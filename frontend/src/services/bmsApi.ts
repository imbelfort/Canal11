import type { UserSession } from '../context/PreferencesContext';
import { mediaHeaders } from './parrillaMedia';
import { BASE_URL, requestJson } from './api/client';
/**
 * Servicio API para sincronización con Backend Laravel 12 (Grupo 12 SC)
 */
const LARAVEL_API = 'http://127.0.0.1:8000/api';

export const bmsApi = {
  // Autenticación
  login: async (login: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const result = await res.json() as
      | { success: true; token: string; usuario: UserSession }
      | { success: false; message?: string };
    return result;
  },

  // Buscador Universal tipo Gmail
  search: async (q: string) => {
    const res = await fetch(`${LARAVEL_API}/search?q=${encodeURIComponent(q)}`);
    return res.json();
  },

  // CU1: Usuarios y Roles
  getUsuarios: async () => (await fetch(`${LARAVEL_API}/v1/usuarios`)).json(),
  createUsuario: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateUsuario: async (id: number, data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteUsuario: async (id: number) => {
    const res = await fetch(`${LARAVEL_API}/v1/usuarios/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  getAuditoria: async () => (await fetch(`${LARAVEL_API}/v1/auditoria`)).json(),

  // CU2: Catálogo de Programas y Categorías
  getCategorias: async () => requestJson<{ id: number; nombre: string }[]>(`${BASE_URL}/v1/categorias`),
  createCategoria: async (data: { nombre: string; descripcion?: string }) =>
    requestJson<{ categoria: { id: number; nombre: string } }>(`${BASE_URL}/v1/categorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    }),
  getProgramas: async () => requestJson<any[]>(`${BASE_URL}/v1/programas`),
  createPrograma: async (data: { titulo: string; id_categoria: number; duracion_estandar_minutos: number; descripcion: string }) =>
    requestJson<{ programa: any }>(`${BASE_URL}/v1/programas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    }),

  // CU3: Parrilla
  getParrillaHoy: async () => requestJson<any>(`${BASE_URL}/v1/parrilla/hoy`),
  addItemParrilla: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteItemParrilla: async (id: number) => {
    const res = await fetch(`${LARAVEL_API}/v1/items/${id}`, { method: 'DELETE' });
    return res.json();
  },
  aprobarParrilla: async (id: number) => {
    const res = await fetch(`${LARAVEL_API}/v1/parrillas/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'APROBADA' })
    });
    return res.json();
  },

  // CU4: MAM Materiales
  getMateriales: async () => (await fetch(`${LARAVEL_API}/v1/materiales`)).json(),
  createMaterial: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/materiales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // CU5: Control de Calidad QC
  getValidaciones: async () => (await fetch(`${LARAVEL_API}/v1/validaciones`)).json(),
  validarItem: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/validaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + (localStorage.getItem('playout_token') || ''),
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // CU6: Clientes, Spots y Pautas
  getClientes: async () => (await fetch(`${LARAVEL_API}/v1/clientes`)).json(),
  createCliente: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getSpots: async () => requestJson<any[]>(`${BASE_URL}/v1/spots`),
  createSpot: async (data: { id_cliente: number; titulo_spot: string; duracion_segundos: number; id_archivo_parrilla: number | null }) =>
    requestJson(`${BASE_URL}/v1/spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    }),
  getPautas: async () => requestJson<any[]>(`${BASE_URL}/v1/pautas`),
  createPauta: async (data: { id_item_parrilla: number; id_spot: number; tanda_bloque: string }) =>
    requestJson(`${BASE_URL}/v1/pautas`, {
      method: 'POST',
      headers: { ...mediaHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  linkSpotFile: async (spot: number, asset: number) =>
    requestJson(`${BASE_URL}/v1/spots/${spot}/archivo`, {
      method: 'PUT',
      headers: { ...mediaHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_archivo_parrilla: asset }),
    }),

  // CU7: Emisión Real (As-Run Log)
  getEmisiones: async () => (await fetch(`${LARAVEL_API}/v1/emisiones`)).json(),
  conciliarEmision: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/emisiones/conciliar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // CU8: Reportes Estadísticos
  getReporteGeneral: async () => (await fetch(`${LARAVEL_API}/v1/reportes/general`)).json(),

  // Módulo PagoFácil QR
  getPagos: async () => (await fetch(`${LARAVEL_API}/pagos`)).json(),
  generarPagoQr: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/pagos/generar-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  confirmarPago: async (txId: string) => {
    const res = await fetch(`${LARAVEL_API}/pagos/confirmar/${txId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'PAGADO_CONFIRMADO' })
    });
    return res.json();
  }
};
