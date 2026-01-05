import { StateGraph } from "@langchain/langgraph";
import { extractor,agent,graphTool } from "./tools.js";
import { offTopicPrompt,handleUserQueryPrompt } from "./botPrompt.js";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getQueryContext } from "../models/pinecone.js";
import {formatDataForPrompt} from  "./helper.js";


const llm = new ChatOpenAI({
  model: "gpt-5-chat-latest",
  apiKey: process.env.OPENAI_API_KEY,
  streaming: true,
});

const SUPPORTED_STATES = ["haryana"];

class ChatWorkflow {
  constructor() {
    this.finalState = null;

    this.workflow = new StateGraph({
      channels: {
        sessionId: {
          value: (prev, next) => next || prev,
          default: () => null,
        },
        memory: {
          value: (prev, next) => [...prev, ...next],
          default: () => [],
        },
        params: {
          value: (prev, next) => ({ ...prev, ...next }),
          default: () => ({}),
        },
      },
    });

    this._buildWorkflow();
  }

  _buildWorkflow() {

    // Adding nodes
    this.workflow.addNode("extractAndSelectTool", this._extractSelectTool.bind(this));
    // this.workflow.addNode("validateState", this._validateStateAvailability.bind(this));
    this.workflow.addNode("fetch", this._fetchDataByTool.bind(this));
    this.workflow.addNode("respond", this._generateResponse.bind(this));

    // EDGES
    this.workflow.addEdge("__start__", "extractAndSelectTool");
    
    // this.workflow.addConditionalEdges("extractAndSelectTool", (state) =>
    //   state.params.isOffTopic ? "respond" : "validateState"
    // );

    // this.workflow.addConditionalEdges("validateState", (state) =>
    //   state.params.stateNotSupported ? "respond" : "fetch"
    // );

    this.workflow.addConditionalEdges("extractAndSelectTool", (state) =>
      state.params.stateNotSupported ? "respond" : "fetch"
    );

    this.workflow.addEdge("fetch", "respond");

    this.compiled = this.workflow.compile();
  }

//node state validate
  // async _validateStateAvailability(state) {
  //   const requestedState = state.params.state?.toLowerCase();
  //   const geographyType = state.params.geographyType;

  //   // If central or no state specified, allow
  //   if (geographyType === "central" || !requestedState) {
  //     return { params: { stateNotSupported: false } };
  //   }

  //   // If state is mentioned but not supported
  //   if (!SUPPORTED_STATES.includes(requestedState)) {
  //     console.log(`⚠️  Unsupported state requested: ${requestedState}`);
  //     return {
  //       params: { 
  //         stateNotSupported: true,
  //         unsupportedStateMessage: `I currently only have data for Haryana. ${requestedState.charAt(0).toUpperCase() + requestedState.slice(1)} compliance data is not yet available. Would you like information on Haryana's maternity benefit rules instead?`
  //       }
  //     };
  //   }

  //   // State is supported
  //   return { params: { stateNotSupported: false } };
  // }

  // Validate that memory belongs to current session
  _validateSessionMemory(state) {
    const currentSessionId = state.sessionId;
    const memoryLength = state.memory?.length || 0;

    console.log(`🔍 Session Validation:`);
    console.log(`   Current Session ID: ${currentSessionId}`);
    console.log(`   Memory Count: ${memoryLength}`);

    if (!currentSessionId) {
      console.warn("⚠️  No session ID provided! Memory isolation may fail.");
      return false;
    }

    if (memoryLength === 0) {
      console.log("✅ New session - memory is empty (as expected)");
      return true;
    }

    console.log("✅ Existing session - using stored memory");
    return true;
  }

//node Extract Parameters & Select Tool

async _extractSelectTool(state) {
    try {

      this._validateSessionMemory(state);

      const fnStart = performance.now();
      const lastMessage = state.memory[state.memory.length - 1]?.content || "";

      // Prepare context for Hybrid mode tool selection
      const context = state.memory.slice(-3).map((message) => {
        const from = message.id ? message.id[2] : message.constructor.name;
        return `${from.includes("Human") ? `User : ${message.content || message.kwargs.content}` : `AI : ${message.content || message.kwargs.content}`}`;
      }).join("\n");

      const currentMode = state.params.mode || "hybrid";

      let selectedTool = null;
      let newParams = null;
      let extractionTime = 0;

      // Vector or Graph Mode (Skips Tool Selection LLM)
      if (currentMode === "vector") {
        console.log("🔒 Mode: Vector Only (Forcing getQueryContext)");
        const t1 = performance.now();
        newParams = await extractor.extract(lastMessage, state.memory);
        if (newParams.isOffTopic) {
                console.log("🚫 Off-topic detected (Vector Mode). Skipping fetch.");
                return { sessionId: state.sessionId, params: { ...newParams, isOffTopic: true } };
        }
        extractionTime = performance.now() - t1;

        selectedTool = {
          toolName: "getQueryContext",
          query: lastMessage,
          dataType: "all"
        };

      } else if (currentMode === "graph") {
        console.log("🔒 Mode: Graph Only (Forcing graphQA)");
        const t1 = performance.now();
        newParams = await extractor.extract(lastMessage, state.memory);
        if (newParams.isOffTopic) {
                console.log("🚫 Off-topic detected (Graph Mode). Skipping fetch.");
                return { sessionId: state.sessionId, params: { ...newParams, isOffTopic: true } };
        }
        extractionTime = performance.now() - t1;

        selectedTool = {
          toolName: "graphQA",
          query: lastMessage,
          dataType: "all"
        };

      } else {
        // Hybrid Mode (Uses AI to Select Tool)
        console.log("🔄 Mode: Hybrid (Running full tool selection)");
        const t1 = performance.now();
        
        const [extractedParams, toolResult] = await Promise.all([
                extractor.extract(lastMessage, state.memory),
                agent.getTool(lastMessage)
            ]);
        const t2 = performance.now();

        console.log(`⏱️  Extraction & Selection (Parallel): ${(t2 - t1).toFixed(2)} ms`);
        newParams = extractedParams;
        if (newParams.isOffTopic) {
                console.log("🚫 Off-topic detected (Hybrid Mode). Overriding tool selection.");
                return { sessionId: state.sessionId, params: { ...newParams, isOffTopic: true } };
        }
        selectedTool = toolResult;
      }

      if (currentMode !== "hybrid") {
        console.log(`⏱️  Extraction Time: ${extractionTime.toFixed(2)} ms`);
        console.log(`⏱️  Selection Time: Skipped (Mode Override)`);
      }

      // Merge params
      const existingParams = state.params || {};
      const mergedParams = Object.keys(existingParams).reduce((acc, key) => {
        acc[key] = newParams[key] ? newParams[key] : existingParams[key];
        return acc;
      }, { ...newParams });

      const finalTool = selectedTool.toolName || "getQueryContext";
      const fnEnd = performance.now();

      console.log("🛠️  Selected Tool:", finalTool);
      console.log(`⏱️  TOTAL _extractSelectTool Time: ${(fnEnd - fnStart).toFixed(2)} ms`);
      console.log("------------------------------------------------");

      return {
        sessionId: state.sessionId,
        params: {
          ...mergedParams,
          tool: finalTool,
          isOffTopic: false,
          isDataRelevant: false, // Will be set to true after the 'fetch' node runs
          query: selectedTool.query,
          dataType: selectedTool.dataType,
          data: state.params.data || [] 
        },
      };
    } catch (err) {
      console.error("Error in _extractSelectTool:", err);
      return { params: { isOffTopic: false } };
    }
}

//node Fetch Data by Tool

  async _fetchDataByTool(state) {
    const tool = state.params.tool;

    switch (tool) {
      case "graphQA":
        const graphData = await graphTool.queryGraph(state.params.query);
        return {
          sessionId: state.sessionId,
          memory: [new AIMessage("I have retrieved specific structural data from the Knowledge Graph.")],
          params: { data: graphData }
        };

      case "getQueryContext":
        const params = {
          scope: state.params.geographyType,
          state: state.params.state,
          type: state.params.dataType,
        };
        const { data } = await getQueryContext(state.params.query, params);
        return {
          sessionId: state.sessionId,
          params: { data }
        };

      default:
        return {
          sessionId: state.sessionId,
          memory: [new AIMessage("No tool could be identified for the request.")],
          params: { isOffTopic: true }
        };
    }
  }




  async _generateResponse(state) {
    const start = performance.now();
    let response;

    console.log(`📝 Generating response for session: ${state.sessionId}`);

    // Handle unsupported state
    if (state.params.stateNotSupported) {
      response = new AIMessage(state.params.unsupportedStateMessage);
      const end = performance.now();
      console.log(`Time taken to respond (unsupported state): ${(end - start).toFixed(2)} ms`);
      return { sessionId: state.sessionId, memory: [response] };
    }

    // Handle off-topic
    if (state.params.isOffTopic) {
      response = await this._handleOffTopic(state.memory);
      const end = performance.now();
      console.log(`Time taken to respond (off-topic): ${(end - start).toFixed(2)} ms`);
      return { sessionId: state.sessionId, memory: [response] };
    }

    // Handle general query
    response = await this._handleGeneralQuery(state.memory, state.params.data);
    const end = performance.now();
    console.log(`Time taken to respond: ${(end - start).toFixed(2)} ms`);

    return { sessionId: state.sessionId, memory: [response] };
  }

  async _handleOffTopic(memory) {
    const context = memory.slice(-3).map((message) => {
      return { content: message.content || message.kwargs.content, from: message.id ? message.id[2] : message.constructor.name };
    });
    const response = await llm.invoke([
      new SystemMessage(offTopicPrompt),
      new HumanMessage(`Context : ${JSON.stringify(context)}.`)
    ]);
    return response;
  }

  async _handleGeneralQuery(memory, queryData, isStream = false) {
    const isDataEmpty = !queryData || (Array.isArray(queryData) && queryData.length === 0);

    if (isDataEmpty) {
      const fallbackMsg = "I currently do not have specific data regarding this topic in my knowledge base. My coverage is currently limited to specific Acts and Rules ingested into the system. Would you like to try searching for a different compliance topic?";
      
      if (isStream) {
          return (async function*() { yield { content: fallbackMsg }; })();
      } else {
          return new AIMessage(fallbackMsg);
      }
    }
    const context = memory.slice(-5).map((message) => {
      const from = message.id ? message.id[2] : message.constructor.name;
      return from.includes("Human")
        ? new HumanMessage(message.content || message.kwargs.content)
        : new AIMessage(message.content || message.kwargs.content);
    });

    const messages = [
      new SystemMessage(handleUserQueryPrompt),
      ...context,
      new AIMessage(`Data - ${formatDataForPrompt(queryData)}`),
    ];

    if (isStream) {
      return await llm.stream(messages);
    } else {
      return await llm.invoke(messages);
    }
  }

  async processMessage(message, state) {
    if (!state.sessionId) {
      console.warn("⚠️  Processing message without session ID!");
      state.sessionId = `temp-${Date.now()}`;
    }
    console.log(`🔄 Processing message for session: ${state.sessionId}`);
    state.memory.push(new HumanMessage(message));
    const newState = await this.compiled.invoke(state);
    newState.sessionId = state.sessionId;
    return newState;
  }

  //stream
  
  async *_generateResponseStream(state) {
    const start = performance.now();

    try {
      console.log(`📝 [STREAM] Generating response for session: ${state.sessionId}`);
      // Handle unsupported state
      if (state.params.stateNotSupported) {
        const response = new AIMessage(state.params.unsupportedStateMessage);
        this.finalState = {
          ...state,
          sessionId: state.sessionId,
          memory: [...state.memory, response]
        };
        yield response.content;
        return;
      }

      // Handle off-topic
      if (state.params.isOffTopic) {
        const response = await this._handleOffTopic(state.memory);
        this.finalState = {
          ...state,
          sessionId: state.sessionId,
          memory: [...state.memory, response]
        };
        yield response.content;
        return;
      }

      // Handle general query
      const stream = await this._handleGeneralQuery(state.memory, state.params.data, true);

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      this.finalState = {
        ...state,
        sessionId: state.sessionId,
        memory: [...state.memory, new AIMessage(fullResponse)]
      };

    } finally {
      const end = performance.now();
      console.log(`⏱️ Time taken to stream response: ${(end - start).toFixed(2)} ms`);
    }
  }

  async *processMessageStream(message, state) {
    if (!state.sessionId) {
      console.warn("⚠️  [STREAM] Processing message without session ID!");
      state.sessionId = `temp-${Date.now()}`;
    }
    console.log(`🔄 [STREAM] Processing message for session: ${state.sessionId}`);
    state.memory.push(new HumanMessage(message));
    const preResponseState = await this._runWorkflowUntilResponse(state);
    preResponseState.sessionId = state.sessionId;
    yield* this._generateResponseStream(preResponseState);
  }

  async _runWorkflowUntilResponse(state) {
    // Run extraction and tool selection
    const extracted = await this._extractSelectTool(state);
    state = { ...state, sessionId: extracted.sessionId || state.sessionId, params: { ...state.params, ...extracted.params } };

    // Validate state availability
    // const validated = await this._validateStateAvailability(state);
    // state = { ...state, params: { ...state.params, ...validated.params } };

    // Fetch data if state is valid and not off-topic
    if (!state.params.isOffTopic && !state.params.stateNotSupported) {
      const fetched = await this._fetchDataByTool(state);
      state.sessionId = fetched.sessionId || state.sessionId;
      if (fetched.memory) state.memory = [...state.memory, ...fetched.memory];
      if (fetched.params) state.params = { ...state.params, ...fetched.params };
    }

    return state;
  }

  getFinalState() {
    return this.finalState;
  }
}

const chatbot = new ChatWorkflow();
export default chatbot;