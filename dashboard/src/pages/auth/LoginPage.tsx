import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { use_auth_store } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { CircleDashed, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [email, set_email] = useState('');
  const [password, set_password] = useState('');
  const [error, set_error] = useState('');
  const [is_loading, set_is_loading] = useState(false);
  
  const { login, is_authenticated } = use_auth_store();
  const navigate = useNavigate();

  useEffect(() => {
    if (is_authenticated) {
      navigate('/dashboard');
    }
  }, [is_authenticated, navigate]);

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault();
    set_error('');
    set_is_loading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      set_error('Invalid credentials. Please try again.');
    } finally {
      set_is_loading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4 relative overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 technical-grid pointer-events-none"></div>

      <Card className="w-full max-w-md relative z-10 border-border shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 bg-obsidian text-white flex items-center justify-center rounded-sm shadow-sm">
              <CircleDashed className="w-6 h-6" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight text-obsidian">Welcome back</CardTitle>
            <CardDescription className="text-subtle">
              Sign in to your ClawKeeper account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handle_submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-medium text-obsidian uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => set_email(e.target.value)}
                placeholder="admin@meridiantech.example"
                className="w-full px-3 py-2.5 border border-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-obsidian/10 focus:border-obsidian transition-all"
                required
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-medium text-obsidian uppercase tracking-wide">
                  Password
                </label>
                <a href="#" className="text-xs text-subtle hover:text-obsidian transition-colors">Forgot password?</a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => set_password(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-obsidian/10 focus:border-obsidian transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive"></span>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={is_loading}
              className="w-full group relative isolate overflow-hidden bg-obsidian text-white text-sm font-semibold px-4 py-3 rounded shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-white/10 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <div className="shimmer-layer absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent z-0 pointer-events-none"></div>
              <span className="relative z-10">{is_loading ? 'Signing in...' : 'Sign In'}</span>
              {!is_loading && <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-subtle">
              Don't have an account?{' '}
              <a href="#" className="font-medium text-obsidian hover:underline">Start a trial</a>
            </p>
          </div>

          <div className="mt-6 p-3 bg-muted/50 rounded text-center border border-border/50">
            <p className="text-[10px] text-obsidian font-mono">
              Demo: admin@demo.com / password123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
