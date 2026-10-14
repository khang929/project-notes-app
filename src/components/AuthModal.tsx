import React, { useState } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  LogOut,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User } from '../types';
import { loginUser, registerUser } from '../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register' | 'lock';
  currentUser: User | null;
  onSuccess: (user: User) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  currentUser,
  onSuccess,
  onSwitchMode,
  onLogout,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'lock') {
        if (!currentUser) throw new Error('Không tìm thấy phiên đăng nhập!');
        const user = await loginUser(currentUser.username, password);
        onSuccess(user);
      } else if (mode === 'login') {
        if (!username.trim() || !password) {
          throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu!');
        }
        const user = await loginUser(username.trim(), password);
        onSuccess(user);
      } else if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Vui lòng nhập họ và tên của bạn!');
        if (!username.trim() || username.trim().length < 3) {
          throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự!');
        }
        if (!password || password.length < 6) {
          throw new Error('Mật khẩu phải có độ dài tối thiểu 6 ký tự!');
        }
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp!');
        }
        const user = await registerUser(fullName, username, password);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginUser('demo', 'password123');
      onSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Không thể đăng nhập tài khoản demo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            {mode === 'lock' ? (
              <Lock className="w-7 h-7 text-amber-500 animate-pulse" />
            ) : mode === 'register' ? (
              <UserIcon className="w-7 h-7" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {mode === 'lock'
              ? 'Khóa bảo mật ứng dụng'
              : mode === 'register'
              ? 'Tạo tài khoản cá nhân'
              : 'Đăng nhập bảo mật'}
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'lock'
              ? `Chào mừng trở lại, ${currentUser?.name || 'bạn'}. Nhập mật khẩu để tiếp tục.`
              : mode === 'register'
              ? 'Bảo vệ toàn bộ ghi chú của bạn bằng mật khẩu riêng tư'
              : 'Đăng nhập để xem và quản lý các ghi chú riêng tư của bạn'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Register: Full Name */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Họ và tên
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Username (Not in lock mode) */}
          {mode !== 'lock' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tên đăng nhập
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nhập tên đăng nhập..."
                  autoCapitalize="none"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {mode === 'lock' ? 'Mật khẩu tài khoản' : 'Mật khẩu'}
              </label>
              {mode === 'register' && (
                <span className="text-[11px] text-slate-400">Tối thiểu 6 ký tự</span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                autoFocus={mode === 'lock'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Register: Confirm Password */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Xác nhận mật khẩu
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {mode === 'lock' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Đang mở khóa...' : 'Mở khóa ứng dụng'}</span>
              </>
            ) : mode === 'register' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Đang tạo...' : 'Đăng ký tài khoản'}</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}</span>
              </>
            )}
          </button>

        </form>

        {/* Demo Fast Login (Only in login mode) */}
        {mode === 'login' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Đăng nhập nhanh tài khoản mẫu (demo / password123)</span>
            </button>
          </div>
        )}

        {/* Switch Between Modes */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          {mode === 'lock' ? (
            <button
              type="button"
              onClick={onLogout}
              className="text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất hoặc chuyển tài khoản khác</span>
            </button>
          ) : mode === 'login' ? (
            <p>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onSwitchMode('register');
                }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onSwitchMode('login');
                }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
