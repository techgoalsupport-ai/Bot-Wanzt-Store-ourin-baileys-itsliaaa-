import React, { useState, type FormEvent } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Bot, Building2, ExternalLink } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Silakan masukkan username dan password Anda.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await onLogin(username, password);
      if (!res.success) {
        setError(res.error || 'Username atau password salah.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 antialiased selection:bg-sky-500/20">
      <div className="w-full max-w-sm">
        {/* Header Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 mb-3 shadow-2xs">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Bot Dashboard Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Masuk untuk mengelola bot WhatsApp & transaksi toko
          </p>
        </div>

        {/* Card Form Login */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Input Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative flex items-center rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white shadow-2xs overflow-hidden">
                <div className="pl-3 pr-2 text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  disabled={loading}
                  className="w-full py-2.5 pr-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/20 transition-all bg-white shadow-2xs overflow-hidden">
                <div className="pl-3 pr-2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  disabled={loading}
                  className="w-full py-2.5 pr-9 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition cursor-pointer"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Tombol Login */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Keamanan Footer Card */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Koneksi aman dengan enkripsi server PBKDF2</span>
          </div>
        </div>

        {/* Akses Portal Master Admin */}
        <div className="mt-4">
          <a
            href="/admin/"
            className="w-full inline-flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-white hover:bg-sky-50/60 text-slate-700 hover:text-sky-600 border border-slate-200/90 hover:border-sky-200 shadow-2xs transition-all cursor-pointer group text-xs font-semibold"
            title="Buka Portal Apartemen / Master Admin"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span>Masuk ke Dashboard Master Admin</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </a>
        </div>

        {/* Informasi Bantuan */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Akun dashboard diberikan saat pembelian script bot.
        </p>
      </div>
    </div>
  );
};
