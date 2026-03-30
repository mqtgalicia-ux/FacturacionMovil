import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import  Layout  from './components/Layout';
import { DashboardScreen } from "./screens/DashboardScreen";
import { CompanyScreen } from './screens/CompanyScreen';
import { ClientsScreen } from './screens/ClientsScreen';
import { InvoicesScreen } from './screens/InvoicesScreen';
import { Empresa } from './types';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [invoiceClientId, setInvoiceClientId] = useState<string | undefined>();

  // Estado global de la empresa
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadEmpresa = async () => {
      setLoadingEmpresa(true);
      try {
        const { data: empresaData, error } = await supabase
          .from('empresas')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        setEmpresa(empresaData || null); // ← aunque no haya empresa, seteamos null
      } catch (err) {
        console.error('Error al cargar empresa:', err);
        setEmpresa(null); // ← fallback para no bloquear la UI
      } finally {
        setLoadingEmpresa(false); // ← clave para que deje de mostrar “Cargando…”
      }
    };

    loadEmpresa();
  }, [user]);

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

  // Ahora se puede mostrar CompanyScreen aunque no exista empresa aún
  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {currentView === 'dashboard' && empresa && (
        <DashboardScreen empresa={empresa} />
      )}
      {currentView === 'company' && (
        <CompanyScreen
          empresa={empresa}
          setEmpresa={setEmpresa}
        />
      )}
      {currentView === 'clients' && (
        <ClientsScreen onNewInvoice={handleNewInvoice} />
      )}
      {currentView === 'invoices' && (
        <InvoicesScreen initialClientId={invoiceClientId} />
      )}
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