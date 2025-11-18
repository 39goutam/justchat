const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const config = require('../config');

let pubClient = null;
let subClient = null;

/**
 * Initialize Redis clients
 */
async function initRedis() {
  pubClient = createClient({ url: config.redisUrl });
  subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
  subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

  await pubClient.connect();
  await subClient.connect();

  console.log('✅ Redis connected');
}

/**
 * Get Redis adapter for Socket.IO
 */
async function getRedisAdapter() {
  if (!pubClient || !subClient) {
    throw new Error('Redis clients not initialized');
  }
  return createAdapter(pubClient, subClient);
}

/**
 * Set user presence
 */
async function setUserPresence(userId, status = 'online') {
  if (!pubClient) return;
  
  await pubClient.hSet('user:presence', userId, JSON.stringify({
    status,
    timestamp: Date.now()
  }));
  
  // Expire after 5 minutes of inactivity
  await pubClient.expire(`user:presence:${userId}`, 300);
}

/**
 * Get user presence
 */
async function getUserPresence(userId) {
  if (!pubClient) return null;
  
  const data = await pubClient.hGet('user:presence', userId);
  return data ? JSON.parse(data) : null;
}

/**
 * Get all online users
 */
async function getOnlineUsers() {
  if (!pubClient) return [];
  
  const users = await pubClient.hGetAll('user:presence');
  return Object.entries(users).map(([userId, data]) => ({
    userId,
    ...JSON.parse(data)
  }));
}

/**
 * Remove user presence
 */
async function removeUserPresence(userId) {
  if (!pubClient) return;
  await pubClient.hDel('user:presence', userId);
}

/**
 * Store typing indicator
 */
async function setTyping(roomId, userId, isTyping) {
  if (!pubClient) return;
  
  const key = `typing:${roomId}`;
  if (isTyping) {
    await pubClient.sAdd(key, userId);
    await pubClient.expire(key, 10); // Auto-expire after 10 seconds
  } else {
    await pubClient.sRem(key, userId);
  }
}

/**
 * Get typing users in room
 */
async function getTypingUsers(roomId) {
  if (!pubClient) return [];
  return await pubClient.sMembers(`typing:${roomId}`);
}

module.exports = {
  initRedis,
  getRedisAdapter,
  setUserPresence,
  getUserPresence,
  getOnlineUsers,
  removeUserPresence,
  setTyping,
  getTypingUsers,
  getPubClient: () => pubClient,
  getSubClient: () => subClient
};