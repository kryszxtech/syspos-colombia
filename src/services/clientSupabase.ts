import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  BusinessConfig,
  ClientSupabaseConfig,
  PaymentMethod,
  Product,
  RepairOrder,
  RepairStatus,
  Sale,
  SaleItem,
} from '../types/pos';
import {
  generateDocumentNumber,
  isValidSupabaseUrl,
  normalizeSupabaseProjectUrl,
} from '../utils/formatters';

const CLIENT_SUPABASE_STORAGE_KEY = 'syspos_client_supabase_v1';
const BUSINESS_CONFIG_STORAGE_KEY = 'syspos_business_config_v1';

export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  nombre_negocio: '',
  nit: '',
  direccion: '',
  telefono: '',
  tamano_ticket: '80mm',
  pie_ticket: '¡Gracias por su compra!',
  logo_url: '',
};

export function getClientSupabaseConfig(): ClientSupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CLIENT_SUPABASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientSupabaseConfig;
    if (!isValidSupabaseUrl(parsed.url) || !parsed.anonKey?.trim()) return null;
    return {
      url: normalizeSupabaseProjectUrl(parsed.url),
      anonKey: parsed.anonKey.trim(),
    };
  } catch {
    return null;
  }
}

export function saveClientSupabaseConfig(config: ClientSupabaseConfig): void {
  localStorage.setItem(
    CLIENT_SUPABASE_STORAGE_KEY,
    JSON.stringify({
      url: normalizeSupabaseProjectUrl(config.url),
      anonKey: config.anonKey.trim(),
    }),
  );
}

export function clearClientSupabaseConfig(): void {
  localStorage.removeItem(CLIENT_SUPABASE_STORAGE_KEY);
}

export function getStoredBusinessConfig(): BusinessConfig {
  try {
    const raw = localStorage.getItem(BUSINESS_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_BUSINESS_CONFIG;
    return { ...DEFAULT_BUSINESS_CONFIG, ...(JSON.parse(raw) as Partial<BusinessConfig>) };
  } catch {
    return DEFAULT_BUSINESS_CONFIG;
  }
}

export function saveStoredBusinessConfig(config: BusinessConfig): void {
  localStorage.setItem(BUSINESS_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function getClientSupabase(): SupabaseClient | null {
  const cfg = getClientSupabaseConfig();
  if (!cfg) return null;
  return createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function requireClient(): SupabaseClient {
  const client = getClientSupabase();
  if (!client) {
    throw new Error('La base de datos del negocio aún no está vinculada a esta cuenta.');
  }
  return client;
}

export async function testClientSupabaseConnection(
  url: string,
  anonKey: string,
): Promise<{ ok: boolean; message: string; missingTables: string[]; normalizedUrl?: string }> {
  if (!isValidSupabaseUrl(url)) {
    return {
      ok: false,
      message:
        'La Project URL debe ser tu URL de API de Supabase (ej. https://tuproyecto.supabase.co), no la URL del panel web.',
      missingTables: [],
    };
  }
  if (!anonKey.trim() || anonKey.trim().length < 20) {
    return {
      ok: false,
      message: 'Ingresa una Anon / Publishable Key válida de tu proyecto Supabase.',
      missingTables: [],
    };
  }

  const normalizedUrl = normalizeSupabaseProjectUrl(url);
  const testClient = createClient(normalizedUrl, anonKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const tables = ['config_negocio', 'productos', 'ventas', 'detalle_ventas', 'reparaciones'];
  const missingTables: string[] = [];

  for (const table of tables) {
    const { error } = await testClient.from(table).select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.message.includes('does not exist') ||
        error.message.includes('schema cache')
      ) {
        missingTables.push(table);
      } else {
        return {
          ok: false,
          message: `Error de conexión o permisos en tabla "${table}": ${error.message}`,
          missingTables: [],
        };
      }
    }
  }

  if (missingTables.length > 0) {
    return {
      ok: false,
      message: `Conexión alcanzada, pero faltan tablas (${missingTables.join(', ')}). Copia y ejecuta el Script SQL en tu Supabase.`,
      missingTables,
    };
  }

  return {
    ok: true,
    message: 'Conexión verificada correctamente. Todas las tablas del POS están listas.',
    missingTables: [],
    normalizedUrl,
  };
}

// ============================================================================
// CONFIGURACIÓN DEL NEGOCIO
// ============================================================================
export async function fetchBusinessConfigFromClient(): Promise<BusinessConfig | null> {
  const client = getClientSupabase();
  if (!client) return null;
  const localCurrent = getStoredBusinessConfig();
  const { data, error } = await client
    .from('config_negocio')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return null;
  const hasRemoteLogoColumn = Object.prototype.hasOwnProperty.call(data, 'logo_url');
  const normalized: BusinessConfig = {
    nombre_negocio: data.nombre_negocio ?? '',
    nit: data.nit ?? '',
    direccion: data.direccion ?? '',
    telefono: data.telefono ?? '',
    tamano_ticket: data.tamano_ticket === '58mm' ? '58mm' : '80mm',
    pie_ticket: data.pie_ticket ?? '¡Gracias por su compra!',
    logo_url: hasRemoteLogoColumn ? (data.logo_url ?? '') : (localCurrent.logo_url ?? ''),
  };
  saveStoredBusinessConfig(normalized);
  return normalized;
}

export async function upsertBusinessConfigToClient(config: BusinessConfig): Promise<void> {
  saveStoredBusinessConfig(config);
  const client = getClientSupabase();
  if (!client) return;

  const basePayload = {
    id: 1,
    nombre_negocio: config.nombre_negocio.trim() || 'Mi Negocio POS',
    nit: config.nit.trim(),
    direccion: config.direccion.trim(),
    telefono: config.telefono.trim(),
    tamano_ticket: config.tamano_ticket,
    pie_ticket: config.pie_ticket.trim() || '¡Gracias por su compra!',
    actualizado_en: new Date().toISOString(),
  };

  const { error } = await client.from('config_negocio').upsert(
    {
      ...basePayload,
      logo_url: config.logo_url ?? '',
    },
    { onConflict: 'id' },
  );

  if (error) {
    if (error.message.includes('logo_url')) {
      const { error: fallbackError } = await client
        .from('config_negocio')
        .upsert(basePayload, { onConflict: 'id' });
      if (!fallbackError) return;
      throw new Error(
        `Configuración guardada localmente, pero falló el guardado en Supabase: ${fallbackError.message}`,
      );
    }
    throw new Error(
      `Configuración guardada localmente, pero falló el guardado en Supabase: ${error.message}`,
    );
  }
}

// ============================================================================
// PRODUCTOS / INVENTARIO
// ============================================================================
export async function fetchProducts(): Promise<Product[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('productos')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function createProduct(
  input: Omit<Product, 'id' | 'creado_en' | 'actualizado_en'>,
): Promise<Product> {
  const client = requireClient();
  const payload = {
    codigo_barras: input.codigo_barras?.trim() || null,
    nombre: input.nombre.trim(),
    categoria: input.categoria.trim() || 'General',
    precio_costo: Math.max(0, Math.round(input.precio_costo)),
    precio_venta: Math.max(0, Math.round(input.precio_venta)),
    stock: Math.max(0, Math.round(input.stock)),
    activo: input.activo,
  };
  const { data, error } = await client.from('productos').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<Product, 'id' | 'creado_en' | 'actualizado_en'>>,
): Promise<Product> {
  const client = requireClient();
  const payload = {
    ...input,
    codigo_barras: input.codigo_barras !== undefined ? input.codigo_barras?.trim() || null : undefined,
    nombre: input.nombre !== undefined ? input.nombre.trim() : undefined,
    categoria: input.categoria !== undefined ? input.categoria.trim() || 'General' : undefined,
    actualizado_en: new Date().toISOString(),
  };
  const { data, error } = await client
    .from('productos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('productos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// VENTAS Y DETALLE DE VENTAS
// ============================================================================
export interface RegisterSaleInput {
  items: Array<{
    producto_id: string | null;
    reparacion_id?: string | null;
    codigo_barras: string | null;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
  }>;
  descuento: number;
  metodo_pago: PaymentMethod;
  efectivo_recibido: number;
  referencia_pago?: string;
  banco_transferencia?: string;
}

export async function registerSale(input: RegisterSaleInput): Promise<{ sale: Sale; items: SaleItem[] }> {
  const client = requireClient();
  const subtotal = input.items.reduce(
    (sum, item) => sum + Math.round(item.precio_unitario) * Math.round(item.cantidad),
    0,
  );
  const descuento = Math.min(subtotal, Math.max(0, Math.round(input.descuento)));
  const total = Math.max(0, subtotal - descuento);
  const efectivoRecibido =
    input.metodo_pago === 'Efectivo' ? Math.max(0, Math.round(input.efectivo_recibido)) : total;
  const cambio = input.metodo_pago === 'Efectivo' ? Math.max(0, efectivoRecibido - total) : 0;

  const reparacionLinked = input.items.find((i) => i.reparacion_id)?.reparacion_id ?? null;
  const numeroFactura = generateDocumentNumber('FAC');

  const { data: saleRow, error: saleError } = await client
    .from('ventas')
    .insert({
      numero_factura: numeroFactura,
      subtotal,
      descuento,
      total,
      metodo_pago: input.metodo_pago,
      efectivo_recibido: efectivoRecibido,
      cambio,
      referencia_pago: input.referencia_pago?.trim() || null,
      banco_transferencia:
        input.metodo_pago === 'Transferencia Bancaria'
          ? input.banco_transferencia?.trim() || null
          : null,
      reparacion_id: reparacionLinked,
    })
    .select()
    .single();

  if (saleError || !saleRow) {
    throw new Error(saleError?.message ?? 'No se pudo registrar la factura.');
  }

  const detailPayload: SaleItem[] = input.items.map((item) => ({
    venta_id: saleRow.id,
    producto_id: item.producto_id,
    codigo_barras: item.codigo_barras,
    nombre_producto: item.nombre_producto,
    cantidad: item.cantidad,
    precio_unitario: Math.round(item.precio_unitario),
    subtotal: Math.round(item.precio_unitario) * Math.round(item.cantidad),
  }));

  const { data: insertedItems, error: detailError } = await client
    .from('detalle_ventas')
    .insert(detailPayload)
    .select();

  if (detailError) {
    throw new Error(`Venta creada, pero falló el detalle: ${detailError.message}`);
  }

  // Descontar stock automáticamente por cada producto físico vendido
  for (const item of input.items) {
    if (item.producto_id) {
      const { error: stockErr } = await client.rpc('descontar_stock_producto', {
        p_producto_id: item.producto_id,
        p_cantidad: item.cantidad,
      });
      if (stockErr) {
        // Respaldo si no se creó la función RPC
        const { data: prod } = await client
          .from('productos')
          .select('stock')
          .eq('id', item.producto_id)
          .single();
        if (prod) {
          await client
            .from('productos')
            .update({ stock: Math.max(0, prod.stock - item.cantidad) })
            .eq('id', item.producto_id);
        }
      }
    }
    // Si corresponde al cobro de saldo de una reparación del taller, marcarla entregada y pagada
    if (item.reparacion_id) {
      await client
        .from('reparaciones')
        .update({
          saldo_pendiente: 0,
          estado: 'Entregado',
          cobrado_en_pos: true,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', item.reparacion_id);
    }
  }

  return {
    sale: saleRow as Sale,
    items: (insertedItems ?? detailPayload) as SaleItem[],
  };
}

export async function fetchSales(): Promise<Sale[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('ventas')
    .select('*, detalle_ventas(*)')
    .order('creado_en', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Sale[];
}

// ============================================================================
// TALLER DE REPARACIONES
// ============================================================================
export async function fetchRepairs(): Promise<RepairOrder[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('reparaciones')
    .select('*')
    .order('creado_en', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RepairOrder[];
}

export async function createRepairOrder(
  input: Omit<RepairOrder, 'id' | 'numero_orden' | 'creado_en' | 'actualizado_en' | 'cobrado_en_pos'>,
): Promise<RepairOrder> {
  const client = requireClient();
  const valorEstimado = Math.max(0, Math.round(input.valor_estimado));
  const abonoInicial = Math.min(valorEstimado, Math.max(0, Math.round(input.abono_inicial)));
  const saldoPendiente = Math.max(0, valorEstimado - abonoInicial);

  const payload = {
    numero_orden: generateDocumentNumber('ORD'),
    tipo_equipo: input.tipo_equipo,
    nombre_cliente: input.nombre_cliente.trim(),
    whatsapp: input.whatsapp.trim(),
    marca_modelo: input.marca_modelo.trim(),
    imei_serie: input.imei_serie?.trim() || '',
    clave_desbloqueo: input.clave_desbloqueo?.trim() || '',
    falla_reportada: input.falla_reportada.trim(),
    accesorios: input.accesorios?.trim() || '',
    valor_estimado: valorEstimado,
    abono_inicial: abonoInicial,
    saldo_pendiente: saldoPendiente,
    estado: input.estado,
    cobrado_en_pos: false,
  };

  const { data, error } = await client.from('reparaciones').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data as RepairOrder;
}

export async function updateRepairStatus(id: string, estado: RepairStatus): Promise<RepairOrder> {
  const client = requireClient();
  const { data, error } = await client
    .from('reparaciones')
    .update({ estado, actualizado_en: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RepairOrder;
}

export async function deleteRepairOrder(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('reparaciones').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
