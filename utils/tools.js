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
        You are a STRICT Cypher query generator for a Neo4j Knowledge Graph used in LexCompliance.

        Your task is to generate a VALID Cypher query that retrieves data ONLY from the Knowledge Graph.
        You MUST strictly follow the rules below.

        --------------------------------
        SCHEMA (SOURCE OF TRUTH)
        --------------------------------
        ${schema}

        --------------------------------
        CORE RULES (MANDATORY)
        --------------------------------

        1. OUTPUT FORMAT
        - Return ONLY raw Cypher
        - No markdown
        - No explanations
        - No comments
        - No backticks

        2. KNOWLEDGE GRAPH ONLY
        - You MUST fetch answers ONLY using nodes and relationships present in the schema
        - NEVER invent facts, values, or relationships
        - If something is not present in the graph, still generate the closest valid query

        3. ENTITY MATCHING (VERY IMPORTANT)
        When matching names (Form, Act, Rule, Section, Authority, Topic, State):

         ALWAYS normalize strings using this pattern:
        replace(toLower(x.name), '-', ' ')
        CONTAINS
        replace(toLower('<VALUE_FROM_QUERY>'), '-', ' ')

         NEVER use direct equality or raw CONTAINS without normalization

        4. ENTITY PRIORITY
        - If the query mentions:
          - Form → start from (:Form)
          - Act → start from (:Act)
          - Section → start from (:Section)
          - Rule → start from (:Rule)
          - Authority → start from (:Authority)
          - Compliance → start from (:Compliance)
          - State → start from (:State)

        5. RELATIONSHIP USAGE
        - Use ONLY relationships defined in the schema
        - Prefer directed relationships
        - Use OPTIONAL MATCH when relationships may not exist

        6. QUERY STRUCTURE (STANDARD)
        - Start from the primary entity
        - Traverse relationships to related entities
        - Return readable properties only (name, description, penalty, criticality, etc.)
        - DO NOT return entire nodes

        7. SAFE DEFAULTS
        - If multiple entities are possible, choose the most specific one
        - If unsure about relationship existence, use OPTIONAL MATCH

        --------------------------------
        RETURN GUIDELINES
        --------------------------------
        - Always alias returned fields
        - Prefer:
          name, purpose, description, penalty, criticality, periodicity,
          applicabilityFull, authority name, siteUrl, isOnline

        --------------------------------
        USER QUESTION
        --------------------------------
        "${userQuestion}"
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
        isOffTopic: { 
          type: "boolean", 
          description: "Set to TRUE if the user query is unrelated to Indian Law, Acts, or Compliance (e.g., cooking, weather, general chat). Set FALSE for greetings ('Hi') or legal queries." 
        },
        geographyType: { type: "string", enum: ["central", "state", "both"], description: "Level of governance" },
        state: { type: "string", description: "State name (e.g., 'Haryana') or null" },

        // --- LEGAL SPECIFICS ---
        actName: { type: "string", description: "Specific Act name if mentioned" },
        section: { type: "string", description: "Section number (e.g., '60')" },
        rule: { type: "string", description: "Rule number" },
        formName: { type: "string", description: "Form name (e.g., 'Form M-5', 'Form XXII')" },
        
        subHead: { type: "string", description: "The specific topic or category (e.g., 'Registration', 'Returns', 'Maternity Benefit', 'Registers')" },
        criticality: { type: "string", enum: ["High", "Medium", "Low"], description: "Risk level mentioned" },
        periodicity: { type: "string", description: "Frequency (Annual, Monthly, Event Based)" },
        department: { type: "string", description: "Department name (e.g., 'Labour')" },
        authority: { type: "string", description: "Official authority (e.g., 'Inspector-cum-Facilitator', 'Chief Inspector')" },
        complianceType: { type: "string", description: "Type of compliance (e.g., 'Statutory')" },
        potentialImpact: { type: "string", description: "Consequence or penalty mentioned (e.g., 'Fine', 'Imprisonment', 'Prosecution')" },
        triggerEvent: { type: "string", description: "Event that triggers the compliance (e.g., 'Hiring', 'Termination', 'Confinement', 'Delivery')" }
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
  // async extract(message, memory) {
  //   // 1. Capture the response
  //   const result = await this.llm.invoke([
  //     new SystemMessage(extractParametersPrompt),
  //     ...memory,
  //     new HumanMessage(message),
  //   ]);

  //   // 2. LOG THE OUTPUT HERE
  //   console.log("\n🔍 --- EXTRACTED PARAMETERS (BOT PROMPT OUTPUT) ---");
  //   console.log(JSON.stringify(result, null, 2));
  //   console.log("---------------------------------------------------\n");

  //   // 3. Return the result as before
  //   return result;
  // }
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

    // Hybrid Mode
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