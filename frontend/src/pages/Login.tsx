import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import UniqueLoading from '@/components/ui/morph-loading'
import { Typewriter } from '@/components/ui/typewriter'
import { CohortDropdown } from '@/components/ui/cohort-dropdown'

const cohorts = [
  { id: 'euclideans', label: 'Euclideans', color: '#6366f1' },
  { id: 'dijkstrians', label: 'Dijkstrians', color: '#06b6d4' },
  { id: 'kruskalians', label: 'Kruskalians', color: '#10b981' },
  { id: 'aksians', label: 'AKSians', color: '#f59e0b' },
  { id: 'rsaians', label: 'RSAians', color: '#ef4444' },
]

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState('euclideans')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  const handleGoogleSignIn = () => {
    setIsLoading(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center">
        <UniqueLoading variant="morph" size="lg" className="mb-6" />
        <p className="text-gray-400 text-sm font-medium tracking-widest uppercase font-['Inter']">
          Signing in...
        </p>
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

      {/* Login Form */}
      <div className="flex-1 flex items-start justify-center px-4 pt-6 pb-24">
        <div className="w-full max-w-md">
          {/* Title with Typewriter effect on Vi-Sakha */}
          <h1 className="text-center mb-10">
            <span className="text-[2.5rem] font-bold text-gray-900 tracking-tight">
              Welcome to{' '}
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

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors mb-6 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400 font-medium">Or, sign in with your email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
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
                placeholder="password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              />
            </div>

            {/* Keep signed in + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Keep me signed in</span>
              </label>
              <button type="button" className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
                Forgot your password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
            >
              Sign in
            </button>
          </form>

          {/* Cohort selector — animated dropdown */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="text-sm text-gray-500 font-medium">Cohort:</span>
            <CohortDropdown
              options={cohorts}
              selected={selectedCohort}
              onSelect={setSelectedCohort}
            />
          </div>
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
