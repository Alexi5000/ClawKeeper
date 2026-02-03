import { useState } from 'react';
import { use_auth_store } from '@/stores/auth-store';
import { use_theme } from '@/hooks/use_theme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  User,
  Link2,
  Bot,
  CreditCard,
  Moon,
  Sun,
  Check,
  Settings2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Shield,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Sliders,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock integration statuses
const integrations = [
  {
    id: 'plaid',
    name: 'Plaid',
    description: 'Bank account connections and transaction sync',
    status: 'connected',
    icon: '🏦',
    lastSync: new Date(Date.now() - 3600000).toISOString(),
    accounts: 3,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing and invoicing',
    status: 'connected',
    icon: '💳',
    lastSync: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Accounting software sync',
    status: 'disconnected',
    icon: '📊',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Cloud accounting platform',
    status: 'disconnected',
    icon: '☁️',
  },
  {
    id: 'google_docs',
    name: 'Google Document AI',
    description: 'Advanced document and invoice processing',
    status: 'connected',
    icon: '📄',
    lastSync: new Date(Date.now() - 1800000).toISOString(),
  },
];

// AI Agent configurations
const ai_agents = [
  {
    id: 'invoice-processor',
    name: 'Invoice Processor',
    description: 'Extracts data from invoices using OCR and AI',
    status: 'active',
    model: 'GPT-4 Vision',
    processed: 1247,
    accuracy: 0.98,
  },
  {
    id: 'reconciliation-agent',
    name: 'Reconciliation Agent',
    description: 'Automatically matches bank transactions with book entries',
    status: 'active',
    model: 'Claude 3.5 Sonnet',
    processed: 5832,
    accuracy: 0.95,
  },
  {
    id: 'payment-scheduler',
    name: 'Payment Scheduler',
    description: 'Optimizes payment timing for cash flow',
    status: 'active',
    model: 'GPT-4',
    processed: 342,
    accuracy: 0.99,
  },
  {
    id: 'compliance-checker',
    name: 'Compliance Checker',
    description: 'Ensures transactions meet regulatory requirements',
    status: 'paused',
    model: 'Claude 3.5 Sonnet',
    processed: 892,
    accuracy: 0.97,
  },
  {
    id: 'fraud-detector',
    name: 'Fraud Detector',
    description: 'Identifies suspicious transactions and patterns',
    status: 'active',
    model: 'Custom ML Model',
    processed: 12450,
    accuracy: 0.99,
  },
  {
    id: 'report-generator',
    name: 'Report Generator',
    description: 'Creates financial reports and summaries',
    status: 'active',
    model: 'GPT-4 Turbo',
    processed: 156,
    accuracy: 0.96,
  },
];

// Billing plan mock
const billing_plan = {
  name: 'Professional',
  price: 9900,
  billingCycle: 'monthly',
  features: [
    'Unlimited invoices',
    'Bank reconciliation',
    'All AI agents',
    '10 team members',
    'Priority support',
    'Custom reports',
  ],
  usage: {
    invoices: { used: 847, limit: null },
    transactions: { used: 12450, limit: null },
    storage: { used: 4.2, limit: 50 },
    team: { used: 4, limit: 10 },
  },
};

export function SettingsPage() {
  const { user } = use_auth_store();
  const { theme, set_theme } = use_theme();
  const [active_tab, set_active_tab] = useState('profile');
  const [saving, set_saving] = useState(false);

  // Profile form state
  const [profile, set_profile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: 'Demo Company Inc.',
    phone: '+1 (555) 123-4567',
  });

  function handle_save_profile() {
    set_saving(true);
    setTimeout(() => {
      set_saving(false);
    }, 1000);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, integrations, and AI configurations
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={active_tab} onValueChange={set_active_tab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="ai-agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Agents
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={profile.name}
                    onChange={(e) => set_profile({ ...profile, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => set_profile({ ...profile, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    value={profile.company}
                    onChange={(e) => set_profile({ ...profile, company: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => set_profile({ ...profile, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handle_save_profile} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize your dashboard theme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <button
                      onClick={() => set_theme('light')}
                      className={cn(
                        'flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all',
                        theme === 'light'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      <Sun className="h-6 w-6" />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => set_theme('dark')}
                      className={cn(
                        'flex-1 p-4 rounded-lg border flex flex-col items-center gap-2 transition-all',
                        theme === 'dark'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      <Moon className="h-6 w-6" />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Theme is applied automatically when you select it
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Change</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Two-Factor Auth</p>
                        <p className="text-sm text-muted-foreground">Enhanced security</p>
                      </div>
                    </div>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
              <CardDescription>Manage your external service integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{integration.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{integration.name}</p>
                          <Badge
                            variant={integration.status === 'connected' ? 'success' : 'secondary'}
                          >
                            {integration.status === 'connected' ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Connected
                              </>
                            ) : (
                              'Not Connected'
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                        {integration.lastSync && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last sync: {new Date(integration.lastSync).toLocaleString()}
                            {integration.accounts && ` • ${integration.accounts} accounts`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.status === 'connected' ? (
                        <>
                          <Button size="sm" variant="outline">
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings2 className="h-4 w-4 mr-1" />
                            Configure
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button size="sm">
                          <Link2 className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Agents Tab */}
        <TabsContent value="ai-agents">
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Bot className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{ai_agents.filter(a => a.status === 'active').length}</p>
                      <p className="text-sm text-muted-foreground">Active Agents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Zap className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {ai_agents.reduce((sum, a) => sum + a.processed, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Items Processed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Check className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.round(ai_agents.reduce((sum, a) => sum + a.accuracy, 0) / ai_agents.length * 100)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{ai_agents.filter(a => a.status === 'paused').length}</p>
                      <p className="text-sm text-muted-foreground">Paused Agents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agents List */}
            <Card>
              <CardHeader>
                <CardTitle>AI Agent Configuration</CardTitle>
                <CardDescription>Manage and monitor your AI-powered automation agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ai_agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'p-3 rounded-lg',
                          agent.status === 'active' ? 'bg-green-500/10' : 'bg-muted'
                        )}>
                          <Bot className={cn(
                            'h-6 w-6',
                            agent.status === 'active' ? 'text-green-500' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{agent.name}</p>
                            <Badge
                              variant={agent.status === 'active' ? 'success' : 'warning'}
                            >
                              {agent.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{agent.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Model: {agent.model}</span>
                            <span>•</span>
                            <span>{agent.processed.toLocaleString()} processed</span>
                            <span>•</span>
                            <span>{Math.round(agent.accuracy * 100)}% accuracy</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Sliders className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                        {agent.status === 'active' ? (
                          <Button size="sm" variant="outline">
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your subscription and usage details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{billing_plan.name}</h3>
                      <Badge>Current Plan</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Billed {billing_plan.billingCycle}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">${(billing_plan.price / 100).toFixed(0)}</p>
                    <p className="text-sm text-muted-foreground">/month</p>
                  </div>
                </div>

                {/* Usage */}
                <h4 className="font-medium mb-4">Current Usage</h4>
                <div className="space-y-4">
                  {Object.entries(billing_plan.usage).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                        <span className="text-sm text-muted-foreground">
                          {typeof value.used === 'number' && value.used % 1 !== 0 
                            ? `${value.used} GB` 
                            : value.used.toLocaleString()
                          }
                          {value.limit && ` / ${value.limit}`}
                          {!value.limit && ' (Unlimited)'}
                        </span>
                      </div>
                      {value.limit && (
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              value.used / value.limit > 0.9 ? 'bg-red-500' :
                              value.used / value.limit > 0.7 ? 'bg-yellow-500' : 'bg-primary'
                            )}
                            style={{ width: `${Math.min((value.used / value.limit) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Plan Features & Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Plan Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {billing_plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Billing Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Update Payment Method
                  </Button>
                  <Button className="w-full" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Invoices
                  </Button>
                  <Button className="w-full">
                    Upgrade Plan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
