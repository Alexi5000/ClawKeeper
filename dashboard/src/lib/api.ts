// API client for ClawKeeper dashboard

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9100';

class ApiClient {
  private get_headers(): HeadersInit {
    const token = localStorage.getItem('clawkeeper_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  private async fetch_json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...this.get_headers(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.fetch_json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async get_current_user() {
    return this.fetch_json('/api/auth/me');
  }

  // Invoices
  async get_invoices(filters?: { status?: string; limit?: number }) {
    const params = new URLSearchParams(filters as any);
    return this.fetch_json(`/api/invoices?${params}`);
  }

  async upload_invoice(file: File) {
    const form_data = new FormData();
    form_data.append('file', file);

    const token = localStorage.getItem('clawkeeper_token');
    const response = await fetch(`${BASE_URL}/api/invoices/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: form_data,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  async approve_invoice(invoice_id: string) {
    return this.fetch_json(`/api/invoices/${invoice_id}/approve`, {
      method: 'POST',
    });
  }

  async pay_invoice(invoice_id: string, payment_method: string = 'stripe') {
    return this.fetch_json(`/api/invoices/${invoice_id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ payment_method }),
    });
  }

  // Reports
  async generate_report(type: string, start_date: string, end_date: string) {
    return this.fetch_json(`/api/reports/${type}`, {
      method: 'POST',
      body: JSON.stringify({ start_date, end_date }),
    });
  }

  // Reconciliation
  async start_reconciliation(account_id: string, start_date: string, end_date: string) {
    return this.fetch_json('/api/reconciliation/start', {
      method: 'POST',
      body: JSON.stringify({ account_id, start_date, end_date }),
    });
  }

  async get_reconciliation_status(task_id: string) {
    return this.fetch_json(`/api/reconciliation/${task_id}/status`);
  }

  // Agents
  async get_agent_status() {
    return this.fetch_json('/api/agents/status');
  }

  async execute_agent_task(agent_id: string, task: {
    task_name: string;
    description: string;
    parameters?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  }) {
    return this.fetch_json(`/api/agents/${agent_id}/execute`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async get_agent_runs(agent_id: string, limit: number = 20) {
    return this.fetch_json(`/api/agents/${agent_id}/runs?limit=${limit}`);
  }

  async get_agent_templates(agent_id: string) {
    return this.fetch_json(`/api/agents/${agent_id}/templates`);
  }

  // Accounts
  async get_accounts() {
    return this.fetch_json('/api/accounts');
  }

  // Dashboard
  async get_dashboard_summary() {
    return this.fetch_json('/api/dashboard/summary');
  }

  // Activity Feed
  async get_activity(filters?: { limit?: number; offset?: number; agent_id?: string; entity_type?: string }) {
    const params = new URLSearchParams(filters as any);
    return this.fetch_json(`/api/activity?${params}`);
  }

  // Vendors
  async get_vendors(filters?: { limit?: number; offset?: number; status?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    return this.fetch_json(`/api/vendors?${params}`);
  }

  async get_vendor(vendor_id: string) {
    return this.fetch_json(`/api/vendors/${vendor_id}`);
  }

  async create_vendor(vendor: any) {
    return this.fetch_json('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(vendor),
    });
  }

  async update_vendor(vendor_id: string, vendor: any) {
    return this.fetch_json(`/api/vendors/${vendor_id}`, {
      method: 'PUT',
      body: JSON.stringify(vendor),
    });
  }

  async delete_vendor(vendor_id: string) {
    return this.fetch_json(`/api/vendors/${vendor_id}`, {
      method: 'DELETE',
    });
  }

  // Customers
  async get_customers(filters?: { limit?: number; offset?: number; status?: string; search?: string }) {
    const params = new URLSearchParams(filters as any);
    return this.fetch_json(`/api/customers?${params}`);
  }

  async get_customer(customer_id: string) {
    return this.fetch_json(`/api/customers/${customer_id}`);
  }

  async create_customer(customer: any) {
    return this.fetch_json('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async update_customer(customer_id: string, customer: any) {
    return this.fetch_json(`/api/customers/${customer_id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  }

  async delete_customer(customer_id: string) {
    return this.fetch_json(`/api/customers/${customer_id}`, {
      method: 'DELETE',
    });
  }

  // Metrics
  async get_cash_flow(period: 'monthly' | 'quarterly' | 'yearly' = 'monthly', limit: number = 12) {
    return this.fetch_json(`/api/metrics/cash-flow?period=${period}&limit=${limit}`);
  }

  // Orchestration - Command Center
  async create_orchestration_plan(command: string) {
    return this.fetch_json<{ plan: OrchestrationPlan }>('/api/agents/orchestrate/plan', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  }

  async get_orchestration_plan(plan_id: string) {
    return this.fetch_json<{ plan: OrchestrationPlan }>(`/api/agents/orchestrate/plan/${plan_id}`);
  }

  async execute_orchestration_plan(plan_id: string) {
    return this.fetch_json<{ result: OrchestrationResult }>(`/api/agents/orchestrate/execute/${plan_id}`, {
      method: 'POST',
    });
  }

  async execute_orchestration_plan_stream(
    plan_id: string, 
    on_event: (event: OrchestrationEvent) => void
  ): Promise<OrchestrationResult> {
    const token = localStorage.getItem('clawkeeper_token');
    
    const response = await fetch(`${BASE_URL}/api/agents/orchestrate/execute/${plan_id}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming execution');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let result: OrchestrationResult | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          // Skip event type line, data follows
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data) {
            try {
              const event = JSON.parse(data);
              if (event.plan_id) {
                on_event(event);
              } else if (event.status) {
                // This is the final result
                result = event;
              }
            } catch (e) {
              console.warn('Failed to parse SSE event:', data);
            }
          }
        }
      }
    }

    if (!result) {
      throw new Error('No result received from stream');
    }

    return result;
  }

  async orchestrate(command: string, auto_execute: boolean = false) {
    return this.fetch_json<{ plan: OrchestrationPlan; result?: OrchestrationResult }>('/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ command, auto_execute }),
    });
  }
}

export const api = new ApiClient();
