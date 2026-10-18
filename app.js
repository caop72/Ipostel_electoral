// URL DIRECTA DE TU GOOGLE APPS SCRIPT
const API_URL = 'https://script.google.com/macros/s/AKfycbyh0dzss884hspHxQ-T90kusjvwAksXIrQgJaA9Ge25TCAfnBxxyykfe73bJI14upBM/exec';

let currentUser = null;
let currentToken = null;

// --- FUNCIÓN DE ENVÍO SEGURO (SIN CORS) ---
function enviarAScript(datos, callback) {
    // Creamos un iframe oculto
    const iframeName = 'iframe_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Creamos un formulario que apunta a Google
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = API_URL;
    form.target = iframeName;
    form.style.display = 'none';

    // Añadimos todos los datos como inputs ocultos
    for (const key in datos) {
        if (datos.hasOwnProperty(key)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = datos[key];
            form.appendChild(input);
        }
    }

    document.body.appendChild(form);
    form.submit();

    // Esperamos que el iframe cargue la respuesta
    iframe.onload = function() {
        try {
            const respuesta = iframe.contentDocument.body.innerText;
            const json = JSON.parse(respuesta);
            callback(json);
        } catch (e) {
            callback({ ok: false, error: 'Error de respuesta del servidor' });
        }
        // Limpiamos el iframe y el formulario
        setTimeout(() => {
            document.body.removeChild(iframe);
            document.body.removeChild(form);
        }, 1000);
    };

    // Timeout de seguridad
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            document.body.removeChild(form);
            callback({ ok: false, error: 'Timeout de conexión' });
        }
    }, 10000);
}

// --- UI Y PESTAÑAS ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
    const formId = tabName === 'altos-cargos' ? 'form-altos' : (tabName === 'directores' ? 'form-directores' : 'form-jefes-opt');
    document.getElementById(formId).classList.add('active');
    if (tabName === 'jefes-opt') cargarOpcionesOPT();
}

function cargarOpcionesOPT() {
    const select = document.getElementById('opt-seleccion');
    if (select.options.length > 1) return;
    enviarAScript({ accion: 'obtenerOPTs' }, function(data) {
        if (data.ok) {
            data.data.forEach(opt => {
                let option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                select.appendChild(option);
            });
        }
    });
}

// --- LOGIN ---
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

// --- CAMBIO DE CLAVE ---
function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    if (newPass.length === 4 && !isNaN(newPass)) {
        enviarAScript({ accion: 'cambiarClave', correo: currentUser.correo, nuevaClave: newPass }, function(data) {
            if (data.ok) {
                alert('Clave guardada correctamente.');
                let loginPayload = { accion: 'login', tipo: currentUser.rol === 'DIRECTOR' ? 'director' : (currentUser.rol === 'JEFE_OPT' ? 'opt' : 'altos'), correo: currentUser.correo, rol: currentUser.estado, clave: newPass };
                enviarAScript(loginPayload, function(data2) {
                    if (data2.ok) {
                        currentToken = data2.token;
                        currentUser = data2.usuario;
                        loginSuccess();
                    } else {
                        alert('Error al iniciar sesión.');
                        logout();
                    }
                });
            } else {
                alert('Error al guardar clave: ' + data.error);
            }
        });
    } else {
        alert('La clave debe tener 4 dígitos.');
    }
}

function loginSuccess() {
    document.getElementById('user-name-display').textContent = currentUser.nombre;
    showScreen('dashboard-screen');
    cargarDashboard();
}

function logout() {
    currentUser = null;
    currentToken = null;
    document.getElementById('new-pass').value = '';
    showScreen('login-screen');
}

// --- DASHBOARD ---
function cargarDashboard() {
    enviarAScript({ accion: 'obtenerDashboard', token: currentToken }, function(data) {
        if (data.ok) {
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
                <button class="btn-primary" style="width:auto; padding:15px 30px;" onclick="abrirModalCargaVoto()">Cargar Voto</button>
                <button class="btn-primary" style="width:auto; padding:15px 30px; background:#0033A0;" onclick="abrirModalClaves()">Ver Claves de OPT</button>
            </div>
        `;
    } else if (currentUser.rol === 'JEFE_OPT') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0; text-align:center;">Panel de Jefe de OPT</h3>
            <p style="margin-bottom:20px; font-size:14px; text-align:center;">Gestión para: <b>${currentUser.estado}</b></p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-primary" style="width:auto; padding:15px 30px;" onclick="abrirModalCargaVoto()">Cargar Voto</button>
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

// --- MODALES ---
function abrirModalCargaVoto() {
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
                    <input type="text" id="voto-commit" placeholder="Justificación" style="width:100%; padding:5px;">
                </div>
                <div class="input-group">
                    <label>Foto (Opcional):</label>
                    <input type="file" id="voto-foto" accept="image/*" style="border: 1px solid #ccc; padding: 5px; width: 100%; border-radius: 5px;">
                </div>
                <button class="btn-primary" onclick="guardarVotoReal()" style="margin-top:15px;">Guardar Voto</button>
                <button onclick="cerrarModal('modal-carga')" style="width:100%; margin-top:10px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function abrirModalNovedades() {
    let modalHTML = `
        <div id="modal-novedades" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:95%; max-width:800px; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin-bottom:15px; color:#dc3545;">Gestión de Novedades</h3>
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
                    <tbody id="tbody-novedades"><tr><td colspan="5" style="text-align:center; padding:10px;">Cargando...</td></tr></tbody>
                </table>
                <button onclick="cerrarModal('modal-novedades')" style="width:100%; margin-top:15px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;
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
    if (!confirm(`¿Está seguro de ${accion} esta novedad?`)) return;
    enviarAScript({ accion: 'gestionarNovedad', token: currentToken, fila: fila, accionNovedad: accion }, function(data) {
        if (data.ok) {
            alert(data.mensaje);
            cargarNovedades();
            cargarDashboard();
        } else {
            alert("Error: " + data.error);
        }
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
            grupoNombre.style.display = 'none';
            grupoCommit.style.display = 'none';
        } else {
            infoDiv.style.display = 'none';
            grupoNombre.style.display = 'block';
            grupoCommit.style.display = 'block';
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
            if (data.ok) {
                alert("✅ " + data.mensaje);
                cerrarModal('modal-carga');
                cargarDashboard();
            } else {
                if (data.requiereCommit) {
                    document.getElementById('grupo-nombre').style.display = 'block';
                    document.getElementById('grupo-commit').style.display = 'block';
                    alert("⚠️ " + data.error);
                } else {
                    alert("Error: " + data.error);
                }
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
    } else {
        enviarDatos('');
    }
}

function abrirModalClaves() {
    let modalHTML = `
        <div id="modal-claves" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:400px;">
                <h3 style="margin-bottom:15px; color:#0033A0;">Claves de OPTs</h3>
                <p style="font-size:14px; margin-bottom:15px;">Entregue estas claves vía WhatsApp a sus Jefes de OPT.</p>
                <table style="width:100%; border-collapse: collapse; font-size:12px;">
                    <tr style="background:#f0f0f0;"><th style="padding:5px; border:1px solid #ddd;">OPT</th><th style="padding:5px; border:1px solid #ddd;">Clave</th></tr>
                    <tr><td style="padding:5px; border:1px solid #ddd;">OPT Central</td><td style="padding:5px; border:1px solid #ddd; font-weight:bold;">1234</td></tr>
                </table>
                <button onclick="cerrarModal('modal-claves')" style="width:100%; margin-top:15px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) modal.remove();
}
