import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

// Trạng thái "khóa nhanh" chỉ là khóa giao diện trên thiết bị này
const SESSION_LOCKED_KEY = 'ai_notes_session_locked_v1';

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-blue-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
];

// Màu avatar cố định theo id để mọi thiết bị đều giống nhau
function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function mapUser(u: SupabaseUser): User {
  const email = u.email || '';
  const metaName = (u.user_metadata?.name as string | undefined)?.trim();
  return {
    id: u.id,
    name: metaName || email.split('@')[0] || 'Người dùng',
    email,
    avatarColor: pickAvatarColor(u.id),
    createdAt: u.created_at,
  };
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không chính xác!';
  if (m.includes('email not confirmed')) return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư và bấm vào liên kết xác nhận.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Email này đã được sử dụng!';
  if (m.includes('password should be at least')) return 'Mật khẩu quá ngắn!';
  if (m.includes('rate limit') || m.includes('too many')) return 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Địa chỉ email không hợp lệ!';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Không kết nối được máy chủ. Hãy kiểm tra mạng!';
  return message;
}

// Lấy người dùng của phiên đăng nhập hiện tại (nếu có)
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ? mapUser(data.session.user) : null;
}

// Lắng nghe đăng nhập / đăng xuất (kể cả từ tab hoặc thiết bị khác). Trả về hàm hủy đăng ký.
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? mapUser(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: User | null; needsEmailConfirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: name.trim() },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(translateAuthError(error.message));

  // Khi bật xác nhận email, email đã tồn tại sẽ trả về user rỗng identities
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('Email này đã được sử dụng!');
  }

  if (!data.session || !data.user) {
    return { user: null, needsEmailConfirm: true };
  }
  setSessionLocked(false);
  return { user: mapUser(data.user), needsEmailConfirm: false };
}

export async function loginUser(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) {
    throw new Error(translateAuthError(error?.message || 'Đăng nhập thất bại!'));
  }
  setSessionLocked(false);
  return mapUser(data.user);
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
  setSessionLocked(false);
}

// Đổi mật khẩu: xác minh mật khẩu cũ rồi mới cập nhật mật khẩu mới
export async function changeUserPassword(email: string, oldPass: string, newPass: string): Promise<void> {
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: oldPass });
  if (verifyError) throw new Error('Mật khẩu hiện tại không đúng!');

  const { error } = await supabase.auth.updateUser({ password: newPass });
  if (error) throw new Error(translateAuthError(error.message));
}

// Khóa nhanh giao diện
export function isSessionLocked(): boolean {
  try {
    return localStorage.getItem(SESSION_LOCKED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSessionLocked(locked: boolean): void {
  try {
    if (locked) {
      localStorage.setItem(SESSION_LOCKED_KEY, 'true');
    } else {
      localStorage.removeItem(SESSION_LOCKED_KEY);
    }
  } catch (err) {
    console.error('Failed to set session lock:', err);
  }
}
