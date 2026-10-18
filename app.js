// --- VARIABLES GLOBALES ---
let currentToken = null;
let currentUser = null;
let API_URL = 'https://script.google.com/macros/s/AKfycbw.../exec'; // Asegúrate de que esta URL sea la correcta en tu app.js original

// Variables para los gráficos (para poder destruirlos y recrearlos)
let chartEstados = null;
let chartDirecciones = null;
let chartHoras = null;

// --- FUNCIONES DE CONEXIÓN ---
function enviarAScript(datos, callback) {
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(datos)
    })
    .then(res => res.json())
    .then(data => callback(data))
    .catch(err => callback({ ok: false, error: 'Error de conexión: ' + err.message }));
}

// --- DASHBOARD Y ESTADÍSTICAS ---
function cargarDashboard() {
    enviarAScript({ accion: 'obtenerEstadisticas', token: currentToken }, function(data) {
        if (data.ok) {
            // Actualizar tarjetas superiores
            document.querySelectorAll('.stat-number')[0].textContent = data.data.totalPadron;
            document.querySelectorAll('.stat-number')[1].textContent = data.data.totalVotos;
            const participacion = data.data.totalPadron > 0 ? ((data.data.totalVotos / data.data.totalPadron) * 100).toFixed(1) : 0;
            document.querySelectorAll('.stat-number')[2].textContent = participacion + '%';
            document.querySelectorAll('.stat-number')[3].textContent = data.data.totalNovedades;
            
            // Dibujar gráficos si no es Jefe de OPT
            if (currentUser.rol !== 'JEFE_OPT') {
                document.getElementById('charts-container').style.display = 'block';
                dibujarGraficos(data.data);
                cargarPorVerificar(); 
            }
        } else {
            console.error("Error al obtener estadísticas:", data.error);
        }
    });
    updateDashboardView();
}

function cargarPorVerificar() {
    enviarAScript({ accion: 'obtenerCedulasPorVerificar', token: currentToken }, function(data) {
        const container = document.getElementById('por-verificar-container');
        const tbody = document.getElementById('tbody-por-verificar');
        
        if (data.ok && data.data && data.data.length > 0) {
            container.style.display = 'block';
            tbody.innerHTML = '';
            data.data.forEach(item => {
                let tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:8px; border:1px solid #ddd;">${item.cedula}</td>
                    <td style="padding:8px; border:1px solid #ddd;">${item.nombre}</td>
                    <td style="padding:8px; border:1px solid #ddd;">${item.reportadoPor}</td>
                    <td style="padding:8px; border:1px solid #ddd;">${item.fecha}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            container.style.display = 'none';
        }
    });
}

function dibujarGraficos(data) {
    // --- Gráfico 1: Participación por Estado ---
    const estados = Object.keys(data.padronPorEstado || {}).sort();
    if (estados.length > 0) {
        const participacionData = estados.map(e => {
            const padron = data.padronPorEstado[e] || 0;
            const votos = data.votosPorEstado[e] || 0;
            return padron > 0 ? ((votos / padron) * 100).toFixed(1) : 0;
        });
        
        if (chartEstados) chartEstados.destroy();
        const canvas1 = document.getElementById('chartEstados');
        if (canvas1) {
            const ctx1 = canvas1.getContext('2d');
            chartEstados = new Chart(ctx1, {
                type: 'bar',
                data: { 
                    labels: estados, 
                    datasets: [{
                        label: '% Participación',
                        data: participacionData,
                        backgroundColor: 'rgba(200, 16, 46, 0.8)'
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        y: { beginAtZero: true, max: 100, ticks: { callback: function(value) { return value + '%'; } } },
                        x: { ticks: { maxRotation: 90, minRotation: 45 } }
                    } 
                }
            });
        }
    }
    
    // --- Gráfico 2: Avance por Dirección ---
    const direcciones = Object.keys(data.padronPorDireccion || {}).sort();
    if (direcciones.length > 0) {
        const padronDirData = direcciones.map(d => data.padronPorDireccion[d] || 0);
        const votosDirData = direcciones.map(d => data.votosPorDireccion[d] || 0);
        
        if (chartDirecciones) chartDirecciones.destroy();
        const canvas2 = document.getElementById('chartDirecciones');
        if (canvas2) {
            const ctx2 = canvas2.getContext('2d');
            chartDirecciones = new Chart(ctx2, {
                type: 'bar',
                data: { labels: direcciones, datasets: [
                    { label: 'Padrón', data: padronDirData, backgroundColor: 'rgba(0, 51, 160, 0.5)' },
                    { label: 'Votos', data: votosDirData, backgroundColor: 'rgba(200, 16, 46, 0.8)' }
                ]},
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: { 
                        y: { beginAtZero: true },
                        x: { ticks: { maxRotation: 90, minRotation: 45 } }
                    } 
                }
            });
        }
    }
    
    // --- Gráfico 3: Curva por Hora ---
    const horas = Object.keys(data.votosPorHora || {}).sort();
    if (horas.length > 0) {
        const votosHora = horas.map(h => data.votosPorHora[h]);
        
        if (chartHoras) chartHoras.destroy();
        const canvas3 = document.getElementById('chartHoras');
        if (canvas3) {
            const ctx3 = canvas3.getContext('2d');
            chartHoras = new Chart(ctx3, {
                type: 'line',
                data: { labels: horas, datasets: [{
                    label: 'Votos por Hora', data: votosHora,
                    borderColor: 'rgba(200, 16, 46, 1)', backgroundColor: 'rgba(200, 16, 46, 0.2)',
                    fill: true, tension: 0.4
                }]},
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } } 
                }
            });
        }
    }
}

function updateDashboardView() {
    const contentDiv = document.getElementById('role-content');
    if (!contentDiv) return;
    
    if (currentUser.rol === 'DIRECTOR') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0; text-align:center;">Panel de Director</h3>
            <p style="margin-bottom:20px; font-size:14px; text-align:center;">Jurisdicción: <b>${currentUser.estado || 'Nacional'}</b></p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-primary" style="width:auto; padding:15px 30px;" onclick="abrirModalCargaVoto()">Cargar Voto</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalCargaLote()">Carga por Lotes</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalGerentes()">Gestionar Gerentes y Claves</button>
            </div>
        `;
    } else if (currentUser.rol === 'GERENTE_ESTADO') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0; text-align:center;">Panel de Gerente de Estado</h3>
            <p style="margin-bottom:20px; font-size:14px; text-align:center;">Estado: <b>${currentUser.estado}</b></p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-primary" style="width:auto; padding:15px 30px;" onclick="abrirModalCargaVoto()">Cargar Voto</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalCargaLote()">Carga por Lotes</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalOpts()">Ver OPTs de mi Estado</button>
            </div>
        `;
    } else if (currentUser.rol === 'JEFE_OPT') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0; text-align:center;">Panel de Jefe de OPT</h3>
            <p style="margin-bottom:20px; font-size:14px; text-align:center;">OPT: <b>${currentUser.estado}</b></p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-primary" style="width:auto; padding:15px 30px;" onclick="abrirModalCargaVoto()">Cargar Voto</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalCargaLote()">Carga por Lotes</button>
            </div>
        `;
    } else {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0; text-align:center;">Panel de ${currentUser.rol}</h3>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#dc3545;" onclick="abrirModalNovedades()">Gestionar Novedades</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px;" onclick="abrirModalCargaVoto()">Cargar Voto</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalCargaLote()">Carga por Lotes</button>
            </div>
        `;
    }
}

// --- MODALES ---
function abrirModalCargaVoto() {
    let modalHTML = `
        <div id="modal-carga" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:400px;">
                <h3 style="margin-bottom:15px; color:#0033A0;">Registrar Voto Individual</h3>
                <div class="input-group"><label>Cédula del Votante:</label><input type="text" id="voto-cedula" placeholder="Ej: 14551754" onblur="buscarEnPadron()"></div>
                <div id="info-padron" style="display:none; background:#e8f4f8; padding:10px; border-radius:5px; margin-bottom:15px; border-left:4px solid #0033A0;">
                    <p style="margin:0; font-size:14px;"><b>Nombre:</b> <span id="info-nombre">-</span></p>
                    <p style="margin:0; font-size:14px;"><b>Cargo:</b> <span id="info-cargo">-</span></p>
                    <p style="margin:0; font-size:14px;"><b>Ubicación:</b> <span id="info-ubicacion">-</span></p>
                </div>
                <div class="input-group" id="grupo-nombre" style="display:none;"><label>Nombre Completo (No está en padrón):</label><input type="text" id="voto-nombre" placeholder="Nombre del votante"></div>
                <div class="input-group" id="grupo-commit" style="display:none; background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffeeba;">
                    <label style="color:#856404;">⚠️ Novedad Detectada</label>
                    <p style="font-size:12px; color:#856404; margin-bottom:5px;">La cédula no está en el padrón. Escriba el motivo:</p>
                    <input type="text" id="voto-commit" placeholder="Justificación" style="width:100%; padding:5px;">
                </div>
                <div class="input-group"><label>Foto (Opcional):</label><input type="file" id="voto-foto" accept="image/*" style="border:1px solid #ccc; padding:5px; width:100%; border-radius:5px;"></div>
                <button class="btn-primary" onclick="guardarVotoReal()" style="margin-top:15px;">Guardar Voto</button>
                <button onclick="cerrarModal('modal-carga')" style="width:100%; margin-top:10px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cancelar</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function abrirModalCargaLote() {
    let modalHTML = `
        <div id="modal-lote" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:500px;">
                <h3 style="margin-bottom:15px; color:#0033A0;">Carga Masiva de Votos</h3>
                <p style="font-size:14px; margin-bottom:15px;">Pegue una cédula por línea (o separadas por coma).</p>
                <div class="input-group">
                    <label>Cédulas:</label>
                    <textarea id="lote-cedulas" rows="8" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:5px; font-size:14px;"></textarea>
                </div>
                <div class="input-group">
                    <label>Foto (Opcional, se aplicará a todas):</label>
                    <input type="file" id="lote-foto" accept="image/*" style="border:1px solid #ccc; padding:5px; width:100%; border-radius:5px;">
                </div>
                <button class="btn-primary" onclick="procesarLote()" style="margin-top:15px;">Procesar Lote</button>
                <button onclick="cerrarModal('modal-lote')" style="width:100%; margin-top:10px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cancelar</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}
