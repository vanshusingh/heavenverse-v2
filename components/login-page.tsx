"use client"

import { useState } from "react"
import { auth, googleProvider, firebaseAvailable } from "@/lib/firebase"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react"

interface LoginPageProps {
  onLoginSuccess: (email: string) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError(null)

    if (firebaseAvailable && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        if (userCredential.user) {
          onLoginSuccess(userCredential.user.email || email)
        }
      } catch (err: any) {
        console.error("Firebase Login Error:", err)
        setError(err.message || "Failed to log in. Please check your credentials.")
      } finally {
        setLoading(false)
      }
    } else {
      // Mock Fallback Authentication Mode
      setTimeout(() => {
        setLoading(false)
        if (password.length >= 6) {
          onLoginSuccess(email)
        } else {
          setError("Password must be at least 6 characters (Local Mock Mode).")
        }
      }, 1000)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    if (firebaseAvailable && auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider)
        if (result.user) {
          onLoginSuccess(result.user.email || "google-user@heavenverse.com")
        }
      } catch (err: any) {
        console.error("Firebase Google Auth Error:", err)
        setError(err.message || "Failed to authenticate with Google.")
      } finally {
        setLoading(false)
      }
    } else {
      // Mock Fallback
      setTimeout(() => {
        setLoading(false)
        onLoginSuccess("guest.google@heavenverse.com")
      }, 800)
    }
  }

  const handleSocialMockLogin = (provider: "apple" | "meta") => {
    setLoading(true)
    setError(null)
    setTimeout(() => {
      setLoading(false)
      onLoginSuccess(`guest.${provider}@heavenverse.com`)
    }, 800)
  }

  return (
    <div className="w-full max-w-[440px] bg-white/10 dark:bg-black/45 backdrop-blur-3xl border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] rounded-[32px] p-8 md:p-10 flex flex-col gap-6 transition-all duration-300 hover:border-white/30">
      
      {/* Title Header */}
      <div className="text-center">
        <h2 className="text-white text-3xl font-extrabold tracking-tight drop-shadow-sm">Welcome Back</h2>
        <p className="text-white/80 text-sm mt-2 font-medium tracking-wide">Please enter your details to sign in</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-xl font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/90 font-bold uppercase tracking-wider px-1">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              className="w-full bg-[#f8f6fc]/90 border-2 border-[#e8dff5] focus:border-[#a88beb] text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#a88beb]/20 transition-all font-sans font-medium"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/90 font-bold uppercase tracking-wider px-1">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-[#f8f6fc]/90 border-2 border-[#e8dff5] focus:border-[#a88beb] text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#a88beb]/20 transition-all font-sans font-medium"
              required
            />
          </div>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0a0f1d] hover:bg-[#121b33] disabled:bg-[#0a0f1d]/70 text-white font-bold text-xs py-4 rounded-xl mt-3 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-black/30 tracking-wider uppercase"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white/70" />
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 text-center my-1 select-none">
        <div className="h-[1px] bg-white/20 flex-1" />
        <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Or continue with</span>
        <div className="h-[1px] bg-white/20 flex-1" />
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center p-3 bg-white/10 border border-white/20 hover:bg-white/20 rounded-2xl transition-all cursor-pointer hover:border-white/30 active:scale-95 shadow-sm"
          title="Sign in with Google"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path
              fill="#EA4335"
              d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.98 1 12 1 7.35 1 3.37 3.68 1.46 7.58l3.79 2.94c.89-2.67 3.39-4.48 6.75-4.48z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.43-4.93 3.43-8.55z"
            />
            <path
              fill="#FBBC05"
              d="M5.25 14.52a6.974 6.974 0 0 1 0-4.04L1.46 7.54a11.96 11.96 0 0 0 0 8.92l3.79-2.94z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.34 1.1-4.26 1.1-3.36 0-5.86-1.81-6.75-4.48L1.46 16.48C3.37 20.32 7.35 23 12 23z"
            />
          </svg>
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={() => handleSocialMockLogin("apple")}
          disabled={loading}
          className="flex items-center justify-center p-3 bg-white/10 border border-white/20 hover:bg-white/20 rounded-2xl transition-all cursor-pointer hover:border-white/30 active:scale-95 shadow-sm"
          title="Sign in with Apple"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39" />
          </svg>
        </button>

        {/* Meta */}
        <button
          type="button"
          onClick={() => handleSocialMockLogin("meta")}
          disabled={loading}
          className="flex items-center justify-center p-3 bg-white/10 border border-white/20 hover:bg-white/20 rounded-2xl transition-all cursor-pointer hover:border-white/30 active:scale-95 shadow-sm"
          title="Sign in with Meta"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#0668E1]">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        </button>
      </div>

      {/* Forgot Password Link */}
      <div className="text-center mt-2">
        <button
          type="button"
          onClick={() => alert("Password reset option is not active in this demo.")}
          className="text-xs text-white/80 hover:text-white font-bold underline transition-colors cursor-pointer"
        >
          Forgot your password?
        </button>
      </div>
    </div>
  )
}
