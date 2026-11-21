import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Barcode,
  Database,
  Lock,
  LockOpen,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
} from 'lucide-react';
import type { ActiveSection, Product } from '../types/pos';
import { formatCOP } from '../utils/formatters';

interface PosViewProps {
  products: Product[];
  loading: boolean;
  clientConnected: boolean;
  laserLockEnabled: boolean;
  onToggleLaserLock: () => void;
  onLaserFocusChange: (focused: boolean) => void;
  onAddProductToCart: (product: Product) => void;
  onOpenQuickCreate: (barcode: string) => void;
  onNavigate: (section: ActiveSection) => void;
  onRetryConnection?: () => void;
  modalOpen: boolean;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  loading,
  clientConnected,
  laserLockEnabled,
  onToggleLaserLock,
  onLaserFocusChange,
  onAddProductToCart,
  onOpenQuickCreate,
  onNavigate,
  onRetryConnection,
  modalOpen,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Auto-enfoque permanente para pistola láser de códigos de barras
  useEffect(() => {
    if (!laserLockEnabled || modalOpen) return;

    const focusScanner = () => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      // No robar foco si el usuario está escribiendo en otro input/select/textarea intencionalmente
      if (
        document.activeElement !== scannerInputRef.current &&
        (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select')
      ) {
        return;
      }
      scannerInputRef.current?.focus();
    };

    focusScanner();

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.closest('[data-keep-focus]')) {
        return;
      }
      setTimeout(focusScanner, 10);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [laserLockEnabled, modalOpen]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(products.map((p) => (p.categoria || 'General').trim())),
    ).sort((a, b) => a.localeCompare(b, 'es'));
    return ['Todos', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.activo) return false;
      const catMatch =
        selectedCategory === 'Todos' || (p.categoria || 'General').trim() === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo_barras ?? '').toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    });
  }, [products, query, selectedCategory]);

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const rawCode = query.trim();
    if (!rawCode) return;

    setNotFoundBarcode(null);
    const exactMatch = products.find(
      (p) =>
        p.activo &&
        ((p.codigo_barras ?? '').trim().toLowerCase() === rawCode.toLowerCase() ||
          p.nombre.toLowerCase() === rawCode.toLowerCase()),
    );

    if (exactMatch) {
      if (exactMatch.stock <= 0) {
        setScanFeedback(`Sin stock disponible para "${exactMatch.nombre}".`);
        setTimeout(() => setScanFeedback(null), 3000);
        setQuery('');
        return;
      }
      onAddProductToCart(exactMatch);
      setScanFeedback(`Agregado: ${exactMatch.nombre}`);
      setTimeout(() => setScanFeedback(null), 2000);
      setQuery('');
    } else {
      setNotFoundBarcode(rawCode);
    }
  };

  if (!clientConnected) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Base de datos pendiente de vinculación</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Tu cuenta aún no tiene una base de datos asignada para registrar productos y ventas.
            Comunícate con el administrador del sistema para activarla.
          </p>
          {onRetryConnection && (
            <button
              type="button"
              onClick={onRetryConnection}
              className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
            >
              Verificar conexión
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Barra superior de pistola láser y búsqueda */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Barcode className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={scannerInputRef}
              type="text"
              value={query}
              onFocus={() => onLaserFocusChange(true)}
              onBlur={() => onLaserFocusChange(false)}
              onChange={(e) => {
                setQuery(e.target.value);
                if (notFoundBarcode) setNotFoundBarcode(null);
              }}
              onKeyDown={handleScannerKeyDown}
              placeholder="Escanea código de barras con pistola láser o busca por nombre (Enter para agregar)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={onToggleLaserLock}
            title="Activar o pausar el auto-enfoque permanente para pistola láser"
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              laserLockEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {laserLockEnabled ? (
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <LockOpen className="w-3.5 h-3.5 text-slate-400" />
            )}
            {laserLockEnabled ? 'Auto-enfoque láser activo' : 'Auto-enfoque pausado'}
          </button>
        </div>

        {/* Feedback de escaneo o botón rápido para código inexistente */}
        {scanFeedback && (
          <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {scanFeedback}
          </div>
        )}

        {notFoundBarcode && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-xs">
            <span className="text-amber-900">
              No existe ningún producto con el código{' '}
              <strong className="font-mono">{notFoundBarcode}</strong>.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const code = notFoundBarcode;
                  setNotFoundBarcode(null);
                  setQuery('');
                  onOpenQuickCreate(code);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md cursor-pointer whitespace-nowrap"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                Crear producto rápido
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotFoundBarcode(null);
                  setQuery('');
                }}
                className="px-2.5 py-1.5 font-medium text-amber-900 hover:bg-amber-100 rounded-md cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

        {/* Filtro de categorías */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cuadrícula de productos */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white border border-slate-200 rounded-xl p-4 animate-pulse"
              >
                <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-3/4 bg-slate-200 rounded mb-6" />
                <div className="h-5 w-1/2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="h-full min-h-[300px] bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Tu inventario está vacío</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              No hay productos cargados todavía. Crea tu primer producto para empezar a vender en
              el Punto de Venta.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenQuickCreate('')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Crear primer producto
              </button>
              <button
                type="button"
                onClick={() => onNavigate('inventario')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Ir a Inventario
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No se encontraron productos para "{query}".
            </p>
            {query.trim() && (
              <button
                type="button"
                onClick={() => onOpenQuickCreate(query.trim())}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                Crear producto "{query.trim()}"
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
            {filteredProducts.map((product) => {
              const outOfStock = product.stock <= 0;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onAddProductToCart(product)}
                  className={`group text-left bg-white border rounded-xl p-3.5 transition-colors flex flex-col justify-between min-h-[126px] ${
                    outOfStock
                      ? 'border-slate-200 opacity-55 cursor-not-allowed'
                      : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-1.5">
                      <span className="truncate">{product.categoria || 'General'}</span>
                      <span
                        className={`font-mono tabular-nums shrink-0 font-semibold ${
                          outOfStock
                            ? 'text-red-600'
                            : product.stock <= 5
                              ? 'text-amber-600'
                              : 'text-slate-500'
                        }`}
                      >
                        Stock: {product.stock}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {product.nombre}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between gap-2">
                    <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                      {formatCOP(product.precio_venta)}
                    </span>
                    {product.codigo_barras && (
                      <span className="font-mono text-[10px] text-slate-400 truncate max-w-[80px]">
                        {product.codigo_barras}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
