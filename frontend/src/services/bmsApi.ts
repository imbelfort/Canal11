import type { UserSession } from '../context/PreferencesContext';
import { mediaHeaders } from './parrillaMedia';
import { BASE_URL, requestJson } from './api/client';
/**
 * Servicio API para sincronización con Backend Laravel 12 (Grupo 12 SC)
 */
const LARAVEL_API = 'http://127.0.0.1:8000/api';

const adminHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + (localStorage.getItem('playout_token') || ''),
});

export type AccessEvent = 'login_success' | 'login_failure' | 'access_denied' | 'request';

export const programRatings = { ATP: 'Todo público', TEEN_14: 'Desde 14 años', ADULTO_18: 'Desde 18 años' } as const;
export const programOrigins = { NACIONAL: 'Nacional', INTERNACIONAL: 'Internacional', COPRODUCCION: 'Coproducción' } as const;

export interface ProgramCategory {
  id: number;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

interface ProgramFields {
  titulo: string;
  id_categoria: number;
  descripcion?: string | null;
  duracion_estandar_minutos: number;
  clasificacion_edad: keyof typeof programRatings;
  origen: keyof typeof programOrigins;
}

export interface CatalogProgram extends ProgramFields {
  id: number;
  codigo: string;
  categoria?: ProgramCategory;
  estado: 'ACTIVO' | 'INACTIVO' | 'ARCHIVADO';
}

export interface AccessLogPage {
  entries: {
    id: number;
    occurred_at: string;
    user_id: number | null;
    ip: string | null;
    method: string;
    route: string;
    status: number;
    duration_ms: number;
    event: AccessEvent;
  }[];
  next_cursor: string | null;
  previous_cursor: string | null;
  top_routes: { method: string; route: string; requests: number; total_ms: number; average_ms: number }[];
}

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
  search: (q: string) => requestJson<{ results: any[] }>(`${BASE_URL}/search?q=${encodeURIComponent(q)}`, { headers: adminHeaders() }),

  // CU1: Usuarios y Roles
  getUsuarios: () => requestJson<any[]>(`${BASE_URL}/v1/usuarios`, { headers: adminHeaders() }),
  createUsuario: async (data: any) => {
    const res = await fetch(`${BASE_URL}/v1/usuarios`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateUsuario: async (id: number, data: any) => {
    const res = await fetch(`${BASE_URL}/v1/usuarios/${id}`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteUsuario: async (id: number) => {
    const res = await fetch(`${BASE_URL}/v1/usuarios/${id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    return res.json();
  },
  getAuditoria: () => requestJson<any[]>(`${BASE_URL}/v1/auditoria`, { headers: adminHeaders() }),
  getAccessLogs: (event: AccessEvent | '', cursor: string | null, signal: AbortSignal) => {
    const query = new URLSearchParams();
    if (event) query.set('event', event);
    if (cursor) query.set('cursor', cursor);
    return requestJson<AccessLogPage>(`${BASE_URL}/v1/accesos?${query}`, { headers: adminHeaders(), signal });
  },

  // CU2: Catálogo de Programas y Categorías
  getCategorias: async () => requestJson<ProgramCategory[]>(`${BASE_URL}/v1/categorias`),
  createCategoria: async (data: { nombre: string; descripcion?: string }) =>
    requestJson<{ categoria: ProgramCategory }>(`${BASE_URL}/v1/categorias`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(data),
    }),
  getProgramas: (signal?: AbortSignal) => requestJson<CatalogProgram[]>(`${BASE_URL}/v1/programas`, { signal }),
  createPrograma: async (data: ProgramFields) =>
    requestJson<{ programa: CatalogProgram }>(`${BASE_URL}/v1/programas`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(data),
    }),

  // CU3: Parrilla
  getParrillaHoy: async () => requestJson<any>(`${BASE_URL}/v1/parrilla/hoy`),
  addItemParrilla: (data: any) =>
    requestJson(`${BASE_URL}/v1/items`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(data)
    }),
  deleteItemParrilla: (id: number) =>
    requestJson(`${BASE_URL}/v1/items/${id}`, { method: 'DELETE', headers: adminHeaders() }),
  aprobarParrilla: (id: number) =>
    requestJson(`${BASE_URL}/v1/parrillas/${id}/estado`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ estado: 'APROBADA' })
    }),

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
