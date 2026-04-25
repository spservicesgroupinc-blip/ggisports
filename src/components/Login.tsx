import React, { useState } from 'react';
import { gasAuth } from '../services/gasService';
import { Bike } from 'lucide-react';

interface LoginProps {
  onLogin: (role?: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let role = 'user';
      if (isRegistering) {
        const res = await gasAuth.register(fullName, password);
        role = res.role;
      } else {
        const res = await gasAuth.login(fullName, password);
        role = res.role;
      }
      onLogin(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 selection:bg-cyan-900 selection:text-white">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-900/20">
            <Bike className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GGI Youth Sports</h1>
          <p className="text-neutral-500 mt-2 text-sm uppercase tracking-widest font-semibold">Sports Event Management</p>
          <p className="text-cyan-600 mt-1 text-xs uppercase tracking-widest font-semibold">Building Leadership Today</p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-xl text-white font-medium mb-6">
            {isRegistering ? 'Create your account' : 'Sign in to your account'}
          </h2>

          {error && (
            <div className="bg-red-950/50 border border-red-900/50 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Full Name (Username)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                isRegistering ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm text-neutral-400 hover:text-cyan-400 transition-colors"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
