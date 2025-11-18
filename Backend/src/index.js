require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const { initRedis, getRedisAdapter } = require('./utils/redis');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const { socketAuth } = require('./middleware/auth');
const { registerSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: { origin: config.corsOrigin, credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize and start server
async function startServer() {
  try {
    // Connect to Redis
    console.log('Connecting to Redis...');
    await initRedis();
    
    // Set up Redis adapter for Socket.IO
    const adapter = await getRedisAdapter();
    io.adapter(adapter);
    console.log('Redis adapter configured');

    // Socket.IO authentication middleware
    io.use(socketAuth);

    // Register socket event handlers
    registerSocketHandlers(io);

    // Start server
    server.listen(config.port, () => {
      console.log(`🚀 JustChat backend running on port ${config.port}`);
      console.log(`Environment: ${config.env}`);
      console.log(`CORS origin: ${config.corsOrigin}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, io };