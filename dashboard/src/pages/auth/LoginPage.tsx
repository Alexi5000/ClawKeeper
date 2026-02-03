import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { use_auth_store } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export function LoginPage() {
  const [email, set_email] = useState('');
  const [password, set_password] = useState('');
  const [error, set_error] = useState('');
  const [is_loading, set_is_loading] = useState(false);
  
  const { login } = use_auth_store();
  const navigate = useNavigate();

  async function handle_submit(e: React.FormEvent) {
    e.preventDefault();
    set_error('');
    set_is_loading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      set_error('Invalid credentials. Please try again.');
    } finally {
      set_is_loading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="text-4xl mb-2">🔐</div>
          <CardTitle className="text-2xl">ClawKeeper</CardTitle>
          <CardDescription>Autonomous AI Bookkeeping</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handle_submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => set_email(e.target.value)}
                placeholder="admin@meridiantech.example"
                className="w-full px-3 py-2 border rounded-md bg-background"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => set_password(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-md bg-background"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={is_loading}>
              {is_loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Demo: admin@meridiantech.example / Demo123!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
