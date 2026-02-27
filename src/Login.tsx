import React, { useState } from 'react'
import { signUp, signIn, signInAnonymously, signInWithGoogle } from './firebase'

type LoginProps = {
  onLoginSuccess: (userId: string, email: string) => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSigningUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      onLoginSuccess(email, email)
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)

    try {
      const user = await signInWithGoogle()
      const userName = user.displayName || user.email || `Guest-${user.uid.slice(0, 8)}`
      onLoginSuccess(userName, user.email || user.uid)
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  async function handleAnonymousLogin() {
    setError('')
    setLoading(true)

    try {
      await signInAnonymously()
      const anonymousName = `Guest-${Math.floor(Math.random() * 10000)}`
      onLoginSuccess(anonymousName, anonymousName)
    } catch (err: any) {
      setError(err.message || 'Failed to sign in anonymously')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Shopping List</h1>
        <p className="login-subtitle">Organize your purchases with ease</p>

        <form onSubmit={handleEmailAuth} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Loading...' : isSigningUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">or</div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn btn-google"
        >
          {loading ? 'Loading...' : '🔵 Sign in with Google'}
        </button>

        <div className="login-divider">or</div>

        <button
          onClick={handleAnonymousLogin}
          disabled={loading}
          className="btn btn-secondary"
        >
          {loading ? 'Loading...' : 'Continue as Guest'}
        </button>

        <div className="login-toggle">
          {isSigningUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsSigningUp(!isSigningUp)
              setError('')
            }}
            className="toggle-link"
            disabled={loading}
          >
            {isSigningUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}
