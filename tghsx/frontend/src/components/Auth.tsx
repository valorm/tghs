'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">Login</h2>
      <form onSubmit={handleLogin} className="space-y-3">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </form>
    </div>
  )
}
