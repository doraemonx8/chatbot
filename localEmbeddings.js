import { pipeline } from '@xenova/transformers';

// Singleton variable to hold the model in memory
let extractor = null;

/**
 * Generates an embedding for the given text using a local transformer model.
 * Uses 'Xenova/all-MiniLM-L6-v2' which provides 384-dimensional vectors.
 */
export const createLocalEmbedding = async (text) => {
    try {
        if (!extractor) {
            console.log("📥 Loading Xenova/all-MiniLM-L6-v2 model locally...");
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }

        // pooling: 'mean' and normalize: true are required for sentence similarity
        const result = await extractor(text, { pooling: 'mean', normalize: true });

        // Convert Tensor to simple Array
        return Array.from(result.data);

    } catch (err) {
        console.error("❌ Embedding Error:", err);
        return null;
    }
};