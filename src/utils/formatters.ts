/**
 * Formatea un valor numérico en Pesos Colombianos (COP),
 * sin decimales y con separador de miles usando punto (ej. "$ 25.000").
 */
export function formatCOP(value: number | null | undefined): string {
  const numeric = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
  const sign = numeric < 0 ? '-' : '';
  const absFormatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(numeric));
  return `${sign}$ ${absFormatted}`;
}

/**
 * Formatea una fecha ISO o YYYY-MM-DD en formato legible para Colombia.
 */
export function formatDateCO(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  // Si viene YYYY-MM-DD puro, evitar desfase de zona horaria
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Formatea fecha y hora exacta en zona horaria America/Bogota.
 */
export function formatDateTimeCO(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Obtiene la fecha actual YYYY-MM-DD en zona horaria de Colombia (America/Bogota).
 */
export function getTodayBogotaISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

/**
 * Convierte una entrada de texto numérica en entero no negativo.
 */
export function parseNonNegativeInt(raw: string | number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  }
  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (!digitsOnly) return 0;
  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/**
 * Normaliza la URL de un proyecto Supabase extrayendo únicamente el origen base
 * (elimina sufijos como /rest/v1/, /auth/v1, barras finales, etc.).
 */
export function normalizeSupabaseProjectUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.origin;
  } catch {
    return rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }
}

/**
 * Valida que la URL de Supabase sea HTTPS (o localhost para desarrollo local).
 */
export function isValidSupabaseUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.hostname === 'supabase.com' || parsed.hostname === 'app.supabase.com') {
      return false;
    }
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Genera un número de factura o de orden con prefijo y marca de tiempo compacta.
 */
export function generateDocumentNumber(prefix: 'FAC' | 'ORD'): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const rand = String(Math.floor(100 + Math.random() * 900));
  return `${prefix}-${yy}${mm}${dd}-${hh}${min}${rand}`;
}

export const DEFAULT_LOW_STOCK_ALERT = 5;

/**
 * Retorna el límite configurado para la alerta de stock bajo de un producto.
 */
export function getProductLowStockLimit(product: { stock_minimo?: number | null }): number {
  const value = product.stock_minimo;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  return DEFAULT_LOW_STOCK_ALERT;
}

/**
 * Indica si un producto activo alcanzó o bajó de su alerta de stock bajo.
 */
export function isProductLowStock(product: {
  activo: boolean;
  stock: number;
  stock_minimo?: number | null;
}): boolean {
  if (!product.activo) return false;
  return product.stock <= getProductLowStockLimit(product);
}
