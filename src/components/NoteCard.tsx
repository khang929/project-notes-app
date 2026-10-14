import React, { useState } from 'react';
import { 
  Pin, 
  Pencil, 
  Trash2, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  Calendar,
  Share2,
  Download
} from 'lucide-react';
import { Note } from '../types';
import { COLOR_SCHEMES, formatVietnameseDate } from '../utils/format';

interface NoteCardProps {
  note: Note;
  viewMode: 'grid' | 'list';
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onUpdateSummary: (id: string, summary: string) => void;
  onFilterByTag?: (tag: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onEdit,
  onDelete,
  onTogglePin,
  onUpdateSummary,
  onFilterByTag,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(Boolean(note.summary));
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const colorScheme = COLOR_SCHEMES[note.color || 'default'];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const element = document.createElement('a');
    const file = new Blob([`${note.title || 'Không tiêu đề'}\n\n${note.content || ''}`], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${(note.title || 'ghi_chu').replace(/[/\\?%*:|"<>]/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.summary) {
      setShowSummary(!showSummary);
      return;
    }

    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: note.title,
          content: note.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi tạo tóm tắt');
      }
      onUpdateSummary(note.id, data.summary);
      setShowSummary(true);
    } catch (err: any) {
      console.error(err);
      setSummaryError(err.message || 'Không thể tóm tắt');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Strip markdown headers/checkboxes for preview snippet
  const cleanPreview = note.content
    ? note.content
        .replace(/^#+\s+/gm, '')
        .replace(/^- \[[ x]\]\s+/gm, '• ')
        .replace(/^- \s+/gm, '• ')
        .trim()
    : 'Không có nội dung.';

  return (
    <article
      onClick={() => onEdit(note)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
        colorScheme.bgLight
      } ${colorScheme.bgDark} ${colorScheme.borderLight} ${colorScheme.borderDark} ${
        note.isPinned ? 'ring-1 ring-amber-400/50 dark:ring-amber-500/30 shadow-xs' : 'shadow-xs hover:shadow-md hover:-translate-y-0.5'
      } ${viewMode === 'list' ? 'p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4' : 'p-5 flex flex-col justify-between min-h-[220px]'}`}
    >
      {/* Top / Main Body */}
      <div className={`space-y-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
        
        {/* Header row: Pin & Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
              {note.title || 'Ghi chú không tiêu đề'}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Pin Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note.id);
              }}
              title={note.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
              className={`p-1.5 rounded-lg transition-colors ${
                note.isPinned
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 opacity-60 group-hover:opacity-100'
              }`}
            >
              <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Snippet */}
        <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line ${
          viewMode === 'list' ? 'line-clamp-2' : 'line-clamp-4'
        }`}>
          {cleanPreview}
        </p>

        {/* AI Summary Banner (if generated & expanded) */}
        {showSummary && note.summary && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300"
          >
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Tóm tắt AI:
              </span>
              <button
                onClick={() => setShowSummary(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Thu gọn tóm tắt"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
              {note.summary}
            </p>
          </div>
        )}

        {summaryError && (
          <div className="p-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
            {summaryError}
          </div>
        )}

        {/* Tags with clean unboxed metadata or subtle chips */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {note.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onFilterByTag) onFilterByTag(tag);
                }}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer row: Date metadata & action bar */}
      <div className={`pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 ${
        viewMode === 'list' ? 'md:pt-0 md:border-t-0 md:justify-end' : ''
      }`}>
        
        {/* Date metadata */}
        <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px]">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{formatVietnameseDate(note.updatedAt || note.createdAt)}</span>
        </div>

        {/* Quick Card Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* AI Summarize Action Button */}
          <button
            type="button"
            onClick={handleSummarize}
            disabled={isSummarizing}
            title={note.summary ? (showSummary ? 'Ẩn tóm tắt AI' : 'Xem tóm tắt AI') : 'Tóm tắt bằng AI'}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border ${
              note.summary
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300'
            }`}
          >
            {isSummarizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            )}
            <span className="hidden sm:inline">
              {isSummarizing ? 'Đang tóm tắt...' : note.summary ? (showSummary ? 'Ẩn tóm tắt' : 'Tóm tắt') : 'Tóm tắt AI'}
            </span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Sao chép nội dung"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download TXT Button */}
          <button
            type="button"
            onClick={handleDownloadTxt}
            title="Tải ghi chú về máy (.txt)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(note);
            }}
            title="Sửa ghi chú"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note);
            }}
            title="Xóa ghi chú"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </article>
  );
};
