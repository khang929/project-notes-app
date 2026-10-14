import React from 'react';
import { 
  Sparkles, 
  Plus, 
  Sun, 
  Moon, 
  ScanLine, 
  Pin,
  Bot,
  Globe,
  User as UserIcon,
  Lock,
  LogOut,
  KeyRound,
  ChevronDown
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  theme: 'light' | 'dark';
  currentUser: User | null;
  onToggleTheme: () => void;
  onOpenCreateModal: () => void;
  onOpenOcrModal: () => void;
  onOpenShareModal: () => void;
  onOpenAuthModal: () => void;
  onLockSession: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  onToggleAiChat: () => void;
  isAiChatOpen: boolean;
  activeFilter: 'all' | 'pinned';
  onChangeFilter: (f: 'all' | 'pinned') => void;
  pinnedCount: number;
  totalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  currentUser,
  onToggleTheme,
  onOpenCreateModal,
  onOpenOcrModal,
  onOpenShareModal,
  onOpenAuthModal,
  onLockSession,
  onOpenChangePassword,
  onLogout,
  onToggleAiChat,
  isAiChatOpen,
  activeFilter,
  onChangeFilter,
  pinnedCount,
  totalCount,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-indigo-100" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            Ghi Chú Cá Nhân <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm ml-0.5">AI</span>
          </span>
        </div>

        {/* Zone 2: Navigation links / segmented controls */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
          <button
            onClick={() => onChangeFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeFilter === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ghi chú
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => onChangeFilter('pinned')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeFilter === 'pinned'
                ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Đã ghim
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {pinnedCount}
            </span>
          </button>
        </nav>

        {/* Zone 3: Actions + Primary Action Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* AI Chatbot Toggle */}
          <button
            onClick={onToggleAiChat}
            title="Mở Trợ lý AI Ghi Chú"
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border ${
              isAiChatOpen
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </button>

          {/* OCR Scan Image Note */}
          <button
            onClick={onOpenOcrModal}
            title="Quét chữ từ ảnh / OCR"
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5"
          >
            <ScanLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden lg:inline">Quét ảnh</span>
          </button>

          {/* Web Browser / Share Link */}
          <button
            onClick={onOpenShareModal}
            title="Xem địa chỉ trang web & hướng dẫn mở trên trình duyệt"
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5"
          >
            <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="hidden md:inline">Link web</span>
          </button>

          {/* Dark/Light mode toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Đổi chế độ sáng tối"
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Account & Security Menu */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                <div className={`w-6 h-6 rounded-lg ${currentUser.avatarColor || 'bg-indigo-600'} text-white flex items-center justify-center text-xs font-bold uppercase shadow-2xs`}>
                  {currentUser.name.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[100px] truncate">
                  {currentUser.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-fade-in text-xs">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        @{currentUser.username}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLockSession();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Khóa nhanh ứng dụng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Đổi mật khẩu</span>
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-colors font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1.5"
            >
              <UserIcon className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Primary Action Button: Create Note */}
          <button
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm ghi chú</span>
          </button>
        </div>

      </div>
    </header>
  );
};
