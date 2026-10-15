import { NoteColor } from '../types';

export function formatVietnameseDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Hôm nay, ${timeStr}`;
    }
    if (isYesterday) {
      return `Hôm qua, ${timeStr}`;
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

export interface ColorScheme {
  id: NoteColor;
  label: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  indicator: string;
  stripe: string;
}

export const COLOR_SCHEMES: Record<NoteColor, ColorScheme> = {
  default: {
    id: 'default',
    label: 'Mặc định',
    bgLight: 'bg-white',
    bgDark: 'dark:bg-slate-900',
    borderLight: 'border-slate-200',
    borderDark: 'dark:border-slate-800',
    indicator: 'bg-slate-400',
    stripe: 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700',
  },
  blue: {
    id: 'blue',
    label: 'Xanh dương',
    bgLight: 'bg-sky-50/70',
    bgDark: 'dark:bg-sky-950/40',
    borderLight: 'border-sky-200',
    borderDark: 'dark:border-sky-800/60',
    indicator: 'bg-sky-500',
    stripe: 'from-sky-400 to-blue-500',
  },
  emerald: {
    id: 'emerald',
    label: 'Xanh lá',
    bgLight: 'bg-emerald-50/70',
    bgDark: 'dark:bg-emerald-950/40',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-800/60',
    indicator: 'bg-emerald-500',
    stripe: 'from-emerald-400 to-teal-500',
  },
  amber: {
    id: 'amber',
    label: 'Vàng hổ phách',
    bgLight: 'bg-amber-50/70',
    bgDark: 'dark:bg-amber-950/40',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-800/60',
    indicator: 'bg-amber-500',
    stripe: 'from-amber-400 to-orange-500',
  },
  purple: {
    id: 'purple',
    label: 'Tím mộng mơ',
    bgLight: 'bg-purple-50/70',
    bgDark: 'dark:bg-purple-950/40',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-800/60',
    indicator: 'bg-purple-500',
    stripe: 'from-purple-400 to-fuchsia-500',
  },
  rose: {
    id: 'rose',
    label: 'Hồng san hô',
    bgLight: 'bg-rose-50/70',
    bgDark: 'dark:bg-rose-950/40',
    borderLight: 'border-rose-200',
    borderDark: 'dark:border-rose-800/60',
    indicator: 'bg-rose-500',
    stripe: 'from-rose-400 to-pink-500',
  },
};
