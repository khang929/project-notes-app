import React, { useState, useRef, useEffect } from 'react';
import { aiPost } from '../utils/aiApi';
import { 
  Plus, 
  Pin, 
  Tag as TagIcon, 
  Sparkles, 
  Palette, 
  Check, 
  X,
  Loader2,
  CheckSquare,
  Bold,
  Italic
} from 'lucide-react';
import { Note, NoteColor } from '../types';
import { COLOR_SCHEMES } from '../utils/format';

interface QuickNoteInputProps {
  onSave: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean> | boolean | void;
  existingAppTags: string[];
}

export const QuickNoteInput: React.FC<QuickNoteInputProps> = ({
  onSave,
  existingAppTags,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState<NoteColor>('default');
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click if empty
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!title.trim() && !content.trim()) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [title, content]);

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSuggestTags = async () => {
    if (!title.trim() && !content.trim()) return;
    setIsSuggestingTags(true);
    try {
      const res = await aiPost('/api/ai/suggest-tags', { title, content, existingTags: existingAppTags });
      const data = await res.json();
      if (res.ok && Array.isArray(data.tags)) {
        setSuggestedTags(data.tags.filter((t: string) => !tags.includes(t)));
      }
    } catch {
      // ignore
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    if (!title.trim() && !content.trim()) {
      setIsExpanded(false);
      return;
    }

    setIsSaving(true);
    let ok: boolean | void;
    try {
      ok = await onSave({
        title: title.trim(),
        content: content.trim(),
        tags,
        isPinned,
        color,
      });
    } finally {
      setIsSaving(false);
    }
    // Lưu lỗi -> giữ nguyên nội dung đã nhập để người dùng thử lại
    if (ok === false) return;

    // Reset
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
    setIsPinned(false);
    setColor('default');
    setSuggestedTags([]);
    setIsExpanded(false);
  };

  const colorScheme = COLOR_SCHEMES[color];

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
        colorScheme.bgLight
      } ${colorScheme.bgDark} ${colorScheme.borderLight} ${colorScheme.borderDark} ${
        isExpanded ? 'shadow-md ring-1 ring-indigo-500/30' : 'hover:shadow-sm'
      }`}
    >
      {!isExpanded ? (
        /* Collapsed quick bar */
        <div
          onClick={() => setIsExpanded(true)}
          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer text-slate-500 dark:text-slate-400"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Ghi chú nhanh suy nghĩ, kế hoạch của bạn...
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setContent('- [ ] ');
              setIsExpanded(true);
            }}
            title="Tạo danh sách việc cần làm"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Expanded quick note form */
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3">
          
          {/* Header row: Title and Pin */}
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề..."
              className="w-full text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
              className={`p-1.5 rounded-lg transition-colors ${
                isPinned
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
          </div>

          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhập nội dung ghi chú ở đây..."
            rows={3}
            className="w-full text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 leading-relaxed resize-y font-normal"
          />

          {/* Active Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="+ Thẻ..."
                className="px-2 py-0.5 text-xs bg-black/5 dark:bg-white/5 border border-transparent rounded-md text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-20"
              />
            </div>

            {/* AI Suggest Tags button in quick input */}
            {(title.trim() || content.trim()) && (
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={isSuggestingTags}
                className="px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition-colors flex items-center gap-1"
              >
                {isSuggestingTags ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Gợi ý thẻ</span>
              </button>
            )}
          </div>

          {/* AI Suggested Tags list */}
          {suggestedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center pt-1">
              <span className="text-[11px] text-slate-400">Gợi ý:</span>
              {suggestedTags.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    handleAddTag(st);
                    setSuggestedTags(suggestedTags.filter((item) => item !== st));
                  }}
                  className="px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  + #{st}
                </button>
              ))}
            </div>
          )}

          {/* Bottom row: Color palette & Save button */}
          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 gap-3">
            
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5">
              {(Object.keys(COLOR_SCHEMES) as NoteColor[]).map((cKey) => {
                const s = COLOR_SCHEMES[cKey];
                const isSelected = color === cKey;
                return (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => setColor(cKey)}
                    title={s.label}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${s.indicator} ${
                      isSelected ? 'ring-2 ring-offset-1 ring-indigo-600 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setContent('');
                  setIsExpanded(false);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                {isSaving ? 'Đang lưu...' : 'Lưu ghi chú'}
              </button>
            </div>

          </div>

        </form>
      )}
    </div>
  );
};
