/*
  # Create Invoicing Application Schema

  ## New Tables

  ### `empresas` (companies)
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `nombre` (text) - Company name
    - `logo` (text) - Logo URL
    - `cif` (text) - Tax ID number
    - `direccion` (text) - Address
    - `telefono` (text) - Phone number
    - `email` (text) - Email
    - `ultimo_numero_factura` (integer) - Last invoice number
    - `politica_proteccion_datos` (text) - Data protection policy
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### `clientes` (clients)
    - `id` (uuid, primary key)
    - `empresa_id` (uuid, references empresas)
    - `nombre` (text) - Client name
    - `cif` (text) - Tax ID
    - `direccion` (text) - Address
    - `telefono` (text) - Phone
    - `email` (text) - Email
    - `precios_con_iva` (boolean) - Prices include VAT
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### `impuestos` (taxes)
    - `id` (uuid, primary key)
    - `empresa_id` (uuid, references empresas)
    - `nombre` (text) - Tax name (e.g., "IVA 21%")
    - `porcentaje` (decimal) - Tax percentage
    - `created_at` (timestamptz)

  ### `facturas` (invoices)
    - `id` (uuid, primary key)
    - `empresa_id` (uuid, references empresas)
    - `cliente_id` (uuid, references clientes)
    - `numero` (integer) - Invoice number
    - `fecha` (date) - Invoice date
    - `estado` (text) - Status: Borrador, Enviada, Pagada
    - `subtotal` (decimal) - Subtotal without taxes
    - `total_impuestos` (decimal) - Total taxes
    - `total` (decimal) - Grand total
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### `items_factura` (invoice items)
    - `id` (uuid, primary key)
    - `factura_id` (uuid, references facturas)
    - `descripcion` (text) - Item description
    - `cantidad` (decimal) - Quantity
    - `precio_unitario` (decimal) - Unit price
    - `impuesto_id` (uuid, references impuestos)
    - `subtotal` (decimal) - Line subtotal
    - `total_impuesto` (decimal) - Line tax total
    - `total` (decimal) - Line total
    - `orden` (integer) - Display order

  ## Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Cascade delete for related records
*/

-- Create empresas table
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  logo text DEFAULT '',
  cif text DEFAULT '',
  direccion text DEFAULT '',
  telefono text DEFAULT '',
  email text DEFAULT '',
  ultimo_numero_factura integer DEFAULT 0,
  politica_proteccion_datos text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies"
  ON empresas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON empresas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON empresas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create clientes table
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  cif text DEFAULT '',
  direccion text DEFAULT '',
  telefono text DEFAULT '',
  email text DEFAULT '',
  precios_con_iva boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients of their companies"
  ON clientes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients to their companies"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients of their companies"
  ON clientes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clients of their companies"
  ON clientes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = clientes.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create impuestos table
CREATE TABLE IF NOT EXISTS impuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  porcentaje decimal(5,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE impuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view taxes of their companies"
  ON impuestos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = impuestos.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert taxes to their companies"
  ON impuestos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = impuestos.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update taxes of their companies"
  ON impuestos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = impuestos.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = impuestos.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete taxes of their companies"
  ON impuestos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = impuestos.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create facturas table
CREATE TABLE IF NOT EXISTS facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE RESTRICT NOT NULL,
  numero integer NOT NULL,
  fecha date DEFAULT CURRENT_DATE,
  estado text DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Enviada', 'Pagada')),
  subtotal decimal(12,2) DEFAULT 0,
  total_impuestos decimal(12,2) DEFAULT 0,
  total decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, numero)
);

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices of their companies"
  ON facturas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoices to their companies"
  ON facturas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices of their companies"
  ON facturas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invoices of their companies"
  ON facturas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = facturas.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create items_factura table
CREATE TABLE IF NOT EXISTS items_factura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid REFERENCES facturas(id) ON DELETE CASCADE NOT NULL,
  descripcion text NOT NULL,
  cantidad decimal(10,2) NOT NULL,
  precio_unitario decimal(12,2) NOT NULL,
  impuesto_id uuid REFERENCES impuestos(id) ON DELETE RESTRICT,
  subtotal decimal(12,2) NOT NULL,
  total_impuesto decimal(12,2) DEFAULT 0,
  total decimal(12,2) NOT NULL,
  orden integer DEFAULT 0
);

ALTER TABLE items_factura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice items of their companies"
  ON items_factura FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas
      JOIN empresas ON empresas.id = facturas.empresa_id
      WHERE facturas.id = items_factura.factura_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoice items to their companies"
  ON items_factura FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas
      JOIN empresas ON empresas.id = facturas.empresa_id
      WHERE facturas.id = items_factura.factura_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoice items of their companies"
  ON items_factura FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas
      JOIN empresas ON empresas.id = facturas.empresa_id
      WHERE facturas.id = items_factura.factura_id
      AND empresas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM facturas
      JOIN empresas ON empresas.id = facturas.empresa_id
      WHERE facturas.id = items_factura.factura_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invoice items of their companies"
  ON items_factura FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas
      JOIN empresas ON empresas.id = facturas.empresa_id
      WHERE facturas.id = items_factura.factura_id
      AND empresas.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_impuestos_empresa_id ON impuestos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_empresa_id ON facturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_items_factura_factura_id ON items_factura(factura_id);