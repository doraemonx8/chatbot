import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { extractParametersPrompt,SelectToolPrompt } from "./botPrompt.js";
// import { getQueryContext } from "../models/pinecone.js";
// import { GraphCypherQAChain } from "@langchain/community/chains/graph_qa/cypher";
import { getNeo4jGraph } from "../models/neo4j.js";

class GraphTool {
  constructor() {
    this.graph = null;
    this.llm = new ChatOpenAI({
      model: "gpt-5-chat-latest", //gpt-5-chat-latest
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async init() {
    if (!this.graph) {
      this.graph = await getNeo4jGraph();
    }
  }

  async queryGraph(userQuestion) {
    await this.init();
    
    try {
      const schema = await this.graph.getSchema();
      const prompt = `
      Task: Generate a Cypher statement to query a Neo4j graph database.
      
      Schema:
      ${schema}

      Instructions:
      - Use the provided schema to write a Cypher query that answers the user's question.
      - Do NOT include any explanations or markdown formatting (like \`\`\`cypher).
      - Return ONLY the raw Cypher query string.
      - **CRITICAL:** When searching for names (Forms, Sections, Acts), ALWAYS use the \`CONTAINS\` operator (case-insensitive) instead of exact matching.
        - Example: Instead of \`f.name = 'XXII'\`, use \`toLower(f.name) CONTAINS toLower('XXII')\`.
      - Return the specific node properties (like description, criticality) rather than just the node itself so the chatbot can read it easily.
      
      User Question: "${userQuestion}"
      `;

      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      
      let cypher = response.content.replace(/```cypher/g, "").replace(/```/g, "").trim();
      
      console.log(`📝 Generated Cypher: ${cypher}`);

      const result = await this.graph.query(cypher);
      
      console.log(`📊 Graph Results: ${result.length} records found.`);
      return result;

    } catch (error) {
      console.error("❌ Graph QA Error:", error);
      return []; 
    }
  }
}

   
class ParamExtractorTool {
  constructor() {
    this.llm = new ChatOpenAI({
      model: "gpt-5-chat-latest",
      apiKey: process.env.OPENAI_API_KEY,
    }).withStructuredOutput({
      type: "object",
      properties: {
        geographyType: { type: "string", enum: ["central", "state", "both"], description: "Level of governance" },
        state: { type: "string", description: "State name (if applicable)" },
        paramConfidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence score for extraction" },
      },
      required: ["geographyType", "state", "paramConfidence"],
    });
  }
  async extract(message,memory) {
    return this.llm.invoke([
      new SystemMessage(extractParametersPrompt),
      ...memory,
      new HumanMessage(message),
    ]);
  }
}


class Agent{
  constructor() {
    this.llm = new ChatOpenAI({
      model: "gpt-5-chat-latest",
      apiKey: process.env.OPENAI_API_KEY,
    }).withStructuredOutput({
      type: "object",
      properties: {
        toolName: { 
          type: "string",
          enum: [
            "getQueryContext",
            "graphQA"
          ],
          description: "The name of the tool to use"
        },
        isOffTopic: { type: "boolean"},
        isDataRelevant:{type:"boolean"},
        query:{type:"string",description:"Query that is constructed using context"},
        dataType:{type:"string",enum:["act","compliance","all"],description:"type of data"},
      },
      required: ["toolName","dataType","id","query","queryColumn"],
    });
  }
  async getTool(message, mode = "hybrid") {
    
    if (mode === "vector") {
      console.log("🔒 Mode: Vector Only (Forcing getQueryContext)");
      return {
        toolName: "getQueryContext",
        isOffTopic: false,
        isDataRelevant: false,
        query: message, // Use the raw message or context as query
        dataType: "all"
      };
    }

    // 2. Graph Only Mode -> Force Neo4j
    if (mode === "graph") {
      console.log("🔒 Mode: Graph Only (Forcing graphQA)");
      return {
        toolName: "graphQA",
        isOffTopic: false,
        isDataRelevant: false,
        query: message, 
        dataType: "all"
      };
    }

    // Hybrid Mode (Default) -> Let AI Decide
    return this.llm.invoke([
      new SystemMessage(SelectToolPrompt),
      new HumanMessage(message),
    ]);
  }
}


const fetchingTools=[
  {
    name:"getQueryContext",
    description:"fetches the data from the whole vector dataset irrespective of act or compliance.",
    parameters:{
      type:"object",
      properties:{
        query:{type:"string",description:"query that is to be used to perform vector search"},
        geographyType:{type:"string",enum:["central","state","both"],description:"Level of governance"},
        state:{type:"string",description:"State name (if applicable)"},
        sector:{type:"string",description:"sector name for filtering (if applicable"},
      },
      required:['query']
    }
  },
  {
  name: "graphQA",
  description: "Use this tool for structural questions about Forms, Sections, Authorities, or relationships (e.g., 'Which compliances require Form XXII?', 'How many compliances are under Section 60?'). Do NOT use for general summaries.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The natural language question to ask the graph database" }
    },
    required: ['query']
  }
}
]

// const classifier=new ClassifierTool();
const extractor= new ParamExtractorTool();
const agent=new Agent();
const graphTool = new GraphTool();


export {extractor,fetchingTools,agent,graphTool};
