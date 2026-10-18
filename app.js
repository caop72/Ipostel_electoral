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
        contentDiv.innerHTML = `<h3 style="text-align:center; color:#0033A0;">Panel de ${currentUser.rol}</h3>`;
    }
}

// --- MODAL DE CARGA CON LOGICA DE NOVEDADES ---
function abrirModalCargaVoto() {
    let modalHTML = `
        <div id="modal-carga" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:400px;">
                <h3 style="margin-bottom:15px; color:#0033A0;">Registrar Voto</h3>
                
                <div class="input-group">
                    <label>Cédula del Votante:</label>
                    <input type="text" id="voto-cedula" placeholder="Ej: 12345678">
                </div>
                
                <div class="input-group" id="grupo-nombre" style="display:none;">
                    <label>Nombre Completo (No está en padrón):</label>
                    <input type="text" id="voto-nombre" placeholder="Nombre del votante">
                </div>

                <div class="input-group" id="grupo-commit" style="display:none; background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffeeba;">
                    <label style="color:#856404;">⚠️ Novedad Detectada</label>
                    <p style="font-size:12px; color:#856404; margin-bottom:5px;">La cédula no está en el padrón. Escriba el motivo por el cual se está registrando:</p>
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

function cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if(modal) modal.remove();
}

// --- GUARDAR VOTO CON VALIDACIÓN ---
function guardarVotoReal() {
    const cedula = document.getElementById('voto-cedula').value;
    const nombre = document.getElementById('voto-nombre').value;
    const commit = document.getElementById('voto-commit').value;
    const fotoInput = document.getElementById('voto-foto');

    if(!cedula) { alert("Debe ingresar una cédula."); return; }

    const enviarDatos = (fotoUrl) => {
        const payload = {
            accion: 'cargarVoto',
            token: currentToken,
            cedula_votante: cedula,
            nombre_votante: nombre,
            commit_novedad: commit,
            foto_url: fotoUrl
        };

        fetch(API_URL, { method: 'POST', body: new URLSearchParams(payload) })
        .then(res => res.json())
        .then(data => {
            if(data.ok) {
                alert("✅ " + data.mensaje);
                cerrarModal('modal-carga');
                cargarDashboard();
            } else {
                // Si el backend pide commit, mostramos los campos ocultos
                if(data.requiereCommit) {
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
            const payloadFoto = { accion: 'subirFoto', token: currentToken, base64: base64Data, nombre: 'voto_' + cedula + '.jpg' };
            
            fetch(API_URL, { method: 'POST', body: new URLSearchParams(payloadFoto) })
            .then(res => res.json())
            .then(dataFoto => {
                if(dataFoto.ok) enviarDatos(dataFoto.url);
                else { alert("Error al subir foto: " + dataFoto.error); enviarDatos(''); }
            });
        };
        reader.readAsDataURL(file);
    } else {
        enviarDatos('');
    }
}
