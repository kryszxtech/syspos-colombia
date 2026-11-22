import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, ShieldAlert, User } from 'lucide-react';
import { loginWithMasterSupabase } from '../config/masterSupabase';
import type { LicenseSession } from '../types/pos';

interface LoginScreenProps {
  onAuthenticated: (session: LicenseSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!usuario.trim() || !clave) {
      setErrorMsg('Ingresa tu usuario (o correo) y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithMasterSupabase(usuario, clave);

      if (!result || !result.autenticado) {
        setErrorMsg(result?.mensaje || 'Usuario o contraseña incorrectos.');
        return;
      }

      const session: LicenseSession = {
        licencia_id: result.licencia_id || '',
        usuario: result.usuario || usuario.trim(),
        nombre_negocio: result.nombre_negocio || 'Mi Negocio',
        activo: Boolean(result.activo),
        fecha_vencimiento: result.fecha_vencimiento || '',
        fecha_servidor: result.fecha_servidor || '',
        dias_restantes: Number(result.dias_restantes ?? 0),
        licencia_valida: Boolean(result.licencia_valida),
        cliente_supabase_url: result.cliente_supabase_url ?? null,
        cliente_supabase_anon_key: result.cliente_supabase_anon_key ?? null,
        mensaje: result.mensaje,
      };

      onAuthenticated(session);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="w-full border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/punto-de-venta_60e36d8f.png"
            alt="SysPOS Colombia"
            className="w-10 h-10 object-contain shrink-0"
          />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
              SysPOS Colombia
            </h1>
            <p className="text-xs text-slate-500">
              Terminal Punto de Venta · Inventario · Taller
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Ingresa tus credenciales para validar tu suscripción mensual y acceder al sistema.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-usuario"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Usuario o correo electrónico
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-usuario"
                  type="text"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="negocio@correo.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-clave"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Contraseña de acceso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-clave"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Validando licencia...' : 'Validar Licencia e Ingresar'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Suscripción mensual</span>
            <span className="font-mono text-slate-600">COP · América/Bogotá</span>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>SysPOS Colombia</span>
        <span>Acceso sujeto a licencia mensual activa.</span>
      </footer>
    </div>
  );
};
