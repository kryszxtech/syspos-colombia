import React from 'react';
import { Printer, X } from 'lucide-react';
import type { BusinessConfig, ThermalReceiptData } from '../types/pos';
import { formatCOP, formatDateTimeCO } from '../utils/formatters';

interface ThermalReceiptProps {
  receipt: ThermalReceiptData | null;
  businessConfig: BusinessConfig;
  fallbackBusinessName: string;
  previewOpen: boolean;
  onClosePreview: () => void;
}

const ReceiptBody: React.FC<{
  receipt: ThermalReceiptData;
  businessConfig: BusinessConfig;
  fallbackBusinessName: string;
}> = ({ receipt, businessConfig, fallbackBusinessName }) => {
  const storeName = businessConfig.nombre_negocio.trim() || fallbackBusinessName || 'SysPOS Colombia';

  return (
    <div>
      {/* Encabezado del negocio */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        {businessConfig.logo_url && (
          <img
            src={businessConfig.logo_url}
            alt={storeName}
            style={{
              display: 'block',
              margin: '0 auto 5px auto',
              maxHeight: businessConfig.tamano_ticket === '58mm' ? '42px' : '54px',
              maxWidth: businessConfig.tamano_ticket === '58mm' ? '110px' : '145px',
              objectFit: 'contain',
              filter: 'grayscale(100%) contrast(1.2)',
            }}
          />
        )}
        <div style={{ fontWeight: 700, fontSize: '1.15em', textTransform: 'uppercase' }}>
          {storeName}
        </div>
        {businessConfig.nit.trim() && <div>NIT: {businessConfig.nit.trim()}</div>}
        {businessConfig.direccion.trim() && <div>{businessConfig.direccion.trim()}</div>}
        {businessConfig.telefono.trim() && <div>Tel: {businessConfig.telefono.trim()}</div>}
      </div>

      <div className="ticket-divider" style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {receipt.tipo === 'venta' ? (
        <div>
          <div style={{ fontWeight: 700, textAlign: 'center', marginBottom: '4px' }}>
            FACTURA DE VENTA POS
          </div>
          <div>No: {receipt.venta.numero_factura}</div>
          <div>Fecha: {formatDateTimeCO(receipt.venta.creado_en)}</div>

          <div
            className="ticket-divider"
            style={{ borderTop: '1px dashed #000', margin: '6px 0' }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              marginBottom: '4px',
            }}
          >
            <span>CANT / DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>

          {receipt.items.map((item, idx) => (
            <div key={item.id ?? `${item.nombre_producto}-${idx}`} style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: 600 }}>{item.nombre_producto}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {item.cantidad} x {formatCOP(item.precio_unitario)}
                </span>
                <span>{formatCOP(item.subtotal)}</span>
              </div>
            </div>
          ))}

          <div
            className="ticket-divider"
            style={{ borderTop: '1px dashed #000', margin: '6px 0' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{formatCOP(receipt.venta.subtotal)}</span>
          </div>
          {receipt.venta.descuento > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Descuento:</span>
              <span>-{formatCOP(receipt.venta.descuento)}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '1.15em',
              marginTop: '3px',
            }}
          >
            <span>TOTAL COP:</span>
            <span>{formatCOP(receipt.venta.total)}</span>
          </div>

          <div
            className="ticket-divider"
            style={{ borderTop: '1px dashed #000', margin: '6px 0' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Pago:</span>
            <span>{receipt.venta.metodo_pago}</span>
          </div>
          {receipt.venta.metodo_pago === 'Efectivo' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Efectivo recibido:</span>
                <span>{formatCOP(receipt.venta.efectivo_recibido)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Cambio devuelto:</span>
                <span>{formatCOP(receipt.venta.cambio)}</span>
              </div>
            </>
          )}
          {receipt.venta.banco_transferencia && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Banco:</span>
              <span>{receipt.venta.banco_transferencia}</span>
            </div>
          )}
          {receipt.venta.referencia_pago && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Referencia:</span>
              <span>{receipt.venta.referencia_pago}</span>
            </div>
          )}

          <div
            className="ticket-divider"
            style={{ borderTop: '1px dashed #000', margin: '6px 0' }}
          />
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            {businessConfig.pie_ticket || '¡Gracias por su compra!'}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontWeight: 700, textAlign: 'center', marginBottom: '4px' }}>
            TICKET RECEPCIÓN DE TALLER
          </div>
          <div>Orden: {receipt.orden.numero_orden}</div>
          <div>Ingreso: {formatDateTimeCO(receipt.orden.creado_en)}</div>
          <div>Estado: {receipt.orden.estado}</div>

          <div
            className="ticket-divider"
            style={{ borderTop: '1px dashed #000', margin: '6px 0' }}
          />

          <div>
            <strong>Cliente:</strong> {receipt.orden.nombre_cliente}
          </div>
          <div>
            <strong>WhatsApp:</strong> {receipt.orden.whatsapp}
          </div>
          <div>
            <strong>Tipo:</strong> {receipt.orden.tipo_equipo}
          </div>
          <div>
            <strong>Equipo:</strong> {receipt.orden.marca_modelo}
          </div>
          {receipt.orden.imei_serie && (
            <div>
              <strong>IMEI/Serie:</strong> {receipt.orden.imei_serie}
            </div>
          )}
          {receipt.orden.clave_desbloqueo && (
            <div>
              <strong>Clave/Patrón:</strong> {receipt.orden.clave_desbloqueo}
            </div>
          )}
          <div>
            <strong>Falla:</strong> {receipt.orden.falla_reportada}
          </div>
          {receipt.orden.accesorios && (
            <div>
              <strong>Accesorios:</strong> {receipt.orden.accesorios}
            </div>
          )}

          <div
            className="ticket-divider"
            style={{ borderTop: '1px dashed #000', margin: '6px 0' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Valor estimado:</span>
            <span>{formatCOP(receipt.orden.valor_estimado)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Abono inicial:</span>
            <span>{formatCOP(receipt.orden.abono_inicial)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '1.1em',
              marginTop: '3px',
            }}
          >
            <span>SALDO PENDIENTE:</span>
            <span>{formatCOP(receipt.orden.saldo_pendiente)}</span>
          </div>

          <div
            className="ticket-divider"
            style={{ borderTop: '1px dashed #000', margin: '6px 0' }}
          />
          <div style={{ textAlign: 'center', fontSize: '0.9em' }}>
            Conserve este comprobante para reclamar su equipo.
          </div>
        </div>
      )}
    </div>
  );
};

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  receipt,
  businessConfig,
  fallbackBusinessName,
  previewOpen,
  onClosePreview,
}) => {
  if (!receipt) return null;

  const sizeClass = businessConfig.tamano_ticket === '58mm' ? 'ticket-58mm' : 'ticket-80mm';

  return (
    <>
      {/* Contenedor oculto para impresión térmica directa via @media print */}
      <div id="thermal-receipt-print" className={sizeClass}>
        <ReceiptBody
          receipt={receipt}
          businessConfig={businessConfig}
          fallbackBusinessName={fallbackBusinessName}
        />
      </div>

      {/* Modal de vista previa en pantalla para reimprimir o confirmar */}
      {previewOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Vista previa de ticket ({businessConfig.tamano_ticket})
                </h3>
                <p className="text-xs text-slate-500">
                  Formato térmico listo para impresora POS
                </p>
              </div>
              <button
                type="button"
                onClick={onClosePreview}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 bg-slate-100 overflow-y-auto flex justify-center">
              <div
                className="bg-white text-black border border-slate-300 p-4 font-mono text-xs leading-snug"
                style={{
                  width: businessConfig.tamano_ticket === '58mm' ? '230px' : '310px',
                }}
              >
                <ReceiptBody
                  receipt={receipt}
                  businessConfig={businessConfig}
                  fallbackBusinessName={fallbackBusinessName}
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClosePreview}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
