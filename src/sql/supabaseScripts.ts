/**
 * ============================================================================
 * SCRIPT SQL 1: SUPABASE MAESTRO (DEL CREADOR / ADMINISTRADOR DEL SOFTWARE)
 * Ejecutar en el SQL Editor del proyecto Supabase Maestro.
 * ============================================================================
 */
export const MASTER_SUPABASE_SQL = `-- ============================================================================
-- SYSPOS COLOMBIA - BASE DE DATOS MAESTRA (LICENCIAS Y AUTENTICACIÓN)
-- Ejecutar en el SQL Editor de TU Supabase Maestro (Administrador)
-- ============================================================================

-- 1. Extensión para cifrado seguro de contraseñas (bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabla de licencias de clientes
CREATE TABLE IF NOT EXISTS public.licencias_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario text UNIQUE NOT NULL,
  clave_hash text NOT NULL,
  nombre_negocio text NOT NULL,
  telefono text,
  fecha_vencimiento date NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  ultimo_acceso timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licencias_usuario
  ON public.licencias_clientes (lower(trim(usuario)));

-- 3. Seguridad RLS: Bloquear lectura/escritura directa con anon key
ALTER TABLE public.licencias_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bloquear acceso directo anon" ON public.licencias_clientes;
CREATE POLICY "Bloquear acceso directo anon"
  ON public.licencias_clientes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 4. Trigger de actualización automática de timestamp
CREATE OR REPLACE FUNCTION public.actualizar_timestamp_licencia()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_licencias_updated_at ON public.licencias_clientes;
CREATE TRIGGER trg_licencias_updated_at
  BEFORE UPDATE ON public.licencias_clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_timestamp_licencia();

-- 5. Función RPC segura: Iniciar sesión y validar licencia contra hora del servidor
CREATE OR REPLACE FUNCTION public.iniciar_sesion_y_validar(
  p_usuario text,
  p_clave text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_usuario_norm text;
  v_reg public.licencias_clientes%ROWTYPE;
  v_fecha_servidor date;
  v_dias_restantes integer;
  v_licencia_valida boolean;
  v_mensaje text;
BEGIN
  v_usuario_norm := lower(trim(COALESCE(p_usuario, '')));
  v_fecha_servidor := (now() AT TIME ZONE 'America/Bogota')::date;

  IF v_usuario_norm = '' OR COALESCE(p_clave, '') = '' THEN
    RETURN jsonb_build_object(
      'autenticado', false,
      'licencia_valida', false,
      'mensaje', 'Debes ingresar usuario y contraseña.'
    );
  END IF;

  SELECT *
    INTO v_reg
    FROM public.licencias_clientes
   WHERE lower(trim(usuario)) = v_usuario_norm
   LIMIT 1;

  IF NOT FOUND OR v_reg.clave_hash <> crypt(p_clave, v_reg.clave_hash) THEN
    RETURN jsonb_build_object(
      'autenticado', false,
      'licencia_valida', false,
      'mensaje', 'Usuario o contraseña incorrectos.'
    );
  END IF;

  v_dias_restantes := (v_reg.fecha_vencimiento - v_fecha_servidor);
  v_licencia_valida := (v_reg.activo = true AND v_reg.fecha_vencimiento >= v_fecha_servidor);

  IF NOT v_reg.activo THEN
    v_mensaje := 'Licencia suspendida por el administrador.';
  ELSIF v_reg.fecha_vencimiento < v_fecha_servidor THEN
    v_mensaje := 'Tu suscripción mensual venció el ' || to_char(v_reg.fecha_vencimiento, 'DD/MM/YYYY') || '.';
  ELSE
    v_mensaje := 'Licencia activa.';
    UPDATE public.licencias_clientes
       SET ultimo_acceso = now()
     WHERE id = v_reg.id;
  END IF;

  RETURN jsonb_build_object(
    'autenticado', true,
    'licencia_valida', v_licencia_valida,
    'licencia_id', v_reg.id,
    'usuario', v_reg.usuario,
    'nombre_negocio', v_reg.nombre_negocio,
    'activo', v_reg.activo,
    'fecha_vencimiento', v_reg.fecha_vencimiento,
    'fecha_servidor', v_fecha_servidor,
    'dias_restantes', v_dias_restantes,
    'mensaje', v_mensaje
  );
END;
$$;

-- 6. Función RPC para revalidar la licencia cada vez que el cliente abre o recarga la app
CREATE OR REPLACE FUNCTION public.verificar_licencia_actual(
  p_licencia_id uuid,
  p_usuario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_usuario_norm text;
  v_reg public.licencias_clientes%ROWTYPE;
  v_fecha_servidor date;
  v_dias_restantes integer;
  v_licencia_valida boolean;
  v_mensaje text;
BEGIN
  v_usuario_norm := lower(trim(COALESCE(p_usuario, '')));
  v_fecha_servidor := (now() AT TIME ZONE 'America/Bogota')::date;

  SELECT *
    INTO v_reg
    FROM public.licencias_clientes
   WHERE id = p_licencia_id
     AND lower(trim(usuario)) = v_usuario_norm
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'autenticado', false,
      'licencia_valida', false,
      'mensaje', 'La sesión de licencia ya no existe.'
    );
  END IF;

  v_dias_restantes := (v_reg.fecha_vencimiento - v_fecha_servidor);
  v_licencia_valida := (v_reg.activo = true AND v_reg.fecha_vencimiento >= v_fecha_servidor);

  IF NOT v_reg.activo THEN
    v_mensaje := 'Licencia suspendida por el administrador.';
  ELSIF v_reg.fecha_vencimiento < v_fecha_servidor THEN
    v_mensaje := 'Tu suscripción mensual venció el ' || to_char(v_reg.fecha_vencimiento, 'DD/MM/YYYY') || '.';
  ELSE
    v_mensaje := 'Licencia activa.';
  END IF;

  RETURN jsonb_build_object(
    'autenticado', true,
    'licencia_valida', v_licencia_valida,
    'licencia_id', v_reg.id,
    'usuario', v_reg.usuario,
    'nombre_negocio', v_reg.nombre_negocio,
    'activo', v_reg.activo,
    'fecha_vencimiento', v_reg.fecha_vencimiento,
    'fecha_servidor', v_fecha_servidor,
    'dias_restantes', v_dias_restantes,
    'mensaje', v_mensaje
  );
END;
$$;

-- Permisos de ejecución para el cliente web (anon)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_sesion_y_validar(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_licencia_actual(uuid, text) TO anon, authenticated;

-- ============================================================================
-- EJEMPLO PARA REGISTRAR UN CLIENTE NUEVO DESDE EL SQL EDITOR DEL MAESTRO:
-- INSERT INTO public.licencias_clientes (usuario, clave_hash, nombre_negocio, telefono, fecha_vencimiento, activo)
-- VALUES (
--   'tienda.centro@ejemplo.com',
--   crypt('ClaveSegura2026!', gen_salt('bf')),
--   'Celulares El Centro SAS',
--   '3001234567',
--   (CURRENT_DATE + INTERVAL '30 days')::date,
--   true
-- );
-- ============================================================================`;

/**
 * ============================================================================
 * SCRIPT SQL 2: SUPABASE DEL CLIENTE (BASE DE DATOS OPERATIVA DEL NEGOCIO)
 * Copiable con un clic desde la vista Configuración para ejecutar en el
 * Supabase personal de cada cliente.
 * ============================================================================
 */
export const CLIENT_SUPABASE_SQL = `-- ============================================================================
-- SYSPOS COLOMBIA - BASE DE DATOS OPERATIVA DEL CLIENTE
-- Ejecutar en el SQL Editor del proyecto Supabase personal del negocio
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Configuración del negocio y formato de impresión
CREATE TABLE IF NOT EXISTS public.config_negocio (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_negocio text NOT NULL DEFAULT 'Mi Negocio POS',
  nit text DEFAULT '',
  direccion text DEFAULT '',
  telefono text DEFAULT '',
  tamano_ticket text NOT NULL DEFAULT '80mm' CHECK (tamano_ticket IN ('80mm', '58mm')),
  pie_ticket text DEFAULT '¡Gracias por su compra!',
  logo_url text DEFAULT '',
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- 2. Catálogo de productos e inventario (inicia vacío)
CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_barras text UNIQUE,
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'General',
  precio_costo integer NOT NULL DEFAULT 0 CHECK (precio_costo >= 0),
  precio_venta integer NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON public.productos (codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos (categoria);

-- 3. Taller de reparaciones (recepción de celulares, computadores y otros)
CREATE TABLE IF NOT EXISTS public.reparaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orden text UNIQUE NOT NULL,
  tipo_equipo text NOT NULL CHECK (tipo_equipo IN ('Teléfono / Celular', 'Computador / Portátil', 'Otro dispositivo')),
  nombre_cliente text NOT NULL,
  whatsapp text NOT NULL,
  marca_modelo text NOT NULL,
  imei_serie text DEFAULT '',
  clave_desbloqueo text DEFAULT '',
  falla_reportada text NOT NULL,
  accesorios text DEFAULT '',
  valor_estimado integer NOT NULL DEFAULT 0 CHECK (valor_estimado >= 0),
  abono_inicial integer NOT NULL DEFAULT 0 CHECK (abono_inicial >= 0),
  saldo_pendiente integer NOT NULL DEFAULT 0 CHECK (saldo_pendiente >= 0),
  estado text NOT NULL DEFAULT 'Recibido' CHECK (
    estado IN ('Recibido', 'En revisión', 'Esperando repuesto', 'Listo para entregar', 'Entregado')
  ),
  cobrado_en_pos boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reparaciones_estado ON public.reparaciones (estado);

-- 4. Encabezado de ventas / facturas
CREATE TABLE IF NOT EXISTS public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_factura text UNIQUE NOT NULL,
  subtotal integer NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  descuento integer NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Nequi', 'Transferencia Bancaria')),
  efectivo_recibido integer NOT NULL DEFAULT 0 CHECK (efectivo_recibido >= 0),
  cambio integer NOT NULL DEFAULT 0 CHECK (cambio >= 0),
  referencia_pago text,
  banco_transferencia text,
  reparacion_id uuid REFERENCES public.reparaciones(id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_creado_en ON public.ventas (creado_en DESC);

-- 5. Detalle de ítems vendidos por factura
CREATE TABLE IF NOT EXISTS public.detalle_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.productos(id) ON DELETE SET NULL,
  codigo_barras text,
  nombre_producto text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario integer NOT NULL CHECK (precio_unitario >= 0),
  subtotal integer NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta_id ON public.detalle_ventas (venta_id);

-- 6. Función segura para descontar stock al confirmar venta
CREATE OR REPLACE FUNCTION public.descontar_stock_producto(
  p_producto_id uuid,
  p_cantidad integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nuevo_stock integer;
BEGIN
  UPDATE public.productos
     SET stock = GREATEST(0, stock - p_cantidad),
         actualizado_en = now()
   WHERE id = p_producto_id
  RETURNING stock INTO v_nuevo_stock;

  RETURN COALESCE(v_nuevo_stock, 0);
END;
$$;

-- 7. Habilitar Row Level Security (RLS) y políticas para el terminal POS
ALTER TABLE public.config_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reparaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso POS config_negocio" ON public.config_negocio;
CREATE POLICY "Acceso POS config_negocio" ON public.config_negocio
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso POS productos" ON public.productos;
CREATE POLICY "Acceso POS productos" ON public.productos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso POS reparaciones" ON public.reparaciones;
CREATE POLICY "Acceso POS reparaciones" ON public.reparaciones
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso POS ventas" ON public.ventas;
CREATE POLICY "Acceso POS ventas" ON public.ventas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso POS detalle_ventas" ON public.detalle_ventas;
CREATE POLICY "Acceso POS detalle_ventas" ON public.detalle_ventas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.config_negocio, public.productos, public.reparaciones, public.ventas, public.detalle_ventas TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.descontar_stock_producto(uuid, integer) TO anon, authenticated;`;
