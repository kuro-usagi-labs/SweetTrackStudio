import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Video, Mail, Lock, Loader2 } from 'lucide-react';
import { useDialog } from '../components/DialogContext';
import { useAuth } from '../components/AuthProvider';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useDialog();
  const { bypassAuth } = useAuth();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showToast("Registration successful! You can now log in.", "success");
        setIsLogin(true);
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shadow-lg mb-4">
            <Video size={24} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">SweetTrack Studio</h1>
          <p className="text-sm text-ink-500 mt-1 font-medium">Your YouTube Productivity Dashboard</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10 bg-gray-50 border-gray-200 w-full" 
                placeholder="creator@youtube.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 bg-gray-50 border-gray-200 w-full" 
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary bg-ink-900 hover:bg-ink-500 py-3 shadow-md flex justify-center items-center mt-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

          {window.electron && (
            <button 
              type="button" 
              onClick={bypassAuth}
              className="w-full btn-secondary py-3 flex justify-center items-center mt-2 border-gray-200 text-ink-700 hover:bg-gray-50"
            >
              <span>Use Offline Mode (Local SQLite)</span>
            </button>
          )}
        </form>



        <div className="mt-8 text-center">
          <p className="text-sm text-ink-500 font-medium">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="ml-2 text-ink-900 font-bold hover:underline focus:outline-none"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
