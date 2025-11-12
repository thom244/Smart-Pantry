// server/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ollama configuration
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL = 'gemma2'; // or whatever model you have installed

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Chat endpoint (non-streaming for simplicity)
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build the full prompt with context
    const systemPrompt = `You are a helpful cooking assistant. You help users with recipe suggestions, cooking tips, and ingredient substitutions.
${context ? `\n\nUser's pantry contains: ${context.join(', ')}\n` : ''}
Keep your responses concise and helpful. Focus on practical cooking advice.`;

    const fullPrompt = `${systemPrompt}\n\nUser question: ${prompt}\n\nAssistant:`;

    // Call Ollama API
    const response = await axios.post(OLLAMA_API_URL, {
      model: MODEL,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 500
      }
    });

    res.json({ 
      response: response.data.response,
      success: true 
    });

  } catch (error) {
    console.error('Ollama API Error:', error.message);
    
    // Check if Ollama is running
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Ollama is not running. Please start Ollama first.',
        success: false 
      });
    }

    res.status(500).json({ 
      error: error.message || 'Failed to get response from AI',
      success: false 
    });
  }
});

// Streaming chat endpoint (for real-time responses)
app.post('/api/chat-stream', async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemPrompt = `You are a helpful cooking assistant. You help users with recipe suggestions, cooking tips, and ingredient substitutions.
${context ? `\n\nUser's pantry contains: ${context.join(', ')}\n` : ''}
Keep your responses concise and helpful. Focus on practical cooking advice.`;

    const fullPrompt = `${systemPrompt}\n\nUser question: ${prompt}\n\nAssistant:`;

    // Call Ollama API with streaming
    const response = await axios.post(OLLAMA_API_URL, {
      model: MODEL,
      prompt: fullPrompt,
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: 500
      }
    }, {
      responseType: 'stream'
    });

    // Stream the response
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            res.write(`data: ${JSON.stringify({ text: data.response })}\n\n`);
          }
          if (data.done) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      });
    });

    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Streaming API Error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:11434/api/tags');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch models. Is Ollama running?',
      success: false 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Make sure Ollama is running on http://localhost:11434`);
  console.log(`\nTest the connection:`);
  console.log(`  curl http://localhost:${PORT}/api/test`);
  console.log(`  curl http://localhost:11434/api/tags`);
});

module.exports = app;