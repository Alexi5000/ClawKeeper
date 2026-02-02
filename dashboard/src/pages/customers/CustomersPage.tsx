import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  Users,
  Search,
  Plus,
  Edit,
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { format_currency, format_date, cn } from '@/lib/utils';

// Mock customers data
const mock_customers = [
  {
    id: 'cust-1',
    name: 'Global Corp Industries',
    email: 'accounts@globalcorp.com',
    phone: '+1 (555) 234-5678',
    address: '123 Business Ave, New York, NY 10001',
    status: 'active',
    total_invoiced: 15250000,
    outstanding: 4250000,
    invoices_count: 24,
    last_invoice: new Date(Date.now() - 7 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 365 * 86400000).toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Tech Innovations LLC',
    email: 'billing@techinnovations.com',
    phone: '+1 (555) 345-6789',
    address: '456 Tech Blvd, San Francisco, CA 94102',
    status: 'active',
    total_invoiced: 8750000,
    outstanding: 1250000,
    invoices_count: 12,
    last_invoice: new Date(Date.now() - 14 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Retail Solutions Inc',
    email: 'ap@retailsolutions.com',
    phone: '+1 (555) 456-7890',
    address: '789 Commerce St, Chicago, IL 60601',
    status: 'active',
    total_invoiced: 6320000,
    outstanding: 0,
    invoices_count: 8,
    last_invoice: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Startup Ventures',
    email: 'finance@startupventures.io',
    phone: '+1 (555) 567-8901',
    address: '321 Innovation Way, Austin, TX 78701',
    status: 'inactive',
    total_invoiced: 2150000,
    outstanding: 850000,
    invoices_count: 5,
    last_invoice: new Date(Date.now() - 60 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'cust-5',
    name: 'Enterprise Systems Co',
    email: 'payments@enterprise-sys.com',
    phone: '+1 (555) 678-9012',
    address: '555 Corporate Pkwy, Seattle, WA 98101',
    status: 'active',
    total_invoiced: 22800000,
    outstanding: 7500000,
    invoices_count: 36,
    last_invoice: new Date(Date.now() - 3 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 730 * 86400000).toISOString(),
  },
];

// Mock invoices for detail view
const mock_customer_invoices = [
  { id: 'inv-1', number: 'INV-2024-0156', amount: 425000, status: 'paid', date: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: 'inv-2', number: 'INV-2024-0142', amount: 875000, status: 'pending', date: new Date(Date.now() - 21 * 86400000).toISOString() },
  { id: 'inv-3', number: 'INV-2024-0128', amount: 1250000, status: 'paid', date: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: 'inv-4', number: 'INV-2024-0115', amount: 650000, status: 'overdue', date: new Date(Date.now() - 60 * 86400000).toISOString() },
];

export function CustomersPage() {
  const [search, set_search] = useState('');
  const [status_filter, set_status_filter] = useState('all');
  const [selected_customer, set_selected_customer] = useState<any>(null);
  const [detail_modal_open, set_detail_modal_open] = useState(false);
  const [edit_modal_open, set_edit_modal_open] = useState(false);
  const [form_data, set_form_data] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  // Filter customers
  const filtered_customers = useMemo(() => {
    return mock_customers.filter((customer) => {
      const matches_search =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase());
      const matches_status = status_filter === 'all' || customer.status === status_filter;
      return matches_search && matches_status;
    });
  }, [search, status_filter]);

  // Calculate totals
  const totals = useMemo(() => ({
    total_customers: mock_customers.length,
    active_customers: mock_customers.filter(c => c.status === 'active').length,
    total_outstanding: mock_customers.reduce((sum, c) => sum + c.outstanding, 0),
    total_invoiced: mock_customers.reduce((sum, c) => sum + c.total_invoiced, 0),
  }), []);

  function handle_view_customer(customer: any) {
    set_selected_customer(customer);
    set_detail_modal_open(true);
  }

  function handle_edit_customer(customer?: any) {
    if (customer) {
      set_form_data({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      });
      set_selected_customer(customer);
    } else {
      set_form_data({ name: '', email: '', phone: '', address: '' });
      set_selected_customer(null);
    }
    set_edit_modal_open(true);
  }

  function handle_save_customer() {
    // In real app, save to API
    console.log('Saving customer:', form_data);
    set_edit_modal_open(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer relationships and invoicing
          </p>
        </div>
        <Button onClick={() => handle_edit_customer()}>
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.total_customers}</p>
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.active_customers}</p>
                <p className="text-sm text-muted-foreground">Active Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{format_currency(totals.total_invoiced)}</p>
                <p className="text-sm text-muted-foreground">Total Invoiced</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{format_currency(totals.total_outstanding)}</p>
                <p className="text-sm text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => set_search(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={status_filter}
              onChange={(e) => set_status_filter(e.target.value)}
              className="h-10 px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Invoiced</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Last Invoice</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered_customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.invoices_count} invoices</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.status === 'active' ? 'success' : 'secondary'}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {format_currency(customer.total_invoiced)}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'font-medium',
                      customer.outstanding > 0 ? 'text-orange-500' : 'text-green-500'
                    )}>
                      {format_currency(customer.outstanding)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format_date(customer.last_invoice)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handle_view_customer(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handle_edit_customer(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered_customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No customers found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      <Modal open={detail_modal_open} onClose={() => set_detail_modal_open(false)} className="max-w-3xl">
        {selected_customer && (
          <>
            <ModalHeader>
              <ModalTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selected_customer.name}
              </ModalTitle>
              <ModalDescription>
                Customer details and invoice history
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selected_customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selected_customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selected_customer.address}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-2xl font-bold">{format_currency(selected_customer.total_invoiced)}</p>
                  <p className="text-sm text-muted-foreground">Total Invoiced</p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <p className={cn(
                    'text-2xl font-bold',
                    selected_customer.outstanding > 0 ? 'text-orange-500' : 'text-green-500'
                  )}>
                    {format_currency(selected_customer.outstanding)}
                  </p>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-2xl font-bold">{selected_customer.invoices_count}</p>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                </div>
              </div>

              {/* Invoice History */}
              <div>
                <h4 className="font-medium mb-3">Recent Invoices</h4>
                <div className="space-y-2">
                  {mock_customer_invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invoice.number}</p>
                          <p className="text-xs text-muted-foreground">{format_date(invoice.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            invoice.status === 'paid' ? 'success' :
                            invoice.status === 'pending' ? 'warning' : 'destructive'
                          }
                        >
                          {invoice.status}
                        </Badge>
                        <span className="font-medium">{format_currency(invoice.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => set_detail_modal_open(false)}>
                Close
              </Button>
              <Button onClick={() => {
                set_detail_modal_open(false);
                handle_edit_customer(selected_customer);
              }}>
                <Edit className="h-4 w-4 mr-1" />
                Edit Customer
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Add/Edit Customer Modal */}
      <Modal open={edit_modal_open} onClose={() => set_edit_modal_open(false)}>
        <ModalHeader>
          <ModalTitle>
            {selected_customer ? 'Edit Customer' : 'Add New Customer'}
          </ModalTitle>
          <ModalDescription>
            {selected_customer ? 'Update customer information' : 'Enter customer details'}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Company Name</label>
            <Input
              value={form_data.name}
              onChange={(e) => set_form_data({ ...form_data, name: e.target.value })}
              placeholder="Enter company name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              value={form_data.email}
              onChange={(e) => set_form_data({ ...form_data, email: e.target.value })}
              placeholder="accounts@company.com"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              value={form_data.phone}
              onChange={(e) => set_form_data({ ...form_data, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <Input
              value={form_data.address}
              onChange={(e) => set_form_data({ ...form_data, address: e.target.value })}
              placeholder="123 Business St, City, State ZIP"
              className="mt-1"
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => set_edit_modal_open(false)}>
            Cancel
          </Button>
          <Button onClick={handle_save_customer}>
            {selected_customer ? 'Save Changes' : 'Add Customer'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
