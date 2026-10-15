export type NoteColor = 'default' | 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  userId?: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  color?: NoteColor;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  summary?: string; // AI generated summary cache
}

export type SortOption = 'updated-desc' | 'created-desc' | 'title-asc' | 'title-desc';

export interface FilterState {
  search: string;
  selectedTag: string | null;
  onlyPinned: boolean;
  sortBy: SortOption;
  viewMode: 'grid' | 'list';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
