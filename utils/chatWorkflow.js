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

class ChatWorkflow {
  constructor() {
    this.finalState = null;

    this.workflow = new StateGraph({
      channels: {
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

    //WORKFLOW
    // Adding nodes

    // this.workflow.addNode("classify", this._classifyMessage.bind(this));
    this.workflow.addNode("extractAndSelectTool",this._extractSelectTool.bind(this));
    this.workflow.addNode("fetch",this._fetchDataByTool.bind(this));
    this.workflow.addNode("respond", this._generateResponse.bind(this));
    

    //EDGES
    this.workflow.addEdge("__start__", "extractAndSelectTool");

    // this.workflow.addConditionalEdges("classify", (state) =>
    //   state.params.isOffTopic == true ? "respond" :"extractAndSelectTool"
    // );

    this.workflow.addConditionalEdges("extractAndSelectTool",(state)=> state.params.isOffTopic==true || state.params.isDataRelevant==true ? "respond":"fetch");

    this.workflow.addEdge("fetch","respond");

    this.compiled = this.workflow.compile();
  }


  //Node Methods
  async _classifyMessage(state) {
    const start=performance.now();

    const classification = await classifier.classify(state.memory);
    
    const end=performance.now();

    console.log(`Time taken to classify message : ${(end-start).toFixed(2)} ms`);

    return {
      params: {
        isOffTopic:classification.isOffTopic,
        classificationReason: classification.reason,
        requestType:classification.requestType,
      },
    };
  }


//  async _extractSelectTool(state) {
//   try {
//     const start = performance.now();

//     const lastMessage = state.memory[state.memory.length - 1]?.content || "";
//     const context=state.memory.slice(-3).map((message)=>{

//     const from=message.id ? message.id[2] : message.constructor.name;
      
//     return `${from.includes("Human") ? `User : ${message.content || message.kwargs.content}` :`AI : ${message.content || message.kwargs.content}`}` 
//     }).join("\n");

//     const currentMode = state.params.mode || "hybrid";

//     // // Start both operations in parallel
//     // const extractPromise = extractor.extract(lastMessage, state.memory);
//     // const selectToolPromise = agent.getTool(`
//     //   Context : ${context}
//     //   Data : ${JSON.stringify(state.params.data)}
//     // `, currentMode);

//     // // Await both
//     // const [newParams, selectedTool] = await Promise.all([extractPromise, selectToolPromise]);

//     let selectedTool = null;
//       let newParams = null;

//       if (currentMode === "vector") {
//         console.log("🔒 Mode: Vector Only (Skipping tool selection)");
        
//         newParams = await extractor.extract(lastMessage, state.memory);
        
//         selectedTool = {
//           toolName: "getQueryContext",
//           isOffTopic: false,
//           isDataRelevant: false,
//           query: lastMessage,
//           dataType: "all"
//         };

//       } else if (currentMode === "graph") {
//         console.log("🔒 Mode: Graph Only (Skipping tool selection)");
        
//         newParams = await extractor.extract(lastMessage, state.memory);
        
//         selectedTool = {
//           toolName: "graphQA",
//           isOffTopic: false,
//           isDataRelevant: false,
//           query: lastMessage,
//           dataType: "all"
//         };

//       } else {
//         //Run both extraction and tool selection in parallel**
//         console.log("🔄 Mode: Hybrid (Running full tool selection)");
        
//         const extractPromise = extractor.extract(lastMessage, state.memory);
//         const selectToolPromise = agent.getTool(`
//           Context : ${context}
//           Data : ${JSON.stringify(state.params.data)}
//         `, currentMode);

//         [newParams, selectedTool] = await Promise.all([extractPromise, selectToolPromise]);
//       }

//     const existingParams = state.params || {};
//     const mergedParams = Object.keys(existingParams).reduce((acc, key) => {
//       acc[key] = newParams[key] ? newParams[key] : existingParams[key];
//       return acc;
//     }, { ...newParams });

//     const end = performance.now();
//     console.log(`Time taken to extract params & select tool : ${(end - start).toFixed(2)} ms`);

//     const finalTool = selectedTool.toolName || "getQueryContext";
//     console.log("🛠️  Selected Tool:", finalTool);
//     // if(finalTool === "graphQA") console.log("❓ Graph Query:", selectedTool.query);

//     return {
//       params: {
//         ...mergedParams,
//         tool: finalTool,
//         isOffTopic:selectedTool.isOffTopic,
//         isDataRelevant:selectedTool.isDataRelevant,
//         query:selectedTool.query,
//         dataType:selectedTool.dataType
//       },
//     };
//   } catch (err) {
//     console.error("Error in _extractSelectTool:",err);
//   }
// }

async _extractSelectTool(state) {
  try {
    const fnStart = performance.now(); 
    const lastMessage = state.memory[state.memory.length - 1]?.content || "";

    const context = state.memory.slice(-3).map((message) => {
      const from = message.id ? message.id[2] : message.constructor.name;
      return `${from.includes("Human") ? `User : ${message.content || message.kwargs.content}` : `AI : ${message.content || message.kwargs.content}`}`;
    }).join("\n");

    const currentMode = state.params.mode || "hybrid";

    let selectedTool = null;
    let newParams = null;

    let extractionTime = 0;
    let selectionTime = 0;
    let retrievalTime = 0;

    // Extraction & Selection
    if (currentMode === "vector") {
      console.log("🔒 Mode: Vector Only (Forcing getQueryContext)");

      const t1 = performance.now();
      newParams = await extractor.extract(lastMessage, state.memory);
      extractionTime = performance.now() - t1;

      selectedTool = {
        toolName: "getQueryContext",
        isOffTopic: false,
        isDataRelevant: false,
        query: lastMessage,
        dataType: "all"
      };

    } else if (currentMode === "graph") {
      console.log("🔒 Mode: Graph Only (Forcing graphQA)");

      const t1 = performance.now();
      newParams = await extractor.extract(lastMessage, state.memory);
      extractionTime = performance.now() - t1;

      selectedTool = {
        toolName: "graphQA",
        isOffTopic: false,
        isDataRelevant: false,
        query: lastMessage,
        dataType: "all"
      };

    } else {
      console.log("🔄 Mode: Hybrid (Running full tool selection)");

      const t1 = performance.now();
      const extractPromise = extractor.extract(lastMessage, state.memory);
      
      const selectPromise = agent.getTool(`
        Context : ${context}
        Data : ${JSON.stringify(state.params.data)}
      `, currentMode);

      const [extractedParams, toolResult] = await Promise.all([extractPromise, selectPromise]);
      const t2 = performance.now();
      
      extractionTime = "N/A (Parallel)"; 
      selectionTime = "N/A (Parallel)";
      console.log(`⏱️  Extraction & Selection (Parallel): ${(t2 - t1).toFixed(2)} ms`);

      newParams = extractedParams;
      selectedTool = toolResult;
    }

    if (currentMode !== "hybrid") {
      console.log(`⏱️  Extraction Time: ${extractionTime.toFixed(2)} ms`);
      console.log(`⏱️  Selection Time: ${selectionTime.toFixed(2)} ms (Skipped)`);
    }

    const existingParams = state.params || {};
    const mergedParams = Object.keys(existingParams).reduce((acc, key) => {
      acc[key] = newParams[key] ? newParams[key] : existingParams[key];
      return acc;
    }, { ...newParams });


    // Pre-fetching
    let fetchedData = null;

    if (selectedTool && selectedTool.toolName && !selectedTool.isOffTopic) {
      console.log(`⚡ Pre-fetching data for ${selectedTool.toolName}...`);
      
      const tFetchStart = performance.now();
      
      // Create a temporary state with ALL params needed for fetching
      const tempState = {
        params: {
          ...mergedParams,
          tool: selectedTool.toolName,
          query: selectedTool.query,
          dataType: selectedTool.dataType,
          data: state.params.data || [] 
        }
      };

      const fetchResult = await this._fetchDataByTool(tempState);
      fetchedData = fetchResult.params?.data || [];
      
      retrievalTime = performance.now() - tFetchStart;
      console.log(`⏱️  Retrieval Time: ${retrievalTime.toFixed(2)} ms (Fetched ${fetchedData.length} results)`);
    }

    const finalTool = selectedTool.toolName || "getQueryContext";
    const fnEnd = performance.now();
    
    console.log("🛠️  Selected Tool:", finalTool);
    console.log(`⏱️  TOTAL _extractSelectTool Time: ${(fnEnd - fnStart).toFixed(2)} ms`);
    console.log("------------------------------------------------");

    return {
      params: {
        ...mergedParams,
        tool: finalTool,
        isOffTopic: selectedTool.isOffTopic,
        isDataRelevant: fetchedData !== null, 
        query: selectedTool.query,
        dataType: selectedTool.dataType,
        data: fetchedData || mergedParams.data
      },
    };
  } catch (err) {
    console.error("Error in _extractSelectTool:", err);
  }
}


  async _fetchDataByTool(state){

    const tool=state.params.tool;
    let compliancesFetched=[];

    //fetching data
    switch(tool){

      case "graphQA":
        const graphData = await graphTool.queryGraph(state.params.query);

        return {
          memory: [new AIMessage("I have retrieved specific structural data from the Knowledge Graph.")],
          params: { data: graphData, scopes: [] }
        };


      case "getQueryContext":
        const params={

          scope:state.params.geographyType,
          state:state.params.state,
          sector:state.params.sector,
          entity:state.params.entity,
          type:state.params.dataType,
        }
        const {data}=await getQueryContext(state.params.query,params);
        return {
          params:{data}
        }
      default:
      return {
        memory:[new AIMessage("No tool could be identified for the request. Will respond based on context and the data captured so far.")],
        params:{isOffTopic:true,scopes:[]}
      }

    }
  }




  async _generateResponse(state) {
    let response;
    let start=performance.now();
    let end;

 
    //handle response based on classification

    if(state.params.isOffTopic){
      response=await this._handleOffTopic(state.memory);
      end=performance.now();


      console.log(`Time taken to respond off_topic : ${(end-start).toFixed(2)} ms`)
      return {
        memory: [response],
      };
    }

    response=await this._handleGeneralQuery(state.memory,state.params.data);

    end=performance.now();
    console.log("time taken to respond : ",(end-start).toFixed(2));

    return {
      memory : [response],
    }
  }

  async _handleOffTopic(memory) {

    const context=memory.slice(-3).map((message)=>{

      return {content:message.content || message.kwargs.content,from : message.id? message.id[2] : message.constructor.name}
    });
    const response = await llm.invoke([
      new SystemMessage(offTopicPrompt),
      new HumanMessage(`Context : ${JSON.stringify(context)}.`)
    ]);

    return response;
  }



 async _handleGeneralQuery(memory, queryData, isStream = false) {
    // 1. Prepare the messages (Shared Logic)
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

    // 2. Return Stream or Response based on flag
    if (isStream) {
      return await llm.stream(messages);
    } else {
      return await llm.invoke(messages);
    }
  }

  async processMessage(message, state) {
    state.memory.push(new HumanMessage(message));
    // Run workflow with current state
    const newState = await this.compiled.invoke(state);
    return newState;
  }

  //stream

async *_generateResponseStream(state) {
    let start = performance.now();

    try {
      // 1. Handle Off-Topic
      if (state.params.isOffTopic) {
        const response = await this._handleOffTopic(state.memory);
        
        this.finalState = {
          ...state,
          memory: [...state.memory, response]
        };
        
        yield response.content;
        return;
      }

      // 2. Handle General Query (Calling the shared helper)
      // We pass 'true' as the 3rd argument to get a stream back
      const stream = await this._handleGeneralQuery(state.memory, state.params.data, true);

      let fullResponse = "";

      // 3. Process the Stream
      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      // 4. Update Final State
      this.finalState = {
        ...state,
        memory: [...state.memory, new AIMessage(fullResponse)]
      };

    } finally {
      let end = performance.now();
      console.log(`⏱️ Time taken to stream response: ${(end - start).toFixed(2)} ms`);
    }
  }

  async *processMessageStream(message, state) {
    state.memory.push(new HumanMessage(message));
    // Run the workflow up to the response generation
    const preResponseState = await this._runWorkflowUntilResponse(state);
    // Stream the response
    yield* this._generateResponseStream(preResponseState);
  }

  async _runWorkflowUntilResponse(state) {
    // Run extraction and tool selection
    const extracted = await this._extractSelectTool(state);
    state = { ...state, params: { ...state.params, ...extracted.params } };

    // Fetch data if needed
    if (!state.params.isOffTopic && !state.params.isDataRelevant) {
      const fetched = await this._fetchDataByTool(state);
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