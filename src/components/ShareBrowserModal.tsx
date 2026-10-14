import React, { useState } from 'react';
import { 
  X, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  Smartphone, 
  Monitor, 
  Download,
  Bookmark,
  Share2
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ShareBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ShareBrowserModal: React.FC<ShareBrowserModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const { isInstallable, install } = usePWAInstall();

  if (!isOpen) return null;

  // Live working development URL
  const devUrl = 'https://ais-dev-4gynwrs4ytjuissz3skvkn-55818486065.asia-southeast1.run.app';
  const preUrl = 'https://ais-pre-4gynwrs4ytjuissz3skvkn-55818486065.asia-southeast1.run.app';

  const activeUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : devUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    onShowToast('Đã sao chép liên kết trang web đang hoạt động!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstallApp = async () => {
    const success = await install();
    if (success) {
      onShowToast('Đang cài đặt ứng dụng vào máy...', 'success');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sử dụng trực tiếp trên trình duyệt
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mở link trên thanh tìm kiếm của Chrome, Safari, Edge hoặc điện thoại
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Website Address Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              Địa chỉ trang web của bạn:
            </label>
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
              <input
                type="text"
                readOnly
                value={activeUrl}
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none select-all truncate px-2"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Mở tab mới"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Download Source Code for VS Code */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Tải mã nguồn để chạy trong VS Code (.zip)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đã bao gồm đầy đủ file dự án, file cấu hình và hướng dẫn README.md
              </p>
            </div>
            <a
              href="/project-notes-app.zip"
              download="project-notes-app.zip"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải ZIP</span>
            </a>
          </div>

          {/* Quick Install PWA (if supported) */}
          {isInstallable && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Cài đặt như ứng dụng máy tính / điện thoại
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chạy riêng biệt trên màn hình chính, không cần thanh URL trình duyệt
                </p>
              </div>
              <button
                type="button"
                onClick={handleInstallApp}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài đặt ngay</span>
              </button>
            </div>
          )}

          {/* Step by step guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Hướng dẫn mở và lưu lại để dùng hàng ngày
            </h4>

            {/* Desktop Guide */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Monitor className="w-4 h-4 text-indigo-500" />
                <span>1. Trên máy tính (Chrome, Edge, Cốc Cốc, Safari):</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
                <li>Dán đường link ở trên vào <strong>thanh địa chỉ</strong> của trình duyệt và nhấn <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px]">Enter</kbd>.</li>
                <li>Nhấn phím <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px]">Ctrl + D</kbd> (hoặc hình ngôi sao <Bookmark className="w-3 h-3 inline text-amber-500" />) để đánh dấu trang (Bookmark).</li>
                <li>Bạn cũng có thể bấm biểu tượng cài đặt (⬇️) trên thanh địa chỉ để đưa icon ra màn hình Desktop.</li>
              </ul>
            </div>

            {/* Mobile Guide */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span>2. Trên điện thoại (iPhone, iPad, Android):</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
                <li>Gửi hoặc gõ link vào trình duyệt Safari (iOS) hoặc Chrome (Android).</li>
                <li>Bấm nút <strong>Chia sẻ (Share <Share2 className="w-3 h-3 inline" />)</strong> ở cuối trình duyệt.</li>
                <li>Chọn <strong>&ldquo;Thêm vào Màn hình chính&rdquo; (Add to Home Screen)</strong> để tạo ứng dụng mở toàn màn hình tiện lợi!</li>
              </ul>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Dữ liệu ghi chú tự động lưu trên máy của bạn
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl"
          >
            Đã hiểu
          </button>
        </div>

      </div>
    </div>
  );
};
