const API_URL = 'https://blue-river-9145.ipostel-monitor.workers.dev';
let currentUser = null;
let currentToken = null;
let chartEstados = null;
let chartHoras = null;

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

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
    let formId = '';
    if (tabName === 'altos-cargos') formId = 'form-altos';
    else if (tabName === 'directores') formId = 'form-directores';
    else if (tabName === 'gerentes') formId = 'form-gerentes';
    else if (tabName === 'jefes-opt') formId = 'form-jefes-opt';
    document.getElementById(formId).classList.add('active');
    if (tabName === 'gerentes') cargarEstadosParaGerente();
    if (tabName === 'jefes-opt') cargarEstadosParaOPT();
}

function cargarEstadosParaGerente() {
    const select = document.getElementById('estado-gerente');
    if (select.options.length > 1) return;
    const estados = ['DISTRITO CAPITAL', 'MIRANDA', 'LA GUAIRA', 'LARA', 'ZULIA', 'CARABOBO', 'SUCRE', 'ARAGUA', 'TRUJILLO', 'FALCON', 'MONAGAS', 'DELTA AMACURO', 'BOLÍVAR', 'TÁCHIRA', 'MÉRIDA', 'BARINAS', 'COJEDES', 'APURE', 'AMAZONAS', 'PORTUGUESA', 'NUEVA ESPARTA', 'ANZOÁTEGUI', 'GUÁRICO', 'YARACUY'];
    estados.forEach(e => { let o = document.createElement('option'); o.value = e; o.textContent = e; select.appendChild(o); });
}

function cargarEstadosParaOPT() {
    const select = document.getElementById('estado-opt');
    if (select.options.length > 1) return;
    const estados = ['DISTRITO CAPITAL', 'MIRANDA', 'LA GUAIRA', 'LARA', 'ZULIA', 'CARABOBO', 'SUCRE', 'ARAGUA', 'TRUJILLO', 'FALCON', 'MONAGAS', 'DELTA AMACURO', 'BOLÍVAR', 'TÁCHIRA', 'MÉRIDA', 'BARINAS', 'COJEDES', 'APURE', 'AMAZONAS', 'PORTUGUESA', 'NUEVA ESPARTA', 'ANZOÁTEGUI', 'GUÁRICO', 'YARACUY'];
    estados.forEach(e => { let o = document.createElement('option'); o.value = e; o.textContent = e; select.appendChild(o); });
}

function cargarOptsPorEstado() {
    const estado = document.getElementById('estado-opt').value;
    const selectOpt = document.getElementById('opt-seleccion');
    selectOpt.innerHTML = '<option value="">-- Cargando OPTs... --</option>';
    if (!estado) {
        selectOpt.innerHTML = '<option value="">-- Primero seleccione un Estado --</option>';
        return;
    }
    enviarAScript({ accion: 'obtenerOptsPorEstado', estado: estado }, function(data) {
        if (data.ok && data.data && data.data.length > 0) {
            selectOpt.innerHTML = '<option value="">-- Seleccione su OPT --</option>';
            data.data.forEach(opt => {
                let o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                selectOpt.appendChild(o);
            });
        } else {
            selectOpt.innerHTML = '<option value="">-- No hay OPTs en este Estado --</option>';
        }
    });
}

function handleLogin(event, tipo) {
    event.preventDefault();
    let payload = { accion: 'login', tipo: tipo };
    if (tipo === 'altos') {
        payload.rol = document.getElementById('rol-alto').value;
        payload.clave = document.getElementById('pass-alto').value;
    } else if (tipo === 'director') {
        payload.rol = document.getElementById('rol-director').value;
        payload.correo = document.getElementById('correo-director').value;
        payload.clave = document.getElementById('pass-director').value;
    } else if (tipo === 'gerente') {
        payload.rol = document.getElementById('estado-gerente').value;
        payload.clave = document.getElementById('pass-gerente').value;
    } else if (tipo === 'opt') {
        payload.rol = document.getElementById('opt-seleccion').value;
        payload.clave = document.getElementById('pass-opt').value;
    }
    enviarAScript(payload, function(data) {
        if (data.ok && data.requiereCambio) {
            currentUser = { rol: payload.rol, nombre: payload.correo || payload.rol, estado: payload.rol };
            currentUser.correo = data.correo || payload.correo;
            showScreen('change-pass-screen');
        } else if (data.ok) {
            currentToken = data.token;
            currentUser = data.usuario;
            loginSuccess();
        } else {
            alert('Error: ' + data.error);
        }
    });
}

function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    if (newPass.length === 4 && !isNaN(newPass)) {
        enviarAScript({ accion: 'cambiarClave', correo: currentUser.correo, nuevaClave: newPass }, function(data) {
            if (data.ok) {
                alert('Clave guardada correctamente.');
                let loginPayload = { accion: 'login', tipo: currentUser.rol === 'DIRECTOR' ? 'director' : (currentUser.rol === 'JEFE_OPT' ? 'opt' : (currentUser.rol === 'GERENTE_ESTADO' ? 'gerente' : 'altos')), correo: currentUser.correo, rol: currentUser.estado, clave: newPass };
                enviarAScript(loginPayload, function(data2) {
                    if (data2.ok) { currentToken = data2.token; currentUser = data2.usuario; loginSuccess(); }
                    else { alert('Error al iniciar sesión.'); logout(); }
                });
            } else { alert('Error al guardar clave: ' + data.error); }
        });
    } else { alert('La clave debe tener 4 dígitos.'); }
}

function loginSuccess() {
    document.getElementById('user-name-display').textContent = currentUser.nombre;
    showScreen('dashboard-screen');
    cargarDashboard();
}

function logout() {
    currentUser = null; currentToken = null;
    document.getElementById('new-pass').value = '';
    showScreen('login-screen');
}

function cargarDashboard() {
    const filtroEstado = document.getElementById('filtro-estado') ? document.getElementById('filtro-estado').value : '';
    const filtroDireccion = document.getElementById('filtro-direccion') ? document.getElementById('filtro-direccion').value : '';
    
    enviarAScript({ 
        accion: 'obtenerEstadisticas', 
        token: currentToken, 
        filtroEstado: filtroEstado, 
        filtroDireccion: filtroDireccion 
    }, function(data) {
        if (data.ok) {
            document.querySelectorAll('.stat-number')[0].textContent = data.data.totalPadron;
            document.querySelectorAll('.stat-number')[1].textContent = data.data.totalVotos;
            const participacion = data.data.totalPadron > 0 ? ((data.data.totalVotos / data.data.totalPadron) * 100).toFixed(1) : 0;
            document.querySelectorAll('.stat-number')[2].textContent = participacion + '%';
            document.querySelectorAll('.stat-number')[3].textContent = data.data.totalNovedades;
            
            if (currentUser.rol !== 'JEFE_OPT') {
                document.getElementById('filtros-container').style.display = 'block';
                document.getElementById('charts-container').style.display = 'block';
                llenarFiltros(data.data);
                dibujarGraficos(data.data, filtroEstado, filtroDireccion);
            }
        }
    });
    updateDashboardView();
}

function llenarFiltros(data) {
    // Llenar filtro de estados
    const selectEstado = document.getElementById('filtro-estado');
    if (selectEstado.options.length <= 1) { // Solo llenar si está vacío
        const estados = Object.keys(data.padronPorEstado).sort();
        estados.forEach(e => {
            let o = document.createElement('option'); o.value = e; o.textContent = e; selectEstado.appendChild(o);
        });
    }
    // Llenar filtro de direcciones (solo si no hay filtro de estado)
    const selectDireccion = document.getElementById('filtro-direccion');
    if (selectDireccion.options.length <= 1) {
        const direcciones = Object.keys(data.padronPorDireccion).sort();
        direcciones.forEach(d => {
            let o = document.createElement('option'); o.value = d; o.textContent = d; selectDireccion.appendChild(o);
        });
    }
}

function dibujarGraficos(data, filtroEstado, filtroDireccion) {
    // Gráfico 1: Por Estado (si no hay filtro de estado)
    if (!filtroEstado) {
        const estados = Object.keys(data.padronPorEstado).sort();
        const padronData = estados.map(e => data.padronPorEstado[e] || 0);
        const votosData = estados.map(e => data.votosPorEstado[e] || 0);
        
        if (chartEstados) chartEstados.destroy();
        const ctx1 = document.getElementById('chartEstados').getContext('2d');
        chartEstados = new Chart(ctx1, {
            type: 'bar',
            data: { labels: estados, datasets: [
                { label: 'Padrón', data: padronData, backgroundColor: 'rgba(0, 51, 160, 0.5)' },
                { label: 'Votos', data: votosData, backgroundColor: 'rgba(200, 16, 46, 0.8)' }
            ]},
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
    
    // Gráfico 2: Por Dirección (si hay filtro de estado o si no hay filtro)
    const direcciones = Object.keys(data.padronPorDireccion).sort();
    const padronDirData = direcciones.map(d => data.padronPorDireccion[d] || 0);
    const votosDirData = direcciones.map(d => data.votosPorDireccion[d] || 0);
    
    if (chartDirecciones) chartDirecciones.destroy();
    const ctx2 = document.getElementById('chartDirecciones').getContext('2d');
    chartDirecciones = new Chart(ctx2, {
        type: 'bar',
        data: { labels: direcciones, datasets: [
            { label: 'Padrón', data: padronDirData, backgroundColor: 'rgba(0, 51, 160, 0.5)' },
            { label: 'Votos', data: votosDirData, backgroundColor: 'rgba(200, 16, 46, 0.8)' }
        ]},
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
    
    // Gráfico 3: Curva por Hora
    const horas = Object.keys(data.votosPorHora).sort();
    const votosHora = horas.map(h => data.votosPorHora[h]);
    
    if (chartHoras) chartHoras.destroy();
    const ctx3 = document.getElementById('chartHoras').getContext('2d');
    chartHoras = new Chart(ctx3, {
        type: 'line',
        data: { labels: horas, datasets: [{
            label: 'Votos por Hora', data: votosHora,
            borderColor: 'rgba(200, 16, 46, 1)', backgroundColor: 'rgba(200, 16, 46, 0.2)',
            fill: true, tension: 0.4
        }]},
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function updateDashboardView() {
    const contentDiv = document.getElementById('role-content');
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
            </div>
        `;
    }
}

// --- MODAL DE CARGA INDIVIDUAL ---
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

// --- MODAL DE CARGA POR LOTES ---
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

function procesarLote() {
    const texto = document.getElementById('lote-cedulas').value;
    const cedulas = texto.split(/[\n,]+/).map(c => c.trim()).filter(c => c.length > 0);
    
    if (cedulas.length === 0) { alert("No hay cédulas para procesar."); return; }
    
    let errores = [];
    let exitos = 0;
    
    function procesarSiguiente(index) {
        if (index >= cedulas.length) {
            alert(`Lote procesado: ${exitos} exitosos, ${errores.length} errores.\n\nErrores:\n${errores.join('\n')}`);
            cerrarModal('modal-lote');
            cargarDashboard();
            return;
        }
        
        const cedula = cedulas[index];
        
        enviarAScript({ accion: 'cargarVoto', token: currentToken, cedula_votante: cedula, nombre_votante: '', commit_novedad: '', foto_url: '' }, function(data) {
            if (data.ok) {
                exitos++;
            } else {
                errores.push(cedula + ': ' + data.error);
            }
            procesarSiguiente(index + 1);
        });
    }
    
    procesarSiguiente(0);
}

// --- MODAL DE NOVEDADES ---
function abrirModalNovedades() {
    let modalHTML = `
        <div id="modal-novedades" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:95%; max-width:800px; max-height:90vh; overflow-y:auto;">
                <h3 style="margin-bottom:15px; color:#dc3545;">Gestión de Novedades</h3>
                <table style="width:100%; border-collapse:collapse; font-size:12px;" id="tabla-novedades">
                    <thead><tr style="background:#f0f0f0;"><th style="padding:5px; border:1px solid #ddd;">Cédula</th><th style="padding:5px; border:1px solid #ddd;">Nombre</th><th style="padding:5px; border:1px solid #ddd;">Reportado Por</th><th style="padding:5px; border:1px solid #ddd;">Commit</th><th style="padding:5px; border:1px solid #ddd;">Acciones</th></tr></thead>
                    <tbody id="tbody-novedades"><tr><td colspan="5" style="text-align:center; padding:10px;">Cargando...</td></tr></tbody>
                </table>
                <button onclick="cerrarModal('modal-novedades')" style="width:100%; margin-top:15px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cerrar</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    cargarNovedades();
}

function cargarNovedades() {
    enviarAScript({ accion: 'obtenerNovedades', token: currentToken }, function(data) {
        const tbody = document.getElementById('tbody-novedades');
        if (data.ok && data.data.length > 0) {
            tbody.innerHTML = '';
            data.data.forEach(n => {
                let tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:5px; border:1px solid #ddd;">${n.cedula}</td><td style="padding:5px; border:1px solid #ddd;">${n.nombre}</td><td style="padding:5px; border:1px solid #ddd;">${n.reportadoPor}</td><td style="padding:5px; border:1px solid #ddd;">${n.commit}</td><td style="padding:5px; border:1px solid #ddd;"><button onclick="gestionarNovedad(${n.fila}, 'VALIDAR')" style="background:#28a745; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">Validar</button><button onclick="gestionarNovedad(${n.fila}, 'INACTIVAR')" style="background:#dc3545; color:white; border:none; padding:5px; border-radius:3px; cursor:pointer;">Inactivar</button></td>`;
                tbody.appendChild(tr);
            });
        } else { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:10px;">No hay novedades pendientes.</td></tr>`; }
    });
}

function gestionarNovedad(fila, accion) {
    if (!confirm(`¿Está seguro de ${accion} esta novedad?`)) return;
    enviarAScript({ accion: 'gestionarNovedad', token: currentToken, fila: fila, accionNovedad: accion }, function(data) {
        if (data.ok) { alert(data.mensaje); cargarNovedades(); cargarDashboard(); }
        else { alert("Error: " + data.error); }
    });
}

// --- MODAL DE GERENTES ---
function abrirModalGerentes() {
    enviarAScript({ accion: 'obtenerGerentesPorDirector', token: currentToken }, function(data) {
        let tabla = '<tr style="background:#f0f0f0;"><th style="padding:5px; border:1px solid #ddd;">Estado</th><th style="padding:5px; border:1px solid #ddd;">Clave</th></tr>';
        if (data.ok && data.data.length > 0) {
            data.data.forEach((estado, index) => {
                const clave = String(1000 + index).slice(-4);
                tabla += `<tr><td style="padding:5px; border:1px solid #ddd;">${estado}</td><td style="padding:5px; border:1px solid #ddd; font-weight:bold;">${clave}</td></tr>`;
            });
        } else {
            tabla += '<tr><td colspan="2" style="text-align:center;">No hay estados asignados.</td></tr>';
        }
        let modalHTML = `<div id="modal-gerentes" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;"><div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:500px; max-height:80vh; overflow-y:auto;"><h3 style="margin-bottom:15px; color:#0033A0;">Gerentes de Estado y Claves</h3><p style="font-size:14px; margin-bottom:15px;">Entregue estas claves a sus Gerentes de Estado.</p><table style="width:100%; border-collapse:collapse; font-size:12px;">${tabla}</table><button onclick="cerrarModal('modal-gerentes')" style="width:100%; margin-top:15px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cerrar</button></div></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    });
}

// --- MODAL DE OPTS ---
function abrirModalOpts() {
    enviarAScript({ accion: 'obtenerOptsPorEstado', token: currentToken, estado: currentUser.estado }, function(data) {
        let tabla = '<tr style="background:#f0f0f0;"><th style="padding:5px; border:1px solid #ddd;">OPT</th><th style="padding:5px; border:1px solid #ddd;">Clave</th></tr>';
        if (data.ok && data.data.length > 0) {
            data.data.forEach((opt, index) => {
                const clave = String(2000 + index).slice(-4);
                tabla += `<tr><td style="padding:5px; border:1px solid #ddd;">${opt}</td><td style="padding:5px; border:1px solid #ddd; font-weight:bold;">${clave}</td></tr>`;
            });
        } else {
            tabla += '<tr><td colspan="2" style="text-align:center;">No hay OPTs en este estado.</td></tr>';
        }
        let modalHTML = `<div id="modal-opts" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;"><div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:500px; max-height:80vh; overflow-y:auto;"><h3 style="margin-bottom:15px; color:#0033A0;">OPTs de ${currentUser.estado}</h3><p style="font-size:14px; margin-bottom:15px;">Entregue estas claves a sus Jefes de OPT.</p><table style="width:100%; border-collapse:collapse; font-size:12px;">${tabla}</table><button onclick="cerrarModal('modal-opts')" style="width:100%; margin-top:15px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cerrar</button></div></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    });
}

function buscarEnPadron() {
    const cedula = document.getElementById('voto-cedula').value;
    if (!cedula || cedula.length < 5) return;
    enviarAScript({ accion: 'consultarPadron', token: currentToken, cedula: cedula }, function(data) {
        const infoDiv = document.getElementById('info-padron');
        const grupoNombre = document.getElementById('grupo-nombre');
        const grupoCommit = document.getElementById('grupo-commit');
        if (data.ok && data.encontrado) {
            infoDiv.style.display = 'block';
            document.getElementById('info-nombre').textContent = data.datos.nombre;
            document.getElementById('info-cargo').textContent = data.datos.cargo;
            document.getElementById('info-ubicacion').textContent = data.datos.ubicacion;
            grupoNombre.style.display = 'none'; grupoCommit.style.display = 'none';
        } else {
            infoDiv.style.display = 'none'; grupoNombre.style.display = 'block'; grupoCommit.style.display = 'block';
        }
    });
}

function guardarVotoReal() {
    const cedula = document.getElementById('voto-cedula').value;
    const nombre = document.getElementById('voto-nombre').value;
    const commit = document.getElementById('voto-commit').value;
    const fotoInput = document.getElementById('voto-foto');
    if (!cedula) { alert("Debe ingresar una cédula."); return; }
    const enviarDatos = (fotoUrl) => {
        enviarAScript({ accion: 'cargarVoto', token: currentToken, cedula_votante: cedula, nombre_votante: nombre, commit_novedad: commit, foto_url: fotoUrl }, function(data) {
            if (data.ok) { alert("✅ " + data.mensaje); cerrarModal('modal-carga'); cargarDashboard(); }
            else {
                if (data.requiereCommit) {
                    document.getElementById('grupo-nombre').style.display = 'block';
                    document.getElementById('grupo-commit').style.display = 'block';
                    alert("⚠️ " + data.error);
                } else { alert("Error: " + data.error); }
            }
        });
    };
    if (fotoInput.files.length > 0) {
        const file = fotoInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result.split(',')[1];
            enviarAScript({ accion: 'subirFoto', token: currentToken, base64: base64Data, nombre: 'voto_' + cedula + '.jpg' }, function(dataFoto) {
                if (dataFoto.ok) enviarDatos(dataFoto.url);
                else { alert("Error al subir foto: " + dataFoto.error); enviarDatos(''); }
            });
        };
        reader.readAsDataURL(file);
    } else { enviarDatos(''); }
}

function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) modal.remove();
}
