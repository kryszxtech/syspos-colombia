import React from 'react';
import { CalendarX2, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import type { LicenseSession } from '../types/pos';
import { formatDateCO } from '../utils/formatters';

interface LicenseBlockedScreenProps {
  session: LicenseSession;
  revalidating: boolean;
  onRetryCheck: () => void;
  onLogout: () => void;
}

export const LicenseBlockedScreen: React.FC<LicenseBlockedScreenProps> = ({
  session,
  revalidating,
  onRetryCheck,
  onLogout,
}) => {
  const isSuspended = !session.activo;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-red-200 rounded-xl p-8">
        <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-5">
          {isSuspended ? <ShieldAlert className="w-6 h-6" /> : <CalendarX2 className="w-6 h-6" />}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isSuspended ? 'Licencia suspendida' : 'Suscripción mensual vencida'}
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          El acceso al Punto de Venta de <strong>{session.nombre_negocio}</strong> ({session.usuario})
          ha sido bloqueado automáticamente por control de licencia.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200 text-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-slate-500">Estado de cuenta</span>
            <span className="font-semibold text-red-700">
              {isSuspended ? 'Suspendida' : 'Vencida'}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-slate-500">Fecha de vencimiento</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatDateCO(session.fecha_vencimiento)}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-slate-500">Fecha del servidor</span>
            <span className="font-mono text-slate-700 tabular-nums">
              {formatDateCO(session.fecha_servidor)}
            </span>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 leading-relaxed">
          Para continuar facturando y operando tu inventario, realiza la renovación de tu mensualidad
          con el administrador del sistema y luego presiona <strong>Verificar renovación</strong>.
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRetryCheck}
            disabled={revalidating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${revalidating ? 'animate-spin' : ''}`} />
            {revalidating ? 'Verificando...' : 'Verificar renovación'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};
