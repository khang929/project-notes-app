/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Pin, 
  FileText, 
  Filter, 
  Sparkles, 
  FolderOpen, 
  AlertCircle,
  Tag as TagIcon
} from 'lucide-react';
import { Note, FilterState, User } from './types';
import { getStoredTheme, saveStoredTheme, INITIAL_SAMPLE_NOTES } from './utils/storage';
import { getCurrentUser, onAuthChange, logoutUser, isSessionLocked, setSessionLocked, wasOpenedFromRecoveryLink } from './utils/auth';
import {
  fetchNotes,
  insertNote,
  insertManyNotes,
  updateNote as updateNoteRemote,
  deleteNote as deleteNoteRemote,
} from './utils/notesApi';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NoteCard } from './components/NoteCard';
import { NoteModal } from './components/NoteModal';
import { AIChatDrawer } from './components/AIChatDrawer';
import { ImageOcrModal } from './components/ImageOcrModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer, ToastMessage } from './components/Toast';
import { QuickNoteInput } from './components/QuickNoteInput';
import { ShareBrowserModal } from './components/ShareBrowserModal';
import { AuthModal } from './components/AuthModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

export default function App() {
  // Authentication & Security state
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => isSessionLocked());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'lock' | 'forgot' | 'reset'>('login');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());
  
  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // In-app deletion and reset confirmation state
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filters state
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    selectedTag: null,
    onlyPinned: false,
    sortBy: 'updated-desc',
    viewMode: 'grid',
  });

  // Active top navigation tab
  const [navTab, setNavTab] = useState<'all' | 'pinned'>('all');

  // Sync theme to <html> class and localStorage
  useEffect(() => {
    saveStoredTheme(theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Khôi phục phiên đăng nhập khi mở app và theo dõi đăng nhập/đăng xuất (kể cả từ tab khác)
  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        setCurrentUserState(user);
        if (user && wasOpenedFromRecoveryLink()) {
          // Mở từ liên kết "đặt lại mật khẩu" trong email -> yêu cầu nhập mật khẩu mới
          setAuthModalMode('reset');
          setIsAuthModalOpen(true);
        } else if (user && isSessionLocked()) {
          setAuthModalMode('lock');
          setIsAuthModalOpen(true);
        }
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    const unsubscribe = onAuthChange(
      (user) => {
        if (!active) return;
        setCurrentUserState((prev) => (prev?.id === user?.id ? prev : user));
      },
      () => {
        if (!active) return;
        setAuthModalMode('reset');
        setIsAuthModalOpen(true);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Chưa đăng nhập -> hiện màn hình đăng nhập
  useEffect(() => {
    if (authReady && !currentUser) {
      setNotes([]);
      setIsAuthModalOpen(true);
    }
  }, [authReady, currentUser]);

  // Tải ghi chú từ Supabase mỗi khi đổi tài khoản
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    setIsLoadingNotes(true);
    fetchNotes()
      .then((data) => {
        if (active) setNotes(data);
      })
      .catch((err) => {
        if (active) showToast(`Không tải được ghi chú: ${err.message}`, 'error');
      })
      .finally(() => {
        if (active) setIsLoadingNotes(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  // Auth & Lock handlers
  const handleAuthSuccess = (user: User) => {
    setCurrentUserState(user);
    setIsLocked(false);
    setSessionLocked(false);
    setIsAuthModalOpen(false);
    showToast(`Chào mừng, ${user.name}! Đăng nhập thành công.`, 'success');
  };

  const handleLockSession = () => {
    setIsLocked(true);
    setSessionLocked(true);
    setAuthModalMode('lock');
    setIsAuthModalOpen(true);
    showToast('Ứng dụng đã được khóa bảo mật', 'info');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUserState(null);
    setSessionLocked(false);
    setIsLocked(false);
    setNotes([]);
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
    showToast('Đã đăng xuất tài khoản an toàn', 'info');
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Note CRUD operations (lưu trên Supabase)
  // Trả về true nếu lưu thành công, false nếu thất bại (để form giữ lại nội dung người dùng đã nhập)
  const handleSaveNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<boolean> => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để lưu ghi chú', 'error');
      return false;
    }
    try {
      if (noteData.id) {
        const saved = await updateNoteRemote(noteData.id, noteData);
        setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
        showToast('Đã cập nhật ghi chú thành công!', 'success');
      } else {
        const saved = await insertNote(noteData);
        setNotes((prev) => [saved, ...prev]);
        showToast('Đã tạo ghi chú mới thành công!', 'success');
      }
      return true;
    } catch (err: any) {
      showToast(`Không lưu được ghi chú: ${err?.message || 'lỗi không xác định'}`, 'error');
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    const target = noteToDelete;
    const deletedTitle = target.title || 'không tiêu đề';
    setNoteToDelete(null);
    try {
      await deleteNoteRemote(target.id);
      setNotes((prev) => prev.filter((n) => n.id !== target.id));
      showToast(`Đã xóa ghi chú "${deletedTitle}" thành công`, 'info');
    } catch (err: any) {
      showToast(`Không xóa được ghi chú: ${err?.message || 'lỗi không xác định'}`, 'error');
    }
  };

  // Thêm bộ ghi chú mẫu vào tài khoản (không xóa ghi chú hiện có)
  const handleConfirmReset = async () => {
    setIsResetConfirmOpen(false);
    try {
      const added = await insertManyNotes(INITIAL_SAMPLE_NOTES);
      setNotes((prev) => [...added, ...prev]);
      showToast('Đã thêm các ghi chú mẫu vào tài khoản!', 'success');
    } catch (err: any) {
      showToast(`Không thêm được ghi chú mẫu: ${err?.message || 'lỗi không xác định'}`, 'error');
    }
  };

  // Nhập từ file JSON sao lưu: thêm vào tài khoản, không ghi đè ghi chú hiện có
  const handleImportNotes = async (imported: Note[]) => {
    try {
      const added = await insertManyNotes(imported);
      setNotes((prev) => [...added, ...prev]);
      showToast(`Đã nhập thành công ${added.length} ghi chú vào tài khoản!`, 'success');
    } catch (err: any) {
      showToast(`Không nhập được ghi chú: ${err?.message || 'lỗi không xác định'}`, 'error');
    }
  };

  const handleTogglePin = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const nextPinned = !target.isPinned;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: nextPinned } : n)));
    try {
      const saved = await updateNoteRemote(id, { isPinned: nextPinned });
      setNotes((prev) => prev.map((n) => (n.id === id ? saved : n)));
      showToast(nextPinned ? 'Đã ghim ghi chú lên đầu' : 'Đã bỏ ghim ghi chú', 'info');
    } catch (err: any) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: !nextPinned } : n)));
      showToast(`Không ghim được ghi chú: ${err?.message || 'lỗi không xác định'}`, 'error');
    }
  };

  const handleUpdateSummary = async (id: string, summary: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, summary } : n)));
    try {
      await updateNoteRemote(id, { summary }, false);
    } catch (err: any) {
      showToast(`Không lưu được tóm tắt: ${err?.message || 'lỗi không xác định'}`, 'error');
    }
  };

  // Open Edit modal
  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  // Handler for creating note from AI Chat
  const handleCreateNoteFromAi = (title: string, content: string) => {
    handleSaveNote({
      title,
      content,
      tags: ['AI-Gợi-ý'],
      isPinned: false,
      color: 'purple',
    });
  };

  // Handler for creating note from Image OCR
  const handleSaveNoteFromOcr = (ocrData: { title: string; content: string; tags: string[] }) => {
    handleSaveNote({
      title: ocrData.title,
      content: ocrData.content,
      tags: ocrData.tags,
      isPinned: false,
      color: 'emerald',
    });
  };

  // Calculate unique tags with counts
  const allTags = useMemo(() => {
    const tagMap: Record<string, number> = {};
    notes.forEach((note) => {
      (note.tags || []).forEach((t) => {
        const clean = t.trim();
        if (clean) {
          tagMap[clean] = (tagMap[clean] || 0) + 1;
        }
      });
    });
    return Object.entries(tagMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [notes]);

  const existingAppTagNames = useMemo(() => allTags.map((t) => t.name), [allTags]);

  // Filter & Sort Logic
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Top tab or sidebar pinned filter
    if (navTab === 'pinned' || filter.onlyPinned) {
      result = result.filter((n) => n.isPinned);
    }

    // Selected Tag filter
    if (filter.selectedTag) {
      result = result.filter((n) => n.tags && n.tags.includes(filter.selectedTag!));
    }

    // Search query filter (matches title, content, or tags)
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter((n) => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        const tagsMatch = (n.tags || []).some((t) => t.toLowerCase().includes(q));
        return titleMatch || contentMatch || tagsMatch;
      });
    }

    // Sort order
    result.sort((a, b) => {
      if (filter.sortBy === 'updated-desc') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }
      if (filter.sortBy === 'created-desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filter.sortBy === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '', 'vi');
      }
      if (filter.sortBy === 'title-desc') {
        return (b.title || '').localeCompare(a.title || '', 'vi');
      }
      return 0;
    });

    return result;
  }, [notes, filter, navTab]);

  // Split into Pinned and Other notes (if not explicitly filtered to pinned only)
  const isSeparatingPinned = navTab !== 'pinned' && !filter.onlyPinned;
  const pinnedNotes = useMemo(() => {
    return isSeparatingPinned ? filteredNotes.filter((n) => n.isPinned) : [];
  }, [filteredNotes, isSeparatingPinned]);

  const otherNotes = useMemo(() => {
    return isSeparatingPinned ? filteredNotes.filter((n) => !n.isPinned) : filteredNotes;
  }, [filteredNotes, isSeparatingPinned]);

  return (
    <div className="min-h-screen flex flex-col app-bg text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Top Navbar */}
      <Navbar
        theme={theme}
        currentUser={currentUser}
        onToggleTheme={handleToggleTheme}
        onOpenCreateModal={handleOpenCreateModal}
        onOpenOcrModal={() => setIsOcrModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenAuthModal={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onLockSession={handleLockSession}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
        onToggleAiChat={() => setIsAiChatOpen(!isAiChatOpen)}
        isAiChatOpen={isAiChatOpen}
        activeFilter={navTab}
        onChangeFilter={(tab) => {
          setNavTab(tab);
          if (tab === 'pinned') {
            setFilter((prev) => ({ ...prev, onlyPinned: true }));
          } else {
            setFilter((prev) => ({ ...prev, onlyPinned: false }));
          }
        }}
        pinnedCount={notes.filter((n) => n.isPinned).length}
        totalCount={notes.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Active Filter Bar if tag or search active */}
        {(filter.selectedTag || filter.search) && (
          <div className="mb-6 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900 dark:text-indigo-200 animate-fade-in">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                Đang lọc:
                {filter.selectedTag && <strong className="ml-1">#{filter.selectedTag}</strong>}
                {filter.selectedTag && filter.search && <span className="mx-1">và</span>}
                {filter.search && <span>từ khóa &quot;{filter.search}&quot;</span>}
                <span className="ml-2 font-mono tabular-nums text-slate-500">
                  ({filteredNotes.length} kết quả)
                </span>
              </span>
            </div>
            <button
              onClick={() => setFilter((prev) => ({ ...prev, selectedTag: null, search: '' }))}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left / Sidebar Controls */}
          <Sidebar
            filter={filter}
            onFilterChange={(updates) => setFilter((prev) => ({ ...prev, ...updates }))}
            allTags={allTags}
            notes={notes}
            onImportNotes={handleImportNotes}
            onRequestResetSamples={() => setIsResetConfirmOpen(true)}
            onShowToast={showToast}
          />

          {/* Right: Notes Content Area */}
          <div className="flex-1 w-full space-y-6">
            
            {/* Quick Note Input Bar (like Google Keep) */}
            <QuickNoteInput
              onSave={handleSaveNote}
              existingAppTags={existingAppTagNames}
            />

            {/* Loading State */}
            {isLoadingNotes && notes.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center text-sm text-slate-500">
                Đang tải ghi chú của bạn...
              </div>
            )}

            {/* Empty State */}
            {!isLoadingNotes && filteredNotes.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    {filter.search || filter.selectedTag
                      ? 'Không tìm thấy ghi chú phù hợp'
                      : 'Chưa có ghi chú nào'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    {filter.search || filter.selectedTag
                      ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc thẻ để xem các ghi chú khác.'
                      : 'Bắt đầu ghi lại ý tưởng, kế hoạch hoặc danh sách công việc của bạn ngay bây giờ.'}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo ghi chú đầu tiên</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pinned Notes Section */}
            {isSeparatingPinned && pinnedNotes.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Đã ghim ({pinnedNotes.length})
                  </h2>
                </div>

                <div
                  className={
                    filter.viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                      : 'space-y-3'
                  }
                >
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      viewMode={filter.viewMode}
                      onEdit={handleEditNote}
                      onDelete={(targetNote) => setNoteToDelete(targetNote)}
                      onTogglePin={handleTogglePin}
                      onUpdateSummary={handleUpdateSummary}
                      onFilterByTag={(tag) => setFilter((prev) => ({ ...prev, selectedTag: tag }))}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other / Standard Notes Section */}
            {otherNotes.length > 0 && (
              <section className="space-y-3">
                {isSeparatingPinned && pinnedNotes.length > 0 && (
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ghi chú khác ({otherNotes.length})
                  </h2>
                )}

                <div
                  className={
                    filter.viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                      : 'space-y-3'
                  }
                >
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      viewMode={filter.viewMode}
                      onEdit={handleEditNote}
                      onDelete={(targetNote) => setNoteToDelete(targetNote)}
                      onTogglePin={handleTogglePin}
                      onUpdateSummary={handleUpdateSummary}
                      onFilterByTag={(tag) => setFilter((prev) => ({ ...prev, selectedTag: tag }))}
                    />
                  ))}
                </div>
              </section>
            )}

          </div>

        </div>
      </main>

      {/* Note Create & Edit Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        onDeleteNote={(targetNote) => setNoteToDelete(targetNote)}
        editingNote={editingNote}
        existingAppTags={existingAppTagNames}
      />

      {/* AI Chat Drawer */}
      <AIChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        notes={notes}
        userId={currentUser?.id}
        onCreateNoteFromAi={handleCreateNoteFromAi}
      />

      {/* Image OCR & Scanner Modal */}
      <ImageOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onSaveAsNote={handleSaveNoteFromOcr}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(noteToDelete)}
        title="Xác nhận xóa ghi chú"
        message="Bạn có chắc chắn muốn xóa ghi chú này không? Thao tác này sẽ xóa vĩnh viễn ghi chú khỏi tài khoản của bạn trên mọi thiết bị."
        noteTitle={noteToDelete?.title || 'Ghi chú không tiêu đề'}
        confirmLabel="Xóa ghi chú"
        cancelLabel="Hủy"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setNoteToDelete(null)}
      />

      {/* Reset Sample Notes Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Thêm ghi chú mẫu"
        message="Thao tác này sẽ thêm bộ ghi chú mẫu vào tài khoản của bạn. Các ghi chú hiện có vẫn được giữ nguyên. Bạn có muốn tiếp tục?"
        confirmLabel="Thêm ghi chú mẫu"
        cancelLabel="Hủy"
        isDestructive={false}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* In-app Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Share / Open in Browser Modal */}
      <ShareBrowserModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Auth / Login / Register / Lock Screen Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authModalMode}
        currentUser={currentUser}
        onSuccess={handleAuthSuccess}
        onSwitchMode={(mode) => setAuthModalMode(mode)}
        onLogout={handleLogout}
        onPasswordReset={() => {
          setIsAuthModalOpen(false);
          setAuthModalMode('login');
          showToast('Đã đặt mật khẩu mới thành công!', 'success');
        }}
      />

      {/* Change Password Modal */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          email={currentUser.email}
          onClose={() => setIsChangePasswordOpen(false)}
          onSuccess={() => showToast('Đổi mật khẩu thành công!', 'success')}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Quản Lý Ghi Chú Cá Nhân · Hỗ trợ AI Gemini</p>
          <div className="flex items-center gap-4 text-xs">
            <span>Dữ liệu đồng bộ trên đám mây</span>
            <span>·</span>
            <span>Chế độ {theme === 'dark' ? 'Tối' : 'Sáng'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
