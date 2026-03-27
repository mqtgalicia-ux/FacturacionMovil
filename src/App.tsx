import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { CompanyScreen } from './screens/CompanyScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { InvoicesScreen } from './screens/InvoicesScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('company');
  const [invoiceClientId, setInvoiceClientId] = useState<string | undefined>();

  const handleNewInvoice = (clientId: string) => {
    setInvoiceClientId(clientId);
    setCurrentView('invoices');
  };

  const handleNavigate = (view: string) => {
    setInvoiceClientId(undefined);
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {currentView === 'company' && <CompanyScreen />}
      {currentView === 'clients' && <ClientsScreen onNewInvoice={handleNewInvoice} />}
      {currentView === 'invoices' && <InvoicesScreen initialClientId={invoiceClientId} />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
