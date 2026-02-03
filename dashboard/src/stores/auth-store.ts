import { create } from 'zustand';

interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'tenant_admin' | 'accountant' | 'viewer';
}

interface AuthState {
  user: User | null;
  token: string | null;
  is_authenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  set_user: (user: User, token: string) => void;
}

export const use_auth_store = create<AuthState>((set) => ({
  user: null,
  token: null,
  is_authenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { user, token } = await response.json();
      
      // Store token and user in localStorage
      localStorage.setItem('clawkeeper_token', token);
      localStorage.setItem('clawkeeper_user', JSON.stringify(user));
      
      set({
        user,
        token,
        is_authenticated: true,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('clawkeeper_token');
    localStorage.removeItem('clawkeeper_user');
    set({
      user: null,
      token: null,
      is_authenticated: false,
    });
  },

  set_user: (user: User, token: string) => {
    set({
      user,
      token,
      is_authenticated: true,
    });
  },
}));

// Initialize auth state from localStorage on app load
const stored_token = localStorage.getItem('clawkeeper_token');
const stored_user_str = localStorage.getItem('clawkeeper_user');

if (stored_token && stored_user_str) {
  try {
    const stored_user = JSON.parse(stored_user_str);
    // Restore full auth state from localStorage
    use_auth_store.setState({ 
      token: stored_token,
      user: stored_user,
      is_authenticated: true,
    });
  } catch (error) {
    // Invalid stored data, clear everything
    localStorage.removeItem('clawkeeper_token');
    localStorage.removeItem('clawkeeper_user');
  }
}
