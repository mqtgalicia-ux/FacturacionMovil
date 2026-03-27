import { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Cliente, Empresa, Impuesto, Factura, ItemFactura } from '../types';

interface InvoiceFormScreenProps {
  invoiceId?: string;
  preselectedClientId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

interface InvoiceItem {
  id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  impuesto_id: string;
  subtotal: number;
  total_impuesto: number;
  total: number;
}

export function InvoiceFormScreen({ invoiceId, preselectedClientId, onSaved, onCancel }: InvoiceFormScreenProps) {
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clienteId, setClienteId] = useState(preselectedClientId || '');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [estado, setEstado] = useState<'Borrador' | 'Enviada' | 'Pagada'>('Borrador');
  const [items, setItems] = useState<InvoiceItem[]>([
    { descripcion: '', cantidad: 1, precio_unitario: 0, impuesto_id: '', subtotal: 0, total_impuesto: 0, total: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, [user, invoiceId]);

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

      const [clientesRes, impuestosRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('empresa_id', empresaData.id).order('nombre'),
        supabase.from('impuestos').select('*').eq('empresa_id', empresaData.id).order('porcentaje'),
      ]);

      if (clientesRes.error) throw clientesRes.error;
      if (impuestosRes.error) throw impuestosRes.error;

      setClientes(clientesRes.data || []);
      setImpuestos(impuestosRes.data || []);

      if (invoiceId) {
        const { data: facturaData, error: facturaError } = await supabase
          .from('facturas')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (facturaError) throw facturaError;

        setClienteId(facturaData.cliente_id);
        setFecha(facturaData.fecha);
        setEstado(facturaData.estado);

        const { data: itemsData, error: itemsError } = await supabase
          .from('items_factura')
          .select('*')
          .eq('factura_id', invoiceId)
          .order('orden');

        if (itemsError) throw itemsError;

        if (itemsData && itemsData.length > 0) {
          setItems(
            itemsData.map((item: ItemFactura) => ({
              id: item.id,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              impuesto_id: item.impuesto_id || '',
              subtotal: item.subtotal,
              total_impuesto: item.total_impuesto,
              total: item.total,
            }))
          );
        }
      } else if (impuestosRes.data && impuestosRes.data.length > 0) {
        setItems([
          {
            descripcion: '',
            cantidad: 1,
            precio_unitario: 0,
            impuesto_id: impuestosRes.data[0].id,
            subtotal: 0,
            total_impuesto: 0,
            total: 0,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotals = (
    cantidad: number,
    precio: number,
    impuestoId: string,
    preciosConIva: boolean
  ) => {
    const impuesto = impuestos.find((i) => i.id === impuestoId);
    const porcentaje = impuesto ? impuesto.porcentaje / 100 : 0;

    let subtotal: number;
    let totalImpuesto: number;
    let total: number;

    if (preciosConIva) {
      total = cantidad * precio;
      subtotal = total / (1 + porcentaje);
      totalImpuesto = total - subtotal;
    } else {
      subtotal = cantidad * precio;
      totalImpuesto = subtotal * porcentaje;
      total = subtotal + totalImpuesto;
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      total_impuesto: Number(totalImpuesto.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'cantidad' || field === 'precio_unitario' || field === 'impuesto_id') {
      const cliente = clientes.find((c) => c.id === clienteId);
      const preciosConIva = cliente?.precios_con_iva ?? true;

      const totals = calculateItemTotals(
        newItems[index].cantidad,
        newItems[index].precio_unitario,
        newItems[index].impuesto_id,
        preciosConIva
      );

      newItems[index] = { ...newItems[index], ...totals };
    }

    setItems(newItems);
  };

  const handleAddItem = () => {
    const defaultImpuestoId = impuestos.length > 0 ? impuestos[0].id : '';
    setItems([
      ...items,
      {
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        impuesto_id: defaultImpuestoId,
        subtotal: 0,
        total_impuesto: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setError('Debe haber al menos un item en la factura');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresa || !clienteId) {
      setError('Selecciona un cliente');
      return;
    }

    if (items.length === 0 || items.some((item) => !item.descripcion)) {
      setError('Completa todos los items de la factura');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const totalImpuestos = items.reduce((sum, item) => sum + item.total_impuesto, 0);
      const total = items.reduce((sum, item) => sum + item.total, 0);

      let facturaId = invoiceId;
      let numero: number;

      if (invoiceId) {
        const { error: updateError } = await supabase
          .from('facturas')
          .update({
            cliente_id: clienteId,
            fecha,
            estado,
            subtotal,
            total_impuestos: totalImpuestos,
            total,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);

        if (updateError) throw updateError;

        const { error: deleteItemsError } = await supabase
          .from('items_factura')
          .delete()
          .eq('factura_id', invoiceId);

        if (deleteItemsError) throw deleteItemsError;
      } else {
        numero = empresa.ultimo_numero_factura + 1;

        const { data: facturaData, error: insertError } = await supabase
          .from('facturas')
          .insert({
            empresa_id: empresa.id,
            cliente_id: clienteId,
            numero,
            fecha,
            estado,
            subtotal,
            total_impuestos: totalImpuestos,
            total,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        facturaId = facturaData.id;

        const { error: updateEmpresaError } = await supabase
          .from('empresas')
          .update({ ultimo_numero_factura: numero })
          .eq('id', empresa.id);

        if (updateEmpresaError) throw updateEmpresaError;
      }

      const itemsToInsert = items.map((item, index) => ({
        factura_id: facturaId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        impuesto_id: item.impuesto_id || null,
        subtotal: item.subtotal,
        total_impuesto: item.total_impuesto,
        total: item.total,
        orden: index,
      }));

      const { error: itemsError } = await supabase
        .from('items_factura')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar factura');
    } finally {
      setSaving(false);
    }
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

  const totales = {
    subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
    impuestos: items.reduce((sum, item) => sum + item.total_impuesto, 0),
    total: items.reduce((sum, item) => sum + item.total, 0),
  };

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {invoiceId ? 'Editar Factura' : 'Nueva Factura'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as 'Borrador' | 'Enviada' | 'Pagada')}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Borrador">Borrador</option>
                <option value="Enviada">Enviada</option>
                <option value="Pagada">Pagada</option>
              </select>
            </div>
          </div>

          {clienteSeleccionado && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              Precios {clienteSeleccionado.precios_con_iva ? 'con' : 'sin'} IVA
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Items de la Factura</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Añadir Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={item.descripcion}
                      onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                      placeholder="Descripción del servicio/producto"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Precio</label>
                      <input
                        type="number"
                        value={item.precio_unitario}
                        onChange={(e) => handleItemChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Impuesto</label>
                      <select
                        value={item.impuesto_id}
                        onChange={(e) => handleItemChange(index, 'impuesto_id', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {impuestos.map((impuesto) => (
                          <option key={impuesto.id} value={impuesto.id}>
                            {impuesto.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Total</label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-900">
                        {item.total.toFixed(2)}€
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 flex gap-4">
                    <span>Base: {item.subtotal.toFixed(2)}€</span>
                    <span>Impuesto: {item.total_impuesto.toFixed(2)}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">{totales.subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Impuestos:</span>
              <span className="font-medium text-gray-900">{totales.impuestos.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">{totales.total.toFixed(2)}€</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar Factura'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
