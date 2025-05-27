'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import Auth from '@/components/Auth'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [kycLevel, setKycLevel] = useState<number | null>(null)

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
        }
      }
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
            } else {
              console.error('KYC fetch error:', error)
            }
          })
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      {!user ? (
        <Auth />
      ) : (
        <>
          <p className="text-lg font-semibold">Welcome!</p>
          {kycLevel !== null && (
            <p className="mt-2 text-sm text-gray-600">
              Your current tier: <strong>Tier {kycLevel}</strong>
            </p>
          )}
        </>
      )}
    </main>
  )
}
