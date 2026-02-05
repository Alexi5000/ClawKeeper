import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  CheckCircle2,
  AlertCircle,
  Search,
  Building2,
  Bot,
  Loader2,
  RefreshCw,
  Check,
  X,
  Link2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { format_currency, format_date, cn } from '@/lib/utils';
import { api } from '@/lib/api';

// Mock bank accounts
const mock_accounts = [
  { id: 'acc-1', name: 'Business Checking', institution: 'Chase Bank', balance: 12450000, last_sync: new Date(Date.now() - 3600000).toISOString() },
  { id: 'acc-2', name: 'Business Savings', institution: 'Chase Bank', balance: 8500000, last_sync: new Date(Date.now() - 7200000).toISOString() },
  { id: 'acc-3', name: 'Operating Account', institution: 'Bank of America', balance: 5320000, last_sync: new Date(Date.now() - 1800000).toISOString() },
];

// Mock unmatched transactions
const mock_bank_transactions = [
  { id: 'bt-1', date: new Date(Date.now() - 86400000).toISOString(), description: 'ACME SUPPLIES INC', amount: -425000, type: 'debit' },
  { id: 'bt-2', date: new Date(Date.now() - 172800000).toISOString(), description: 'TECH SOLUTIONS LLC', amount: -1250000, type: 'debit' },
  { id: 'bt-3', date: new Date(Date.now() - 259200000).toISOString(), description: 'CUSTOMER PAYMENT - INV1001', amount: 875000, type: 'credit' },
  { id: 'bt-4', date: new Date(Date.now() - 345600000).toISOString(), description: 'WIRE TRANSFER - REF#5521', amount: 2500000, type: 'credit' },
  { id: 'bt-5', date: new Date(Date.now() - 432000000).toISOString(), description: 'MARKETING PRO AGENCY', amount: -350000, type: 'debit' },
];

// Mock book entries
const mock_book_entries = [
  { id: 'be-1', date: new Date(Date.now() - 90000000).toISOString(), description: 'Invoice #INV-2024-0156 - Acme Supplies', amount: -425000, reference: 'INV-2024-0156' },
  { id: 'be-2', date: new Date(Date.now() - 180000000).toISOString(), description: 'Invoice #INV-2024-0155 - Tech Solutions', amount: -1250000, reference: 'INV-2024-0155' },
  { id: 'be-3', date: new Date(Date.now() - 270000000).toISOString(), description: 'Customer Payment - Global Corp', amount: 875000, reference: 'PAY-1001' },
  { id: 'be-4', date: new Date(Date.now() - 360000000).toISOString(), description: 'Wire Transfer Received', amount: 2500000, reference: 'WIR-5521' },
  { id: 'be-5', date: new Date(Date.now() - 450000000).toISOString(), description: 'Invoice #INV-2024-0153 - Marketing Pro', amount: -350000, reference: 'INV-2024-0153' },
];

// AI-suggested matches
const mock_suggested_matches = [
  {
    id: 'match-1',
    bank_transaction: mock_bank_transactions[0],
    book_entry: mock_book_entries[0],
    confidence: 0.98,
    reason: 'Exact amount match, vendor name similarity',
  },
  {
    id: 'match-2',
    bank_transaction: mock_bank_transactions[1],
    book_entry: mock_book_entries[1],
    confidence: 0.95,
    reason: 'Exact amount match, date proximity',
  },
  {
    id: 'match-3',
    bank_transaction: mock_bank_transactions[2],
    book_entry: mock_book_entries[2],
    confidence: 0.92,
    reason: 'Amount match, reference number detected',
  },
];

export function ReconciliationPage() {
  const [selected_account, set_selected_account] = useState('');
  const [search, set_search] = useState('');
  const [matched_ids, set_matched_ids] = useState<string[]>([]);
  const [reconciling, set_reconciling] = useState(false);

  const { data: accounts_data } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get_accounts(),
    placeholderData: { accounts: mock_accounts },
  });
  
  const accounts = Array.isArray(accounts_data) ? accounts_data : (accounts_data?.accounts || mock_accounts);

  // Filter suggested matches based on search
  const filtered_matches = useMemo(() => {
    if (!search) return mock_suggested_matches.filter(m => !matched_ids.includes(m.id));
    const searchLower = search.toLowerCase();
    return mock_suggested_matches.filter((match) => {
      const inBank = match.bank_transaction.description.toLowerCase().includes(searchLower);
      const inBook = match.book_entry.description.toLowerCase().includes(searchLower);
      return (inBank || inBook) && !matched_ids.includes(match.id);
    });
  }, [search, matched_ids]);

  // Calculate reconciliation stats
  const stats = {
    total_transactions: mock_bank_transactions.length,
    matched: matched_ids.length,
    pending: mock_suggested_matches.length - matched_ids.length,
    unmatched: mock_bank_transactions.length - mock_suggested_matches.length,
  };

  function handle_match(match_id: string) {
    set_matched_ids([...matched_ids, match_id]);
  }

  function handle_reject_match(match_id: string) {
    // In real app, this would flag the match as rejected
    console.log('Rejected match:', match_id);
  }

  function start_reconciliation() {
    if (!selected_account) return;
    set_reconciling(true);
    setTimeout(() => {
      set_reconciling(false);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
          <p className="text-muted-foreground mt-1">
            Match transactions and resolve discrepancies with AI assistance
          </p>
        </div>
        <Button
          onClick={start_reconciliation}
          disabled={!selected_account || reconciling}
        >
          {reconciling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {reconciling ? 'Processing...' : 'Sync & Reconcile'}
        </Button>
      </div>

      {/* Account Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Account Selector */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Bank Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts.map((account: any) => (
                <button
                  key={account.id}
                  onClick={() => set_selected_account(account.id)}
                  className={cn(
                    'w-full p-4 rounded-lg border text-left transition-all',
                    selected_account === account.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{format_currency(account.balance)}</p>
                      <p className="text-xs text-muted-foreground">
                        Synced {format_date(account.last_sync)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-3xl font-bold">{stats.matched}</p>
                <p className="text-xs text-muted-foreground">transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-3xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">suggested matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggested Matches */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI-Suggested Matches
              </CardTitle>
              <CardDescription>
                Review and confirm AI-detected transaction matches
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => set_search(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered_matches.length > 0 ? (
            <div className="space-y-4">
              {filtered_matches.map((match) => (
                <div
                  key={match.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Bank Transaction */}
                    <div className="flex-1 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-medium text-blue-500">Bank Transaction</span>
                      </div>
                      <p className="font-medium text-sm">{match.bank_transaction.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format_date(match.bank_transaction.date)}
                        </span>
                        <span className={cn(
                          'font-semibold',
                          match.bank_transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                        )}>
                          {match.bank_transaction.type === 'credit' ? '+' : ''}
                          {format_currency(match.bank_transaction.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Match Indicator */}
                    <div className="flex flex-col items-center gap-1 pt-4">
                      <Link2 className="h-5 w-5 text-primary" />
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          'text-xs font-medium',
                          match.confidence >= 0.95 ? 'text-green-500' :
                          match.confidence >= 0.85 ? 'text-yellow-500' : 'text-red-500'
                        )}>
                          {Math.round(match.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Book Entry */}
                    <div className="flex-1 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-purple-500" />
                        <span className="text-xs font-medium text-purple-500">Book Entry</span>
                      </div>
                      <p className="font-medium text-sm">{match.book_entry.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          Ref: {match.book_entry.reference}
                        </span>
                        <span className={cn(
                          'font-semibold',
                          match.book_entry.amount > 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {match.book_entry.amount > 0 ? '+' : ''}
                          {format_currency(match.book_entry.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handle_match(match.id)}
                        className="w-20"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Match
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handle_reject_match(match.id)}
                        className="w-20"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {/* AI Reason */}
                  <div className="mt-3 pt-3 border-t flex items-center gap-2">
                    <Bot className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{match.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/50" />
              <p className="mt-2 text-muted-foreground">
                {matched_ids.length > 0 
                  ? 'All suggested matches have been reviewed!'
                  : 'No matches found for your search criteria'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unmatched Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unmatched Bank Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Unmatched Bank Transactions</CardTitle>
                <CardDescription>Transactions without matching book entries</CardDescription>
              </div>
              <Badge variant="warning">{mock_bank_transactions.length - mock_suggested_matches.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mock_bank_transactions.slice(3).map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      txn.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                    )}>
                      {txn.type === 'credit' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{format_date(txn.date)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'font-semibold',
                    txn.type === 'credit' ? 'text-green-500' : 'text-red-500'
                  )}>
                    {txn.type === 'credit' ? '+' : ''}{format_currency(txn.amount)}
                  </span>
                </div>
              ))}
              {mock_bank_transactions.length <= 3 && (
                <p className="text-center text-muted-foreground py-4">
                  No unmatched transactions
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unmatched Book Entries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Unmatched Book Entries</CardTitle>
                <CardDescription>Entries without matching bank transactions</CardDescription>
              </div>
              <Badge variant="warning">{mock_book_entries.length - mock_suggested_matches.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mock_book_entries.slice(3).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      entry.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    )}>
                      {entry.amount > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">Ref: {entry.reference}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'font-semibold',
                    entry.amount > 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {entry.amount > 0 ? '+' : ''}{format_currency(entry.amount)}
                  </span>
                </div>
              ))}
              {mock_book_entries.length <= 3 && (
                <p className="text-center text-muted-foreground py-4">
                  No unmatched entries
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
