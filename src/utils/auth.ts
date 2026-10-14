import { User } from '../types';

const USERS_STORAGE_KEY = 'ai_notes_users_v1';
const CURRENT_USER_KEY = 'ai_notes_current_user_v1';
const SESSION_LOCKED_KEY = 'ai_notes_session_locked_v1';

// Hash password with Web Crypto API (SHA-256)
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initial demo user
const INITIAL_DEMO_HASH = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'; // SHA-256 for "password123"

const DEFAULT_USERS: User[] = [
  {
    id: 'user-demo-1',
    username: 'demo',
    name: 'Tài khoản Demo',
    email: 'demo@example.com',
    passwordHash: INITIAL_DEMO_HASH,
    avatarColor: 'bg-indigo-600',
    createdAt: new Date().toISOString(),
  },
];

// Get all registered users
export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

// Save users
export function saveStoredUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users:', err);
  }
}

// Get current active user
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Set current active user
export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to set current user:', err);
  }
}

// Lock state
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

// Random avatar color
const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-blue-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
];

// Register a new user
export async function registerUser(name: string, username: string, password: string, email?: string): Promise<User> {
  const users = getStoredUsers();
  const cleanUsername = username.trim().toLowerCase();

  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    throw new Error('Tên đăng nhập này đã được sử dụng!');
  }

  const passwordHash = await hashPassword(password);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    username: cleanUsername,
    name: name.trim() || cleanUsername,
    email: email?.trim(),
    passwordHash,
    avatarColor,
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);
  setCurrentUser(newUser);
  setSessionLocked(false);

  return newUser;
}

// Login user
export async function loginUser(username: string, password: string): Promise<User> {
  const users = getStoredUsers();
  const cleanUsername = username.trim().toLowerCase();
  const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

  if (!user) {
    throw new Error('Tài khoản không tồn tại!');
  }

  const hash = await hashPassword(password);
  if (user.passwordHash !== hash) {
    throw new Error('Mật khẩu không chính xác!');
  }

  setCurrentUser(user);
  setSessionLocked(false);
  return user;
}

// Change password
export async function changeUserPassword(userId: string, oldPass: string, newPass: string): Promise<void> {
  const users = getStoredUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Không tìm thấy người dùng!');

  const oldHash = await hashPassword(oldPass);
  if (user.passwordHash !== oldHash) {
    throw new Error('Mật khẩu hiện tại không đúng!');
  }

  user.passwordHash = await hashPassword(newPass);
  saveStoredUsers(users);
  setCurrentUser(user);
}
