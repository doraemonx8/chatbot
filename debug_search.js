import { getQueryContext } from "./models/pinecone.js"; // Ensure path points to your pinecone.js
import dotenv from 'dotenv';

dotenv.config();

const runDebug = async () => {
    console.log("🛠️  Starting Retrieval Debugger...\n");

    // Test Case 1: The query that failed (Restrictions)
    // We try to match the language in your JSON: "Restriction on employer to employ woman"
    const difficultQuery = "restrictions on employing women after delivery";
    
    console.log(`🔎 Searching for: "${difficultQuery}"`);
    const results = await getQueryContext(difficultQuery, { state: 'haryana' });

    if (results.data.length === 0) {
        console.log("❌ No results found.");
    } else {
        console.log(`✅ Found ${results.data.length} matches:\n`);
        results.data.forEach((item, index) => {
            console.log(`${index + 1}. [Score: ${item.score}]`);
            console.log(`   Type: ${item.documentType}`);
            console.log(`   Desc: ${item.complianceDescription}`);
            console.log(`   Source ID: ${item.original_id} | Chunk: ${item.chunk_type}`);
            console.log("---------------------------------------------------");
        });
    }
};

runDebug();