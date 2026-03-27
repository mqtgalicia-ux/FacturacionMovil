import { useState, useEffect } from 'react';
import { Users, Plus, CreditCard as Edit2, ChevronRight, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Cliente, Empresa, Factura } from '../types';
import { ClientForm } from '../components/ClientForm';

interface ClientWithStats extends Cliente {
  invoice_count: number;
  total_sales: number;
}

interface ClientsScreenProps {
  onNewInvoice?: (clientId: string) => void;
}

export function ClientsScreen({ onNewInvoice }: ClientsScreenProps) {
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empresaError) throw empresaError;
      if (!empresaData) {
        setError('Por favor, configura tu empresa primero');
        setLoading(false);
        return;
      }

      setEmpresa(empresaData);

      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .order('nombre', { ascending: true });

      if (clientsError) throw clientsError;

      const { data: facturasData, error: facturasError } = await supabase
        .from('facturas')
        .select('cliente_id, total')
        .eq('empresa_id', empresaData.id);

      if (facturasError) throw facturasError;

      const clientsWithStats = (clientsData || []).map((client) => {
        const clientInvoices = (facturasData || []).filter(
          (f: Factura) => f.cliente_id === client.id
        );
        return {
          ...client,
          invoice_count: clientInvoices.length,
          total_sales: clientInvoices.reduce((sum: number, inv: Factura) => sum + inv.total, 0),
        };
      });

      setClients(clientsWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Cliente) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingClient(null);
    loadData();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        Por favor, configura tu empresa en la sección de Empresa primero.
      </div>
    );
  }

  if (showForm) {
    return (
      <ClientForm
        empresa={empresa}
        client={editingClient}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {clients.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
          <p className="text-gray-600 mb-4">Comienza añadiendo tu primer cliente</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Añadir Cliente
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{client.nombre}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{client.cif || 'Sin CIF'}</span>
                    <span>{client.telefono || 'Sin teléfono'}</span>
                  </div>
                </div>
                {onNewInvoice && (
                  <button
                    onClick={() => onNewInvoice(client.id)}
                    className="flex items-center gap-2 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Nueva Factura
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">
                    {client.invoice_count} {client.invoice_count === 1 ? 'factura' : 'facturas'}
                  </span>
                  <span className="font-semibold text-gray-900">
                    Total: {client.total_sales.toFixed(2)}€
                  </span>
                </div>
                <button
                  onClick={() => handleEdit(client)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
