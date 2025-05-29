'use client'

import { useState } from 'react'
import StatusFeed from '@/components/StatusFeed'

export default function StatusPage() {
  const [wallet, setWallet] = useState('')

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">View Wallet Activity</h1>

      <input
        type="text"
        placeholder="Enter wallet address (0x...)"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        className="w-full px-4 py-2 border rounded shadow-sm"
      />

      {wallet && (
        <div className="mt-8">
          <StatusFeed wallet={wallet} />
        </div>
      )}
    </div>
  )
}