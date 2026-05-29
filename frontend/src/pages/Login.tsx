import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import UniqueLoading from '@/components/ui/morph-loading'
import { Typewriter } from '@/components/ui/typewriter'
import { CohortDropdown } from '@/components/ui/cohort-dropdown'
import { setAuth } from '@/lib/auth'
import { auth, signInWithEmailAndPassword, signInWithPopup, googleProvider, signOut } from '@/lib/firebase'
import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { EyeBall, Pupil } from "@/components/ui/animated-characters-login-page"

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
  const [error, setError] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [mouseX, setMouseX] = useState<number>(0)
  const [mouseY, setMouseY] = useState<number>(0)
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
  const [isBlackBlinking, setIsBlackBlinking] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)

  const purpleRef = useRef<HTMLDivElement>(null)
  const blackRef = useRef<HTMLDivElement>(null)
  const yellowRef = useRef<HTMLDivElement>(null)
  const orangeRef = useRef<HTMLDivElement>(null)

  // Track mouse coordinates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX)
      setMouseY(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Purple character random blinking
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true)
        setTimeout(() => {
          setIsPurpleBlinking(false)
          scheduleBlink()
        }, 150)
      }, getRandomBlinkInterval())

      return blinkTimeout
    }

    const timeout = scheduleBlink()
    return () => clearTimeout(timeout)
  }, [])

  // Black character random blinking
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true)
        setTimeout(() => {
          setIsBlackBlinking(false)
          scheduleBlink()
        }, 150)
      }, getRandomBlinkInterval())

      return blinkTimeout
    }

    const timeout = scheduleBlink()
    return () => clearTimeout(timeout)
  }, [])

  // Characters look at each other briefly when starting typing
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true)
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false)
      }, 800)
      return () => clearTimeout(timer)
    } else {
      setIsLookingAtEachOther(false)
    }
  }, [isTyping])

  // Purple peek logic when password is typed and revealed
  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsPurplePeeking(true)
          setTimeout(() => {
            setIsPurplePeeking(false)
          }, 800)
        }, Math.random() * 3000 + 2000)
        return peekInterval
      }

      const firstPeek = schedulePeek()
      return () => clearTimeout(firstPeek)
    } else {
      setIsPurplePeeking(false)
    }
  }, [password, showPassword, isPurplePeeking])

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 3

    const deltaX = mouseX - centerX
    const deltaY = mouseY - centerY

    const faceX = Math.max(-15, Math.min(15, deltaX / 20))
    const faceY = Math.max(-10, Math.min(10, deltaY / 30))
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120))

    return { faceX, faceY, bodySkew }
  }

  const purplePos = calculatePosition(purpleRef)
  const blackPos = calculatePosition(blackRef)
  const yellowPos = calculatePosition(yellowRef)
  const orangePos = calculatePosition(orangeRef)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // 2. Check email verification
      if (!firebaseUser.emailVerified) {
        await signOut(auth)
        throw new Error('Please verify your email before logging in. Check your inbox for a verification link.')
      }

      // 3. Get ID Token and sync with Backend
      const idToken = await firebaseUser.getIdToken()
      const data = await api.auth.firebaseSync(idToken)

      // 4. Store JWT and user info
      setAuth(data.access_token, data.user)

      // Role-based redirect
      if (data.user.role === 'student') {
        navigate('/dashboard')
      } else {
        navigate('/labmember')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      let message = err.message || 'Login failed'
      if (err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password'
      } else if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email'
      }
      setError(message)
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      const data = await api.auth.firebaseSync(idToken)

      setAuth(data.access_token, data.user)
      if (data.user.role === 'student') {
        navigate('/dashboard')
      } else {
        navigate('/labmember')
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err)
      setError(err.message || 'Google sign-in failed')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-['Inter']">
        <UniqueLoading variant="morph" size="lg" className="mb-6" />
        <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">
          Signing in...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 font-['Inter'] overflow-hidden">
      {/* Left Content Section with Cartoon Characters */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/95 via-primary to-blue-700 p-12 text-primary-foreground">
        
        {/* Brand header */}
        <div className="relative z-20">
          <div className="flex items-center justify-between w-full">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 flex items-center justify-center border border-white/15">
                <span className="text-white font-extrabold text-base tracking-wider">VS</span>
              </div>
              <span className="font-bold text-white text-lg tracking-wide">Vi-Sakha</span>
            </Link>
            <a
              href="https://sudarshansudarshan.github.io/vinternship/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-white/90 border border-white/20 rounded-xl px-4 py-2 hover:bg-white/10 transition-all duration-200"
            >
              Join VInternship
            </a>
          </div>
        </div>

        {/* Animated Cartoon Characters Container */}
        <div className="relative z-20 flex items-end justify-center h-[460px]">
          <div className="relative" style={{ width: '550px', height: '400px' }}>
            {/* Purple tall rectangle character - Back layer */}
            <div 
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '70px',
                width: '180px',
                height: (isTyping || (password.length > 0 && !showPassword)) ? '440px' : '400px',
                backgroundColor: '#6C3FF5',
                borderRadius: '10px 10px 0 0',
                zIndex: 1,
                transform: (password.length > 0 && showPassword)
                  ? `skewX(0deg)`
                  : (isTyping || (password.length > 0 && !showPassword))
                    ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)` 
                    : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eyes */}
              <div 
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${20}px` : isLookingAtEachOther ? `${55}px` : `${45 + purplePos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? `${35}px` : isLookingAtEachOther ? `${65}px` : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall 
                  size={18} 
                  pupilSize={7} 
                  maxDistance={5} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
                <EyeBall 
                  size={18} 
                  pupilSize={7} 
                  maxDistance={5} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              </div>
            </div>

            {/* Black tall rectangle character - Middle layer */}
            <div 
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '240px',
                width: '120px',
                height: '310px',
                backgroundColor: '#2D2D2D',
                borderRadius: '8px 8px 0 0',
                zIndex: 2,
                transform: (password.length > 0 && showPassword)
                  ? `skewX(0deg)`
                  : isLookingAtEachOther
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : (isTyping || (password.length > 0 && !showPassword))
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)` 
                      : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eyes */}
              <div 
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${10}px` : isLookingAtEachOther ? `${32}px` : `${26 + blackPos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? `${28}px` : isLookingAtEachOther ? `${12}px` : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall 
                  size={16} 
                  pupilSize={6} 
                  maxDistance={4} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
                <EyeBall 
                  size={16} 
                  pupilSize={6} 
                  maxDistance={4} 
                  eyeColor="white" 
                  pupilColor="#2D2D2D" 
                  isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              </div>
            </div>

            {/* Orange semi-circle character - Front left */}
            <div 
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '0px',
                width: '240px',
                height: '200px',
                zIndex: 3,
                backgroundColor: '#FF9B6B',
                borderRadius: '120px 120px 0 0',
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eyes - just pupils, no white */}
              <div 
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${50}px` : `${82 + (orangePos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${85}px` : `${90 + (orangePos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
            </div>

            {/* Yellow tall rectangle character - Front right */}
            <div 
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '310px',
                width: '140px',
                height: '230px',
                backgroundColor: '#E8D754',
                borderRadius: '70px 70px 0 0',
                zIndex: 4,
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${yellowPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              {/* Eyes - just pupils, no white */}
              <div 
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${20}px` : `${52 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${35}px` : `${40 + (yellowPos.faceY || 0)}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
              {/* Horizontal line for mouth */}
              <div 
                className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                style={{
                  left: (password.length > 0 && showPassword) ? `${10}px` : `${40 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? `${88}px` : `${88 + (yellowPos.faceY || 0)}px`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer info in left pane */}
        <div className="relative z-20 flex items-center gap-8 text-sm text-white/60">
          <a href="#" className="hover:text-white transition-colors duration-200">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-white transition-colors duration-200">
            Terms of Service
          </a>
          <a href="#" className="hover:text-white transition-colors duration-200">
            Contact Support
          </a>
        </div>

        {/* Decorative background grid and blurs */}
        <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:30px_30px]" />
        <div className="absolute top-1/4 right-1/4 size-72 bg-white/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-blue-600/25 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* Right Login Form Section */}
      <div className="flex flex-col min-h-screen bg-background">
        
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gray-900 rounded-lg px-2.5 py-1.5 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm tracking-wide">VS</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">Vi-Sakha</span>
          </Link>
          <a
            href="https://sudarshansudarshan.github.io/vinternship/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            Join VInternship
          </a>
        </div>

        {/* Main Form Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[420px] space-y-6">
            
            {/* Header with Typewriter effect */}
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                Welcome to{' '}
                <span className="block mt-1">
                  <Typewriter
                    words={['Vi-Sakha', 'VInternship', 'VLED Lab']}
                    speed={90}
                    delayBetweenWords={2500}
                    cursor={true}
                    cursorChar="|"
                    className="text-blue-600 text-3xl font-bold"
                  />
                </span>
              </h1>
              <p className="text-muted-foreground text-sm">Please enter your details to sign in</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="anna@gmail.com"
                  value={email}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  required
                  className="h-12 bg-background border-border/80 focus:border-primary rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-11 bg-background border-border/80 focus:border-primary rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={keepSignedIn} 
                    onCheckedChange={(checked) => setKeepSignedIn(!!checked)}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-medium text-gray-600 cursor-pointer select-none"
                  >
                    Keep me signed in
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700 hover:underline font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold rounded-xl mt-2 bg-gray-900 hover:bg-gray-800 text-white shadow-sm" 
                size="lg"
              >
                Log in
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">Or, sign in with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social Login */}
            <div>
              <Button 
                variant="outline" 
                onClick={handleGoogleSignIn}
                className="w-full h-12 bg-white text-gray-700 border-gray-200 hover:bg-gray-50 font-semibold rounded-xl flex items-center justify-center gap-3 shadow-sm hover:border-gray-300"
                type="button"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </Button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-600 font-bold hover:underline">
                Create one
              </Link>
            </div>

            {/* Cohort Selector */}
            <div className="flex items-center justify-center gap-3 bg-gray-50/50 py-3 rounded-2xl border border-gray-100/80">
              <span className="text-xs text-gray-500 font-bold">Cohort:</span>
              <CohortDropdown
                options={cohorts}
                selected={selectedCohort}
                onSelect={setSelectedCohort}
              />
            </div>

            {/* Mobile Footer */}
            <div className="lg:hidden text-center text-xs text-gray-400 pt-4">
              © {new Date().getFullYear()} VLED Lab, IIT Ropar
            </div>
          </div>
        </div>

        {/* Desktop Footer (Only on LG screens, positioned at the bottom of the form pane) */}
        <div className="hidden lg:block py-6 border-t border-border/20">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} VLED Lab, IIT Ropar
          </p>
        </div>
      </div>
    </div>
  )
}
