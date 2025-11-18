import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Chat from './components/Chat'

export default function App() {
  const [user, setUser] = useState(null)

  // Check for saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('justchat_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('justchat_user')
      }
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('justchat_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('justchat_user')
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return <Chat user={user} onLogout={handleLogout} />
}