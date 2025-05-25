const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuration
const PYTHON_API_BASE = 'http://127.0.0.1:8080/api/v1';

// Create a proxy to forward requests to Python backend
const createApiProxy = (endpoint) => {
  return async (req, res) => {
    try {
      console.log(`Proxying ${req.method} request to: ${endpoint}`);
      
      const url = `${PYTHON_API_BASE}${endpoint}`;
      const method = req.method.toLowerCase();
      
      let response;
      if (method === 'get') {
        response = await axios.get(url, { params: req.query });
      } else {
        response = await axios[method](url, req.body);
      }
      
      res.json(response.data);
    } catch (error) {
      console.error(`API Proxy Error (${endpoint}):`, error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ 
          error: error.message,
          message: 'Internal server error'
        });
      }
    }
  };
};

// AUTH ENDPOINTS
app.post('/api/v1/user/login', createApiProxy('/user/login'));
app.post('/api/v1/user/register', createApiProxy('/user/register'));
app.get('/api/v1/user/me', createApiProxy('/user/me'));

// DIARY ENDPOINTS
app.get('/api/v1/diary', createApiProxy('/diary'));
app.post('/api/v1/diary', createApiProxy('/diary'));
app.get('/api/v1/diary/:id', createApiProxy('/diary/:id'));
app.put('/api/v1/diary/:id', createApiProxy('/diary/:id'));
app.delete('/api/v1/diary/:id', createApiProxy('/diary/:id'));

// CALENDAR ENDPOINTS
app.get('/api/v1/calendar/:date', createApiProxy('/calendar/:date'));
app.post('/api/v1/calendar/event', createApiProxy('/calendar/event'));
app.put('/api/v1/calendar/event/:id', createApiProxy('/calendar/event/:id'));
app.delete('/api/v1/calendar/event/:id', createApiProxy('/calendar/event/:id'));

// TASK ENDPOINTS
app.get('/api/v1/tasks/:date', createApiProxy('/tasks/:date'));
app.post('/api/v1/tasks', createApiProxy('/tasks'));
app.put('/api/v1/tasks/:id', createApiProxy('/tasks/:id'));
app.delete('/api/v1/tasks/:id', createApiProxy('/tasks/:id'));
app.put('/api/v1/tasks/:id/complete', createApiProxy('/tasks/:id/complete'));

// Fallback route for development
app.use('/api/v1/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function startServer(port = 5000) {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        console.log(`API Express server running on port ${port}`);
        resolve(server);
      });
    } catch (error) {
      console.error('Failed to start Express server:', error);
      reject(error);
    }
  });
}

// Export for use in main.js
module.exports = { startServer };