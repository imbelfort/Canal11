// IB-Cast Playout Master Controller (24/7 Engine Client)

let currentPlayoutState = null;
let playlistItems = [];
let selectedItemIndex = -1;
let socket = null;

// Tab Management
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');

    if (btn.dataset.tab === 'tabAudit') {
      loadAuditLogs();
      loadAuditStats();
    } else if (btn.dataset.tab === 'tabIncidents') {
      loadIncidents();
    }
  });
});

// ==========================================
// 1. WEBSOCKET REAL-TIME SYNC (24/7 Engine)
// ==========================================

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    document.getElementById('engineStatusPill').className = 'status-pill online';
    document.getElementById('engineStatusText').textContent = 'MOTOR 24/7 ACTIVO';
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'TICK' || msg.type === 'INIT') {
        updatePlayoutUI(msg.data);
      }
    } catch (e) {
      console.error('Error procesando mensaje WebSocket:', e);
    }
  };

  socket.onclose = () => {
    document.getElementById('engineStatusPill').className = 'status-pill';
    document.getElementById('engineStatusText').textContent = 'RECONECTANDO MOTOR...';
    setTimeout(initWebSocket, 2000);
  };
}

// ==========================================
// 2. UI UPDATE LOOP (TICK)
// ==========================================

function updatePlayoutUI(data) {
  currentPlayoutState = data;

  // Master Clock
  if (data.timecodes) {
    document.getElementById('masterClockDisplay').textContent = data.timecodes.stationMaster;
    document.getElementById('tcElapsed').textContent = data.timecodes.itemElapsed;
    document.getElementById('tcRemaining').textContent = data.timecodes.itemRemaining;
  }

  // Progress Bar
  const fill = document.getElementById('progressFill');
  fill.style.width = `${Math.min(100, data.progressPercent || 0)}%`;

  // On Air Status & Titles
  const onAirTag = document.getElementById('onAirTag');
  const overlaySource = document.getElementById('overlaySource');
  const btnTakeLive = document.getElementById('btnTakeLive');

  if (data.state === 'PLAYING') {
    onAirTag.className = 'on-air-tag active';
    overlaySource.textContent = 'ORIGEN: ARCHIVO (DECKLINK 4K)';
    btnTakeLive.classList.remove('active');
    btnTakeLive.textContent = '📡 EN VIVO SDI';
    renderMonitorCanvas('VIDEO');
  } else if (data.state === 'LIVE_SDI') {
    onAirTag.className = 'on-air-tag active';
    overlaySource.textContent = 'ORIGEN: SEÑAL SDI EN VIVO';
    btnTakeLive.classList.add('active');
    btnTakeLive.textContent = '⏹ SALIR DE VIVO';
    renderMonitorCanvas('LIVE_SDI');
  } else if (data.state === 'EMERGENCY_FALLBACK') {
    onAirTag.className = 'on-air-tag active';
    overlaySource.textContent = 'ORIGEN: CORTINILLA RESPALDO';
    btnTakeLive.classList.remove('active');
    renderMonitorCanvas('EMERGENCY');
  } else {
    onAirTag.className = 'on-air-tag';
    overlaySource.textContent = 'ORIGEN: EN ESPERA';
    btnTakeLive.classList.remove('active');
    renderMonitorCanvas('VIDEO');
  }

  // Active Item Details
  if (data.currentItem) {
    document.getElementById('activeItemTitle').textContent = data.currentItem.title;
    document.getElementById('activeItemPath').textContent = data.currentItem.file_path;
  } else if (data.state === 'LIVE_SDI') {
    document.getElementById('activeItemTitle').textContent = 'TRANSMISIÓN EN VIVO SDI (DeckLink 4K)';
    document.getElementById('activeItemPath').textContent = 'Canal SDI In 1 • 1080i59.94 Sincronizado';
  } else if (data.state === 'EMERGENCY_FALLBACK') {
    document.getElementById('activeItemTitle').textContent = 'CORTINILLA DE RESPALDO (CONTINUIDAD)';
    document.getElementById('activeItemPath').textContent = 'Patrón de Emergencia IB-Cast Activo';
  } else {
    document.getElementById('activeItemTitle').textContent = 'SISTEMA EN ESPERA';
    document.getElementById('activeItemPath').textContent = 'Presione PLAY para iniciar la emisión';
  }

  // Next Item Details
  if (data.nextItem) {
    document.getElementById('nextItemTitle').textContent = data.nextItem.title;
    document.getElementById('nextItemDetails').textContent = `Duración: ${formatDuration(data.nextItem.duration_ms)} • Modo: ${data.nextItem.timing_mode}`;
  } else {
    document.getElementById('nextItemTitle').textContent = '-- Fin de lista --';
    document.getElementById('nextItemDetails').textContent = '';
  }

  // Simulate Broadcast Audio VU Meters
  if (data.state === 'PLAYING' || data.state === 'LIVE_SDI') {
    const left = Math.floor(40 + Math.random() * 45);
    const right = Math.floor(40 + Math.random() * 45);
    document.getElementById('vuLeft').style.height = `${left}%`;
    document.getElementById('vuRight').style.height = `${right}%`;
  } else {
    document.getElementById('vuLeft').style.height = '0%';
    document.getElementById('vuRight').style.height = '0%';
  }

  // Highlight rows in table
  highlightCurrentRow(data.currentIndex);
}

// Canvas test pattern generator for emergency curtain or live SDI
function renderMonitorCanvas(mode) {
  const canvas = document.getElementById('pgmCanvas');
  const video = document.getElementById('pgmVideo');
  const ctx = canvas.getContext('2d');

  if (mode === 'VIDEO') {
    canvas.style.display = 'none';
    video.style.display = 'block';
    return;
  }

  video.style.display = 'none';
  canvas.style.display = 'block';
  canvas.width = 640;
  canvas.height = 360;

  if (mode === 'EMERGENCY') {
    // SMPTE Color bars with IB-Cast Emergency Banner
    const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const barWidth = canvas.width / colors.length;
    colors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(idx * barWidth, 0, barWidth, canvas.height * 0.7);
    });

    ctx.fillStyle = '#111';
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

    ctx.fillStyle = '#ff1744';
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, 50);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IB-CAST - CORTINILLA DE RESPALDO (CONTINUIDAD)', canvas.width / 2, canvas.height * 0.4 + 32);
  } else if (mode === 'LIVE_SDI') {
    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('● SEÑAL SDI EN VIVO (DECKLINK 4K)', canvas.width / 2, canvas.height / 2 - 10);

    ctx.fillStyle = '#8b9bb4';
    ctx.font = '14px sans-serif';
    ctx.fillText('1080i 59.94 Hz • SDI IN 1 • 48 kHz 24-bit', canvas.width / 2, canvas.height / 2 + 25);
  }
}

// ==========================================
// 3. PLAYLIST MANAGEMENT
// ==========================================

async function loadPlaylist() {
  try {
    const res = await fetch('/api/playlist');
    const data = await res.json();
    if (data.success) {
      playlistItems = data.items;
      renderPlaylistTable();
    }
  } catch (err) {
    console.error('Error cargando playlist:', err);
  }
}

function renderPlaylistTable() {
  const tbody = document.getElementById('playlistTableBody');
  tbody.innerHTML = '';

  if (playlistItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:30px; color:var(--text-dim);">
          No hay elementos en la lista. Arrastre archivos de video aquí o haga clic en "+ AGREGAR VIDEOS".
        </td>
      </tr>
    `;
    return;
  }

  playlistItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.dataset.index = index;
    tr.dataset.id = item.id;

    if (index === selectedItemIndex) {
      tr.style.outline = '1px solid var(--accent-blue)';
    }

    let badgeClass = 'pending';
    let statusLabel = item.status;
    if (item.status === 'ON_AIR') { badgeClass = 'on-air'; statusLabel = 'AL AIRE'; }
    else if (item.status === 'PLAYED_SUCCESS') { badgeClass = 'played'; statusLabel = 'EMITIDO'; }
    else if (item.status === 'FILE_CORRUPT_OR_MISSING' || item.status === 'ERROR') { badgeClass = 'error'; statusLabel = 'FALLA'; }
    else if (item.status === 'PENDING') { statusLabel = 'EN ESPERA'; }

    tr.innerHTML = `
      <td style="color:var(--text-dim);">${index + 1}</td>
      <td><span class="badge-status ${badgeClass}">${statusLabel}</span></td>
      <td>
        <div style="font-weight:600; color:#fff;">${escapeHtml(item.title)}</div>
        <div style="font-size:10px; color:var(--text-dim); font-family:var(--font-mono);">${escapeHtml(item.file_path)}</div>
      </td>
      <td><span style="font-size:10px; padding:2px 4px; background:#1c2536; border-radius:3px;">${item.event_type}</span></td>
      <td style="font-family:var(--font-mono);">${formatDuration(item.duration_ms)}</td>
      <td style="font-size:11px; color:var(--text-muted);">${item.timing_mode}</td>
      <td>
        <button class="btn-tool" onclick="playSingleItem(${item.id})" title="Emitir ahora">▶</button>
      </td>
    `;

    tr.addEventListener('click', () => {
      selectedItemIndex = index;
      renderPlaylistTable();
    });

    tbody.appendChild(tr);
  });
}

function highlightCurrentRow(currentIndex) {
  const rows = document.querySelectorAll('#playlistTableBody tr');
  rows.forEach((row, idx) => {
    if (idx === currentIndex) {
      row.classList.add('row-on-air');
    } else {
      row.classList.remove('row-on-air');
    }
  });
}

// Add files directly
document.getElementById('btnAddFiles').addEventListener('click', () => {
  document.getElementById('filePicker').click();
});

document.getElementById('filePicker').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  const toAdd = files.map(file => ({
    title: file.name.replace(/\.[^/.]+$/, ""),
    file_path: file.path || file.name,
    event_type: file.type.startsWith('image') ? 'IMAGE' : 'VIDEO',
    duration_ms: file.type.startsWith('image') ? 10000 : 30000,
    timing_mode: 'AUTO_FOLLOW'
  }));

  try {
    await fetch('/api/playlist/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: toAdd })
    });
    loadPlaylist();
  } catch (err) {
    alert('Error agregando archivos: ' + err.message);
  }
});

// Drag and drop onto playlist
const dropZone = document.getElementById('playlistDropZone');
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');

  const files = Array.from(e.dataTransfer.files);
  if (files.length === 0) return;

  const toAdd = files.map(file => ({
    title: file.name.replace(/\.[^/.]+$/, ""),
    file_path: file.path || file.name,
    event_type: file.type.startsWith('image') ? 'IMAGE' : 'VIDEO',
    duration_ms: 30000,
    timing_mode: 'AUTO_FOLLOW'
  }));

  try {
    await fetch('/api/playlist/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: toAdd })
    });
    loadPlaylist();
  } catch (err) {
    alert('Error agregando archivos soltados: ' + err.message);
  }
});

// Add Live SDI Item to playlist
document.getElementById('btnAddSdiItem').addEventListener('click', async () => {
  const item = {
    title: 'Pase a Móvil en Vivo (SDI IN)',
    file_path: 'SDI_INPUT_CH1',
    event_type: 'LIVE_SDI',
    duration_ms: 300000, // 5 min default
    timing_mode: 'AUTO_FOLLOW'
  };

  await fetch('/api/playlist/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item })
  });
  loadPlaylist();
});

// Reorder controls
document.getElementById('btnMoveUp').addEventListener('click', async () => {
  if (selectedItemIndex <= 0 || selectedItemIndex >= playlistItems.length) return;
  const temp = playlistItems[selectedItemIndex];
  playlistItems[selectedItemIndex] = playlistItems[selectedItemIndex - 1];
  playlistItems[selectedItemIndex - 1] = temp;
  selectedItemIndex--;

  const orderedIds = playlistItems.map(i => i.id);
  await fetch('/api/playlist/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds })
  });
  renderPlaylistTable();
});

document.getElementById('btnMoveDown').addEventListener('click', async () => {
  if (selectedItemIndex < 0 || selectedItemIndex >= playlistItems.length - 1) return;
  const temp = playlistItems[selectedItemIndex];
  playlistItems[selectedItemIndex] = playlistItems[selectedItemIndex + 1];
  playlistItems[selectedItemIndex + 1] = temp;
  selectedItemIndex++;

  const orderedIds = playlistItems.map(i => i.id);
  await fetch('/api/playlist/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds })
  });
  renderPlaylistTable();
});

// Delete selected
document.getElementById('btnDeleteSelected').addEventListener('click', async () => {
  if (selectedItemIndex < 0 || selectedItemIndex >= playlistItems.length) {
    alert('Seleccione un elemento de la lista para eliminar');
    return;
  }
  const item = playlistItems[selectedItemIndex];
  await fetch(`/api/playlist/items/${item.id}`, { method: 'DELETE' });
  selectedItemIndex = -1;
  loadPlaylist();
});

// Clear playlist
document.getElementById('btnClearPlaylist').addEventListener('click', async () => {
  if (confirm('¿Está seguro de limpiar toda la lista de emisión?')) {
    await fetch('/api/playlist/clear', { method: 'POST' });
    selectedItemIndex = -1;
    loadPlaylist();
  }
});

// Export playlist
document.getElementById('btnExportPlaylist').addEventListener('click', () => {
  window.open('/api/playlist/export?format=m3u', '_blank');
});

// ==========================================
// 4. MASTER PLAYOUT CONTROLS
// ==========================================

document.getElementById('btnPlay').addEventListener('click', async () => {
  await fetch('/api/playout/play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
});

document.getElementById('btnPause').addEventListener('click', async () => {
  if (currentPlayoutState && currentPlayoutState.state === 'PAUSED') {
    await fetch('/api/playout/resume', { method: 'POST' });
  } else {
    await fetch('/api/playout/pause', { method: 'POST' });
  }
});

document.getElementById('btnNext').addEventListener('click', async () => {
  await fetch('/api/playout/next', { method: 'POST' });
});

document.getElementById('btnStop').addEventListener('click', async () => {
  await fetch('/api/playout/stop', { method: 'POST' });
});

document.getElementById('btnTakeLive').addEventListener('click', async () => {
  if (currentPlayoutState && currentPlayoutState.state === 'LIVE_SDI') {
    await fetch('/api/playout/return-live', { method: 'POST' });
  } else {
    await fetch('/api/playout/take-live', { method: 'POST' });
  }
});

document.getElementById('btnEmergency').addEventListener('click', async () => {
  if (confirm('¿ACTIVAR CORTINILLA DE RESPALDO DE EMERGENCIA AL AIRE?')) {
    await fetch('/api/playout/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Activación manual por operador de Master' })
    });
  }
});

window.playSingleItem = async function(id) {
  await fetch('/api/playout/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: id })
  });
};

// ==========================================
// 5. AUDITORÍA OFICIAL (AS-RUN LOGS)
// ==========================================

async function loadAuditLogs() {
  try {
    const status = document.getElementById('auditFilterStatus').value;
    const search = document.getElementById('auditSearchInput').value;

    const res = await fetch(`/api/audit/logs?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`);
    const data = await res.json();

    if (data.success) {
      renderAuditTable(data.logs);
    }
  } catch (err) {
    console.error('Error cargando auditoría:', err);
  }
}

async function loadAuditStats() {
  try {
    const res = await fetch('/api/audit/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('statTotalEmissions').textContent = data.stats.totalEmissions;
      document.getElementById('statTodayEmissions').textContent = data.stats.todayEmissions;
      document.getElementById('statSuccessRate').textContent = data.stats.successRate;
      document.getElementById('statActiveIncidents').textContent = data.stats.activeIncidents;
    }
  } catch (err) {
    console.error('Error cargando estadísticas de auditoría:', err);
  }
}

function renderAuditTable(logs) {
  const tbody = document.getElementById('auditTableBody');
  tbody.innerHTML = '';

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:var(--text-dim);">No hay registros de auditoría para los filtros aplicados.</td></tr>`;
    return;
  }

  logs.forEach(l => {
    const tr = document.createElement('tr');
    const plannedSec = (l.planned_duration_ms / 1000).toFixed(1);
    const actualSec = (l.actual_duration_ms / 1000).toFixed(1);
    const diffSec = (l.duration_discrepancy_ms / 1000).toFixed(1);

    let statusBadge = `<span class="badge-status played">EMITIDO OK</span>`;
    if (l.status === 'FILE_CORRUPT_OR_MISSING') statusBadge = `<span class="badge-status error">NO ENCONTRADO</span>`;
    else if (l.status === 'INTERRUPTED') statusBadge = `<span class="badge-status" style="background:#d97706; color:#fff;">CORTADO</span>`;
    else if (l.status === 'EMERGENCY_FALLBACK') statusBadge = `<span class="badge-status" style="background:#dc2626; color:#fff;">RESPALDO</span>`;

    tr.innerHTML = `
      <td style="color:var(--text-dim);">${l.id}</td>
      <td>${l.timestamp ? l.timestamp.slice(0, 10) : ''}</td>
      <td style="font-family:var(--font-mono);">${l.actual_start ? new Date(l.actual_start).toLocaleTimeString() : ''}</td>
      <td style="font-family:var(--font-mono);">${l.actual_end ? new Date(l.actual_end).toLocaleTimeString() : ''}</td>
      <td><strong>${escapeHtml(l.event_title)}</strong></td>
      <td style="font-size:10px; font-family:var(--font-mono); color:var(--text-dim);">${escapeHtml(l.file_path || '')}</td>
      <td style="font-family:var(--font-mono);">${plannedSec}s</td>
      <td style="font-family:var(--font-mono);">${actualSec}s</td>
      <td style="font-family:var(--font-mono); color:${diffSec < 0 ? '#f87171' : '#6ee7b7'};">${diffSec}s</td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('btnRefreshAudit').addEventListener('click', () => {
  loadAuditLogs();
  loadAuditStats();
});

document.getElementById('auditFilterStatus').addEventListener('change', loadAuditLogs);
document.getElementById('auditSearchInput').addEventListener('input', debounce(loadAuditLogs, 300));

document.getElementById('btnExportCsv').addEventListener('click', () => {
  const status = document.getElementById('auditFilterStatus').value;
  const search = document.getElementById('auditSearchInput').value;
  window.open(`/api/audit/export/csv?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`, '_blank');
});

// ==========================================
// 6. INCIDENTES Y CONTINUIDAD
// ==========================================

async function loadIncidents() {
  try {
    const res = await fetch('/api/audit/incidents');
    const data = await res.json();
    const tbody = document.getElementById('incidentsTableBody');
    tbody.innerHTML = '';

    if (!data.incidents || data.incidents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-dim);">No hay incidentes técnicos registrados. Transmisión estable.</td></tr>`;
      return;
    }

    data.incidents.forEach(inc => {
      const tr = document.createElement('tr');
      let sevColor = '#00d2ff';
      if (inc.severity === 'ERROR') sevColor = '#f87171';
      if (inc.severity === 'CRITICAL') sevColor = '#ef4444';

      tr.innerHTML = `
        <td style="color:var(--text-dim);">${inc.id}</td>
        <td style="font-family:var(--font-mono); font-size:11px;">${new Date(inc.timestamp).toLocaleString()}</td>
        <td><span style="font-weight:700; color:${sevColor};">${inc.severity}</span></td>
        <td>${inc.source}</td>
        <td>${escapeHtml(inc.description)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error cargando incidentes:', err);
  }
}

document.getElementById('btnRefreshIncidents').addEventListener('click', loadIncidents);

// ==========================================
// HELPERS
// ==========================================

function formatDuration(ms) {
  if (!ms || ms < 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initial boot
loadPlaylist();
initWebSocket();
