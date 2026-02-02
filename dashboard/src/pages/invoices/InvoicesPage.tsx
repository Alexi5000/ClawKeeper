import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  Upload,
  Check,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  DollarSign,
  FileText,
  Calendar,
  Bot,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format_currency, format_date, cn } from '@/lib/utils';
import { api } from '@/lib/api';

// Mock invoice data for demo
const mock_invoices = [
  {
    id: '1',
    invoice_number: 'INV-2024-0156',
    vendor_name: 'Acme Supplies Inc.',
    customer_email: 'billing@acme.com',
    amount: 425000,
    status: 'pending_approval',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Office supplies and equipment',
    ai_confidence: 0.98,
  },
  {
    id: '2',
    invoice_number: 'INV-2024-0155',
    vendor_name: 'Tech Solutions LLC',
    customer_email: 'accounts@techsol.com',
    amount: 1250000,
    status: 'approved',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Monthly software subscription',
    ai_confidence: 0.95,
  },
  {
    id: '3',
    invoice_number: 'INV-2024-0154',
    vendor_name: 'Global Logistics',
    customer_email: 'finance@globallog.com',
    amount: 875000,
    status: 'paid',
    due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Shipping and handling fees',
    ai_confidence: 0.92,
  },
  {
    id: '4',
    invoice_number: 'INV-2024-0153',
    vendor_name: 'Marketing Pro Agency',
    customer_email: 'billing@marketpro.com',
    amount: 350000,
    status: 'overdue',
    due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Q2 marketing campaign',
    ai_confidence: 0.88,
  },
  {
    id: '5',
    invoice_number: 'INV-2024-0152',
    vendor_name: 'Clean Services Co.',
    customer_email: 'ap@cleanservices.com',
    amount: 125000,
    status: 'pending_approval',
    due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Monthly janitorial services',
    ai_confidence: 0.99,
  },
];

const status_options = [
  { value: 'all', label: 'All Status' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function InvoicesPage() {
  const query_client = useQueryClient();
  const [search, set_search] = useState('');
  const [status_filter, set_status_filter] = useState('all');
  const [selected_ids, set_selected_ids] = useState<string[]>([]);
  const [selected_invoice, set_selected_invoice] = useState<any>(null);
  const [detail_modal_open, set_detail_modal_open] = useState(false);
  const [upload_loading, set_upload_loading] = useState(false);

  const { data: invoices = mock_invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get_invoices(),
    placeholderData: mock_invoices,
  });

  const approve_mutation = useMutation({
    mutationFn: (invoice_id: string) => api.approve_invoice(invoice_id),
    onSuccess: () => {
      query_client.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const pay_mutation = useMutation({
    mutationFn: (invoice_id: string) => api.pay_invoice(invoice_id),
    onSuccess: () => {
      query_client.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  // Filtered invoices
  const filtered_invoices = useMemo(() => {
    return (Array.isArray(invoices) ? invoices : mock_invoices).filter((invoice: any) => {
      const matches_search = 
        invoice.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
        invoice.invoice_number.toLowerCase().includes(search.toLowerCase());
      
      const matches_status = status_filter === 'all' || invoice.status === status_filter;
      
      return matches_search && matches_status;
    });
  }, [invoices, search, status_filter]);

  function handle_upload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        set_upload_loading(true);
        try {
          for (const file of Array.from(files)) {
            await api.upload_invoice(file);
          }
          query_client.invalidateQueries({ queryKey: ['invoices'] });
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          set_upload_loading(false);
        }
      }
    };
    input.click();
  }

  function handle_select_all() {
    if (selected_ids.length === filtered_invoices.length) {
      set_selected_ids([]);
    } else {
      set_selected_ids(filtered_invoices.map((inv: any) => inv.id));
    }
  }

  function handle_select(id: string) {
    if (selected_ids.includes(id)) {
      set_selected_ids(selected_ids.filter((i) => i !== id));
    } else {
      set_selected_ids([...selected_ids, id]);
    }
  }

  function handle_view_details(invoice: any) {
    set_selected_invoice(invoice);
    set_detail_modal_open(true);
  }

  function get_status_variant(status: string): 'success' | 'info' | 'warning' | 'destructive' | 'secondary' {
    switch (status) {
      case 'paid': return 'success';
      case 'approved': return 'info';
      case 'pending_approval': return 'warning';
      case 'overdue': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor invoices and payments
          </p>
        </div>
        <Button onClick={handle_upload} disabled={upload_loading}>
          {upload_loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload Invoice
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => set_search(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={status_filter}
                onChange={(e) => set_status_filter(e.target.value)}
                className="h-10 px-3 py-2 border rounded-md bg-background text-sm"
              >
                {status_options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selected_ids.length > 0 && (
            <div className="mt-4 flex items-center gap-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selected_ids.length} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Check className="h-4 w-4 mr-1" />
                  Approve Selected
                </Button>
                <Button size="sm" variant="outline">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Pay Selected
                </Button>
                <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selected_ids.length === filtered_invoices.length && filtered_invoices.length > 0}
                    onChange={handle_select_all}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer/Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>AI Confidence</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered_invoices.map((invoice: any) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected_ids.includes(invoice.id)}
                      onChange={() => handle_select(invoice.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {format_date(invoice.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{invoice.vendor_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {invoice.customer_email}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {format_currency(invoice.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={get_status_variant(invoice.status)}>
                      {invoice.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      'flex items-center gap-1',
                      invoice.status === 'overdue' && 'text-red-500'
                    )}>
                      <Calendar className="h-3 w-3" />
                      {format_date(invoice.due_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Bot className="h-3 w-3 text-primary" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            invoice.ai_confidence >= 0.95 ? 'bg-green-500' :
                            invoice.ai_confidence >= 0.85 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${invoice.ai_confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(invoice.ai_confidence * 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handle_view_details(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status === 'pending_approval' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => approve_mutation.mutate(invoice.id)}
                          disabled={approve_mutation.isPending}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {invoice.status === 'approved' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => pay_mutation.mutate(invoice.id)}
                          disabled={pay_mutation.isPending}
                        >
                          <DollarSign className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered_invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No invoices found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      <Modal open={detail_modal_open} onClose={() => set_detail_modal_open(false)} className="max-w-2xl">
        {selected_invoice && (
          <>
            <ModalHeader>
              <ModalTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selected_invoice.invoice_number}
              </ModalTitle>
              <ModalDescription>
                Invoice details and AI extraction results
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-6">
              {/* Status Banner */}
              <div className={cn(
                'p-4 rounded-lg flex items-center justify-between',
                selected_invoice.status === 'paid' && 'bg-green-500/10',
                selected_invoice.status === 'approved' && 'bg-blue-500/10',
                selected_invoice.status === 'pending_approval' && 'bg-yellow-500/10',
                selected_invoice.status === 'overdue' && 'bg-red-500/10',
              )}>
                <div>
                  <Badge variant={get_status_variant(selected_invoice.status)} className="mb-1">
                    {selected_invoice.status.replace('_', ' ')}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Due: {format_date(selected_invoice.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {format_currency(selected_invoice.amount)}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selected_invoice.vendor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selected_invoice.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format_date(selected_invoice.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{selected_invoice.description}</p>
                </div>
              </div>

              {/* AI Extraction Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="font-medium">AI Processing</span>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="font-medium">
                      {Math.round(selected_invoice.ai_confidence * 100)}%
                    </p>
                  </div>
                  <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        selected_invoice.ai_confidence >= 0.95 ? 'bg-green-500' :
                        selected_invoice.ai_confidence >= 0.85 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${selected_invoice.ai_confidence * 100}%` }}
                    />
                  </div>
                </div>
                {selected_invoice.ai_confidence < 0.90 && (
                  <div className="mt-2 flex items-center gap-2 text-yellow-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Manual review recommended
                  </div>
                )}
              </div>
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => set_detail_modal_open(false)}>
                Close
              </Button>
              {selected_invoice.status === 'pending_approval' && (
                <Button onClick={() => {
                  approve_mutation.mutate(selected_invoice.id);
                  set_detail_modal_open(false);
                }}>
                  <Check className="h-4 w-4 mr-1" />
                  Approve Invoice
                </Button>
              )}
              {selected_invoice.status === 'approved' && (
                <Button onClick={() => {
                  pay_mutation.mutate(selected_invoice.id);
                  set_detail_modal_open(false);
                }}>
                  <DollarSign className="h-4 w-4 mr-1" />
                  Pay Now
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
