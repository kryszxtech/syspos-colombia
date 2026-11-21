import React, { useState } from 'react';
import {
  Banknote,
  Landmark,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { CartItem, PaymentMethod } from '../types/pos';
import { formatCOP, parseNonNegativeInt } from '../utils/formatters';

interface CartSidebarProps {
  items: CartItem[];
  clientConnected: boolean;
  processingSale: boolean;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onCheckout: (params: {
    descuento: number;
    metodo_pago: PaymentMethod;
    efectivo_recibido: number;
    referencia_pago?: string;
    banco_transferencia?: string;
  }) => Promise<void>;
}

const COLOMBIAN_BILLS = [10000, 20000, 50000, 100000];
const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA Colombia',
  'Daviplata',
  'Banco Agrario',
  'Otro banco',
];

export const CartSidebar: React.FC<CartSidebarProps> = ({
  items,
  clientConnected,
  processingSale,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onCheckout,
}) => {
  const [discountRaw, setDiscountRaw] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [cashReceivedRaw, setCashReceivedRaw] = useState('');
  const [reference, setReference] = useState('');
  const [bank, setBank] = useState('Bancolombia');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
  const descuento = Math.min(subtotal, parseNonNegativeInt(discountRaw));
  const total = Math.max(0, subtotal - descuento);
  const cashReceived = parseNonNegativeInt(cashReceivedRaw);
  const change = cashReceived - total;
  const cashInsufficient = paymentMethod === 'Efectivo' && total > 0 && cashReceived < total;

  const handleCheckoutSubmit = async () => {
    setCheckoutError(null);
    if (!clientConnected) {
      setCheckoutError('Base de datos pendiente de vinculación. Contacta al administrador.');
      return;
    }
    if (items.length === 0) {
      setCheckoutError('Agrega al menos un producto o servicio al ticket.');
      return;
    }
    if (paymentMethod === 'Efectivo' && cashReceived < total) {
      setCheckoutError('El efectivo recibido es menor al total a pagar.');
      return;
    }

    try {
      await onCheckout({
        descuento,
        metodo_pago: paymentMethod,
        efectivo_recibido: paymentMethod === 'Efectivo' ? cashReceived : total,
        referencia_pago: paymentMethod !== 'Efectivo' ? reference : undefined,
        banco_transferencia: paymentMethod === 'Transferencia Bancaria' ? bank : undefined,
      });
      setDiscountRaw('');
      setCashReceivedRaw('');
      setReference('');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'No se pudo procesar el cobro.');
    }
  };

  return (
    <aside className="w-full xl:w-[390px] shrink-0 bg-white border-t xl:border-t-0 xl:border-l border-slate-200 flex flex-col h-full">
      {/* Encabezado del ticket */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Ticket de Venta</h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            ({items.reduce((acc, i) => acc + i.cantidad, 0)})
          </span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onClearCart();
              setCheckoutError(null);
            }}
            className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Lista de productos en el carrito */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[160px]">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <ShoppingCart className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-500">Ticket vacío</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Escanea un código de barras o haz clic en un producto.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.key} className="p-3.5 flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 leading-snug truncate">
                  {item.nombre}
                </p>
                <p className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                  {formatCOP(item.precio_unitario)} c/u
                </p>

                <div className="mt-2 inline-flex items-center border border-slate-200 rounded-md bg-slate-50">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.key, -1)}
                    aria-label="Disminuir cantidad"
                    className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-l cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {item.cantidad}
                  </span>
                  <button
                    type="button"
                    disabled={
                      item.stock_disponible !== null && item.cantidad >= item.stock_disponible
                    }
                    onClick={() => onUpdateQty(item.key, 1)}
                    aria-label="Aumentar cantidad"
                    className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-40 rounded-r cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end justify-between">
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                  {formatCOP(item.precio_unitario * item.cantidad)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.key)}
                  aria-label={`Quitar ${item.nombre}`}
                  className="mt-2 p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totales, método de pago y botón de cobro */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums font-medium">{formatCOP(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between gap-2 text-slate-600">
            <label htmlFor="pos-discount" className="shrink-0">
              Descuento (COP)
            </label>
            <input
              id="pos-discount"
              data-keep-focus="true"
              type="number"
              min={0}
              value={discountRaw}
              onChange={(e) => setDiscountRaw(e.target.value)}
              placeholder="0"
              className="w-28 px-2 py-1 text-right font-mono text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-900">TOTAL</span>
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOP(total)}
            </span>
          </div>
        </div>

        {/* Selector de Método de Pago */}
        <div>
          <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
            Método de Pago
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'Nequi', label: 'Nequi', icon: Smartphone },
                { id: 'Transferencia Bancaria', label: 'Transfer.', icon: Landmark },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              const active = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.id);
                    setCheckoutError(null);
                  }}
                  className={`flex items-center justify-center gap-1 py-2 px-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controles específicos según método de pago */}
        {paymentMethod === 'Efectivo' && (
          <div className="space-y-2">
            <div>
              <label
                htmlFor="cash-received"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Efectivo recibido (COP)
              </label>
              <input
                id="cash-received"
                data-keep-focus="true"
                type="number"
                min={0}
                value={cashReceivedRaw}
                onChange={(e) => setCashReceivedRaw(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 font-mono text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COLOMBIAN_BILLS.map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => setCashReceivedRaw(String(bill))}
                  className="px-2 py-1 text-[11px] font-mono font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded cursor-pointer"
                >
                  {formatCOP(bill)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCashReceivedRaw(String(total))}
                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded cursor-pointer"
              >
                Exacto
              </button>
            </div>

            {total > 0 && (
              <div
                className={`px-3 py-2 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                  cashInsufficient
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <span>{cashInsufficient ? 'Falta dinero:' : 'Devueltas / Cambio:'}</span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {formatCOP(Math.abs(change))}
                </span>
              </div>
            )}
          </div>
        )}

        {paymentMethod === 'Nequi' && (
          <div>
            <label
              htmlFor="nequi-ref"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Comprobante / Referencia Nequi (opcional)
            </label>
            <input
              id="nequi-ref"
              data-keep-focus="true"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. M12345678"
              className="w-full px-3 py-2 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        )}

        {paymentMethod === 'Transferencia Bancaria' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="bank-select"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Banco
              </label>
              <select
                id="bank-select"
                data-keep-focus="true"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {COLOMBIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="bank-ref"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                Referencia
              </label>
              <input
                id="bank-ref"
                data-keep-focus="true"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="No. aprobación"
                className="w-full px-2.5 py-2 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}

        {checkoutError && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {checkoutError}
          </div>
        )}

        <button
          type="button"
          disabled={processingSale || items.length === 0 || !clientConnected}
          onClick={handleCheckoutSubmit}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 rounded-xl transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          {processingSale ? 'Procesando venta...' : 'Cobrar e Imprimir Ticket'}
        </button>
      </div>
    </aside>
  );
};
