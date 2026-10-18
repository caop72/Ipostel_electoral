// CONFIGURACIÓN
// Si ya tienes la URL del backend, pégala aquí entre las comillas.
const API_URL = 'AQUI_IRA_LA_URL_DEL_BACKEND'; 
let currentUser = null;

// --- UI (Pantallas) ---
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
    
    if(tipo === 'altos') {
        const rol = document.getElementById('rol-alto').value;
        const pass = document.getElementById('pass-alto').value;
        if(!rol) { alert('Por favor seleccione un rol.'); return; }

        if(pass === '1234') {
            currentUser = { rol: rol, nombre: rol, estado: null };
            showScreen('change-pass-screen');
        } else {
            alert('Clave incorrecta. La clave inicial es 1234.');
        }
    } else {
        const estado = document.getElementById('rol-director').value;
        const correo = document.getElementById('correo-director').value;
        const pass = document.getElementById('pass-director').value;
        if(!estado || !correo) { alert('Debe seleccionar un estado y colocar su correo.'); return; }

        if(pass === '1234') {
            currentUser = { rol: 'DIRECTOR', nombre: correo, estado: estado };
            showScreen('change-pass-screen');
        } else {
            alert('Clave incorrecta. La clave inicial es 1234.');
        }
    }
}

function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    
    if(newPass.length === 4 && !isNaN(newPass)) {
        // Luego esto se enviará al backend.
        alert('Clave actualizada correctamente. Bienvenido al sistema.');
        loginSuccess();
    } else {
        alert('La clave debe tener exactamente 4 dígitos numéricos.');
    }
}

function loginSuccess() {
    document.getElementById('user-name-display').textContent = `${currentUser.nombre}`;
    showScreen('dashboard-screen');
    updateDashboardView();
}

function logout() {
    currentUser = null;
    document.getElementById('new-pass').value = '';
    showScreen('login-screen');
}

// --- DASHBOARD Y BOTONES ---
function updateDashboardView() {
    document.querySelectorAll('.stat-number')[0].textContent = "2,350";
    document.querySelectorAll('.stat-number')[1].textContent = "0";
    
    const contentDiv = document.getElementById('role-content');
    
    if(currentUser.rol === 'OBSERVATORIO') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0;">Panel del Observatorio</h3>
            <button class="btn-primary" style="margin-bottom:10px; background:#0033A0;" onclick="alert('Aquí irá el gráfico de estadísticas.')">Ver Estadísticas Globales</button>
            <button class="btn-primary" style="margin-bottom:10px;" onclick="alert('Generando reporte...')">Generar Reporte PDF</button>
        `;
    } else if (currentUser.rol === 'DIRECTOR') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0;">Panel del Director</h3>
            <p style="margin-bottom:15px; font-size:14px;">Gestión para: <b>${currentUser.estado}</b></p>
            
            <button class="btn-primary" style="margin-bottom:10px;" onclick="abrirModalCargaVoto()">
                <i class="fa-solid fa-check-circle"></i> Cargar Voto (Personal Central)
            </button>
            
            <button class="btn-primary" style="background:#0033A0;" onclick="abrirModalClaves()">
                <i class="fa-solid fa-key"></i> Ver Claves de Jefes de OPT
            </button>
        `;
    } else {
        contentDiv.innerHTML = `<h3>Visión de ${currentUser.rol}</h3>`;
    }
}

// --- VENTANAS EMERGENTES (MODALES) ---

function abrirModalCargaVoto() {
    // Creamos un modal dinámico
    let modalHTML = `
        <div id="modal-carga" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:400px;">
                <h3 style="margin-bottom:15px; color:#0033A0;">Registrar Voto</h3>
                <div class="input-group">
                    <label>Cédula del Votante:</label>
                    <input type="text" id="voto-cedula" placeholder="Ej: 12345678">
                </div>
                <div class="input-group">
                    <label>Foto (Opcional):</label>
                    <input type="file" id="voto-foto" accept="image/*" capture="environment">
                </div>
                <button class="btn-primary" onclick="guardarVoto()">Guardar Voto</button>
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
                    <tr><td style="padding:5px; border:1px solid #ddd;">OPT Local</td><td style="padding:5px; border:1px solid #ddd; font-weight:bold;">5678</td></tr>
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

function guardarVoto() {
    const cedula = document.getElementById('voto-cedula').value;
    if(!cedula) {
        alert("Debe ingresar una cédula.");
        return;
    }
    // Aquí luego conectaremos con el backend para guardar en Google Sheets.
    alert("Voto para la cédula " + cedula + " registrado (Simulado).");
    cerrarModal('modal-carga');
}
