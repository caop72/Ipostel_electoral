const API_URL = 'https://script.google.com/macros/s/AKfycbyh0dzss884hspHxQ-T90kusjvwAksXIrQgJaA9Ge25TCAfnBxxyykfe73bJI14upBM/exec';
let currentUser = null;
let currentToken = null; // Para guardar la sesión

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

    // Enviamos al backend usando FormData (más seguro para Apps Script)
    const formData = new URLSearchParams(payload);

    fetch(API_URL, {
        method: 'POST',
        body: formData
    })
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
    .catch(err => {
        alert("Error de conexión. Revisa que el Apps Script esté implementado como 'Cualquier persona'.");
        console.error(err);
    });
}

// --- CAMBIO DE CLAVE ---
function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    
    if(newPass.length === 4 && !isNaN(newPass)) {
        const payload = { 
            accion: 'cambiarClave', 
            correo: currentUser.correo, 
            nuevaClave: newPass
        };

        fetch(API_URL, {
            method: 'POST',
            body: new URLSearchParams(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.ok) {
                alert('Clave guardada correctamente. Vuelva a iniciar sesión.');
                logout(); // Lo devolvemos al login para que entre con su clave nueva
            } else {
                alert('Error al guardar clave: ' + data.error);
            }
        })
        .catch(err => alert("Error de red al guardar clave."));
        
    } else {
        alert('La clave debe tener exactamente 4 dígitos numéricos.');
    }
}

function loginSuccess() {
    document.getElementById('user-name-display').textContent = `${currentUser.nombre}`;
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
    fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams({ accion: 'obtenerDashboard', token: currentToken })
    })
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
    
    if(currentUser.rol === 'OBSERVATORIO' || currentUser.rol === 'PRESIDENCIA' || currentUser.rol === 'DESPACHO') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0;">Panel de ${currentUser.rol}</h3>
            <button class="btn-primary" style="margin-bottom:10px; background:#0033A0;" onclick="alert('Estadísticas en construcción.')">Ver Estadísticas Globales</button>
        `;
    } else if (currentUser.rol === 'DIRECTOR') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0;">Panel del Director</h3>
            <p style="margin-bottom:15px; font-size:14px;">Gestión para: <b>${currentUser.estado || 'Nacional'}</b></p>
            <button class="btn-primary" style="margin-bottom:10px;" onclick="abrirModalCargaVoto()">
                <i class="fa-solid fa-check-circle"></i> Cargar Voto
            </button>
            <button class="btn-primary" style="background:#0033A0;" onclick="abrirModalClaves()">
                <i class="fa-solid fa-key"></i> Ver Claves de Jefes de OPT
            </button>
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
                    <input type="text" id="voto-cedula" placeholder="Ej: 12345678">
                </div>
                <div class="input-group">
                    <label>Nombre (Opcional):</label>
                    <input type="text" id="voto-nombre" placeholder="Nombre del votante">
                </div>
                <button class="btn-primary" onclick="guardarVotoReal()">Guardar Voto</button>
                <button onclick="cerrarModal('modal-carga')" style="width:100%; margin-top:10px; padding:10px; background:#ccc; border:none; border-radius:5px; cursor:pointer;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function abrirModalClaves() {
    let modalHTML = `
        <div id="modal-claves" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:400px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-bottom:15px; color:#0033A0;">Claves de OPTs</h3>
                <p style="font-size:14px; margin-bottom:15px;">Entregue estas claves vía WhatsApp a sus Jefes de OPT.</p>
                <table style="width:100%; border-collapse: collapse; font-size:12px;">
                    <tr style="background:#f0f0f0;">
                        <th style="padding:5px; border:1px solid #ddd;">OPT</th>
                        <th style="padding:5px; border:1px solid #ddd;">Clave</th>
                    </tr>
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
    if(modal) modal.remove();
}

function guardarVotoReal() {
    const cedula = document.getElementById('voto-cedula').value;
    const nombre = document.getElementById('voto-nombre').value;
    if(!cedula) { alert("Debe ingresar una cédula."); return; }

    const payload = {
        accion: 'cargarVoto',
        token: currentToken,
        cedula_votante: cedula,
        nombre_votante: nombre
    };

    fetch(API_URL, {
        method: 'POST',
        body: new URLSearchParams(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.ok) {
            alert("¡Voto guardado en Google Sheets con éxito!");
            cerrarModal('modal-carga');
            cargarDashboard(); // Recargar los números
        } else {
            alert("Error al guardar: " + data.error);
        }
    })
    .catch(err => alert("Error de red al guardar voto."));
}
