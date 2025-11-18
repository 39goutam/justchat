import React, { useState, useEffect, useRef } from 'react'
import { createSocket } from '../services/socket'

export default function Chat({ user, onLogout }) {
  const [socket, setSocket] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState(new Set())
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = createSocket(user.token)

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
      newSocket.emit('room:join', 'broadcast')
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    newSocket.on('message:recv', (msg) => {
      setMessages(prev => [...prev, msg])
    })

    newSocket.on('users:online', (users) => {
      setOnlineUsers(users)
    })

    newSocket.on('user:online', (data) => {
      setOnlineUsers(prev => [...prev, data])
    })

    newSocket.on('user:offline', (data) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId))
    })

    newSocket.on('typing:update', (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => new Set([...prev, data.userName]))
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.userName)
          return newSet
        })
      }
    })

    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
      alert(error.message || 'An error occurred')
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [user.token])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim() || !socket || !connected) return

    socket.emit('message:send', {
      to: 'broadcast',
      content: input.trim(),
      contentType: 'text'
    })

    // Add message optimistically
    setMessages(prev => [...prev, {
      from: user.userId,
      fromName: user.name,
      content: input.trim(),
      timestamp: Date.now(),
      id: `temp_${Date.now()}`
    }])

    setInput('')
    stopTyping()
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    
    // Send typing indicator
    if (socket && connected) {
      socket.emit('typing:start', { roomId: 'broadcast' })
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 2000)
    }
  }

  const stopTyping = () => {
    if (socket && connected) {
      socket.emit('typing:stop', { roomId: 'broadcast' })
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">JustChat</h1>
            <div className="flex items-center space-x-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{onlineUsers.length} online</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">Guest User</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.from === user.userId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
                {!isOwn && (
                  <p className="text-xs text-gray-600 mb-1 px-1">{msg.fromName}</p>
                )}
                <div className={`rounded-2xl px-4 py-2 ${
                  isOwn 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}>
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>{Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
              rows={1}
              maxLength={5000}
              disabled={!connected}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !connected}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}