'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import Auth from '@/components/Auth'
import MintInterface from '@/components/MintInterface'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [kycLevel, setKycLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mint' | 'profile'>('mint')

  useEffect(() => {
    const getSessionAndKYC = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user
      setUser(currentUser)

      if (currentUser) {
        const { data, error } = await supabase
          .from('users')
          .select('kyc_level')
          .eq('id', currentUser.id)
          .single()

        if (!error && data) {
          setKycLevel(data.kyc_level)
        } else {
          console.error('KYC fetch error:', error)
          // If user doesn't exist in users table, create entry
          if (error?.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('users')
              .insert([
                { id: currentUser.id, kyc_level: 0, email: currentUser.email }
              ])
            
            if (!insertError) {
              setKycLevel(0)
            }
          }
        }
      }
      setLoading(false)
    }

    getSessionAndKYC()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      setUser(user)
      if (user) {
        supabase
          .from('users')
          .select('kyc_level')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setKycLevel(data.kyc_level)
            } else if (error?.code === 'PGRST116') {
              // Create user entry if doesn't exist
              supabase
                .from('users')
                .insert([{ id: user.id, kyc_level: 0, email: user.email }])
                .then(() => setKycLevel(0))
            }
          })
      } else {
        setKycLevel(null)
      }
      setLoading(false)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                tGHSX Token Platform
              </h1>
              <p className="text-xl text-gray-600">
                Mint tokenized Ghana Cedi backed by crypto collateral
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">🏦</div>
                <h3 className="text-lg font-semibold mb-2">Collateral-Backed</h3>
                <p className="text-gray-600">
                  Mint tGHSX tokens backed by ETH and USDT collateral with 150% collateralization ratio
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">🔒</div>
                <h3 className="text-lg font-semibold mb-2">KYC Tiers</h3>
                <p className="text-gray-600">
                  Multiple KYC levels with increasing mint limits and better rates
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold mb-2">Fast Processing</h3>
                <p className="text-gray-600">
                  Automated minting process with real-time collateral verification
                </p>
              </div>
            </div>

            {/* Auth Component */}
            <div className="flex justify-center">
              <Auth />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">tGHSX Platform</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
            <button
              onClick={() => setActiveTab('mint')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'mint'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mint Tokens
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Profile & KYC
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'mint' && <MintInterface />}
          
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Profile & KYC Status</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-lg text-gray-900">{user.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current KYC Tier</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-lg font-medium bg-blue-100 text-blue-800">
                      Tier {kycLevel}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Mint Limits</label>
                  <div className="mt-1 text-lg text-gray-900">
                    {kycLevel === 0 && "0 tGHSX (No KYC completed)"}
                    {kycLevel === 1 && "100 tGHSX (Basic KYC)"}
                    {kycLevel === 2 && "1,000 tGHSX (Enhanced KYC)"}
                    {kycLevel === 3 && "10,000 tGHSX (Premium KYC)"}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">KYC Upgrade</h3>
                  <p className="text-yellow-700 mb-3">
                    To increase your mint limits, please contact support to upgrade your KYC tier.
                  </p>
                  <div className="text-sm text-yellow-600">
                    <p><strong>Tier 1 (Basic):</strong> Email verification + basic info</p>
                    <p><strong>Tier 2 (Enhanced):</strong> ID verification + proof of address</p>
                    <p><strong>Tier 3 (Premium):</strong> Enhanced due diligence + video call</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}