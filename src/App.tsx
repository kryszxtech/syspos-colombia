import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CartSidebar } from './components/CartSidebar';
import { InventoryView } from './components/InventoryView';
import { LicenseBlockedScreen } from './components/LicenseBlockedScreen';
import { LoginScreen } from './components/LoginScreen';
import { PosView } from './components/PosView';
import { QuickProductModal } from './components/QuickProductModal';
import { SalesHistoryView } from './components/SalesHistoryView';
import { SettingsView } from './components/SettingsView';
import { SidebarNav } from './components/SidebarNav';
import { ThermalReceipt } from './components/ThermalReceipt';
import { WorkshopView } from './components/WorkshopView';
import {
  clearStoredLicenseSession,
  getEffectiveMasterCredentials,
  getStoredLicenseSession,
  revalidateMasterLicense,
  saveStoredLicenseSession,
} from './config/masterSupabase';
import {
  clearClientSupabaseConfig,
  createProduct,
  createRepairOrder,
  deleteProduct,
  deleteRepairOrder,
  fetchBusinessConfigFromClient,
  fetchProducts,
  fetchRepairs,
  fetchSales,
  getClientSupabaseConfig,
  getStoredBusinessConfig,
  registerSale,
  saveClientSupabaseConfig,
  updateProduct,
  updateRepairStatus,
  upsertBusinessConfigToClient,
} from './services/clientSupabase';
import { isValidSupabaseUrl } from './utils/formatters';
import type {
  ActiveSection,
  BusinessConfig,
  CartItem,
  LicenseSession,
  PaymentMethod,
  Product,
  RepairOrder,
  RepairStatus,
  Sale,
  ThermalReceiptData,
} from './types/pos';

export default function App() {
  const [session, setSession] = useState<LicenseSession | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [revalidatingLicense, setRevalidatingLicense] = useState<boolean>(false);
  const lastUserRef = useRef<string | null>(getStoredLicenseSession()?.usuario ?? null);

  const [activeSection, setActiveSection] = useState<ActiveSection>('pos');
  const [clientConnected, setClientConnected] = useState<boolean>(() =>
    Boolean(getClientSupabaseConfig()),
  );
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>(() =>
    getStoredBusinessConfig(),
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [loadingClientData, setLoadingClientData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [processingSale, setProcessingSale] = useState<boolean>(false);

  const [laserLockEnabled, setLaserLockEnabled] = useState<boolean>(true);
  const [laserFocused, setLaserFocused] = useState<boolean>(false);

  const [quickCreateBarcode, setQuickCreateBarcode] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState<boolean>(false);

  const loadAllClientData = useCallback(async () => {
    const cfg = getClientSupabaseConfig();
    setClientConnected(Boolean(cfg));
    if (!cfg) {
      setProducts([]);
      setSales([]);
      setRepairs([]);
      return;
    }

    setLoadingClientData(true);
    setDataError(null);
    try {
      const [prods, sls, reps, remoteBiz] = await Promise.all([
        fetchProducts(),
        fetchSales(),
        fetchRepairs(),
        fetchBusinessConfigFromClient(),
      ]);
      setProducts(prods);
      setSales(sls);
      setRepairs(reps);
      if (remoteBiz) {
        setBusinessConfig(remoteBiz);
      }
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Error al consultar la base de datos del negocio. Verifica que las tablas estén creadas o contacta al administrador.',
      );
    } finally {
      setLoadingClientData(false);
    }
  }, []);

  const verifyCurrentLicense = useCallback(async (stored: LicenseSession) => {
    const master = getEffectiveMasterCredentials();
    if (!master.configured) {
      setSession(stored);
      return;
    }
    const fresh = await revalidateMasterLicense(stored.licencia_id, stored.usuario);
    if (!fresh.autenticado) {
      clearStoredLicenseSession();
      setSession(null);
      return;
    }
    const updated: LicenseSession = {
      licencia_id: fresh.licencia_id || stored.licencia_id,
      usuario: fresh.usuario || stored.usuario,
      nombre_negocio: fresh.nombre_negocio || stored.nombre_negocio,
      activo: Boolean(fresh.activo),
      fecha_vencimiento: fresh.fecha_vencimiento || stored.fecha_vencimiento,
      fecha_servidor: fresh.fecha_servidor || stored.fecha_servidor,
      dias_restantes: Number(fresh.dias_restantes ?? 0),
      licencia_valida: Boolean(fresh.licencia_valida),
      cliente_supabase_url: fresh.cliente_supabase_url ?? stored.cliente_supabase_url ?? null,
      cliente_supabase_anon_key:
        fresh.cliente_supabase_anon_key ?? stored.cliente_supabase_anon_key ?? null,
      mensaje: fresh.mensaje,
    };
    if (
      updated.cliente_supabase_url &&
      updated.cliente_supabase_anon_key &&
      isValidSupabaseUrl(updated.cliente_supabase_url) &&
      updated.cliente_supabase_anon_key.trim().length >= 20
    ) {
      saveClientSupabaseConfig({
        url: updated.cliente_supabase_url,
        anonKey: updated.cliente_supabase_anon_key,
      });
      setClientConnected(true);
    }
    saveStoredLicenseSession(updated);
    setSession(updated);
  }, []);

  // Revalidar licencia contra Supabase Maestro al abrir la aplicación
  useEffect(() => {
    const init = async () => {
      const stored = getStoredLicenseSession();
      if (!stored) {
        setCheckingSession(false);
        return;
      }
      try {
        await verifyCurrentLicense(stored);
      } catch {
        setSession(stored);
      } finally {
        setCheckingSession(false);
      }
    };
    init();
  }, [verifyCurrentLicense]);

  // Revalidar licencia periódicamente y al volver a la pestaña para control mensual estricto
  useEffect(() => {
    if (!session) return;

    const revalidateSilently = () => {
      verifyCurrentLicense(session).catch(() => {
        // Mantener estado actual si hay caída momentánea de red
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        revalidateSilently();
      }
    };

    const intervalId = window.setInterval(revalidateSilently, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [session?.licencia_id, session?.usuario, verifyCurrentLicense]);

  // Cargar datos operativos del Supabase del cliente cuando la licencia está activa
  useEffect(() => {
    if (session?.licencia_valida) {
      loadAllClientData();
    }
  }, [
    session?.licencia_valida,
    session?.cliente_supabase_url,
    session?.cliente_supabase_anon_key,
    loadAllClientData,
  ]);

  const handleAuthenticated = (newSession: LicenseSession) => {
    if (
      newSession.cliente_supabase_url &&
      newSession.cliente_supabase_anon_key &&
      isValidSupabaseUrl(newSession.cliente_supabase_url) &&
      newSession.cliente_supabase_anon_key.trim().length >= 20
    ) {
      saveClientSupabaseConfig({
        url: newSession.cliente_supabase_url,
        anonKey: newSession.cliente_supabase_anon_key,
      });
      setClientConnected(true);
    } else if (lastUserRef.current && lastUserRef.current !== newSession.usuario) {
      clearClientSupabaseConfig();
      setClientConnected(false);
    }
    lastUserRef.current = newSession.usuario;
    saveStoredLicenseSession(newSession);
    setSession(newSession);
  };

  const handleRetryLicenseCheck = async () => {
    if (!session) return;
    setRevalidatingLicense(true);
    try {
      await verifyCurrentLicense(session);
      await loadAllClientData();
    } finally {
      setRevalidatingLicense(false);
    }
  };

  const handleLogout = () => {
    if (session?.usuario) {
      lastUserRef.current = session.usuario;
    }
    clearStoredLicenseSession();
    setSession(null);
    setDataError(null);
    setCart([]);
    setProducts([]);
    setSales([]);
    setRepairs([]);
    setActiveSection('pos');
  };

  // Gestión de carrito
  const handleAddProductToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.key === product.id);
      if (existing) {
        if (existing.stock_disponible !== null && existing.cantidad >= existing.stock_disponible) {
          return prev;
        }
        return prev.map((item) =>
          item.key === product.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          key: product.id,
          producto_id: product.id,
          codigo_barras: product.codigo_barras,
          nombre: product.nombre,
          precio_unitario: product.precio_venta,
          cantidad: 1,
          stock_disponible: product.stock,
        },
      ];
    });
  };

  const handleUpdateCartQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const nextQty = item.cantidad + delta;
          if (nextQty <= 0) return null;
          if (item.stock_disponible !== null && nextQty > item.stock_disponible) return item;
          return { ...item, cantidad: nextQty };
        })
        .filter((item): item is CartItem => item !== null),
    );
  };

  const handleRemoveCartItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const handleCheckout = async (params: {
    descuento: number;
    metodo_pago: PaymentMethod;
    efectivo_recibido: number;
    referencia_pago?: string;
    banco_transferencia?: string;
  }) => {
    setProcessingSale(true);
    try {
      const { sale, items } = await registerSale({
        items: cart.map((c) => ({
          producto_id: c.producto_id,
          reparacion_id: c.reparacion_id ?? null,
          codigo_barras: c.codigo_barras,
          nombre_producto: c.nombre,
          cantidad: c.cantidad,
          precio_unitario: c.precio_unitario,
        })),
        descuento: params.descuento,
        metodo_pago: params.metodo_pago,
        efectivo_recibido: params.efectivo_recibido,
        referencia_pago: params.referencia_pago,
        banco_transferencia: params.banco_transferencia,
      });

      setCart([]);
      await loadAllClientData();

      setReceiptData({ tipo: 'venta', venta: sale, items });
      setReceiptPreviewOpen(true);
      setTimeout(() => {
        window.print();
      }, 150);
    } finally {
      setProcessingSale(false);
    }
  };

  // CRUD Productos
  const handleCreateProduct = async (
    input: Omit<Product, 'id' | 'creado_en' | 'actualizado_en'>,
    addToCart = false,
  ) => {
    const created = await createProduct(input);
    setProducts((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    if (addToCart && created.stock > 0) {
      handleAddProductToCart(created);
    }
    return created;
  };

  const handleUpdateProduct = async (
    id: string,
    input: Partial<Omit<Product, 'id' | 'creado_en' | 'actualizado_en'>>,
  ) => {
    const updated = await updateProduct(id, input);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((item) => item.producto_id !== id));
  };

  // CRUD Taller de Reparaciones
  const handleCreateRepair = async (
    input: Omit<
      RepairOrder,
      'id' | 'numero_orden' | 'creado_en' | 'actualizado_en' | 'cobrado_en_pos'
    >,
  ) => {
    const created = await createRepairOrder(input);
    setRepairs((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateRepairStatus = async (id: string, status: RepairStatus) => {
    const updated = await updateRepairStatus(id, status);
    setRepairs((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const handleDeleteRepair = async (id: string) => {
    await deleteRepairOrder(id);
    setRepairs((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePrintReceptionTicket = (order: RepairOrder) => {
    setReceiptData({ tipo: 'taller', orden: order });
    setReceiptPreviewOpen(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSendRepairBalanceToPos = (order: RepairOrder) => {
    if (order.saldo_pendiente <= 0) return;
    const key = `rep:${order.id}`;
    setCart((prev) => {
      if (prev.some((i) => i.key === key)) return prev;
      return [
        ...prev,
        {
          key,
          producto_id: null,
          reparacion_id: order.id,
          codigo_barras: order.numero_orden,
          nombre: `Reparación ${order.numero_orden} (${order.marca_modelo})`,
          precio_unitario: order.saldo_pendiente,
          cantidad: 1,
          stock_disponible: 1,
          es_servicio_taller: true,
        },
      ];
    });
    setActiveSection('pos');
  };

  const handleReprintSale = (sale: Sale) => {
    setReceiptData({
      tipo: 'venta',
      venta: sale,
      items: sale.detalle_ventas ?? [],
    });
    setReceiptPreviewOpen(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSaveBusinessConfig = async (cfg: BusinessConfig) => {
    await upsertBusinessConfigToClient(cfg);
    setBusinessConfig(cfg);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-700">
            Verificando estado de licencia...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  if (!session.licencia_valida) {
    return (
      <LicenseBlockedScreen
        session={session}
        revalidating={revalidatingLicense}
        onRetryCheck={handleRetryLicenseCheck}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <div className="no-print h-screen w-full overflow-hidden bg-slate-50 flex flex-col">
        {/* Diseño principal de 3 columnas */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Columna Izquierda: Navegación y Estado */}
          <SidebarNav
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            session={session}
            businessConfig={businessConfig}
            clientConnected={clientConnected}
            laserFocused={laserFocused}
            onLogout={handleLogout}
          />

          {/* Columna Central: Área de Trabajo Dinámica */}
          <main className="flex-1 min-w-0 min-h-0 p-4 overflow-hidden flex flex-col">
            {dataError && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2 shrink-0">
                <span>{dataError}</span>
                <button
                  type="button"
                  onClick={loadAllClientData}
                  className="font-semibold underline shrink-0 cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0">
              {activeSection === 'pos' && (
                <PosView
                  products={products}
                  loading={loadingClientData}
                  clientConnected={clientConnected}
                  laserLockEnabled={laserLockEnabled}
                  onToggleLaserLock={() => setLaserLockEnabled((prev) => !prev)}
                  onLaserFocusChange={setLaserFocused}
                  onAddProductToCart={handleAddProductToCart}
                  onOpenQuickCreate={(barcode) => setQuickCreateBarcode(barcode)}
                  onNavigate={setActiveSection}
                  onRetryConnection={handleRetryLicenseCheck}
                  modalOpen={quickCreateBarcode !== null || receiptPreviewOpen}
                />
              )}

              {activeSection === 'inventario' && (
                <InventoryView
                  products={products}
                  loading={loadingClientData}
                  clientConnected={clientConnected}
                  onCreateProduct={(input) => handleCreateProduct(input, false)}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onRetryConnection={handleRetryLicenseCheck}
                />
              )}

              {activeSection === 'taller' && (
                <WorkshopView
                  repairs={repairs}
                  loading={loadingClientData}
                  clientConnected={clientConnected}
                  onCreateRepair={handleCreateRepair}
                  onUpdateStatus={handleUpdateRepairStatus}
                  onDeleteRepair={handleDeleteRepair}
                  onPrintReceptionTicket={handlePrintReceptionTicket}
                  onSendBalanceToPos={handleSendRepairBalanceToPos}
                  onRetryConnection={handleRetryLicenseCheck}
                />
              )}

              {activeSection === 'historial' && (
                <SalesHistoryView
                  sales={sales}
                  loading={loadingClientData}
                  clientConnected={clientConnected}
                  onReprintSale={handleReprintSale}
                  onRetryConnection={handleRetryLicenseCheck}
                />
              )}

              {activeSection === 'configuracion' && (
                <SettingsView
                  businessConfig={businessConfig}
                  onSaveBusinessConfig={handleSaveBusinessConfig}
                />
              )}
            </div>
          </main>

          {/* Columna Derecha: Ticket / Carrito de Venta en Vivo (solo visible en POS) */}
          {activeSection === 'pos' && (
            <CartSidebar
              items={cart}
              clientConnected={clientConnected}
              processingSale={processingSale}
              onUpdateQty={handleUpdateCartQty}
              onRemoveItem={handleRemoveCartItem}
              onClearCart={() => setCart([])}
              onCheckout={handleCheckout}
            />
          )}
        </div>

        {/* Modal rápido para código escaneado inexistente */}
        {quickCreateBarcode !== null && (
          <QuickProductModal
            initialBarcode={quickCreateBarcode}
            onClose={() => setQuickCreateBarcode(null)}
            onCreate={(input) => handleCreateProduct(input, true)}
          />
        )}
      </div>

      {/* Plantilla térmica oculta (@media print) + Modal de vista previa */}
      <ThermalReceipt
        receipt={receiptData}
        businessConfig={businessConfig}
        fallbackBusinessName={session.nombre_negocio}
        previewOpen={receiptPreviewOpen}
        onClosePreview={() => setReceiptPreviewOpen(false)}
      />
    </>
  );
}
