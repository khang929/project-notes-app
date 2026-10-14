import React, { useRef } from 'react';
import { 
  Search, 
  X, 
  Tag as TagIcon, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  Pin, 
  Download, 
  Upload, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { FilterState, Note, SortOption } from '../types';

interface SidebarProps {
  filter: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  allTags: { name: string; count: number }[];
  notes: Note[];
  onImportNotes: (importedNotes: Note[]) => void;
  onRequestResetSamples: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  filter,
  onFilterChange,
  allTags,
  notes,
  onImportNotes,
  onRequestResetSamples,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ghi_chu_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Đã tải xuống file sao lưu ghi chú JSON!', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onImportNotes(json);
        } else {
          onShowToast('Tệp JSON không đúng định dạng danh sách ghi chú!', 'error');
        }
      } catch {
        onShowToast('Không thể đọc tệp JSON. Vui lòng kiểm tra lại!', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filter.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          placeholder="Tìm tiêu đề, nội dung, thẻ..."
          className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-xs"
        />
        {filter.search && (
          <button
            onClick={() => onFilterChange({ search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            title="Xóa tìm kiếm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter & View Mode Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
        
        {/* View Mode & Pinned Toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Hiển thị & Sắp xếp
          </span>

          {/* Grid / List toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => onFilterChange({ viewMode: 'grid' })}
              title="Chế độ lưới"
              className={`p-1.5 rounded-md transition-colors ${
                filter.viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFilterChange({ viewMode: 'list' })}
              title="Chế độ danh sách"
              className={`p-1.5 rounded-md transition-colors ${
                filter.viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sort Select */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ArrowUpDown className="w-3 h-3" />
            Thứ tự sắp xếp
          </label>
          <select
            value={filter.sortBy}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as SortOption })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="updated-desc">Cập nhật gần nhất</option>
            <option value="created-desc">Ngày tạo mới nhất</option>
            <option value="title-asc">Tiêu đề (A → Z)</option>
            <option value="title-desc">Tiêu đề (Z → A)</option>
          </select>
        </div>

        {/* Quick Pin Filter Checkbox */}
        <button
          onClick={() => onFilterChange({ onlyPinned: !filter.onlyPinned })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
            filter.onlyPinned
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Pin className={`w-3.5 h-3.5 ${filter.onlyPinned ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            Chỉ xem ghi chú đã ghim
          </span>
          <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {notes.filter((n) => n.isPinned).length}
          </span>
        </button>

      </div>

      {/* Tags Filter Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <TagIcon className="w-3.5 h-3.5 text-indigo-500" />
            Thẻ phân loại
          </span>
          {filter.selectedTag && (
            <button
              onClick={() => onFilterChange({ selectedTag: null })}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Bỏ lọc thẻ
            </button>
          )}
        </div>

        {/* Tags List */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            onClick={() => onFilterChange({ selectedTag: null })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter.selectedTag === null
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả thẻ ({notes.length})
          </button>

          {allTags.map((t) => {
            const isActive = filter.selectedTag === t.name;
            return (
              <button
                key={t.name}
                onClick={() => onFilterChange({ selectedTag: isActive ? null : t.name })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>#{t.name}</span>
                <span className={`text-[10px] font-mono tabular-nums px-1 rounded-sm ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {t.count}
                </span>
              </button>
            );
          })}

          {allTags.length === 0 && (
            <p className="text-xs text-slate-400 italic py-1">Chưa có thẻ nào được tạo.</p>
          )}
        </div>
      </div>

      {/* Local Storage & Data Utilities */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Dữ liệu & Bộ nhớ
        </span>

        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Tổng ghi chú:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{notes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Đã lưu trữ:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">localStorage an toàn</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
          <button
            onClick={handleExportJson}
            title="Xuất file sao lưu JSON"
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sao lưu</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Nhập lại file JSON đã sao lưu"
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        <button
          onClick={onRequestResetSamples}
          className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors pt-1 flex items-center justify-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Khôi phục dữ liệu mẫu</span>
        </button>
      </div>

    </aside>
  );
};
