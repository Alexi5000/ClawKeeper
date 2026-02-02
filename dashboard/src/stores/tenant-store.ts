import { create } from 'zustand';

interface TenantSettings {
  theme?: 'light' | 'dark';
  currency?: string;
  timezone?: string;
  logo_url?: string;
  primary_color?: string;
}

interface Tenant {
  id: string;
  name: string;
  settings: TenantSettings;
  status: 'active' | 'suspended' | 'deleted';
}

interface TenantState {
  tenant: Tenant | null;
  set_tenant: (tenant: Tenant) => void;
  update_settings: (settings: Partial<TenantSettings>) => void;
}

export const use_tenant_store = create<TenantState>((set) => ({
  tenant: null,

  set_tenant: (tenant) => set({ tenant }),

  update_settings: (settings) =>
    set((state) => ({
      tenant: state.tenant
        ? {
            ...state.tenant,
            settings: { ...state.tenant.settings, ...settings },
          }
        : null,
    })),
}));
