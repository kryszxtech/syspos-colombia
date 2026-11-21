import React, { useMemo, useState } from 'react';
import { Calendar, Database, Eye, History, Printer, X } from 'lucide-react';
import type { Sale } from '../types/pos';
import { formatCOP, formatDateTimeCO, getTodayBogotaISO } from '../utils/formatters';

interface SalesHistoryViewProps {
  sales: Sale[];
  loading: boolean;
  clientConnected: boolean;
  onReprintSale: (sale: Sale) => void;
  onRetryConnection?: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  loading,
  clientConnected,
  onReprintSale,
  onRetryConnection,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayBogotaISO());
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const daySales = useMemo(() => {
    if (!selectedDate) return sales;
    return sales.filter((s) => {
      const dateCO = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(s.creado_en));
      return dateCO === selectedDate;
    });
  }, [sales, selectedDate]);

  const summary = useMemo(() => {
    return daySales.reduce(
      (acc, sale) => {
        if (sale.metodo_pago === 'Efectivo') acc.efectivo += sale.total;
        else if (sale.metodo_pago === 'Nequi') acc.nequi += sale.total;
        else if (sale.metodo_pago === 'Transferencia Bancaria') acc.transferencia += sale.total;
        acc.total += sale.total;
        return acc;
      },
      { efectivo: 0, nequi: 0, transferencia: 0, total: 0 },
    );
  }, [daySales]);

  if (!clientConnected) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Base de datos pendiente de vinculación</h2>
          <p className="text-sm text-slate-600 mt-2">
            Tu cuenta aún no tiene una base de datos asignada para consultar el cierre diario de
            caja e historial de facturas. Comunícate con el administrador del sistema para activarla.
          </p>
          {onRetryConnection && (
            <button
              type="button"
              onClick={onRetryConnection}
              className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
            >
              Verificar conexión
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-0.5">
      {/* Filtro de fecha y resumen de caja del día */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Cierre de Caja e Historial de Ventas
            </h2>
            <p className="text-xs text-slate-500">
              Totales discriminados por método de pago en Pesos Colombianos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Ver todas
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Total Efectivo</span>
            <span className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-1 block">
              {formatCOP(summary.efectivo)}
            </span>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Total Nequi</span>
            <span className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-1 block">
              {formatCOP(summary.nequi)}
            </span>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Total Transferencias</span>
            <span className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-1 block">
              {formatCOP(summary.transferencia)}
            </span>
          </div>
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-semibold text-emerald-800 block">
              Total General ({daySales.length} {daySales.length === 1 ? 'venta' : 'ventas'})
            </span>
            <span className="font-mono text-lg font-bold text-emerald-800 tabular-nums mt-1 block">
              {formatCOP(summary.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de facturas emitidas */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col min-h-[280px]">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 text-sm font-bold text-slate-900">
          <History className="w-4 h-4 text-slate-500" />
          <span>Facturas emitidas</span>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Cargando ventas...</div>
          ) : daySales.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No hay ventas registradas para la fecha seleccionada.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Factura</th>
                  <th className="py-2.5 px-4">Fecha y Hora</th>
                  <th className="py-2.5 px-4">Método de Pago</th>
                  <th className="py-2.5 px-4">Referencia / Banco</th>
                  <th className="py-2.5 px-4 text-right">Total COP</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daySales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {sale.numero_factura}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                      {formatDateTimeCO(sale.creado_en)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{sale.metodo_pago}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono">
                      {[sale.banco_transferencia, sale.referencia_pago].filter(Boolean).join(' · ') ||
                        '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatCOP(sale.total)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailSale(sale)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => onReprintSale(sale)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Reimprimir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de detalle de factura */}
      {detailSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {detailSale.numero_factura}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDateTimeCO(detailSale.creado_en)} · {detailSale.metodo_pago}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailSale(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
              {(detailSale.detalle_ventas ?? []).map((item, idx) => (
                <div key={item.id ?? idx} className="px-3.5 py-2.5 flex justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.nombre_producto}</p>
                    <p className="font-mono text-slate-500">
                      {item.cantidad} x {formatCOP(item.precio_unitario)}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {formatCOP(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCOP(detailSale.subtotal)}</span>
              </div>
              {detailSale.descuento > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Descuento</span>
                  <span className="font-mono tabular-nums">
                    -{formatCOP(detailSale.descuento)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Pagado</span>
                <span className="font-mono tabular-nums">{formatCOP(detailSale.total)}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailSale(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = detailSale;
                  setDetailSale(null);
                  onReprintSale(s);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Reimprimir Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
