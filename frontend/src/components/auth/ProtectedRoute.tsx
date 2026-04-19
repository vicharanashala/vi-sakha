import { Navigate } from 'react-router-dom'
import { getToken, getUser } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If provided, only these roles can access the route. Others are redirected to /login. */
  roles?: Array<'student' | 'lab_member' | 'admin'>
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = getToken()
  const user = getUser()

  // No token → send to login
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  // Role restriction — redirect unauthorized roles back to their own dashboard
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'student') return <Navigate to="/dashboard" replace />
    return <Navigate to="/labmember" replace />
  }

  return <>{children}</>
}
