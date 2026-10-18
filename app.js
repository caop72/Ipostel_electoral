// CONFIGURACIÓN
const API_URL = 'AQUI_IRA_LA_URL_DEL_BACKEND'; 
let currentUser = null;

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

// --- LOGIN SIMPLIFICADO (Clave inicial 1234) ---
function handleLogin(event, tipo) {
    event.preventDefault();
    
    if(tipo === 'altos') {
        const rol = document.getElementById('rol-alto').value;
        const pass = document.getElementById('pass-alto').value;
        
        if(!rol) { alert('Por favor seleccione un rol.'); return; }

        if(pass === '1234') {
            // Clave inicial correcta, forzar cambio
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
            // Clave inicial correcta, forzar cambio
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
        // Aquí luego enviaremos la nueva clave al backend.
        // Por ahora, simulamos que se guardó y entramos al sistema.
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

// --- DASHBOARD ---
function updateDashboardView() {
    // Datos simulados por ahora (luego conectamos con Google Sheets)
    document.querySelectorAll('.stat-number')[0].textContent = "2,350";
    document.querySelectorAll('.stat-number')[1].textContent = "0";
    
    const contentDiv = document.getElementById('role-content');
    
    if(currentUser.rol === 'OBSERVATORIO') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0;">Panel del Observatorio</h3>
            <p style="margin-bottom:15px; font-size:14px;">Tiene visión total del país.</p>
            <button class="btn-primary" style="margin-bottom:10px; background:#0033A0;">Ver Estadísticas Globales</button>
            <button class="btn-primary" style="margin-bottom:10px;">Generar Reporte PDF</button>
            <button class="btn-primary" style="background:#28a745;">Descargar CSV (Excel)</button>
        `;
    } else if (currentUser.rol === 'DIRECTOR') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0;">Panel del Director</h3>
            <p style="margin-bottom:15px; font-size:14px;">Gestión para: <b>${currentUser.estado}</b></p>
            <button class="btn-primary" style="margin-bottom:10px;">Cargar Voto (Personal Central)</button>
            <button class="btn-primary" style="background:#0033A0;">Ver Claves de Jefes de OPT</button>
        `;
    } else {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px; color:#0033A0;">Visión de Alto Nivel</h3>
            <p>Bienvenido ${currentUser.rol}.</p>
        `;
    }
}