export interface Empresa {
  id: string;
  user_id: string;
  nombre: string;
  logo: string;
  cif: string;
  direccion: string;
  telefono: string;
  email: string;
  ultimo_numero_factura: number;
  politica_proteccion_datos: string;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  empresa_id: string;
  nombre: string;
  cif: string;
  direccion: string;
  telefono: string;
  email: string;
  precios_con_iva: boolean;
  created_at: string;
  updated_at: string;
}

export interface Impuesto {
  id: string;
  empresa_id: string;
  nombre: string;
  porcentaje: number;
  created_at: string;
}

export interface Factura {
  id: string;
  empresa_id: string;
  cliente_id: string;
  numero: number;
  fecha: string;
  estado: 'Borrador' | 'Enviada' | 'Pagada';
  subtotal: number;
  total_impuestos: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface ItemFactura {
  id: string;
  factura_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  impuesto_id: string | null;
  subtotal: number;
  total_impuesto: number;
  total: number;
  orden: number;
}
