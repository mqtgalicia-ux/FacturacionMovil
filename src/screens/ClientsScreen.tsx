import { useState, useEffect } from 'react';
import { Users, Plus, CreditCard as Edit2, ChevronRight, FileText, Eye, X, MoreVertical, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Cliente, Empresa } from '../types';
import { ClientForm } from '../components/ClientForm';
import { generateInvoicePDF } from '../utils/pdfGenerator';

interface ClientWithStats extends Cliente {
  invoice_count: number;
  total_facturado: number;
  total_pagado: number;
  total_pendiente: number;
  total_borrador: number;
}

interface ClientsScreenProps {
  onNewInvoice?: (clientId: string) => void;
  onEditInvoice?: (invoiceId: string) => void;
}

export function ClientsScreen({ onNewInvoice, onEditInvoice }: ClientsScreenProps) {
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [facturas, setFacturas] = useState<any[]>([]); // Lista de facturas del cliente seleccionado
  const [loadingFacturas, setLoadingFacturas] = useState(false); // Para mostrar cargando
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null); // Cliente cuyo listado de facturas mostrar
  const [search, setSearch] = useState('');
  
  const [menuFactura, setMenuFactura] = useState<string | null>(null);

  const loadFacturas = async (clienteId: string) => {
    setLoadingFacturas(true);
    try {
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });

    if (error) throw error;
    setFacturas(data || []);
    } catch (err) {
    console.error('Error al cargar facturas:', err);
    setFacturas([]);
    } finally {
    setLoadingFacturas(false);
    }
  };


const marcarPagada = async (facturaId: string) => {
  try {
    const { error } = await supabase
      .from('facturas')
      .update({ estado: 'Pagada' })
      .eq('id', facturaId);

    if (error) throw error;

    // refrescar lista
    if (clienteSeleccionado) {
      loadFacturas(clienteSeleccionado.id);
    }

  } catch (err) {
    console.error('Error actualizando factura', err);
  }
};



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
      .from('clientes_con_stats')
      .select('*')
      .eq('empresa_id', empresaData.id)
      .order('nombre', { ascending: true });

      if (clientsError) throw clientsError;

      setClients((clientsData || []) as ClientWithStats[]);
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

const filteredClients = clients.filter(client =>
  client.nombre.toLowerCase().includes(search.toLowerCase())
);


  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        </div>

<div className="relative">
  <input
    type="text"
    placeholder="Buscar cliente..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="border border-gray-300 rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  {search && (
    <button
      onClick={() => setSearch('')}
      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      ✖
    </button>
  )}
</div>


        <button
  onClick={handleNew}
  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors flex items-center justify-center"
  title="Agregar Cliente"
>
  <Plus className="w-5 h-5" />
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
          {filteredClients.map((client) => (
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

              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm">
                  
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">

              <span className="text-gray-600 flex items-center gap-1">
                🧾 {client.invoice_count} facturas
              </span>

              <span className="text-blue-600 font-semibold flex items-center gap-1">
                💰 {client.total_facturado.toFixed(2)}€
              </span>

              <span className="text-green-600 font-semibold flex items-center gap-1">
                ✅ {client.total_pagado.toFixed(2)}€
              </span>

              <span className="text-orange-600 font-semibold flex items-center gap-1">
                ⏳ {client.total_borrador.toFixed(2)}€
              </span>

<button
  onClick={() => {
    if (clienteSeleccionado?.id === client.id) {
      setClienteSeleccionado(null);
    } else {
      setClienteSeleccionado(client);
      loadFacturas(client.id);
    }
  }}
  className="flex items-center gap-1 bg-gray-100 text-gray-700 py-1 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
>
  {clienteSeleccionado?.id === client.id ? (
    <>
      <X className="w-4 h-4 text-red-500" />
      Ocultar
    </>
  ) : (
    <>
      <Eye className="w-4 h-4 text-gray-700" />
      Ver facturas
    </>
  )}
</button>





              
              </div>
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

{clienteSeleccionado?.id === client.id && (
  <div className="bg-gray-50 p-3 mt-3 rounded-lg border border-gray-200">
    <h4 className="font-semibold mb-2">Facturas de {clienteSeleccionado.nombre}</h4>

    {loadingFacturas ? (
      <div>Cargando facturas...</div>
    ) : facturas.length === 0 ? (
      <div>No hay facturas</div>
    ) : (
     <div className="space-y-2">
  {facturas.map((f) => (
    <div
      key={f.id}
      className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">#{f.numero}</span>

          {f.estado === "Pagada" && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              🟢 Pagada
            </span>
          )}

          {f.estado === "Enviada" && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
              🔴 Pendiente
            </span>
          )}

          {f.estado === "Borrador" && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
              🟠 Borrador
            </span>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-1">
          {new Date(f.fecha).toLocaleDateString()}
        </div>

        <div className="font-bold text-blue-600 mt-1">
          {f.total.toFixed(2)}€
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() =>
            setMenuFactura(menuFactura === f.id ? null : f.id)
          }
          className="p-2 rounded hover:bg-gray-100"
        >
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </button>

        {menuFactura === f.id && (
          <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">

            <button
              onClick={async () => {
                if (!empresa || !clienteSeleccionado) return;

                try {
                  const { data: items, error } = await supabase
                    .from("items_factura")
                    .select(`*, impuestos (*)`)
                    .eq("factura_id", f.id);

                  if (error) throw error;

                  const pdfBlob = await generateInvoicePDF(
                    empresa,
                    f,
                    clienteSeleccionado,
                    items || []
                  );

                  const url = URL.createObjectURL(pdfBlob);
                  window.open(url);
                } catch (err) {
                  console.error("Error generando PDF:", err);
                }
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
            >
              <FileText className="w-4 h-4" />
              Ver PDF
            </button>

            <button
              onClick={() => marcarPagada(f.id)}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <CheckCircle className="w-4 h-4" />
              Marcar pagada
            </button>

          </div>
        )}
      </div>
    </div>
  ))}
</div>
    )}
  </div>
)}




            </div>
          ))}
        </div>
      )}
    </div>
  );
}
