import React, { useState, useRef } from 'react';
import { aiPost } from '../utils/aiApi';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Check, 
  FileText, 
  RefreshCw,
  Plus
} from 'lucide-react';

interface ImageOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsNote: (noteData: { title: string; content: string; tags: string[] }) => void;
}

export const ImageOcrModal: React.FC<ImageOcrModalProps> = ({
  isOpen,
  onClose,
  onSaveAsNote,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    title: string;
    content: string;
    tags: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)');
      return;
    }

    setMimeType(file.type);
    setError(null);
    setExtractedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await aiPost('/api/ai/analyze-image', { imageBase64: selectedImage, mimeType });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi phân tích hình ảnh');
      }

      setExtractedData({
        title: data.title || 'Ghi chú từ hình ảnh',
        content: data.content || '',
        tags: Array.isArray(data.tags) ? data.tags : ['Hình ảnh'],
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể quét chữ từ hình ảnh');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyNote = () => {
    if (!extractedData) return;
    onSaveAsNote(extractedData);
    onClose();
  };

  const handleReset = () => {
    setSelectedImage(null);
    setExtractedData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quét & trích xuất ghi chú từ hình ảnh
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chuyển chữ viết tay, tài liệu, sách báo, hóa đơn thành ghi chú bằng Gemini AI
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {!selectedImage ? (
            /* Upload box */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-850/40 space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Nhấp để tải ảnh lên hoặc kéo thả vào đây
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Hỗ trợ định dạng JPG, PNG, WebP (chữ viết tay, tài liệu in, bảng biểu...)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Image Preview & Results */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Hình ảnh đã chọn:</span>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Chọn ảnh khác</span>
                </button>
              </div>

              {/* Image thumbnail container */}
              <div className="relative max-h-52 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black/5 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Ảnh tài liệu tải lên"
                  referrerPolicy="no-referrer"
                  className="max-h-52 object-contain"
                />
              </div>

              {!extractedData && (
                <div className="text-center pt-2">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 mx-auto active:scale-95 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isAnalyzing ? 'Đang đọc và phân tích ảnh...' : 'Bắt đầu quét chữ bằng Gemini AI'}</span>
                  </button>
                </div>
              )}

              {/* Extracted Output */}
              {extractedData && (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Kết quả trích xuất thành công:</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500">Tiêu đề nhận diện:</label>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {extractedData.title}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500">Nội dung văn bản:</label>
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 max-h-40 overflow-y-auto whitespace-pre-line leading-relaxed font-normal">
                      {extractedData.content}
                    </div>
                  </div>

                  {extractedData.tags && extractedData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-slate-500 mr-1">Thẻ gợi ý:</span>
                      {extractedData.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Đóng
          </button>
          {extractedData && (
            <button
              onClick={handleApplyNote}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Lưu thành ghi chú mới</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
