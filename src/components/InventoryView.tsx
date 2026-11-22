import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, Edit3, Package, Plus, Search, Trash2, X } from 'lucide-react';
import type { Product } from '../types/pos';
import {
  DEFAULT_LOW_STOCK_ALERT,
  formatCOP,
  getProductLowStockLimit,
  isProductLowStock,
  parseNonNegativeInt,
} from '../utils/formatters';

interface InventoryViewProps {
  products: Product[];
  loading: boolean;
  clientConnected: boolean;
  focusLowStockSignal?: number;
  onCreateProduct: (
    input: Omit<Product, 'id' | 'creado_en' | 'actualizado_en'>,
  ) => Promise<Product>;
  onUpdateProduct: (
    id: string,
    input: Partial<Omit<Product, 'id' | 'creado_en' | 'actualizado_en'>>,
  ) => Promise<Product>;
  onDeleteProduct: (id: string) => Promise<void>;
  onRetryConnection?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  loading,
  clientConnected,
  focusLowStockSignal = 0,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRetryConnection,
}) => {
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [codigoBarras, setCodigoBarras] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stock, setStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState(String(DEFAULT_LOW_STOCK_ALERT));

  const resetForm = () => {
    setEditingId(null);
    setCodigoBarras('');
    setNombre('');
    setCategoria('');
    setPrecioCosto('');
    setPrecioVenta('');
    setStock('');
    setStockMinimo(String(DEFAULT_LOW_STOCK_ALERT));
  };

  const handleStartEdit = (p: Product) => {
    setEditingId(p.id);
    setCodigoBarras(p.codigo_barras ?? '');
    setNombre(p.nombre);
    setCategoria(p.categoria);
    setPrecioCosto(String(p.precio_costo));
    setPrecioVenta(String(p.precio_venta));
    setStock(String(p.stock));
    setStockMinimo(String(getProductLowStockLimit(p)));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('Ingresa el nombre del producto.');
      return;
    }

    const venta = parseNonNegativeInt(precioVenta);
    if (venta <= 0) {
      setErrorMsg('El precio de venta en COP debe ser mayor a 0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        codigo_barras: codigoBarras.trim() || null,
        nombre: nombre.trim(),
        categoria: categoria.trim() || 'General',
        precio_costo: parseNonNegativeInt(precioCosto),
        precio_venta: venta,
        stock: parseNonNegativeInt(stock),
        stock_minimo:
          stockMinimo.trim() === ''
            ? DEFAULT_LOW_STOCK_ALERT
            : parseNonNegativeInt(stockMinimo),
        activo: true,
      };

      if (editingId) {
        await onUpdateProduct(editingId, payload);
        setSuccessMsg('Producto actualizado correctamente.');
      } else {
        await onCreateProduct(payload);
        setSuccessMsg('Producto registrado en tu inventario.');
      }
      resetForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    try {
      await onDeleteProduct(id);
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
    }
  };

  useEffect(() => {
    if (focusLowStockSignal > 0) {
      setOnlyLowStock(true);
    }
  }, [focusLowStockSignal]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => isProductLowStock(p)),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (onlyLowStock && !isProductLowStock(p)) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras ?? '').toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    });
  }, [products, search, onlyLowStock]);

  if (!clientConnected) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Base de datos pendiente de vinculación</h2>
          <p className="text-sm text-slate-600 mt-2">
            Tu cuenta aún no tiene una base de datos asignada para administrar el inventario.
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
      {/* Formulario de creación / edición de producto */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingId ? 'Editar producto' : 'Registrar nuevo producto'}
            </h2>
            <p className="text-xs text-slate-500">
              Los cambios se guardan directamente en tu base de datos Supabase.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar edición
            </button>
          )}
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
              Código de barras
            </label>
            <input
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              placeholder="Escanear o escribir código"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Vidrio Templado 9D"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ej. Accesorios, Repuestos"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Precio de costo (COP)
            </label>
            <input
              type="number"
              min={0}
              value={precioCosto}
              onChange={(e) => setPrecioCosto(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Precio de venta (COP) *
            </label>
            <input
              type="number"
              min={1}
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Stock actual
            </label>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Ej. 10"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alerta de stock bajo
            </label>
            <input
              type="number"
              min={0}
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              placeholder="Ej. 2"
              title="Avisar cuando el stock llegue o baje de esta cantidad"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      </form>

      {/* Alerta de stock bajo en inventario */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Alerta de stock bajo:</strong>{' '}
              {lowStockProducts.length === 1
                ? '1 producto llegó a su mínimo configurado.'
                : `${lowStockProducts.length} productos llegaron a su mínimo configurado.`}{' '}
              <span className="text-amber-800">
                (
                {lowStockProducts
                  .slice(0, 3)
                  .map(
                    (p) =>
                      `${p.nombre}: ${
                        p.stock === 0
                          ? 'Agotado'
                          : `${p.stock} uds / mín. ${getProductLowStockLimit(p)}`
                      }`,
                  )
                  .join(', ')}
                {lowStockProducts.length > 3 ? `, y ${lowStockProducts.length - 3} más` : ''})
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOnlyLowStock((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer whitespace-nowrap ${
              onlyLowStock
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            {onlyLowStock ? 'Ver todo el catálogo' : `Filtrar stock bajo (${lowStockProducts.length})`}
          </button>
        </div>
      )}

      {/* Tabla de productos */}
      <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col min-h-[280px]">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Package className="w-4 h-4 text-slate-500" />
            <span>
              {onlyLowStock
                ? `Stock bajo / Agotado (${filteredProducts.length})`
                : `Catálogo (${products.length})`}
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar inventario..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Cargando inventario...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {products.length === 0
                ? 'Aún no has creado ningún producto. Usa el formulario superior para agregar el primero.'
                : 'No hay productos que coincidan con tu búsqueda.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Código</th>
                  <th className="py-2.5 px-4">Producto</th>
                  <th className="py-2.5 px-4">Categoría</th>
                  <th className="py-2.5 px-4 text-right">Costo</th>
                  <th className="py-2.5 px-4 text-right">Precio Venta</th>
                  <th className="py-2.5 px-4 text-right">Stock</th>
                  <th className="py-2.5 px-4 text-right">Alerta mín.</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {p.codigo_barras || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{p.nombre}</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.categoria}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatCOP(p.precio_costo)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatCOP(p.precio_venta)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                        p.stock <= 0
                          ? 'text-red-600'
                          : isProductLowStock(p)
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                      }`}
                    >
                      {p.stock}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                      {getProductLowStockLimit(p)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {confirmDeleteId === p.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded cursor-pointer"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(p)}
                            aria-label={`Editar ${p.nombre}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            aria-label={`Eliminar ${p.nombre}`}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
