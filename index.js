import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import chatbot from './utils/chatWorkflow.js';
import cors from "cors";
import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import { chatLimiter } from './middleware/rateLimit.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));

const PORT = process.env.PORT || 3000;

const sessions = {}; 

app.use('/api/auth', authRoutes);

app.post('/api/chat', authenticateToken, chatLimiter, async (req, res) => {
    try {
        const { message, sessionId = 'default-session', mode = 'hybrid' } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        console.log(`\n📩 Received message from ${sessionId}: ${message}`);

        const currentState = getOrCreateSession(sessionId, mode);
        const validatedState = validateSession(currentState);
        const newState = await chatbot.processMessage(message, validatedState);

        // Verify session ID matches before saving
        if (newState.sessionId !== sessionId) {
            console.error(`❌ Session ID mismatch! Expected: ${sessionId}, Got: ${newState.sessionId}`);
            return res.status(500).json({ 
                error: "Session mismatch error",
                details: "Memory was not properly associated with this session"
            });
        }

        // Save updated state to correct session
        sessions[sessionId] = newState;

        const lastMessage = newState.memory[newState.memory.length - 1];
        const aiResponse = lastMessage.content || lastMessage.kwargs.content;

        res.json({
            response: aiResponse,
            sessionId: sessionId,
            memoryCount: newState.memory.length
        });

    } catch (error) {
        console.error("❌ API Error:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.post('/api/chat/stream', authenticateToken, chatLimiter, async (req, res) => {
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

        // Get or create session
        const currentState = getOrCreateSession(sessionId, mode);
        
        // Validate session
        const validatedState = validateSession(currentState);

        // Send initial event
        res.write(`data: ${JSON.stringify({ 
            type: 'start', 
            sessionId,
            memoryCount: validatedState.memory.length 
        })}\n\n`);

        // Process with streaming
        const stream = await chatbot.processMessageStream(message, validatedState);

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ 
                type: 'token', 
                content: chunk 
            })}\n\n`);
        }

        // Get final state and validate
        const newState = await chatbot.getFinalState();
        
        // Verify session ID
        if (newState.sessionId !== sessionId) {
            console.error(`❌ [STREAM] Session ID mismatch!`);
            res.write(`data: ${JSON.stringify({ 
                type: 'error', 
                message: 'Session mismatch error' 
            })}\n\n`);
            res.end();
            return;
        }

        sessions[sessionId] = newState;

        // Send completion event
        res.write(`data: ${JSON.stringify({ 
            type: 'done', 
            sessionId,
            memoryCount: newState.memory.length
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

const getOrCreateSession = (sessionId, mode = 'hybrid') => {
    if (!sessions[sessionId]) {
        console.log(`🆕 Creating new session: ${sessionId}`);
        sessions[sessionId] = {
            sessionId: sessionId,
            memory: [],
            params: { mode: mode }
        };
    } else {
        console.log(`♻️  Using existing session: ${sessionId}`);
        sessions[sessionId].params.mode = mode;
    }
    return sessions[sessionId];
};

const validateSession = (state) => {
    if (!state.sessionId) {
        console.warn("⚠️  State missing sessionId! Creating temporary ID.");
        state.sessionId = `temp-${Date.now()}`;
    }
    return state;
};

// Get session info
app.get('/api/session/:sessionId', authenticateToken, (req, res) => {
    const { sessionId } = req.params;
    const session = sessions[sessionId];
    
    if (!session) {
        return res.status(404).json({ 
            error: "Session not found",
            sessionId 
        });
    }

    res.json({
        sessionId: session.sessionId,
        memoryCount: session.memory.length,
        mode: session.params.mode,
        lastParams: session.params
    });
});

// Clear session
app.delete('/api/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (sessions[sessionId]) {
        delete sessions[sessionId];
        return res.json({ 
            message: "Session cleared",
            sessionId 
        });
    }

    res.status(404).json({ 
        error: "Session not found",
        sessionId 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});