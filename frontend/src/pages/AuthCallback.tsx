import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAuth } from '@/lib/auth'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userRaw = params.get('user')

    if (token && userRaw) {
      try {
        const user = JSON.parse(decodeURIComponent(userRaw))
        setAuth(token, user)
        const dest = user.role === 'student' ? '/dashboard' : '/labmember'
        navigate(dest, { replace: true })
      } catch {
        navigate('/login?error=invalid_callback', { replace: true })
      }
    } else {
      navigate('/login?error=oauth_failed', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--intercom-cream)' }}>
      <p className="text-gray-500 text-sm font-medium tracking-wide">Signing you in…</p>
    </div>
  )
}
