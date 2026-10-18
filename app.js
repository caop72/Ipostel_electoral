const API_URL = 'https://script.google.com/macros/s/AKfycbyh0dzss884hspHxQ-T90kusjvwAksXIrQgJaA9Ge25TCAfnBxxyykfe73bJI14upBM/exec';
let currentUser = null;
let currentToken = null;

// --- UI ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`form-${tabName}`).classList.add('active');
}

// --- LOGIN ---
function handleLogin(event, tipo) {
    event.preventDefault();
    let payload = { accion: 'login', tipo: tipo };

    if(tipo === 'altos') {
        payload.rol = document.getElementById('rol-alto').value;
        payload.clave = document.getElementById('pass-alto').value;
        if(!payload.rol) { alert('Por favor seleccione un rol.'); return; }
    } else {
        payload.rol = document.getElementById('rol-director').value;
        payload.correo = document.getElementById('correo-director').value;
        payload.clave = document.getElementById('pass-director').value;
        if(!payload.rol || !payload.correo) { alert('Seleccione estado y correo.'); return; }
    }

    fetch(API_URL, { method: 'POST', body: new URLSearchParams(payload) })
    .then(res => res.json())
    .then(data => {
        if(data.ok && data.requiereCambio) {
            currentUser = { rol: payload.rol, nombre: payload.correo || 'admin_'+payload.rol, estado: payload.rol };
            currentUser.correo = data.correo || payload.correo;
            showScreen('change-pass-screen');
        } else if (data.ok) {
            currentToken = data.token;
            currentUser = data.usuario;
            loginSuccess();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => alert("Error de conexión. Verifique su Apps Script."));
}

// --- CAMBIO DE CLAVE ---
function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    
    if(newPass.length === 4 && !isNaN(newPass)) {
        const payload = { accion: 'cambiarClave', correo: currentUser.correo, nuevaClave: newPass };
        fetch(API_URL, { method: 'POST', body: new URLSearchParams(payload) })
        .then(res => res.json())
        .then(data => {
            if(data.ok) {
                alert('Clave guardada correctamente.');
                let loginPayload = { accion: 'login', tipo: currentUser.rol === 'DIRECTOR' ? 'director' : 'altos', correo: currentUser.correo, rol: currentUser.estado, clave: newPass };
                fetch(API_URL, { method: 'POST', body: new URLSearchParams(loginPayload) })
                .then(res => res.json())
                .then(data2 => {
                    if(data2.ok) { currentToken = data2.token; currentUser = data2.usuario; loginSuccess(); }
                    else { alert('Error al iniciar sesión.'); logout(); }
                });
            } else { alert('Error al guardar clave: ' + data.error); }
        });
    } else { alert('La clave debe tener exactamente 4 dígitos numéricos.'); }
}

function loginSuccess() {
    document.getElementById('user-name-display').textContent = `${currentUser.nombre}`;
    showScreen('dashboard-screen');
    cargarDashboard();
}

function logout() {
    currentUser = null; currentToken = null;
    document.getElementById('new-pass').value = '';
    showScreen('login-screen');
}

// --- DASHBOARD ---
function cargarDashboard() {
    fetch(API_URL, { method: 'POST', body: new URLSearchParams({ accion: 'obtenerDashboard', token: currentToken }) })
    .then(res => res.json())
    .then(data => {
        if(data.ok) {
            document.querySelectorAll('.stat-number')[0].textContent = data.data.totalPadron;
            document.querySelectorAll('.stat-number')[1].textContent = data.data.totalVotos;
        }
    });
    updateDashboardView();
}

function updateDashboardView() {
    const contentDiv = document.getElementById('role-content');
    
    if (currentUser.rol === 'DIRECTOR') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0; text-align:center;">Panel de Director</h3>
            <p style="margin-bottom:20px; font-size:14px; text-align:center;">Gestión para: <b>${currentUser.estado || 'Nacional'}</b></p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-primary" style="width:auto; padding:15px 30px;" onclick="abrirModalCargaVoto()">
                    <i class="fa-solid fa-check-circle"></i> Cargar Voto
                </button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalClaves()">
                    <i class="fa-solid fa-key"></i> Ver Claves de OPT
                </button>
            </div>
        `;
    } else {
        // Para OBSERVATORIO, PRESIDENCIA, DESPACHO
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0; text-align:center;">Panel de ${currentUser.rol}</h3>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#dc3545;" onclick="abrirModalNovedades()">
                    <i class="fa-solid fa-exclamation-triangle"></i> Gestionar Novedades
                </button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="alert('Módulo de estadísticas en construcción.')">
                    <i class="fa-solid fa-chart-line"></i> Ver Estadísticas
                </button>
            </div>
        `;
    }
}

// --- MODAL DE CARGA (Ya existente) ---
function abrirModalCargaVoto() {
    // ... (El mismo código que tenías antes para el modal de carga) ...
    let modalHTML = `
        <div id="modal-carga" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:400px;">
                <h3 style="margin-bottom:15px; color:#0033A0;">Registrar Voto</h3>
                <div class="input-group">
                    <label>Cédula del Votante:</label>
                    <input type="text" id="voto-cedula" placeholder="Ej: 14551754" onblur="buscarEnPadron()">
                </div>
                <div id="info-padron" style="display:none; background:#e8f4f8; padding:10px; border-radius:5px; margin-bottom:15px; border-left: 4px solid #0033A0;">
                    <p style="margin:0; font-size:14px;"><b>Nombre:</b> <span id="info-nombre">-</span></p>
                    <p style="margin:0; font-size:14px;"><b>Cargo:</b> <span id="info-cargo">-</span></p>
                    <p style="margin:0; font-size:14px;"><b>Ubicación:</b> <span id="info-ubicacion">-</span></p>
                </div>
                <div class="input-group" id="grupo-nombre" style="display:none;">
                    <label>Nombre Completo (No está en padrón):</label>
                    <input type="text" id="voto-nombre" placeholder="Nombre del votante">
                </div>
                <div class="input-group" id="grupo-commit" style="display:none; background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffeeba;">
                    <label style="color:#856404;">⚠️ Novedad Detectada</label>
                    <p style="font-size:12px; color:#856404; margin-bottom:5px;">La cédula no está en el padrón. Escriba el motivo:</p>
                    <input type="text" id="voto-commit" placeholder="Justificación del reporte" style="width:100%; padding:5px;">
                </div>
                <div class="input-group">
                    <label>Foto (Opcional):</label>
                    <input type="file" id="voto-foto" accept="image/*" capture="environment" style="border: 1px solid #ccc; padding: 5px; width: 100%; border-radius: 5px;">
                </div>
                <button class="btn-primary" onclick="guardarVotoReal()" style="margin-top:15px;">Guardar Voto</button>
                <button onclick="cerrarModal('modal-carga')" style="width:100%; margin-top:10px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- NUEVO: MODAL DE NOVEDADES PARA OBSERVATORIO ---
function abrirModalNovedades() {
    let modalHTML = `
        <div id="modal-novedades" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:95%; max-width:800px; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin-bottom:15px; color:#dc3545;">Gestión de Novedades</h3>
                <p style="font-size:14px; margin-bottom:15px;">Revise los casos que no están en el padrón. Valide o Inactive.</p>
                
                <table style="width:100%; border-collapse: collapse; font-size:12px;" id="tabla-novedades">
                    <thead>
                        <tr style="background:#f0f0f0;">
                            <th style="padding:5px; border:1px solid #ddd;">Cédula</th>
                            <th style="padding:5px; border:1px solid #ddd;">Nombre</th>
                            <th style="padding:5px; border:1px solid #ddd;">Reportado Por</th>
                            <th style="padding:5px; border:1px solid #ddd;">Commit</th>
                            <th style="padding:5px; border:1px solid #ddd;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-novedades">
                        <tr><td colspan="5" style="text-align:center; padding:10px;">Cargando novedades...</td></tr>
                    </tbody>
                </table>
                
                <button onclick="cerrarModal('modal-novedades')" style="width:100%; margin-top:15px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    cargarNovedades();
}

function cargarNovedades() {
    fetch(API_URL, { method: 'POST', body: new URLSearchParams({ accion: 'obtenerNovedades', token: currentToken }) })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('tbody-novedades');
        if(data.ok && data.data.length > 0) {
            tbody.innerHTML = '';
            data.data.forEach(n => {
                let tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:5px; border:1px solid #ddd;">${n.cedula}</td>
                    <td style="padding:5px; border:1px solid #ddd;">${n.nombre}</td>
                    <td style="padding:5px; border:1px solid #ddd;">${n.reportadoPor}</td>
                    <td style="padding:5px; border:1px solid #ddd;">${n.commit}</td>
                    <td style="padding:5px; border:1px solid #ddd;">
                        <button onclick="gestionarNovedad(${n.fila}, 'VALIDAR')" style="background:#28a745; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">Validar</button>
                        <button onclick="gestionarNovedad(${n.fila}, 'INACTIVAR')" style="background:#dc3545; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">Inactivar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:10px;">No hay novedades pendientes.</td></tr>`;
        }
    });
}

function gestionarNovedad(fila, accion) {
    if(!confirm(`¿Está seguro de ${accion} esta novedad?`)) return;

    fetch(API_URL, { method: 'POST', body: new URLSearchParams({ accion: 'gestionarNovedad', token: currentToken, fila: fila, accion: accion }) })
    .then(res => res.json())
    .then(data => {
        if(data.ok) {
            alert(data.mensaje);
            cargarNovedades(); // Recargar la tabla
            cargarDashboard(); // Actualizar contadores
        } else {
            alert("Error: " + data.error);
        }
    });
}

// --- RESTO DE FUNCIONES (guardarVotoReal, buscarEnPadron, etc.) ---
// ... (Pega aquí las funciones que ya tenías: buscarEnPadron, guardarVotoReal, abrirModalClaves, cerrarModal) ...
