import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import dotenv from "dotenv";

dotenv.config();

let graphInstance = null;

export const getNeo4jGraph = async () => {
  if (!graphInstance) {
    graphInstance = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI,
      username: process.env.NEO4J_USERNAME,
      password: process.env.NEO4J_PASSWORD,
    });
    await graphInstance.refreshSchema();
  }
  return graphInstance;
};