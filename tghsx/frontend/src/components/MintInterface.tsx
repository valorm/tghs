'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'

interface MintRequest {
  id: string
  wallet: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  tx_hash?: string
  created_at: string
  error?: string
}

interface GHSPrice {
  price_usd: number
  updated_at: number
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export default function MintInterface() {
  const [wallet, setWallet] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [kycLevel, setKycLevel] = useState<number>(0)
  const [mintRequests, setMintRequests] = useState<MintRequest[]>([])
  const [ghsPrice, setGhsPrice] = useState<GHSPrice | null>(null)
  const [collateralInfo, setCollateralInfo] = useState<any>(null)

  // Get user session and KYC level
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user
      setUser(currentUser)

      if (currentUser) {
        const { data } = await supabase
          .from('users')
          .select('kyc_level')
          .eq('id', currentUser.id)
          .single()
        
        if (data) {
          setKycLevel(data.kyc_level || 0)
        }
      }
    }
    getUser()
  }, [])

  // Fetch GHS price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/ghs-price`)
        if (response.ok) {
          const data = await response.json()
          setGhsPrice(data)
        }
      } catch (error) {
        console.error('Failed to fetch GHS price:', error)
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Fetch user's mint requests
  useEffect(() => {
    if (wallet) {
      fetchMintRequests()
    }
  }, [wallet])

  const fetchMintRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('mint_requests')
        .select('*')
        .eq('wallet', wallet)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setMintRequests(data)
      }
    } catch (error) {
      console.error('Failed to fetch mint requests:', error)
    }
  }

  const checkCollateral = async () => {
    if (!wallet) return

    try {
      const response = await fetch(`${BACKEND_URL}/submit-mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet,
          amount: parseFloat(amount) || 1
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCollateralInfo({
          sufficient: true,
          collateral_ghs: data.collateral_ghs,
          required_ghs: parseFloat(amount) * 1.5
        })
      } else {
        const errorData = await response.json()
        setCollateralInfo({
          sufficient: false,
          error: errorData.detail
        })
      }
    } catch (error) {
      setCollateralInfo({
        sufficient: false,
        error: 'Failed to check collateral'
      })
    }
  }

  const handleMintRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setMessage('Please log in to mint tokens')
      return
    }

    if (!wallet || !amount) {
      setMessage('Please fill in all fields')
      return
    }

    const mintAmount = parseFloat(amount)
    const maxAmount = getMaxMintAmount()

    if (mintAmount > maxAmount) {
      setMessage(`Amount exceeds your KYC limit of ${maxAmount} tGHSX`)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // First check collateral
      const collateralResponse = await fetch(`${BACKEND_URL}/submit-mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet,
          amount: mintAmount
        })
      })

      if (!collateralResponse.ok) {
        const errorData = await collateralResponse.json()
        setMessage(`Collateral check failed: ${errorData.detail}`)
        setLoading(false)
        return
      }

      // If collateral is sufficient, create mint request
      const mintResponse = await fetch(`${BACKEND_URL}/mint-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: wallet,
          amount: mintAmount,
          kyc_level: kycLevel
        })
      })

      if (mintResponse.ok) {
        const data = await mintResponse.json()
        setMessage('Mint request submitted successfully! Processing will begin shortly.')
        setAmount('')
        setCollateralInfo(null)
        // Refresh mint requests
        setTimeout(fetchMintRequests, 1000)
      } else {
        const errorData = await mintResponse.json()
        setMessage(`Failed to submit mint request: ${errorData.detail}`)
      }
    } catch (error) {
      console.error('Mint request error:', error)
      setMessage('An error occurred while submitting the mint request')
    }

    setLoading(false)
  }

  const getMaxMintAmount = () => {
    // KYC limits
    const limits = {
      0: 0,     // No KYC
      1: 100,   // Basic KYC
      2: 1000,  // Enhanced KYC
      3: 10000  // Premium KYC
    }
    return limits[kycLevel as keyof typeof limits] || 0
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Mint tGHSX Tokens</h2>
        <p className="text-gray-600">Please log in to access the minting interface.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Mint tGHSX Tokens</h2>
        
        {/* Current Price Display */}
        {ghsPrice && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-blue-800">Current GHS Price</h3>
            <p className="text-2xl font-bold text-blue-600">${ghsPrice.price_usd.toFixed(4)} USD</p>
            <p className="text-sm text-blue-600">
              Updated: {new Date(ghsPrice.updated_at * 1000).toLocaleString()}
            </p>
          </div>
        )}

        {/* KYC Status */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-gray-800">Your KYC Status</h3>
          <p className="text-lg">
            <span className="font-bold">Tier {kycLevel}</span> - 
            Maximum mint: <span className="font-bold text-green-600">{getMaxMintAmount()} tGHSX</span>
          </p>
        </div>

        {/* Mint Form */}
        <form onSubmit={handleMintRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (tGHSX)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to mint"
              step="0.01"
              min="0.01"
              max={getMaxMintAmount()}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum: {getMaxMintAmount()} tGHSX (based on your KYC tier)
            </p>
          </div>

          {/* Collateral Check Button */}
          <button
            type="button"
            onClick={checkCollateral}
            disabled={!wallet || !amount}
            className="w-full bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check Collateral Requirements
          </button>

          {/* Collateral Info */}
          {collateralInfo && (
            <div className={`p-4 rounded-lg ${collateralInfo.sufficient ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {collateralInfo.sufficient ? (
                <div>
                  <h4 className="font-semibold text-green-800">✅ Collateral Sufficient</h4>
                  <p className="text-green-700">
                    Your collateral: <strong>{collateralInfo.collateral_ghs.toFixed(4)} GHS</strong>
                  </p>
                  <p className="text-green-700">
                    Required (150%): <strong>{collateralInfo.required_ghs.toFixed(4)} GHS</strong>
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold text-red-800">❌ Insufficient Collateral</h4>
                  <p className="text-red-700">{collateralInfo.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !collateralInfo?.sufficient}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Submitting Request...' : 'Submit Mint Request'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Mint Request History */}
      {mintRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Your Mint Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {mintRequests.map((request) => (
                  <tr key={request.id} className="border-b">
                    <td className="p-2 font-medium">{request.amount} tGHSX</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
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

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">How to Mint tGHSX</h3>
        <ol className="list-decimal list-inside space-y-2 text-yellow-700">
          <li>Ensure you have sufficient collateral (ETH or USDT) deposited in the vault</li>
          <li>Enter your wallet address and desired mint amount</li>
          <li>Check that your collateral meets the 150% requirement</li>
          <li>Submit the mint request - processing typically takes 1-2 minutes</li>
          <li>Once completed, the tGHSX tokens will appear in your wallet</li>
        </ol>
        <p className="mt-4 text-sm text-yellow-600">
          <strong>Note:</strong> Your KYC tier determines your maximum mint amount. 
          Higher tiers allow larger amounts and better rates.
        </p>
      </div>
    </div>
  )
}