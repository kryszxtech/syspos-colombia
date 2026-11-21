import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LicenseSession, LicenseValidationResult } from '../types/pos';
import { isValidSupabaseUrl, normalizeSupabaseProjectUrl } from '../utils/formatters';

// ============================================================================
// CONEXIÓN INTERNA A SUPABASE MAESTRO (ADMINISTRADOR - SOLO LICENCIAS Y LOGIN)
// ----------------------------------------------------------------------------
// Proyecto: kryszxtech's Project (wwpwqouiuxlqeqdethrq)
// Se utiliza exclusivamente para autenticar usuarios y validar suscripción
// mensual contra la fecha actual del servidor. Sin configuración visual en UI.
// ============================================================================
export const MASTER_SUPABASE_URL = (
  import.meta.env.VITE_MASTER_SUPABASE_URL || 'https://wwpwqouiuxlqeqdethrq.supabase.co'
)
  .trim()
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '');

export const MASTER_SUPABASE_ANON_KEY = (
  import.meta.env.VITE_MASTER_SUPABASE_ANON_KEY ||
  'sb_publishable_FEhyCCIibYqpPCHd3tCSwQ_k7M1XHj9'
).trim();
// ============================================================================

const LICENSE_SESSION_STORAGE_KEY = 'syspos_license_session_v1';

export function getEffectiveMasterCredentials(): {
  url: string;
  anonKey: string;
  configured: boolean;
} {
  const configured =
    isValidSupabaseUrl(MASTER_SUPABASE_URL) && MASTER_SUPABASE_ANON_KEY.length > 20;
  return {
    url: MASTER_SUPABASE_URL,
    anonKey: MASTER_SUPABASE_ANON_KEY,
    configured,
  };
}

export function getMasterSupabaseClient(): SupabaseClient {
  const { url, anonKey, configured } = getEffectiveMasterCredentials();
  if (!configured) {
    throw new Error('No fue posible inicializar el servicio de validación de licencias.');
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function saveStoredLicenseSession(session: LicenseSession): void {
  localStorage.setItem(LICENSE_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getStoredLicenseSession(): LicenseSession | null {
  try {
    const raw = localStorage.getItem(LICENSE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LicenseSession;
    if (!parsed.licencia_id || !parsed.usuario) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStoredLicenseSession(): void {
  localStorage.removeItem(LICENSE_SESSION_STORAGE_KEY);
}

/**
 * Autentica al usuario contra la función RPC `iniciar_sesion_y_validar`
 * del Supabase Administrador, validando contraseña y vigencia mensual
 * contra la fecha actual del servidor.
 */
export async function loginWithMasterSupabase(
  usuario: string,
  clave: string,
): Promise<LicenseValidationResult> {
  const client = getMasterSupabaseClient();
  const { data, error } = await client.rpc('iniciar_sesion_y_validar', {
    p_usuario: usuario.trim(),
    p_clave: clave,
  });

  if (error) {
    throw new Error(`No se pudo validar el acceso: ${error.message}`);
  }

  return data as LicenseValidationResult;
}

/**
 * Revalida la licencia mensual activa contra la fecha actual del servidor
 * al abrir, recargar o volver a enfocar la aplicación.
 */
export async function revalidateMasterLicense(
  licenciaId: string,
  usuario: string,
): Promise<LicenseValidationResult> {
  const client = getMasterSupabaseClient();
  const { data, error } = await client.rpc('verificar_licencia_actual', {
    p_licencia_id: licenciaId,
    p_usuario: usuario,
  });

  if (error) {
    throw new Error(`No se pudo verificar la vigencia de la licencia: ${error.message}`);
  }

  return data as LicenseValidationResult;
}

/**
 * Guarda la Project URL y Anon Key del Supabase personal del cliente
 * dentro de su fila en `licencias_clientes` para que persista entre dispositivos.
 */
export async function saveClientSupabaseToMaster(
  licenciaId: string,
  usuario: string,
  clienteUrl: string,
  clienteAnonKey: string,
): Promise<{ savedRemote: boolean; error?: string }> {
  try {
    const client = getMasterSupabaseClient();
    const cleanUrl = clienteUrl.trim() ? normalizeSupabaseProjectUrl(clienteUrl) : '';
    const { data, error } = await client.rpc('guardar_config_supabase_cliente', {
      p_licencia_id: licenciaId,
      p_usuario: usuario,
      p_url: cleanUrl,
      p_anon_key: clienteAnonKey.trim(),
    });

    if (error) {
      return { savedRemote: false, error: error.message };
    }

    const res = data as { ok?: boolean; mensaje?: string } | null;
    if (res && res.ok === false) {
      return { savedRemote: false, error: res.mensaje };
    }

    return { savedRemote: true };
  } catch (err) {
    return {
      savedRemote: false,
      error: err instanceof Error ? err.message : 'No se pudo sincronizar con la cuenta.',
    };
  }
}
