import { createContext, useContext, useEffect, useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { getUserByEmail } from '../api/userSetup.api'
import type { KhajaUserSetup } from '../types/khaja'

interface UserContextValue {
  khajaUser: KhajaUserSetup | null
  loading: boolean
}

const UserContext = createContext<UserContextValue>({ khajaUser: null, loading: true })

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { accounts } = useMsal()
  const [khajaUser, setKhajaUser] = useState<KhajaUserSetup | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // accounts[0].username is the UPN — same as their Dogma Group email
    const email = accounts[0]?.username
    if (!email) {
      setLoading(false)
      return
    }

    setLoading(true)
    getUserByEmail(email)
      .then((user) => setKhajaUser(user ?? null))
      .catch(() => setKhajaUser(null))
      .finally(() => setLoading(false))
  }, [accounts])

  return (
    <UserContext.Provider value={{ khajaUser, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useKhajaUser() {
  return useContext(UserContext)
}
