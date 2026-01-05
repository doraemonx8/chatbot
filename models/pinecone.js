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

        // Keep your existing filter logic
        if (params.state && params.state !== 'all') filter.state = params.state.toLowerCase();
        if (params.scope && params.scope !== 'all') filter.scope = params.scope.toLowerCase();
        if (params.subHead) filter.subHead = params.subHead;
        if (params.criticality) filter.criticality = params.criticality;
        if (params.periodicity) filter.periodicity = params.periodicity;
        if (params.section) filter.section = params.section;
        if (params.formName) filter.formName = params.formName;
        if (params.department) filter.department = params.department;
        if (params.authority) filter.authority = params.authority;
        if (params.triggerEvent) filter.triggerEvent = params.triggerEvent;

        // Attempt STRICT search first
        let queryResponse = await index.query({
            vector: vector,
            topK: 3,
            includeMetadata: true,
            filter: Object.keys(filter).length > 0 ? filter : undefined
        });

        console.log(`✅ Strict Pinecone Matches: ${queryResponse.matches.length}`);

        // If strict search failed, try again without filters
        if (queryResponse.matches.length === 0 && Object.keys(filter).length > 0) {
            console.log("⚠️ Strict filters yielded 0 results. Relaxing search (removing filters)...");
            queryResponse = await index.query({
                vector: vector,
                topK: 3, 
                includeMetadata: true
            });
            
            console.log(`✅ Relaxed Pinecone Matches: ${queryResponse.matches.length}`);
        }

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