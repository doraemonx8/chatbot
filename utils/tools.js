import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { extractParametersPrompt,SelectToolPrompt } from "./botPrompt.js";
import { getNeo4jGraph } from "../models/neo4j.js";

class GraphTool {
  constructor() {
    this.graph = null;
    this.llm = new ChatOpenAI({
      model: "gpt-5-chat-latest",
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
      },
      required: ["geographyType", "state"],
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
        query:{type:"string",description:"Refined search query based on context"},
        dataType:{type:"string",enum:["all"],description:"Data type (always 'all' for now)"},
      },
      required: ["toolName","dataType","query"],
    });
  }
  async getTool(message, mode = "hybrid") {
    // 🔒 Force Vector Mode
    if (mode === "vector") {
      console.log("🔒 Mode: Vector Only (Bypassing SelectToolPrompt)");
      return {
        toolName: "getQueryContext",
        isOffTopic: false,
        isDataRelevant: false,
        query: message,
        dataType: "all"
      };
    }

    // 🔒 Force Graph Mode
    if (mode === "graph") {
      console.log("🔒 Mode: Graph Only (Bypassing SelectToolPrompt)");
      return {
        toolName: "graphQA",
        isOffTopic: false,
        isDataRelevant: false,
        query: message,
        dataType: "all"
      };
    }

    // 🔄 Hybrid Mode -> Let AI Decide
    console.log("🔄 Mode: Hybrid (Using SelectToolPrompt)");
    const result = await this.llm.invoke([
      new SystemMessage(SelectToolPrompt),
      new HumanMessage(message),
    ]);

    return {
      ...result,
      isOffTopic: false,
      isDataRelevant: false
    };
  }
}

const extractor = new ParamExtractorTool();
const agent = new Agent();
const graphTool = new GraphTool();

export {extractor,agent,graphTool};
