import { useState, useEffect } from 'react';
import { FileText, Plus, CreditCard as Edit2, Eye, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Empresa, Factura, Cliente } from '../types';
import { InvoiceFormScreen } from './InvoiceFormScreen';
import { generateInvoicePDF } from '../utils/pdfGenerator';

interface FacturaWithClient extends Factura {
  cliente: Cliente;
}

interface InvoicesScreenProps {
  initialClientId?: string;
}

export function InvoicesScreen({ initialClientId }: InvoicesScreenProps) {
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [facturas, setFacturas] = useState<FacturaWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(initialClientId);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (initialClientId) {
      setPreselectedClientId(initialClientId);
      setShowForm(true);
    }
  }, [initialClientId]);

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

      const { data: facturasData, error: facturasError } = await supabase
        .from('facturas')
        .select(`
          *,
          clientes:cliente_id (*)
        `)
        .eq('empresa_id', empresaData.id)
        .order('numero', { ascending: false });

      if (facturasError) throw facturasError;

      setFacturas(
        (facturasData || []).map((f: any) => ({
          ...f,
          cliente: f.clientes,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invoiceId: string) => {
    setEditingInvoiceId(invoiceId);
    setPreselectedClientId(undefined);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingInvoiceId(null);
    setPreselectedClientId(undefined);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingInvoiceId(null);
    setPreselectedClientId(undefined);
    loadData();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingInvoiceId(null);
    setPreselectedClientId(undefined);
  };

  const handleViewPDF = async (factura: FacturaWithClient) => {
    if (!empresa) return;

    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items_factura')
        .select('*, impuestos:impuesto_id (*)')
        .eq('factura_id', factura.id)
        .order('orden');

      if (itemsError) throw itemsError;

      const pdfBlob = await generateInvoicePDF(empresa, factura, factura.cliente, itemsData || []);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar PDF');
    }
  };

  const handleDownloadPDF = async (factura: FacturaWithClient) => {
    if (!empresa) return;

    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items_factura')
        .select('*, impuestos:impuesto_id (*)')
        .eq('factura_id', factura.id)
        .order('orden');

      if (itemsError) throw itemsError;

      const pdfBlob = await generateInvoicePDF(empresa, factura, factura.cliente, itemsData || []);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${factura.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar PDF');
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      Borrador: 'bg-gray-100 text-gray-800',
      Enviada: 'bg-blue-100 text-blue-800',
      Pagada: 'bg-green-100 text-green-800',
    };
    return colors[estado as keyof typeof colors] || colors.Borrador;
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
      <InvoiceFormScreen
        invoiceId={editingInvoiceId || undefined}
        preselectedClientId={preselectedClientId}
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
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Facturas</h2>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Factura
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {facturas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay facturas</h3>
          <p className="text-gray-600 mb-4">Comienza creando tu primera factura</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Factura
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {facturas.map((factura) => (
            <div
              key={factura.id}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      Factura #{factura.numero}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getEstadoBadge(factura.estado)}`}>
                      {factura.estado}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>{factura.cliente.nombre}</div>
                    <div className="text-xs mt-1">{new Date(factura.fecha).toLocaleDateString('es-ES')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{factura.total.toFixed(2)}€</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Base: {factura.subtotal.toFixed(2)}€ + IVA: {factura.total_impuestos.toFixed(2)}€
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(factura.id)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleViewPDF(factura)}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver PDF
                </button>
                <button
                  onClick={() => handleDownloadPDF(factura)}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
