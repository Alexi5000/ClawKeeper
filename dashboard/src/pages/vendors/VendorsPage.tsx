import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  Truck,
  Search,
  Plus,
  Edit,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Eye,
  CreditCard,
  Clock,
  CheckCircle2,
  BanknoteIcon,
} from 'lucide-react';
import { format_currency, format_date, cn } from '@/lib/utils';

// Mock vendors data
const mock_vendors = [
  {
    id: 'vend-1',
    name: 'Acme Supplies Inc.',
    email: 'billing@acme.com',
    phone: '+1 (555) 111-2222',
    address: '100 Supplier Lane, Boston, MA 02101',
    status: 'active',
    category: 'Office Supplies',
    total_paid: 8250000,
    outstanding: 425000,
    invoices_count: 18,
    last_payment: new Date(Date.now() - 5 * 86400000).toISOString(),
    payment_terms: 'Net 30',
    created_at: new Date(Date.now() - 400 * 86400000).toISOString(),
  },
  {
    id: 'vend-2',
    name: 'Tech Solutions LLC',
    email: 'accounts@techsol.com',
    phone: '+1 (555) 222-3333',
    address: '200 Tech Park, San Jose, CA 95110',
    status: 'active',
    category: 'Software',
    total_paid: 15600000,
    outstanding: 1250000,
    invoices_count: 36,
    last_payment: new Date(Date.now() - 12 * 86400000).toISOString(),
    payment_terms: 'Net 45',
    created_at: new Date(Date.now() - 600 * 86400000).toISOString(),
  },
  {
    id: 'vend-3',
    name: 'Global Logistics',
    email: 'finance@globallog.com',
    phone: '+1 (555) 333-4444',
    address: '300 Shipping Blvd, Miami, FL 33101',
    status: 'active',
    category: 'Shipping',
    total_paid: 4750000,
    outstanding: 875000,
    invoices_count: 24,
    last_payment: new Date(Date.now() - 8 * 86400000).toISOString(),
    payment_terms: 'Net 15',
    created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
  },
  {
    id: 'vend-4',
    name: 'Marketing Pro Agency',
    email: 'billing@marketpro.com',
    phone: '+1 (555) 444-5555',
    address: '400 Creative Ave, Los Angeles, CA 90001',
    status: 'active',
    category: 'Marketing',
    total_paid: 6200000,
    outstanding: 350000,
    invoices_count: 12,
    last_payment: new Date(Date.now() - 20 * 86400000).toISOString(),
    payment_terms: 'Net 30',
    created_at: new Date(Date.now() - 150 * 86400000).toISOString(),
  },
  {
    id: 'vend-5',
    name: 'Clean Services Co.',
    email: 'ap@cleanservices.com',
    phone: '+1 (555) 555-6666',
    address: '500 Service Rd, Denver, CO 80201',
    status: 'inactive',
    category: 'Facilities',
    total_paid: 1850000,
    outstanding: 0,
    invoices_count: 24,
    last_payment: new Date(Date.now() - 90 * 86400000).toISOString(),
    payment_terms: 'Net 30',
    created_at: new Date(Date.now() - 365 * 86400000).toISOString(),
  },
];

// Mock payment history
const mock_payment_history = [
  { id: 'pay-1', date: new Date(Date.now() - 5 * 86400000).toISOString(), amount: 425000, method: 'ACH', reference: 'PAY-2024-0156', invoice: 'INV-2024-0142' },
  { id: 'pay-2', date: new Date(Date.now() - 35 * 86400000).toISOString(), amount: 875000, method: 'Wire', reference: 'PAY-2024-0128', invoice: 'INV-2024-0115' },
  { id: 'pay-3', date: new Date(Date.now() - 65 * 86400000).toISOString(), amount: 650000, method: 'ACH', reference: 'PAY-2024-0098', invoice: 'INV-2024-0088' },
  { id: 'pay-4', date: new Date(Date.now() - 95 * 86400000).toISOString(), amount: 1250000, method: 'Check', reference: 'PAY-2024-0067', invoice: 'INV-2024-0055' },
];

const category_colors: Record<string, string> = {
  'Office Supplies': 'bg-blue-500/10 text-blue-500',
  'Software': 'bg-purple-500/10 text-purple-500',
  'Shipping': 'bg-green-500/10 text-green-500',
  'Marketing': 'bg-pink-500/10 text-pink-500',
  'Facilities': 'bg-orange-500/10 text-orange-500',
};

export function VendorsPage() {
  const [search, set_search] = useState('');
  const [status_filter, set_status_filter] = useState('all');
  const [category_filter, set_category_filter] = useState('all');
  const [selected_vendor, set_selected_vendor] = useState<any>(null);
  const [detail_modal_open, set_detail_modal_open] = useState(false);
  const [edit_modal_open, set_edit_modal_open] = useState(false);
  const [form_data, set_form_data] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    category: '',
    payment_terms: 'Net 30',
  });

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(mock_vendors.map(v => v.category)));
  }, []);

  // Filter vendors
  const filtered_vendors = useMemo(() => {
    return mock_vendors.filter((vendor) => {
      const matches_search =
        vendor.name.toLowerCase().includes(search.toLowerCase()) ||
        vendor.email.toLowerCase().includes(search.toLowerCase());
      const matches_status = status_filter === 'all' || vendor.status === status_filter;
      const matches_category = category_filter === 'all' || vendor.category === category_filter;
      return matches_search && matches_status && matches_category;
    });
  }, [search, status_filter, category_filter]);

  // Calculate totals
  const totals = useMemo(() => ({
    total_vendors: mock_vendors.length,
    active_vendors: mock_vendors.filter(v => v.status === 'active').length,
    total_outstanding: mock_vendors.reduce((sum, v) => sum + v.outstanding, 0),
    total_paid: mock_vendors.reduce((sum, v) => sum + v.total_paid, 0),
  }), []);

  function handle_view_vendor(vendor: any) {
    set_selected_vendor(vendor);
    set_detail_modal_open(true);
  }

  function handle_edit_vendor(vendor?: any) {
    if (vendor) {
      set_form_data({
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        category: vendor.category,
        payment_terms: vendor.payment_terms,
      });
      set_selected_vendor(vendor);
    } else {
      set_form_data({ name: '', email: '', phone: '', address: '', category: '', payment_terms: 'Net 30' });
      set_selected_vendor(null);
    }
    set_edit_modal_open(true);
  }

  function handle_save_vendor() {
    console.log('Saving vendor:', form_data);
    set_edit_modal_open(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground mt-1">
            Manage your vendors and payment history
          </p>
        </div>
        <Button onClick={() => handle_edit_vendor()}>
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.total_vendors}</p>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
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
                <p className="text-2xl font-bold">{totals.active_vendors}</p>
                <p className="text-sm text-muted-foreground">Active Vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BanknoteIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{format_currency(totals.total_paid)}</p>
                <p className="text-sm text-muted-foreground">Total Paid</p>
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
                placeholder="Search vendors..."
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
            <select
              value={category_filter}
              onChange={(e) => set_category_filter(e.target.value)}
              className="h-10 px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered_vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        <p className="text-xs text-muted-foreground">{vendor.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={category_colors[vendor.category] || 'bg-gray-500/10 text-gray-500'}>
                      {vendor.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={vendor.status === 'active' ? 'success' : 'secondary'}>
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vendor.payment_terms}
                  </TableCell>
                  <TableCell className="font-medium">
                    {format_currency(vendor.total_paid)}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'font-medium',
                      vendor.outstanding > 0 ? 'text-orange-500' : 'text-green-500'
                    )}>
                      {format_currency(vendor.outstanding)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format_date(vendor.last_payment)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handle_view_vendor(vendor)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handle_edit_vendor(vendor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered_vendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No vendors found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vendor Detail Modal */}
      <Modal open={detail_modal_open} onClose={() => set_detail_modal_open(false)} className="max-w-3xl">
        {selected_vendor && (
          <>
            <ModalHeader>
              <ModalTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {selected_vendor.name}
              </ModalTitle>
              <ModalDescription>
                Vendor details and payment history
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selected_vendor.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selected_vendor.phone}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selected_vendor.address}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border text-center">
                  <Badge className={category_colors[selected_vendor.category] || ''}>
                    {selected_vendor.category}
                  </Badge>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-xl font-bold">{format_currency(selected_vendor.total_paid)}</p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <p className={cn(
                    'text-xl font-bold',
                    selected_vendor.outstanding > 0 ? 'text-orange-500' : 'text-green-500'
                  )}>
                    {format_currency(selected_vendor.outstanding)}
                  </p>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </div>
                <div className="p-4 rounded-lg border text-center">
                  <p className="text-xl font-bold">{selected_vendor.payment_terms}</p>
                  <p className="text-xs text-muted-foreground">Payment Terms</p>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-medium mb-3">Payment History</h4>
                <div className="space-y-2">
                  {mock_payment_history.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <CreditCard className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.reference}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format_date(payment.date)}</span>
                            <span>•</span>
                            <span>{payment.method}</span>
                            <span>•</span>
                            <span>For: {payment.invoice}</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-semibold text-green-500">
                        -{format_currency(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => set_detail_modal_open(false)}>
                Close
              </Button>
              <Button variant="outline">
                <DollarSign className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
              <Button onClick={() => {
                set_detail_modal_open(false);
                handle_edit_vendor(selected_vendor);
              }}>
                <Edit className="h-4 w-4 mr-1" />
                Edit Vendor
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Add/Edit Vendor Modal */}
      <Modal open={edit_modal_open} onClose={() => set_edit_modal_open(false)}>
        <ModalHeader>
          <ModalTitle>
            {selected_vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </ModalTitle>
          <ModalDescription>
            {selected_vendor ? 'Update vendor information' : 'Enter vendor details'}
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
              placeholder="billing@company.com"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <label className="text-sm font-medium">Category</label>
              <select
                value={form_data.category}
                onChange={(e) => set_form_data({ ...form_data, category: e.target.value })}
                className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm mt-1"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <Input
              value={form_data.address}
              onChange={(e) => set_form_data({ ...form_data, address: e.target.value })}
              placeholder="123 Supplier St, City, State ZIP"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Payment Terms</label>
            <select
              value={form_data.payment_terms}
              onChange={(e) => set_form_data({ ...form_data, payment_terms: e.target.value })}
              className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm mt-1"
            >
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
              <option value="Due on Receipt">Due on Receipt</option>
            </select>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => set_edit_modal_open(false)}>
            Cancel
          </Button>
          <Button onClick={handle_save_vendor}>
            {selected_vendor ? 'Save Changes' : 'Add Vendor'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
