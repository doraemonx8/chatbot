import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index("lexbot-openai").namespace("v4-test-openai");

// embeddings for the query
const createEmbedding = async (text) => {
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-large",
        dimensions: 1024,
        apiKey: process.env.OPENAI_API_KEY,
    });
    return await embeddings.embedQuery(text);
};

// General Context Search
export const getQueryContext = async (query, params = {}) => {
    try {
        const vector = await createEmbedding(query);
        
        const filter = {};
        if (params.state && params.state !== 'all') filter.state = params.state.toLowerCase();
        if (params.scope && params.scope !== 'all') filter.scope = params.scope.toLowerCase();

        const queryResponse = await index.query({
            vector: vector,
            topK: 3,
            includeMetadata: true,
            filter: Object.keys(filter).length > 0 ? filter : undefined
        });

        // console.log(queryResponse)

        const data = queryResponse.matches.map((match) => {
            console.log(`[Score: ${match.score.toFixed(4)}] Content: ${match.id}...`);
            
            return {
                ...match.metadata,
                score: match.score
            };
        });

        return { data };
    } catch (err) {
        console.error("Pinecone Query Error:", err);
        return { data: [] };
    }
};