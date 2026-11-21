import React, { useState } from 'react';
import { PackagePlus, X } from 'lucide-react';
import type { Product } from '../types/pos';
import { parseNonNegativeInt } from '../utils/formatters';

interface QuickProductModalProps {
  initialBarcode: string;
  onClose: () => void;
  onCreate: (input: Omit<Product, 'id' | 'creado_en' | 'actualizado_en'>) => Promise<Product>;
}

export const QuickProductModal: React.FC<QuickProductModalProps> = ({
  initialBarcode,
  onClose,
  onCreate,
}) => {
  const [codigoBarras, setCodigoBarras] = useState(initialBarcode);
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('General');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stock, setStock] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }

    const venta = parseNonNegativeInt(precioVenta);
    if (venta <= 0) {
      setError('El precio de venta debe ser mayor a $ 0.');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        codigo_barras: codigoBarras.trim() || null,
        nombre: nombre.trim(),
        categoria: categoria.trim() || 'General',
        precio_costo: parseNonNegativeInt(precioCosto),
        precio_venta: venta,
        stock: parseNonNegativeInt(stock),
        activo: true,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el producto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Crear producto rápido</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código de barras
            </label>
            <input
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del producto *
            </label>
            <input
              type="text"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cargador Tipo C 25W"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock inicial</label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Precio costo (COP)
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
                Precio venta (COP) *
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
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar y agregar al carrito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
