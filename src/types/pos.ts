export type ActiveSection = 'pos' | 'inventario' | 'taller' | 'historial' | 'configuracion';

export type TicketSize = '80mm' | '58mm';

export type PaymentMethod = 'Efectivo' | 'Nequi' | 'Transferencia Bancaria';

export type DeviceType = 'Teléfono / Celular' | 'Computador / Portátil' | 'Otro dispositivo';

export type RepairStatus =
  | 'Recibido'
  | 'En revisión'
  | 'Esperando repuesto'
  | 'Listo para entregar'
  | 'Entregado';

export interface LicenseValidationResult {
  autenticado: boolean;
  licencia_valida: boolean;
  licencia_id?: string;
  usuario?: string;
  nombre_negocio?: string;
  activo?: boolean;
  fecha_vencimiento?: string;
  fecha_servidor?: string;
  dias_restantes?: number;
  cliente_supabase_url?: string | null;
  cliente_supabase_anon_key?: string | null;
  mensaje?: string;
}

export interface LicenseSession {
  licencia_id: string;
  usuario: string;
  nombre_negocio: string;
  activo: boolean;
  fecha_vencimiento: string;
  fecha_servidor: string;
  dias_restantes: number;
  licencia_valida: boolean;
  cliente_supabase_url?: string | null;
  cliente_supabase_anon_key?: string | null;
  mensaje?: string;
}

export interface ClientSupabaseConfig {
  url: string;
  anonKey: string;
}

export interface BusinessConfig {
  nombre_negocio: string;
  nit: string;
  direccion: string;
  telefono: string;
  tamano_ticket: TicketSize;
  pie_ticket: string;
  logo_url?: string;
}

export interface Product {
  id: string;
  codigo_barras: string | null;
  nombre: string;
  categoria: string;
  precio_costo: number;
  precio_venta: number;
  stock: number;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CartItem {
  key: string; // producto.id o "rep:<reparacion_id>"
  producto_id: string | null;
  reparacion_id?: string | null;
  codigo_barras: string | null;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number | null; // null para servicios de taller
  es_servicio_taller?: boolean;
}

export interface SaleItem {
  id?: string;
  venta_id?: string;
  producto_id: string | null;
  codigo_barras: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  numero_factura: string;
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: PaymentMethod;
  efectivo_recibido: number;
  cambio: number;
  referencia_pago: string | null;
  banco_transferencia: string | null;
  reparacion_id: string | null;
  creado_en: string;
  detalle_ventas?: SaleItem[];
}

export interface RepairOrder {
  id: string;
  numero_orden: string;
  tipo_equipo: DeviceType;
  nombre_cliente: string;
  whatsapp: string;
  marca_modelo: string;
  imei_serie: string | null;
  clave_desbloqueo: string | null;
  falla_reportada: string;
  accesorios: string | null;
  valor_estimado: number;
  abono_inicial: number;
  saldo_pendiente: number;
  estado: RepairStatus;
  cobrado_en_pos: boolean;
  creado_en: string;
  actualizado_en?: string;
}

export type ThermalReceiptData =
  | {
      tipo: 'venta';
      venta: Sale;
      items: SaleItem[];
    }
  | {
      tipo: 'taller';
      orden: RepairOrder;
    };
