import React from 'react';
import {
  Barcode,
  CalendarCheck2,
  Database,
  History,
  LogOut,
  Package,
  Printer,
  Settings,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import type { ActiveSection, BusinessConfig, LicenseSession } from '../types/pos';
import { formatDateCO } from '../utils/formatters';

interface SidebarNavProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  session: LicenseSession;
  businessConfig: BusinessConfig;
  clientConnected: boolean;
  laserFocused: boolean;
  lowStockCount: number;
  onLogout: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'pos', label: 'Punto de Venta (POS)', icon: ShoppingCart },
  { id: 'inventario', label: 'Inventario / Productos', icon: Package },
  { id: 'taller', label: 'Taller de Reparaciones', icon: Wrench },
  { id: 'historial', label: 'Historial de Ventas y Caja', icon: History },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelectSection,
  session,
  businessConfig,
  clientConnected,
  laserFocused,
  lowStockCount,
  onLogout,
}) => {
  const storeName = businessConfig.nombre_negocio.trim() || session.nombre_negocio;

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800">
      <div>
        {/* Identidad del negocio */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {businessConfig.logo_url ? (
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={businessConfig.logo_url}
                  alt={storeName}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="/assets/aistudio/punto-de-venta_60e36d8f.png"
                  alt="SysPOS Colombia"
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{storeName}</p>
              <p className="text-xs text-slate-400 truncate">SysPOS Colombia</p>
            </div>
          </div>
        </div>

        {/* Menú de navegación */}
        <nav className="p-3 space-y-1" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            const showLowStock = item.id === 'inventario' && lowStockCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {showLowStock && (
                  <span
                    title={`${lowStockCount} producto(s) con stock bajo o agotado`}
                    className={`font-mono text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded shrink-0 ${
                      active ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {lowStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Panel de estado en tiempo real y cierre de sesión */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Licencia
            </span>
            <div className="text-right">
              <span className="block font-semibold text-emerald-400">Activa</span>
              <span className="block font-mono text-[11px] text-slate-400 tabular-nums">
                Vence {formatDateCO(session.fecha_vencimiento)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Database
                className={`w-3.5 h-3.5 shrink-0 ${
                  clientConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              />
              Base de Datos
            </span>
            <span
              className={`font-semibold ${
                clientConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {clientConnected ? 'Conectado' : 'Sin vincular'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Barcode
                className={`w-3.5 h-3.5 shrink-0 ${
                  laserFocused ? 'text-emerald-400' : 'text-slate-400'
                }`}
              />
              Pistola Láser
            </span>
            <span
              className={`font-medium ${
                laserFocused ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {laserFocused ? 'Activa (Auto)' : 'En espera'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Printer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Térmica POS
            </span>
            <span className="font-mono text-slate-200">{businessConfig.tamano_ticket}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};
