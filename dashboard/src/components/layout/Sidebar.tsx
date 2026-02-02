import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  GitCompare, 
  Settings,
  LogOut,
  Users,
  Truck,
  Bot,
  Zap,
} from 'lucide-react';
import { use_auth_store } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const nav_sections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Invoices', path: '/invoices', icon: FileText },
      { name: 'Reconciliation', path: '/reconciliation', icon: GitCompare },
      { name: 'Reports', path: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Contacts',
    items: [
      { name: 'Customers', path: '/customers', icon: Users },
      { name: 'Vendors', path: '/vendors', icon: Truck },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

// Mock active agents count
const active_agents = 4;

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = use_auth_store();

  return (
    <div className="w-64 border-r bg-card flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">🔐</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">ClawKeeper</h1>
            <p className="text-xs text-muted-foreground">AI Bookkeeping</p>
          </div>
        </div>
      </div>

      {/* AI Status Badge */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className="h-5 w-5 text-primary" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-medium">{active_agents} AI Agents</p>
              <p className="text-[10px] text-muted-foreground">Processing</p>
            </div>
          </div>
          <Zap className="h-4 w-4 text-yellow-500" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {nav_sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const is_active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200',
                      is_active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-3 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
