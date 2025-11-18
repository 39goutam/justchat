import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000'

export function createSocket(token) {
  const socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  })

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message)
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber, 'attempts')
  })

  socket.on('reconnect_failed', () => {
    console.error('Failed to reconnect')
  })

  return socket
}