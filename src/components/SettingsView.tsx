import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Printer, Save, Store, Trash2 } from 'lucide-react';
import type { BusinessConfig, TicketSize } from '../types/pos';

interface SettingsViewProps {
  businessConfig: BusinessConfig;
  onSaveBusinessConfig: (config: BusinessConfig) => Promise<void>;
}

async function processLogoFile(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo SVG.'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 220;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error('No se pudo optimizar el ícono.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
    };
    img.src = objectUrl;
  });
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  businessConfig,
  onSaveBusinessConfig,
}) => {
  const [nombreNegocio, setNombreNegocio] = useState(businessConfig.nombre_negocio);
  const [nit, setNit] = useState(businessConfig.nit);
  const [direccion, setDireccion] = useState(businessConfig.direccion);
  const [telefono, setTelefono] = useState(businessConfig.telefono);
  const [tamanoTicket, setTamanoTicket] = useState<TicketSize>(businessConfig.tamano_ticket);
  const [pieTicket, setPieTicket] = useState(businessConfig.pie_ticket);
  const [logoUrl, setLogoUrl] = useState(businessConfig.logo_url ?? '');
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessMsg, setBusinessMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNombreNegocio(businessConfig.nombre_negocio);
    setNit(businessConfig.nit);
    setDireccion(businessConfig.direccion);
    setTelefono(businessConfig.telefono);
    setTamanoTicket(businessConfig.tamano_ticket);
    setPieTicket(businessConfig.pie_ticket);
    setLogoUrl(businessConfig.logo_url ?? '');
  }, [businessConfig]);

  const handleSelectLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBusinessMsg({ ok: false, text: 'Selecciona un archivo de imagen válido (PNG, JPG o SVG).' });
      return;
    }

    try {
      const processed = await processLogoFile(file);
      setLogoUrl(processed);
      setBusinessMsg(null);
    } catch (err) {
      setBusinessMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'No se pudo cargar la imagen.',
      });
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBusiness(true);
    setBusinessMsg(null);
    try {
      await onSaveBusinessConfig({
        nombre_negocio: nombreNegocio.trim(),
        nit: nit.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        tamano_ticket: tamanoTicket,
        pie_ticket: pieTicket.trim() || '¡Gracias por su compra!',
        logo_url: logoUrl,
      });
      setBusinessMsg({ ok: true, text: 'Datos del negocio y ticket guardados correctamente.' });
      setTimeout(() => setBusinessMsg(null), 3500);
    } catch (err) {
      setBusinessMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Error al guardar configuración.',
      });
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pr-0.5">
      <div className="max-w-2xl">
        <form
          onSubmit={handleSaveBusiness}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-700" />
              Datos del Negocio y Ticket Térmico
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Información e ícono impresos en el encabezado y pie de tus facturas y tickets de taller.
            </p>
          </div>

          {businessMsg && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                businessMsg.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {businessMsg.text}
            </div>
          )}

          {/* Ícono / Logo del negocio */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Ícono del negocio"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Store className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">Ícono / Logo del Negocio</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Aparece en el menú lateral y en el encabezado de tus tickets térmicos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleSelectLogo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                {logoUrl ? 'Cambiar ícono' : 'Subir ícono'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Negocio
              </label>
              <input
                type="text"
                value={nombreNegocio}
                onChange={(e) => setNombreNegocio(e.target.value)}
                placeholder="Ej. TecnoServicios Colombia"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIT o Cédula
              </label>
              <input
                type="text"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="Ej. 901.234.567-8"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Cra 10 # 15-20, Centro"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="300 123 4567"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tamaño de Papel Térmico
              </label>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['80mm', '58mm'] as TicketSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTamanoTicket(size)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer ${
                      tamanoTicket === size
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pie de Ticket
              </label>
              <input
                type="text"
                value={pieTicket}
                onChange={(e) => setPieTicket(e.target.value)}
                placeholder="¡Gracias por su compra!"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingBusiness}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingBusiness ? 'Guardando...' : 'Guardar Datos del Negocio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
