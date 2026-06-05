import React, { useState } from 'react';
import { supabase, credentials, SUPABASE_SQL_SETUP } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';
import { 
  Building, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  Database,
  Terminal,
  Check,
  Copy,
  FolderLock
} from 'lucide-react';

interface LoginProps {
  onAuthSuccess: (uid: string, username: string) => void;
}

export function Login({ onAuthSuccess }: LoginProps) {
  const { loginAsSandbox } = useAppContext();
  // Config state
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('PROPS_SUPABASE_URL') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('PROPS_SUPABASE_ANON_KEY') || '');
  const [isConfigured, setIsConfigured] = useState(credentials.isConfigured);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Auth state
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const saveConfiguration = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedUrl = supabaseUrl.trim();
    const cleanedKey = supabaseKey.trim();

    if (!cleanedUrl || !cleanedKey) {
      setError('Please provide both Supabase URL and Anonymous/Public Key.');
      return;
    }

    localStorage.setItem('PROPS_SUPABASE_URL', cleanedUrl);
    localStorage.setItem('PROPS_SUPABASE_ANON_KEY', cleanedKey);
    setError(null);
    setIsConfigured(true);
    // Reload to ensure supabase client initializes with new variables
    window.location.reload();
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const validateUsername = (name: string) => {
    if (name.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name);
    }
    const regex = /^[a-zA-Z0-9_-]{3,20}$/;
    return regex.test(name);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please enter a username or email.');
      return;
    }

    if (!validateUsername(cleanUsername)) {
      setError(
        cleanUsername.includes('@')
          ? 'Please enter a valid email address.'
          : 'Username must be 3-20 characters long and contain only letters, numbers, underscores, or hyphens.'
      );
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    // Map username to standard email format, or use it directly if it looks like an email
    const virtualEmail = cleanUsername.includes('@') 
      ? cleanUsername 
      : `${cleanUsername.toLowerCase()}@propertymanager.com`;

    try {
      if (isRegistering) {
        // Sign up with Supabase Auth
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: virtualEmail,
          password: password,
          options: {
            data: {
              display_name: cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername
            }
          }
        });

        if (signUpErr) throw signUpErr;

        if (data.user) {
          // If auto-confirm is off they get a user object but it might not be confirmed. Let's see if session is available.
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            onAuthSuccess(data.user.id, cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername);
          } else {
            setError(
              'User signed up successfully! However, Email Confirmation is enabled on your Supabase Project. Please check your inbox OR disable "Confirm Email" on your Supabase Dashboard under Auth -> Providers -> Email.'
            );
          }
        } else {
          setError('Verification required or registration returned incomplete data.');
        }
      } else {
        // Sign in with Supabase Auth
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password: password
        });

        if (signInErr) throw signInErr;

        if (data.user) {
          onAuthSuccess(data.user.id, data.user.user_metadata?.display_name || (cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername));
        }
      }
    } catch (err: any) {
      console.error('Supabase Auth Error:', err);
      // Friendly messaging for common issues
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('database error')) {
        setError('Connection established successfully, but schema is missing. Click "Database Setup Schema" below to execute tables creation SQL in your Supabase Dashboard.');
      } else if (errMsg.toLowerCase().includes('invalid login')) {
        setError('Invalid username or password. Please try again.');
      } else if (errMsg.toLowerCase().includes('email not confirmed')) {
        setError('Email confirmation is enabled in your Supabase project. To login instantly, go to your Supabase Dashboard -> Auth -> Providers -> Email and turn off "Confirm email", or sign up with your real email address to trigger a confirmation.');
      } else if (errMsg.toLowerCase().includes('security purposes') || errMsg.toLowerCase().includes('after 55 seconds')) {
        setError('Supabase Auth Rate Limit: Please wait a moment before registering again, or disable "Confirm email" inside your Supabase Dashboard -> Auth -> Providers -> Email to bypass verification limits.');
      } else if (errMsg.toLowerCase().includes('email logins are disabled') || errMsg.toLowerCase().includes('email provider is disabled') || errMsg.toLowerCase().includes('email provider')) {
        setError('Email Auth provider is disabled in your Supabase project. Please go to your Supabase Dashboard -> Auth -> Providers -> Email, toggle "Enable Email Provider" to ON, and click Save.');
      } else {
        setError(errMsg || 'Failed to authenticate. Please check connection credentials and schema setup.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 select-none relative overflow-auto font-sans">
      {/* Decorative ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute right-12 top-12 opacity-5 pointer-events-none">
        <Sparkles className="w-64 h-64 text-indigo-400" />
      </div>
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 p-6 sm:p-8 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3 shadow-sm border border-indigo-100/50">
            <Building className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Landlord Desk</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Smart Property & Tenant Management Suite</p>
          
          {isConfigured && (
            <button
              type="button"
              onClick={() => {
                setIsConfigured(false);
                setError(null);
              }}
              title="Edit Connection Settings"
              className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Database className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action interactive panel */}
        <div>
          {!isConfigured ? (
            /* CONNECTION FORM */
            <form onSubmit={saveConfiguration} className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-50">
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">Configure Cloud Connection</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Please provide your Supabase configurations to tie your portfolio data to the cloud.</p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex flex-col gap-2 text-xs font-semibold leading-relaxed animate-in fade-in">
                  <div className="flex gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-650 mt-0.5" />
                    <div>{error}</div>
                  </div>
                  <button
                    type="button"
                    onClick={loginAsSandbox}
                    className="mt-0.5 self-start bg-white hover:bg-rose-100 text-rose-900 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-rose-200 transition-all"
                  >
                    ⚡ Bypass: Continue with Local Demo
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Supabase Project URL</label>
                  <div className="relative">
                    <Database className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      required
                      placeholder="https://your-project-ref.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800 font-mono transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Anon / Public API Key</label>
                  <div className="relative">
                    <FolderLock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  Save & Connect Database
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">OR bypass</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button
                  type="button"
                  onClick={loginAsSandbox}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  🚀 Instant Local Demo Sandbox (No Database)
                </button>
              </div>
            </form>
          ) : (
            /* AUTH FORM */
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="text-center pb-1">
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                  {isRegistering ? 'Register Portal Account' : 'Sign In'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isRegistering ? 'Create your landlord access master keys.' : 'Please access your landlord manager workspace.'}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl flex flex-col gap-1.5 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>{error}</div>
                  </div>
                  <button
                    type="button"
                    onClick={loginAsSandbox}
                    className="self-start bg-white hover:bg-rose-100 text-rose-900 px-2 py-1 rounded border border-rose-200 text-[10px] font-bold transition-all flex items-center gap-1"
                  >
                    ⚡ Bypass: Switch to Local Demo Mode
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Username or Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. landlord_one or email@example.com"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-850 font-medium transition-all"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-850 font-medium transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegistering && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Confirm Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm password exactly"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-850 font-medium transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-605 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Authenticating Cloud Keys...' : (
                    <>
                      {isRegistering ? 'Create New Workspace' : 'Sign In Now'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">OR bypass</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button
                  type="button"
                  onClick={loginAsSandbox}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-slate-300 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  🚀 Launch Instant local demo
                </button>
              </div>

              <div className="pt-2 text-center text-xs">
                <span className="text-slate-500">
                  {isRegistering ? 'Already registered?' : 'New to this portal?'}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                  }}
                  className="text-indigo-600 font-bold hover:underline"
                  disabled={loading}
                >
                  {isRegistering ? 'Login Instead' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
