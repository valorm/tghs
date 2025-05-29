'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { formatDate } from '@/utils/formatDate'

interface StatusFeedProps {
  wallet: string
}

export default function StatusFeed({ wallet }: StatusFeedProps) {
  const [mintRequests, setMintRequests] = useState<any[]>([])
  const [unlockRequests, setUnlockRequests] = useState<any[]>([])

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

  const fetchData = async () => {
    if (!wallet) return
    const [mint, unlock] = await Promise.all([
      supabase.from('mint_requests').select('*').eq('wallet', wallet).order('created_at', { ascending: false }),
      supabase.from('unlock_requests').select('*').eq('wallet', wallet).order('created_at', { ascending: false }),
    ])
    setMintRequests(mint.data || [])
    setUnlockRequests(unlock.data || [])
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [wallet])

  return (
    <div className="space-y-10">
      {/* Mint Requests */}
      {mintRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Mint Requests</h3>
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Tx</th>
              </tr>
            </thead>
            <tbody>
              {mintRequests.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.amount} tGHSX</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2 text-sm text-gray-600">{formatDate(r.created_at)}</td>
                  <td className="p-2">
                    {r.tx_hash ? (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${r.tx_hash}`}
                        className="text-blue-600 hover:underline text-sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Explorer
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
      )}

      {/* Unlock Requests */}
      {unlockRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Unlock Requests</h3>
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Asset</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Tx</th>
              </tr>
            </thead>
            <tbody>
              {unlockRequests.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.amount} GHS</td>
                  <td className="p-2">{r.asset}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2 text-sm text-gray-600">{formatDate(r.created_at)}</td>
                  <td className="p-2">
                    {r.tx_hash ? (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${r.tx_hash}`}
                        className="text-blue-600 hover:underline text-sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Explorer
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
      )}
    </div>
  )
}
