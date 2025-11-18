const { 
  setUserPresence, 
  removeUserPresence, 
  getOnlineUsers,
  setTyping,
  getTypingUsers 
} = require('../utils/redis');

// Simple rate limiting per socket
const messageRateLimits = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = messageRateLimits.get(userId) || { count: 0, resetTime: now + 60000 };
  
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + 60000;
  }
  
  userLimit.count++;
  messageRateLimits.set(userId, userLimit);
  
  return userLimit.count <= 10; // 10 messages per minute
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`✅ User connected: ${user.name} (${user.id})`);

    // Join user's personal room (for direct messages)
    socket.join(user.id);
    
    // Join a broadcast room (for testing)
    socket.join('broadcast');

    // Set user as online
    setUserPresence(user.id, 'online').catch(console.error);

    // Notify others that user is online
    socket.broadcast.emit('user:online', {
      userId: user.id,
      name: user.name
    });

    // Send current online users to the newly connected user
    getOnlineUsers()
      .then(users => {
        socket.emit('users:online', users);
      })
      .catch(console.error);

    /**
     * Handle sending messages
     */
    socket.on('message:send', (data) => {
      try {
        // Rate limiting
        if (!checkRateLimit(user.id)) {
          socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
          return;
        }

        // Validate data
        if (!data || !data.to || !data.content) {
          socket.emit('error', { message: 'Invalid message format' });
          return;
        }

        // Sanitize content (basic XSS prevention)
        const sanitizedContent = data.content.toString().substring(0, 5000);

        const message = {
          from: user.id,
          fromName: user.name,
          to: data.to,
          content: sanitizedContent,
          contentType: data.contentType || 'text',
          timestamp: Date.now(),
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // Send to recipient(s)
        // If 'to' is 'broadcast', send to everyone
        if (data.to === 'broadcast') {
          io.to('broadcast').emit('message:recv', message);
        } else {
          // Send to specific user's room
          io.to(data.to).emit('message:recv', message);
        }

        // Confirm delivery to sender
        socket.emit('message:sent', { id: message.id, timestamp: message.timestamp });

        console.log(`📨 Message from ${user.name} to ${data.to}`);

      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Handle typing indicators
     */
    socket.on('typing:start', (data) => {
      if (!data || !data.roomId) return;
      
      setTyping(data.roomId, user.id, true)
        .then(() => {
          socket.to(data.roomId).emit('typing:update', {
            userId: user.id,
            userName: user.name,
            isTyping: true
          });
        })
        .catch(console.error);
    });

    socket.on('typing:stop', (data) => {
      if (!data || !data.roomId) return;
      
      setTyping(data.roomId, user.id, false)
        .then(() => {
          socket.to(data.roomId).emit('typing:update', {
            userId: user.id,
            userName: user.name,
            isTyping: false
          });
        })
        .catch(console.error);
    });

    /**
     * Handle joining rooms (for group chats)
     */
    socket.on('room:join', (roomId) => {
      if (!roomId) return;
      socket.join(roomId);
      console.log(`${user.name} joined room: ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit('user:joined', {
        userId: user.id,
        userName: user.name,
        roomId
      });
    });

    socket.on('room:leave', (roomId) => {
      if (!roomId) return;
      socket.leave(roomId);
      console.log(`${user.name} left room: ${roomId}`);
      
      socket.to(roomId).emit('user:left', {
        userId: user.id,
        userName: user.name,
        roomId
      });
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.name} (${user.id})`);
      
      // Remove presence
      removeUserPresence(user.id).catch(console.error);
      
      // Notify others
      socket.broadcast.emit('user:offline', {
        userId: user.id,
        name: user.name
      });

      // Clean up rate limit
      messageRateLimits.delete(user.id);
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Clean up rate limits periodically
  setInterval(() => {
    const now = Date.now();
    for (const [userId, limit] of messageRateLimits.entries()) {
      if (now > limit.resetTime + 60000) {
        messageRateLimits.delete(userId);
      }
    }
  }, 60000);
}

module.exports = { registerSocketHandlers };