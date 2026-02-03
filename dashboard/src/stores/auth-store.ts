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
      
      // Store token in localStorage
      localStorage.setItem('clawkeeper_token', token);
      
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
if (stored_token) {
  // Set authenticated state (token exists)
  use_auth_store.setState({ 
    token: stored_token,
    is_authenticated: true,
  });
  
  // TODO: Optionally verify token with /api/auth/me endpoint
  // and load user data for better UX
}
