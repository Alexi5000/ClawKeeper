import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { use_auth_store } from './stores/auth-store';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { ReconciliationPage } from './pages/reconciliation/ReconciliationPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { VendorsPage } from './pages/vendors/VendorsPage';
import { AgentsPage } from './pages/agents/AgentsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { is_authenticated } = use_auth_store();
  
  if (!is_authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Dashboard */}
        <Route path="/" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
        
        {/* Finance */}
        <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
        <Route path="/reconciliation" element={<ProtectedRoute><ReconciliationPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        
        {/* Contacts */}
        <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute><VendorsPage /></ProtectedRoute>} />
        
        {/* System */}
        <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
