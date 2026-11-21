import React, { useMemo, useState } from 'react';
import {
  Database,
  Laptop,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  Wrench,
} from 'lucide-react';
import type { DeviceType, RepairOrder, RepairStatus } from '../types/pos';
import { formatCOP, formatDateTimeCO, parseNonNegativeInt } from '../utils/formatters';

interface WorkshopViewProps {
  repairs: RepairOrder[];
  loading: boolean;
  clientConnected: boolean;
  onCreateRepair: (
    input: Omit<
      RepairOrder,
      'id' | 'numero_orden' | 'creado_en' | 'actualizado_en' | 'cobrado_en_pos'
    >,
  ) => Promise<RepairOrder>;
  onUpdateStatus: (id: string, status: RepairStatus) => Promise<RepairOrder>;
  onDeleteRepair: (id: string) => Promise<void>;
  onPrintReceptionTicket: (order: RepairOrder) => void;
  onSendBalanceToPos: (order: RepairOrder) => void;
  onRetryConnection?: () => void;
}

const REPAIR_STATUSES: RepairStatus[] = [
  'Recibido',
  'En revisión',
  'Esperando repuesto',
  'Listo para entregar',
  'Entregado',
];

const DEVICE_TYPES: DeviceType[] = [
  'Teléfono / Celular',
  'Computador / Portátil',
  'Otro dispositivo',
];

export const WorkshopView: React.FC<WorkshopViewProps> = ({
  repairs,
  loading,
  clientConnected,
  onCreateRepair,
  onUpdateStatus,
  onDeleteRepair,
  onPrintReceptionTicket,
  onSendBalanceToPos,
  onRetryConnection,
}) => {
  const [tipoEquipo, setTipoEquipo] = useState<DeviceType>('Teléfono / Celular');
  const [nombreCliente, setNombreCliente] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [marcaModelo, setMarcaModelo] = useState('');
  const [imeiSerie, setImeiSerie] = useState('');
  const [claveDesbloqueo, setClaveDesbloqueo] = useState('');
  const [fallaReportada, setFallaReportada] = useState('');
  const [accesorios, setAccesorios] = useState('');
  const [valorEstimado, setValorEstimado] = useState('');
  const [abonoInicial, setAbonoInicial] = useState('');
  const [estado, setEstado] = useState<RepairStatus>('Recibido');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const valorEstimadoNum = parseNonNegativeInt(valorEstimado);
  const abonoInicialNum = Math.min(valorEstimadoNum, parseNonNegativeInt(abonoInicial));
  const saldoPendienteNum = Math.max(0, valorEstimadoNum - abonoInicialNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nombreCliente.trim() || !whatsapp.trim() || !marcaModelo.trim() || !fallaReportada.trim()) {
      setErrorMsg('Completa cliente, WhatsApp, marca/modelo y falla reportada.');
      return;
    }

    setSaving(true);
    try {
      const created = await onCreateRepair({
        tipo_equipo: tipoEquipo,
        nombre_cliente: nombreCliente.trim(),
        whatsapp: whatsapp.trim(),
        marca_modelo: marcaModelo.trim(),
        imei_serie: imeiSerie.trim(),
        clave_desbloqueo: claveDesbloqueo.trim(),
        falla_reportada: fallaReportada.trim(),
        accesorios: accesorios.trim(),
        valor_estimado: valorEstimadoNum,
        abono_inicial: abonoInicialNum,
        saldo_pendiente: saldoPendienteNum,
        estado,
      });

      setNombreCliente('');
      setWhatsapp('');
      setMarcaModelo('');
      setImeiSerie('');
      setClaveDesbloqueo('');
      setFallaReportada('');
      setAccesorios('');
      setValorEstimado('');
      setAbonoInicial('');
      setEstado('Recibido');

      setSuccessMsg(`Orden ${created.numero_orden} registrada correctamente.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo registrar la orden.');
    } finally {
      setSaving(false);
    }
  };

  const filteredRepairs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repairs.filter((r) => {
      if (statusFilter !== 'Todos' && r.estado !== statusFilter) return false;
      if (!q) return true;
      return (
        r.numero_orden.toLowerCase().includes(q) ||
        r.nombre_cliente.toLowerCase().includes(q) ||
        r.whatsapp.toLowerCase().includes(q) ||
        r.marca_modelo.toLowerCase().includes(q) ||
        (r.imei_serie ?? '').toLowerCase().includes(q)
      );
    });
  }, [repairs, statusFilter, search]);

  if (!clientConnected) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Base de datos pendiente de vinculación</h2>
          <p className="text-sm text-slate-600 mt-2">
            Tu cuenta aún no tiene una base de datos asignada para registrar ingresos de taller.
            Comunícate con el administrador del sistema para activarla.
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
      {/* Formulario de recepción de equipo */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recepción de Equipo — Taller de Reparaciones
            </h2>
            <p className="text-xs text-slate-500">
              Registra celulares, portátiles u otros dispositivos y cobra el saldo directo en el POS.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {DEVICE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTipoEquipo(type)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  tipoEquipo === type
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'Teléfono / Celular' && <Smartphone className="w-3.5 h-3.5" />}
                {type === 'Computador / Portátil' && <Laptop className="w-3.5 h-3.5" />}
                {type === 'Otro dispositivo' && <Wrench className="w-3.5 h-3.5" />}
                {type}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del cliente *
            </label>
            <input
              type="text"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              placeholder="Ej. Carlos Mendoza"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp / Teléfono *
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="300 000 0000"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Marca y Modelo *
            </label>
            <input
              type="text"
              value={marcaModelo}
              onChange={(e) => setMarcaModelo(e.target.value)}
              placeholder="Ej. Samsung A54 / HP Pavilion"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              IMEI o Número de Serie
            </label>
            <input
              type="text"
              value={imeiSerie}
              onChange={(e) => setImeiSerie(e.target.value)}
              placeholder="IMEI / Serial"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clave / Patrón de desbloqueo
            </label>
            <input
              type="text"
              value={claveDesbloqueo}
              onChange={(e) => setClaveDesbloqueo(e.target.value)}
              placeholder="PIN, contraseña o patrón"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Falla reportada *
            </label>
            <input
              type="text"
              value={fallaReportada}
              onChange={(e) => setFallaReportada(e.target.value)}
              placeholder="Descripción detallada del daño o síntoma"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Accesorios que deja
            </label>
            <input
              type="text"
              value={accesorios}
              onChange={(e) => setAccesorios(e.target.value)}
              placeholder="Ej. Cargador, funda, SIM"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor estimado (COP)
            </label>
            <input
              type="number"
              min={0}
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Abono inicial (COP)
            </label>
            <input
              type="number"
              min={0}
              value={abonoInicial}
              onChange={(e) => setAbonoInicial(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Saldo pendiente (COP)
            </label>
            <div className="px-3 py-2 text-sm font-mono font-bold tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
              {formatCOP(saldoPendienteNum)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estado inicial
            </label>
            <div className="flex items-center gap-2">
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as RepairStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {REPAIR_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Lista de órdenes de taller */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col min-h-[280px]">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 mr-2">
              Órdenes de Taller ({repairs.length})
            </span>
            {['Todos', ...REPAIR_STATUSES].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar orden, cliente, IMEI..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Cargando órdenes...</div>
          ) : filteredRepairs.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {repairs.length === 0
                ? 'No hay equipos registrados en el taller todavía.'
                : 'No hay órdenes que coincidan con el filtro seleccionado.'}
            </div>
          ) : (
            filteredRepairs.map((order) => (
              <div
                key={order.id}
                className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-900">{order.numero_orden}</span>
                    <span aria-hidden="true">·</span>
                    <span>{order.tipo_equipo}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatDateTimeCO(order.creado_en)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {order.marca_modelo} — {order.nombre_cliente}{' '}
                    <span className="font-mono font-normal text-xs text-slate-500">
                      ({order.whatsapp})
                    </span>
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Falla:</strong> {order.falla_reportada}
                    {order.imei_serie && (
                      <>
                        {' · '}
                        <strong>IMEI/Serie:</strong>{' '}
                        <span className="font-mono">{order.imei_serie}</span>
                      </>
                    )}
                    {order.accesorios && (
                      <>
                        {' · '}
                        <strong>Accesorios:</strong> {order.accesorios}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="text-right font-mono tabular-nums text-xs mr-1">
                    <div className="text-slate-500">
                      Est: {formatCOP(order.valor_estimado)} · Abono: {formatCOP(order.abono_inicial)}
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        order.saldo_pendiente > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      Saldo: {formatCOP(order.saldo_pendiente)}
                    </div>
                  </div>

                  <select
                    aria-label={`Estado de ${order.numero_orden}`}
                    value={order.estado}
                    onChange={(e) => onUpdateStatus(order.id, e.target.value as RepairStatus)}
                    className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {REPAIR_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onPrintReceptionTicket(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Ticket Recepción
                  </button>

                  {order.saldo_pendiente > 0 && !order.cobrado_en_pos && (
                    <button
                      type="button"
                      onClick={() => onSendBalanceToPos(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Cobrar Saldo en el POS
                    </button>
                  )}

                  {confirmDeleteId === order.id ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteRepair(order.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 rounded cursor-pointer"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-[11px] text-slate-600 bg-slate-100 rounded cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(order.id)}
                      aria-label={`Eliminar orden ${order.numero_orden}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
