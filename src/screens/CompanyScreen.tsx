import { useState, useEffect } from 'react';
import { Building2, Save, Trash2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Empresa, Impuesto } from '../types';

interface CompanyScreenProps {
  empresa: Empresa | null;
  setEmpresa: (empresa: Empresa | null) => void;
}



export function CompanyScreen({ empresa, setEmpresa }: CompanyScreenProps) {
  const { user } = useAuth();
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    logo: '',
    cif: '',
    direccion: '',
    telefono: '',
    email: '',
    politica_proteccion_datos: '',
  });

  const [newTax, setNewTax] = useState({ nombre: '', porcentaje: '' });

  useEffect(() => {
    loadEmpresa();
  }, [user]);

  const loadEmpresa = async () => {
    if (!user) return;

    try {
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empresaError) throw empresaError;

      if (empresaData) {
        setEmpresa(empresaData);
        setFormData({
          nombre: empresaData.nombre,
          logo: empresaData.logo,
          cif: empresaData.cif,
          direccion: empresaData.direccion,
          telefono: empresaData.telefono,
          email: empresaData.email,
          politica_proteccion_datos: empresaData.politica_proteccion_datos,
        });

        const { data: impuestosData, error: impuestosError } = await supabase
          .from('impuestos')
          .select('*')
          .eq('empresa_id', empresaData.id)
          .order('porcentaje', { ascending: true });

        if (impuestosError) throw impuestosError;
        setImpuestos(impuestosData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !formData.nombre) {
      setError('El nombre de la empresa es obligatorio');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (empresa) {
        const { error: updateError } = await supabase
          .from('empresas')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', empresa.id);

        if (updateError) throw updateError;
        setSuccess('Empresa actualizada correctamente');
      } else {
        const { data, error: insertError } = await supabase
          .from('empresas')
          .insert({
            ...formData,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setEmpresa(data);
        setSuccess('Empresa creada correctamente');

        const defaultTaxes = [
          { nombre: 'IVA 21%', porcentaje: 21 },
          { nombre: 'IVA 10%', porcentaje: 10 },
          { nombre: 'IVA 4%', porcentaje: 4 },
          { nombre: 'Exento', porcentaje: 0 },
        ];

        const { error: taxError } = await supabase.from('impuestos').insert(
          defaultTaxes.map((tax) => ({
            ...tax,
            empresa_id: data.id,
          }))
        );

        if (taxError) throw taxError;
        loadEmpresa();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!empresa || !confirm('¿Estás seguro? Esto eliminará toda la información relacionada (clientes, facturas, etc.)')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('empresas')
        .delete()
        .eq('id', empresa.id);

      if (deleteError) throw deleteError;

      setEmpresa(null);
      setImpuestos([]);
      setFormData({
        nombre: '',
        logo: '',
        cif: '',
        direccion: '',
        telefono: '',
        email: '',
        politica_proteccion_datos: '',
      });
      setSuccess('Empresa eliminada correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar empresa');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTax = async () => {
    if (!empresa || !newTax.nombre || !newTax.porcentaje) {
      setError('Complete el nombre y porcentaje del impuesto');
      return;
    }

    try {
      const { error: insertError } = await supabase.from('impuestos').insert({
        nombre: newTax.nombre,
        porcentaje: parseFloat(newTax.porcentaje),
        empresa_id: empresa.id,
      });

      if (insertError) throw insertError;
      setNewTax({ nombre: '', porcentaje: '' });
      loadEmpresa();
      setSuccess('Impuesto añadido correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al añadir impuesto');
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    if (!confirm('¿Eliminar este impuesto?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('impuestos')
        .delete()
        .eq('id', taxId);

      if (deleteError) throw deleteError;
      loadEmpresa();
      setSuccess('Impuesto eliminado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar impuesto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Administración de Empresa</h2>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mi Empresa S.L."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo (URL)
            </label>
            <input
              type="text"
              value={formData.logo}
              onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CIF
            </label>
            <input
              type="text"
              value={formData.cif}
              onChange={(e) => setFormData({ ...formData, cif: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="B12345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Calle Example 123, 28001 Madrid"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+34 600 000 000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="contacto@miempresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Política de Protección de Datos
            </label>
            <textarea
              value={formData.politica_proteccion_datos}
              onChange={(e) => setFormData({ ...formData, politica_proteccion_datos: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Información sobre protección de datos..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : empresa ? 'Actualizar' : 'Crear Empresa'}
            </button>

            {empresa && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>

      {empresa && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Impuestos</h3>

          <div className="space-y-2 mb-4">
            {impuestos.map((tax) => (
              <div
                key={tax.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">{tax.nombre}</span>
                  <span className="text-gray-600 ml-2">({tax.porcentaje}%)</span>
                </div>
                <button
                  onClick={() => handleDeleteTax(tax.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTax.nombre}
              onChange={(e) => setNewTax({ ...newTax, nombre: e.target.value })}
              placeholder="Nombre (ej: IVA 21%)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="number"
              value={newTax.porcentaje}
              onChange={(e) => setNewTax({ ...newTax, porcentaje: e.target.value })}
              placeholder="%"
              step="0.01"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddTax}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
