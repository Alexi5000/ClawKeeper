import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  DollarSign,
  FileText,
  Landmark,
  Clock,
  TrendingUp,
  Upload,
  GitCompare,
  BarChart3,
  Bot,
  AlertCircle,
  Loader2,
  ArrowRight,
  Activity,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format_currency, format_datetime, cn } from '@/lib/utils';
import { api } from '@/lib/api';

// Mock data for the cash flow chart
const cash_flow_data = [
  { month: 'Jan', inflow: 45000, outflow: 32000 },
  { month: 'Feb', inflow: 52000, outflow: 38000 },
  { month: 'Mar', inflow: 48000, outflow: 35000 },
  { month: 'Apr', inflow: 61000, outflow: 42000 },
  { month: 'May', inflow: 55000, outflow: 40000 },
  { month: 'Jun', inflow: 67000, outflow: 45000 },
];

// Mock recent activity
const mock_activity = [
  {
    id: '1',
    type: 'invoice_processed',
    title: 'Invoice #INV-2024-0156 processed',
    description: 'AI extracted $4,250.00 from vendor invoice',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    icon: FileText,
    status: 'success',
  },
  {
    id: '2',
    type: 'reconciliation',
    title: 'Bank reconciliation complete',
    description: '47 transactions matched automatically',
    timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    icon: GitCompare,
    status: 'success',
  },
  {
    id: '3',
    type: 'payment',
    title: 'Payment scheduled',
    description: '$12,500.00 to Acme Supplies - Due in 3 days',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    icon: DollarSign,
    status: 'pending',
  },
  {
    id: '4',
    type: 'alert',
    title: 'Duplicate invoice detected',
    description: 'Potential duplicate: INV-2024-0142',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    icon: AlertCircle,
    status: 'warning',
  },
  {
    id: '5',
    type: 'report',
    title: 'Monthly P&L generated',
    description: 'May 2024 profit & loss statement ready',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    icon: BarChart3,
    status: 'success',
  },
];

// Mock AI agents
const ai_agents = [
  { id: 'invoice-processor', name: 'Invoice Processor', status: 'active', tasks: 3 },
  { id: 'reconciliation', name: 'Reconciliation Agent', status: 'idle', tasks: 0 },
  { id: 'payment-scheduler', name: 'Payment Scheduler', status: 'active', tasks: 1 },
  { id: 'compliance-checker', name: 'Compliance Checker', status: 'active', tasks: 2 },
];

interface Invoice {
  id: string;
  status: string;
  amount: number;
}

interface Account {
  id: string;
  balance?: number;
}

export function DashboardHome() {
  useEffect(() => {
    const timer = setInterval(() => {}, 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get_invoices()) as Invoice[],
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get_accounts()) as Account[],
  });

  const isLoading = invoicesLoading || accountsLoading;

  // Calculate summary stats
  const total_revenue = invoices?.filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0) || 0;

  const outstanding_invoices = invoices?.filter((inv) => 
    ['pending_approval', 'approved', 'overdue'].includes(inv.status)
  ).reduce((sum, inv) => sum + inv.amount, 0) || 0;

  const bank_balance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

  const pending_tasks = invoices?.filter((inv) => inv.status === 'pending_approval').length || 0;

  const stats = [
    {
      title: 'Total Revenue',
      value: format_currency(total_revenue),
      change: '+12.5%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Outstanding Invoices',
      value: format_currency(outstanding_invoices),
      change: `${invoices?.filter((inv) => ['pending_approval', 'approved'].includes(inv.status)).length || 0} pending`,
      changeType: 'neutral',
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Bank Balance',
      value: format_currency(bank_balance),
      change: `${(accounts?.length ?? 0)} accounts`,
      changeType: 'neutral',
      icon: Landmark,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Pending Tasks',
      value: pending_tasks,
      change: 'Requires attention',
      changeType: pending_tasks > 0 ? 'warning' : 'positive',
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const quick_actions = [
    { label: 'Upload Invoice', icon: Upload, href: '/invoices' },
    { label: 'Reconcile', icon: GitCompare, href: '/reconciliation' },
    { label: 'View Reports', icon: BarChart3, href: '/reports' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your financial overview.
          </p>
        </div>
        <div className="flex gap-2">
          {quick_actions.map((action) => {
            const Icon = action.icon;
            return (
              <a key={action.label} href={action.href}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </a>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.changeType === 'positive' && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  {stat.changeType === 'warning' && (
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                  )}
                  <span className={cn(
                    'text-xs',
                    stat.changeType === 'positive' && 'text-green-500',
                    stat.changeType === 'warning' && 'text-orange-500',
                    stat.changeType === 'neutral' && 'text-muted-foreground'
                  )}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cash Flow</CardTitle>
                <CardDescription>Monthly inflow vs outflow</CardDescription>
              </div>
              <Badge variant="secondary">Last 6 months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cash_flow_data}>
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => `$${value / 1000}k`} 
                    className="text-xs"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${(value / 100).toLocaleString()}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="inflow"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorInflow)"
                    name="Inflow"
                  />
                  <Area
                    type="monotone"
                    dataKey="outflow"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorOutflow)"
                    name="Outflow"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Inflow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Outflow</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Agents Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Agents
                </CardTitle>
                <CardDescription>Active automation status</CardDescription>
              </div>
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ai_agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      agent.status === 'active' && 'bg-green-500 animate-pulse',
                      agent.status === 'idle' && 'bg-gray-400'
                    )} />
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.status === 'active' 
                          ? `Processing ${agent.tasks} task${agent.tasks !== 1 ? 's' : ''}`
                          : 'Idle'
                        }
                      </p>
                    </div>
                  </div>
                  {agent.status === 'active' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest updates and transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mock_activity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    'p-2 rounded-lg',
                    activity.status === 'success' && 'bg-green-500/10 text-green-500',
                    activity.status === 'pending' && 'bg-blue-500/10 text-blue-500',
                    activity.status === 'warning' && 'bg-orange-500/10 text-orange-500'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {format_datetime(activity.timestamp).split(',')[1]}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
