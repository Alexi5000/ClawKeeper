// file: dashboard/src/hooks/use_theme.ts
// description: Theme management hook with localStorage persistence and DOM updates
// reference: dashboard/src/stores/tenant-store.ts, dashboard/src/pages/settings/SettingsPage.tsx

import { useEffect, useRef } from 'react';
import { use_tenant_store } from '../stores/tenant-store';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'clawkeeper-theme';

export function use_theme() {
  const { tenant, update_settings } = use_tenant_store();
  const current_theme = tenant?.settings?.theme || 'dark';
  const initialized = useRef(false);

  const set_theme = (theme: Theme) => {
    // Update Zustand store
    update_settings({ theme });

    // Update localStorage
    localStorage.setItem(STORAGE_KEY, theme);

    // Update DOM
    apply_theme_to_dom(theme);
  };

  const toggle_theme = () => {
    set_theme(current_theme === 'dark' ? 'light' : 'dark');
  };

  // Initialize theme on mount only once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const stored_theme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    
    if (stored_theme) {
      // Apply stored theme to DOM
      apply_theme_to_dom(stored_theme);
      
      // Only update store if different (avoid triggering re-render)
      if (stored_theme !== current_theme) {
        update_settings({ theme: stored_theme });
      }
    } else {
      // No stored theme, use current and apply to DOM
      apply_theme_to_dom(current_theme);
    }
  }, []);

  return {
    theme: current_theme,
    set_theme,
    toggle_theme,
  };
}

function apply_theme_to_dom(theme: Theme) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
