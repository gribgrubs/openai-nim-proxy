const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const PORT = process.env.PORT || 3000;

// Chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const {
      messages,
      model = 'meta/llama-3.1-405b-instruct',
      stream = false,
      temperature = 0.7,
      max_tokens = 1024,
      top_p = 1.0
    } = req.body;

    const nvidiaPayload = {
      model,
      messages,
      temperature,
      max_tokens,
      top_p,
      stream
    };

    const headers = {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    };

    if (stream) {
      // Handle streaming response
      const response = await axios.post(
        `${NVIDIA_BASE_URL}/chat/completions`,
        nvidiaPayload,
        {
          headers,
          responseType: 'stream'
        }
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      response.data.pipe(res);
    } else {
      // Handle regular response
      const response = await axios.post(
        `${NVIDIA_BASE_URL}/chat/completions`,
        nvidiaPayload,
        { headers }
      );

      res.json(response.data);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.error?.message || error.message,
        type: 'proxy_error'
      }
    });
  }
});

// List models endpoint
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: 'meta/llama-3.1-405b-instruct',
        object: 'model',
        created: 1686935002,
        owned_by: 'nvidia'
      },
      {
        id: 'meta/llama-3.1-70b-instruct',
        object: 'model',
        created: 1686935002,
        owned_by: 'nvidia'
      },
      {
        id: 'meta/llama-3.1-8b-instruct',
        object: 'model',
        created: 1686935002,
        owned_by: 'nvidia'
      },
      {
        id: 'mistralai/mixtral-8x7b-instruct-v0.1',
        object: 'model',
        created: 1686935002,
        owned_by: 'nvidia'
      },
      {
        id: 'google/gemma-2-9b-it',
        object: 'model',
        created: 1686935002,
        owned_by: 'nvidia'
      }
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'OpenAI-compatible NVIDIA NIM Proxy API',
    status: 'online',
    endpoints: {
      chat: '/v1/chat/completions',
      models: '/v1/models'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/v1/chat/completions`);
});
