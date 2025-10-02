const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'OpenAI to NVIDIA NIM Proxy is running' });
});

// OpenAI compatible chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ error: 'NVIDIA_API_KEY not configured' });
    }

    const { messages, model, temperature, max_tokens, stream, top_p, frequency_penalty, presence_penalty } = req.body;

    // Map OpenAI request to NVIDIA NIM format
    const nvidiaRequest = {
      model: model || 'meta/llama-3.1-405b-instruct',
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 1024,
      stream: stream || false,
      top_p: top_p || 1.0,
    };

    // Make request to NVIDIA NIM API
    const response = await axios.post(
      `${NVIDIA_BASE_URL}/chat/completions`,
      nvidiaRequest,
      {
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: stream ? 'stream' : 'json',
      }
    );

    // Handle streaming responses
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      response.data.pipe(res);
      return;
    }

    // Return the response in OpenAI format
    res.json(response.data);

  } catch (error) {
    console.error('Error proxying request:', error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.detail || error.message,
        type: 'proxy_error',
      }
    });
  }
});

// Models endpoint (OpenAI compatible)
app.get('/v1/models', async (req, res) => {
  try {
    if (!NVIDIA_API_KEY) {
      return res.status(500).json({ error: 'NVIDIA_API_KEY not configured' });
    }

    const response = await axios.get(`${NVIDIA_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching models:', error.message);
    
    // Fallback response if models endpoint fails
    res.json({
      object: 'list',
      data: [
        {
          id: 'meta/llama-3.1-405b-instruct',
          object: 'model',
          created: Date.now(),
          owned_by: 'nvidia',
        }
      ]
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI compatible endpoint: http://localhost:${PORT}/v1/chat/completions`);
});
