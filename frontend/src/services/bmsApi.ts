/**
 * Servicio API para sincronización con Backend Laravel 12 (Grupo 12 SC)
 */
const LARAVEL_API = 'http://127.0.0.1:8000/api';

export const bmsApi = {
  // Autenticación
  login: async (login: string, password: string) => {
    const res = await fetch(`${LARAVEL_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    return res.json();
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
  getAuditoria: async () => (await fetch(`${LARAVEL_API}/v1/auditoria`)).json(),

  // CU2: Catálogo de Programas
  getProgramas: async () => (await fetch(`${LARAVEL_API}/v1/programas`)).json(),
  createPrograma: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/programas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // CU3: Parrilla
  getParrillaHoy: async () => (await fetch(`${LARAVEL_API}/v1/parrilla/hoy`)).json(),
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
      headers: { 'Content-Type': 'application/json' },
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
  getSpots: async () => (await fetch(`${LARAVEL_API}/v1/spots`)).json(),
  createSpot: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getPautas: async () => (await fetch(`${LARAVEL_API}/v1/pautas`)).json(),
  createPauta: async (data: any) => {
    const res = await fetch(`${LARAVEL_API}/v1/pautas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

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
