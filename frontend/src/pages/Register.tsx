import { useState } from 'react'
import { Link } from 'react-router-dom'
import UniqueLoading from '@/components/ui/morph-loading'
import { Typewriter } from '@/components/ui/typewriter'
import { auth, createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from '@/lib/firebase'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // 2. Set display name
      await updateProfile(userCredential.user, {
        displayName: name
      })

      // 3. Send verification email
      await sendEmailVerification(userCredential.user)

      // 4. Sign out immediately (force login after verification)
      await signOut(auth)

      setIsSuccess(true)
      setIsLoading(false)
    } catch (err: any) {
      console.error('Registration error:', err)
      let message = err.message || 'Registration failed'
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered'
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak'
      }
      setError(message)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center">
        <UniqueLoading variant="morph" size="lg" className="mb-6" />
        <p className="text-gray-400 text-sm font-medium tracking-widest uppercase font-['Inter']">
          Creating your account...
        </p>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-8">
            We've sent a verification link to <strong>{email}</strong>. 
            Please verify your email before signing in.
          </p>
          <Link
            to="/login"
            className="block w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-['Inter']">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-gray-900 rounded-lg px-2.5 py-1.5">
            <span className="text-white font-bold text-sm tracking-tight">VS</span>
          </div>
        </Link>
        <a
          href="https://sudarshansudarshan.github.io/vinternship/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100 transition-colors"
        >
          Join VInternship
        </a>
      </header>

      {/* Register Form */}
      <div className="flex-1 flex items-start justify-center px-4 pt-6 pb-24">
        <div className="w-full max-w-md">
          {/* Title */}
          <h1 className="text-center mb-2">
            <span className="text-[2.5rem] font-bold text-gray-900 tracking-tight">
              Join{' '}
              <Typewriter
                words={['Vi-Sakha', 'VInternship', 'VLED Lab']}
                speed={90}
                delayBetweenWords={2500}
                cursor={true}
                cursorChar="|"
                className="text-blue-600 text-[2rem] font-semibold"
              />
            </span>
          </h1>
          <p className="text-center text-gray-500 text-sm mb-10">
            Create a student account to get started
          </p>

          {/* Register Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                className={`w-full px-4 py-3 border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all bg-white ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                    : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!!confirmPassword && confirmPassword !== password}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
            >
              Create Account
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            New accounts are registered as students. Contact an admin to get lab member access.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6">
        <p className="text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} VLED Lab, IIT Ropar
        </p>
      </footer>
    </div>
  )
}
