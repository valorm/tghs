'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { formatDate } from '@/utils/formatDate'
import StatusFeed from '@/components/StatusFeed'

export default function UnlockPage() {
  const [wallet, setWallet] = useState('')
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState('ETH')
  const [unlockRequests, setUnlockRequests] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const submitUnlock = async () => {
    setSubmitting(true)
    const { data, error } = await supabase.from('unlock_requests').insert([
      {
        wallet,
        amount: parseFloat(amount),
        asset,
      },
    ])
    if (error) {
      alert(`❌ Error: ${error.message}`)
    } else {
      alert('✅ Unlock request submitted!')
      setWallet('')
      setAmount('')
    }
    setSubmitting(false)
    fetchRequests()
  }

  const fetchRequests = async () => {
    if (!wallet) return
    const { data } = await supabase
      .from('unlock_requests')
      .select('*')
      .eq('wallet', wallet)
      .order('created_at', { ascending: false })
    setUnlockRequests(data || [])
  }

  useEffect(() => {
    if (wallet) fetchRequests()
  }, [wallet])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return ''
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-12">
      <h1 className="text-3xl font-bold">Request Unlock</h1>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <input
          type="text"
          placeholder="Your Wallet Address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          className="w-full border px-4 py-2 rounded"
        />
        <input
          type="number"
          placeholder="Amount (in GHS)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border px-4 py-2 rounded"
        />
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="w-full border px-4 py-2 rounded"
        >
          <option value="ETH">ETH</option>
          <option value="USDT">USDT</option>
        </select>
        <button
          onClick={submitUnlock}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded"
        >
          {submitting ? 'Submitting...' : 'Submit Unlock Request'}
        </button>

        {wallet && <StatusFeed wallet={wallet} />}
      </div>

      {/* Unlock History */}
      {unlockRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Your Unlock Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Asset</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {unlockRequests.map((request) => (
                  <tr key={request.id} className="border-b">
                    <td className="p-2 font-medium">{request.amount} GHS</td>
                    <td className="p-2">{request.asset}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="p-2">
                      {request.tx_hash ? (
                        <a
                          href={`https://amoy.polygonscan.com/tx/${request.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View on Explorer
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}