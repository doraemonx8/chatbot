import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import chatbot from './utils/chatWorkflow.js';
import cors from "cors";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

const PORT = process.env.PORT || 3000;

const sessions = {}; 

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'default-session', mode = 'hybrid' } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        console.log(`\n📩 Received message from ${sessionId}: ${message}`);

        if (!sessions[sessionId]) {
            sessions[sessionId] = {
                memory: [], // Stores message history
                params: { mode: mode }
            };
        } else {
            sessions[sessionId].params.mode = mode;
        }

        const currentState = sessions[sessionId];

        const newState = await chatbot.processMessage(message, currentState);

        console.log("\n=== 📜 CURRENT MESSAGES ARRAY ======");
        newState.memory.forEach((msg, index) => {
            // Determine the sender (User or AI)
            // Note: LangChain messages sometimes store content in .content or .kwargs.content
            const role = msg.constructor.name; 
            const text = msg.content || msg.kwargs?.content || "";
            
            console.log(`[${index}] ${role}: ${text.substring(0, 100)}...`); // Prints first 100 chars
        });
        console.log("====================================\n");

        sessions[sessionId] = newState;

        const lastMessage = newState.memory[newState.memory.length - 1];
        const aiResponse = lastMessage.content || lastMessage.kwargs.content;

        res.json({
            response: aiResponse,
            sessionId: sessionId,
        });

    } catch (error) {
        console.error("❌ API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, sessionId = 'default-session', mode = 'hybrid' } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        console.log(`\n📩 [STREAM] Received message from ${sessionId}: ${message}`);

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

        if (!sessions[sessionId]) {
            sessions[sessionId] = {
                memory: [],
                params: { mode: mode }
            };
        } else {
            sessions[sessionId].params.mode = mode;
        }

        const currentState = sessions[sessionId];

        // Send initial event
        res.write(`data: ${JSON.stringify({ type: 'start', sessionId })}\n\n`);

        // Process with streaming
        const stream = await chatbot.processMessageStream(message, currentState);

        for await (const chunk of stream) {
            // Send each token as it arrives
            res.write(`data: ${JSON.stringify({ 
                type: 'token', 
                content: chunk 
            })}\n\n`);
        }

        // Get final state and update session
        const newState = await chatbot.getFinalState();
        sessions[sessionId] = newState;

        // Send completion event
        res.write(`data: ${JSON.stringify({ 
            type: 'done', 
            sessionId 
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error("❌ Streaming API Error:", error);
        res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            message: error.message 
        })}\n\n`);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

