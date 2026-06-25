import React, { useState } from 'react';
import { supabase, credentials, SUPABASE_SQL_SETUP } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';
import { safeLocalStorage } from '../lib/security';
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
  const [supabaseUrl, setSupabaseUrl] = useState(safeLocalStorage.getItem('PROPS_SUPABASE_URL') || '');
  const [supabaseKey, setSupabaseKey] = useState(safeLocalStorage.getItem('PROPS_SUPABASE_ANON_KEY') || '');
  const [isConfigured, setIsConfigured] = useState(credentials.isConfigured);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Auth state
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
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

    safeLocalStorage.setItem('PROPS_SUPABASE_URL', cleanedUrl);
    safeLocalStorage.setItem('PROPS_SUPABASE_ANON_KEY', cleanedKey);
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

    if (isRegistering) {
      const cleanEmail = regEmail.trim();
      const cleanUsername = regUsername.trim();

      if (!cleanEmail) {
        setError('Please enter a Gmail address.');
        return;
      }

      if (!cleanEmail.toLowerCase().endsWith('@gmail.com')) {
        setError('Only Gmail accounts (ending in @gmail.com) are allowed for registration.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setError('Please enter a valid email address.');
        return;
      }

      if (!cleanUsername) {
        setError('Please enter a username.');
        return;
      }

      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(cleanUsername)) {
        setError('Username must be 3-20 characters long and contain only letters, numbers, underscores, or hyphens.');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);

      try {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              display_name: cleanUsername
            }
          }
        });

        if (signUpErr) throw signUpErr;

        if (data.user) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            onAuthSuccess(data.user.id, cleanUsername);
          } else {
            setError(
              'User signed up successfully! However, Email Confirmation is enabled on your Supabase Project. Please check your inbox OR disable "Confirm Email" on your Supabase Dashboard under Auth -> Providers -> Email.'
            );
          }
        } else {
          setError('Verification required or registration returned incomplete data.');
        }
      } catch (err: any) {
        console.error('Supabase Auth Error:', err);
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
    } else {
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

      setLoading(true);

      const virtualEmail = cleanUsername.includes('@') 
        ? cleanUsername 
        : `${cleanUsername.toLowerCase()}@propertymanager.com`;

      try {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password: password
        });

        if (signInErr) throw signInErr;

        if (data.user) {
          onAuthSuccess(data.user.id, data.user.user_metadata?.display_name || (cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername));
        }
      } catch (err: any) {
        console.error('Supabase Auth Error:', err);
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-950 to-teal-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 select-none relative overflow-auto font-sans">
      {/* Decorative ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20, 184, 166,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute right-12 top-12 opacity-5 pointer-events-none">
        <Sparkles className="w-64 h-64 text-teal-400" />
      </div>
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden relative z-10 p-6 sm:p-8 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-2xl mb-3 shadow-sm border border-teal-100/50">
            <Building className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">Landlord Desk</h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Smart Property & Tenant Management Suite</p>
        </div>

        {/* Action interactive panel */}
        <div>
          {!isConfigured ? (
            /* CONNECTION FORM */
            <form onSubmit={saveConfiguration} className="space-y-4">
              <div className="text-center pb-2 border-b border-zinc-50">
                <h2 className="text-sm font-bold text-zinc-800 tracking-tight">Configure Cloud Connection</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Please provide your Supabase configurations to tie your portfolio data to the cloud.</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl flex flex-col gap-2 text-xs font-semibold leading-relaxed animate-in fade-in">
                  <div className="flex gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600 mt-0.5" />
                    <div>{error}</div>
                  </div>
                  <button
                    type="button"
                    onClick={loginAsSandbox}
                    className="mt-0.5 self-start bg-white hover:bg-red-100 text-red-900 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-red-200 transition-all"
                  >
                    ⚡ Bypass: Continue with Local Demo
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Supabase Project URL</label>
                  <div className="relative">
                    <Database className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="url"
                      required
                      placeholder="https://your-project-ref.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-zinc-50 text-zinc-800 font-mono transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Anon / Public API Key</label>
                  <div className="relative">
                    <FolderLock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-zinc-50 text-zinc-800 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-600"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  Save & Connect Database
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-100"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">OR bypass</span>
                  <div className="flex-grow border-t border-zinc-100"></div>
                </div>

                <button
                  type="button"
                  onClick={loginAsSandbox}
                  className="w-full bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                >
                  🚀 Instant Local Demo Sandbox (No Database)
                </button>
              </div>
            </form>
          ) : (
            /* AUTH FORM */
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="text-center pb-2">
                <h2 className="text-sm font-bold text-zinc-800 tracking-tight">
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {isRegistering ? 'Register credentials to access your properties.' : 'Access your landlord workspace.'}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl flex flex-col gap-1.5 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <div>{error}</div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {isRegistering ? (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Gmail Address (must end in @gmail.com) *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                          type="email"
                          required
                          placeholder="yourname@gmail.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-zinc-50 text-zinc-850 font-medium transition-all"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Username *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. landlord_one"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-zinc-50 text-zinc-850 font-medium transition-all"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Username or Email Address</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. landlord_one"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-zinc-50 text-zinc-850 font-medium transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-zinc-50 text-zinc-850 font-medium transition-all"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegistering && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Confirm Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm password exactly"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 text-xs border border-zinc-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-zinc-50 text-zinc-850 font-medium transition-all"
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
                  className="w-full bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Authenticating...' : (
                    <>
                      {isRegistering ? 'Register Account' : 'Sign In Now'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-100"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">OR bypass</span>
                  <div className="flex-grow border-t border-zinc-100"></div>
                </div>

                <button
                  type="button"
                  onClick={loginAsSandbox}
                  className="w-full bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🚀 Instant Local Demo Sandbox (No Database)
                </button>
              </div>

              <div className="pt-2 text-center text-xs">
                <span className="text-zinc-500">
                  {isRegistering ? 'Already registered?' : 'New to this portal?'}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                  }}
                  className="text-teal-600 font-bold hover:underline cursor-pointer"
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
