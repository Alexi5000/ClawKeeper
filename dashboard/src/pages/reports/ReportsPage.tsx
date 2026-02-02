import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  BarChart3,
  FileText,
  Download,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  Calendar,
  Loader2,
  ChevronRight,
  Clock,
  CheckCircle2,
  Printer,
  Mail,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format_currency, cn } from '@/lib/utils';
import { api } from '@/lib/api';

const report_types = [
  {
    id: 'profit_loss',
    name: 'Profit & Loss',
    description: 'Income and expenses summary',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'balance_sheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities, and equity',
    icon: BarChart3,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'cash_flow',
    name: 'Cash Flow Statement',
    description: 'Cash inflows and outflows',
    icon: DollarSign,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'ar_aging',
    name: 'AR Aging',
    description: 'Accounts receivable by age',
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'ap_aging',
    name: 'AP Aging',
    description: 'Accounts payable by age',
    icon: FileText,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
];

// Mock P&L data
const mock_pl_data = {
  revenue: [
    { category: 'Product Sales', amount: 12500000 },
    { category: 'Services', amount: 8750000 },
    { category: 'Subscriptions', amount: 4200000 },
    { category: 'Other Income', amount: 550000 },
  ],
  expenses: [
    { category: 'Salaries', amount: 6500000 },
    { category: 'Marketing', amount: 2100000 },
    { category: 'Operations', amount: 1800000 },
    { category: 'Software', amount: 850000 },
    { category: 'Office', amount: 650000 },
    { category: 'Other', amount: 450000 },
  ],
  total_revenue: 26000000,
  total_expenses: 12350000,
  net_income: 13650000,
};

// Mock Balance Sheet data
const mock_balance_sheet = {
  assets: [
    { name: 'Cash & Equivalents', amount: 15200000 },
    { name: 'Accounts Receivable', amount: 8500000 },
    { name: 'Inventory', amount: 3200000 },
    { name: 'Fixed Assets', amount: 12000000 },
  ],
  liabilities: [
    { name: 'Accounts Payable', amount: 4500000 },
    { name: 'Short-term Debt', amount: 2000000 },
    { name: 'Long-term Debt', amount: 8000000 },
  ],
  equity: [
    { name: 'Common Stock', amount: 5000000 },
    { name: 'Retained Earnings', amount: 19400000 },
  ],
};

// Mock AR Aging data
const mock_ar_aging = [
  { period: 'Current', amount: 3500000, percentage: 41 },
  { period: '1-30 Days', amount: 2100000, percentage: 25 },
  { period: '31-60 Days', amount: 1500000, percentage: 18 },
  { period: '61-90 Days', amount: 850000, percentage: 10 },
  { period: '90+ Days', amount: 550000, percentage: 6 },
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ReportsPage() {
  const [selected_report, set_selected_report] = useState('profit_loss');
  const [start_date, set_start_date] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [end_date, set_end_date] = useState(() => new Date().toISOString().split('T')[0]);
  const [generated_data, set_generated_data] = useState<any>(null);

  const generate_mutation = useMutation({
    mutationFn: () => api.generate_report(selected_report, start_date, end_date),
    onSuccess: (data) => {
      set_generated_data(data);
    },
  });

  function handle_generate() {
    // For demo purposes, use mock data
    switch (selected_report) {
      case 'profit_loss':
        set_generated_data(mock_pl_data);
        break;
      case 'balance_sheet':
        set_generated_data(mock_balance_sheet);
        break;
      case 'ar_aging':
      case 'ap_aging':
        set_generated_data(mock_ar_aging);
        break;
      default:
        set_generated_data(mock_pl_data);
    }
  }

  function render_pl_report() {
    if (!generated_data) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-green-500">
              {format_currency(generated_data.total_revenue)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500">
              {format_currency(generated_data.total_expenses)}
            </p>
          </div>
          <div className={cn(
            'p-4 rounded-lg border',
            generated_data.net_income >= 0
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-orange-500/10 border-orange-500/20'
          )}>
            <p className="text-sm text-muted-foreground">Net Income</p>
            <p className={cn(
              'text-2xl font-bold',
              generated_data.net_income >= 0 ? 'text-blue-500' : 'text-orange-500'
            )}>
              {format_currency(generated_data.net_income)}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div>
            <h4 className="font-medium mb-4">Revenue Breakdown</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={generated_data.revenue}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {generated_data.revenue.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => format_currency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div>
            <h4 className="font-medium mb-4">Expense Breakdown</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generated_data.expenses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `$${v / 100000}k`} />
                  <YAxis dataKey="category" type="category" width={100} />
                  <Tooltip formatter={(value: number) => format_currency(value)} />
                  <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Revenue</h4>
            <div className="space-y-2">
              {generated_data.revenue.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-sm">{item.category}</span>
                  <span className="font-medium text-green-500">{format_currency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Expenses</h4>
            <div className="space-y-2">
              {generated_data.expenses.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-sm">{item.category}</span>
                  <span className="font-medium text-red-500">{format_currency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function render_aging_report() {
    if (!generated_data) return null;

    return (
      <div className="space-y-6">
        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={generated_data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(v) => `$${v / 100000}k`} />
              <Tooltip formatter={(value: number) => format_currency(value)} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="space-y-2">
          {generated_data.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  index === 0 ? 'bg-green-500' :
                  index === 1 ? 'bg-blue-500' :
                  index === 2 ? 'bg-yellow-500' :
                  index === 3 ? 'bg-orange-500' : 'bg-red-500'
                )} />
                <span className="font-medium">{item.period}</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary">{item.percentage}%</Badge>
                <span className="font-semibold w-32 text-right">{format_currency(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function render_balance_sheet() {
    if (!generated_data) return null;

    const total_assets = generated_data.assets.reduce((sum: number, a: any) => sum + a.amount, 0);
    const total_liabilities = generated_data.liabilities.reduce((sum: number, l: any) => sum + l.amount, 0);
    const total_equity = generated_data.equity.reduce((sum: number, e: any) => sum + e.amount, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-500">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {generated_data.assets.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{format_currency(item.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Total Assets</span>
                  <span className="text-blue-500">{format_currency(total_assets)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-red-500">Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {generated_data.liabilities.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{format_currency(item.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Total Liabilities</span>
                  <span className="text-red-500">{format_currency(total_liabilities)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-green-500">Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {generated_data.equity.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{format_currency(item.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Total Equity</span>
                  <span className="text-green-500">{format_currency(total_equity)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equation Check */}
        <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-center gap-4">
          <span className="font-medium">Assets ({format_currency(total_assets)})</span>
          <span>=</span>
          <span className="font-medium">Liabilities ({format_currency(total_liabilities)})</span>
          <span>+</span>
          <span className="font-medium">Equity ({format_currency(total_equity)})</span>
          {total_assets === total_liabilities + total_equity && (
            <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
          )}
        </div>
      </div>
    );
  }

  function render_report_preview() {
    if (!generated_data) {
      return (
        <div className="text-center py-16">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">
            Select a report type and date range, then click Generate Report
          </p>
        </div>
      );
    }

    switch (selected_report) {
      case 'profit_loss':
        return render_pl_report();
      case 'balance_sheet':
        return render_balance_sheet();
      case 'ar_aging':
      case 'ap_aging':
        return render_aging_report();
      default:
        return render_pl_report();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and export financial statements
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selector Sidebar */}
        <div className="space-y-4">
          {/* Report Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report_types.map((report) => {
                const Icon = report.icon;
                const is_selected = selected_report === report.id;
                return (
                  <button
                    key={report.id}
                    onClick={() => {
                      set_selected_report(report.id);
                      set_generated_data(null);
                    }}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all flex items-center gap-3',
                      is_selected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg',
                      is_selected ? 'bg-primary-foreground/20' : report.bgColor
                    )}>
                      <Icon className={cn('h-4 w-4', is_selected ? 'text-primary-foreground' : report.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className={cn(
                        'text-xs truncate',
                        is_selected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {report.description}
                      </p>
                    </div>
                    {is_selected && <ChevronRight className="h-4 w-4" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={start_date}
                  onChange={(e) => set_start_date(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={end_date}
                  onChange={(e) => set_end_date(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handle_generate}
                disabled={generate_mutation.isPending}
              >
                {generate_mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {report_types.find((r) => r.id === selected_report)?.name || 'Report'} Preview
                </CardTitle>
                <CardDescription>
                  {start_date} to {end_date}
                </CardDescription>
              </div>
              {generated_data && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {render_report_preview()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
