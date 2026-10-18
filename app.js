// CONFIGURACIÓN INICIAL
const API_URL = 'AQUI_IRA_LA_URL_DEL_BACKEND'; // Lo cambiaremos luego

// Variables de estado
let currentUser = null;

// --- LÓGICA DE UI Y NAVEGACIÓN ---

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabName) {
    // Cambiar botones activos
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    // Cambiar formularios
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`form-${tabName}`).classList.add('active');
}

// --- LÓGICA DE AUTENTICACIÓN (SIMULADA PARA DISEÑO) ---

function handleLogin(event, tipo) {
    event.preventDefault();
    
    // Simulamos una validación exitosa para poder ver el diseño del Dashboard
    // En la vida real, aquí hacemos el fetch a la API_URL
    
    if(tipo === 'altos') {
        const rol = document.getElementById('rol-alto').value;
        const pass = document.getElementById('pass-alto').value;
        
        if(pass === 'Ipostel') {
            // Si usa la clave inicial, forzar cambio
            showScreen('change-pass-screen');
        } else {
            // Login normal simulado
            mockSuccessfulLogin(rol, 'Usuario ' + rol);
        }
    } else {
        const rol = document.getElementById('rol-director').value;
        const correo = document.getElementById('correo-director').value;
        const pass = document.getElementById('pass-director').value;
        
        if(pass === 'Ipostel') {
            alert('Registro enviado. El Observatorio debe autorizar su cuenta. Si ya fue autorizado, cambie su clave.');
        } else {
            mockSuccessfulLogin('DIRECTOR', correo);
        }
    }
}

function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    
    if(newPass.length === 4) {
        alert('Clave actualizada correctamente. Iniciando sesión...');
        // Aquí enviaríamos la nueva clave al backend y haríamos login
        mockSuccessfulLogin('OBSERVATORIO', 'Usuario Observatorio');
    } else {
        alert('La clave debe tener exactamente 4 dígitos.');
    }
}

function mockSuccessfulLogin(rol, nombre) {
    currentUser = { rol: rol, nombre: nombre };
    document.getElementById('user-name-display').textContent = `${nombre} (${rol})`;
    showScreen('dashboard-screen');
    updateDashboardView();
}

function logout() {
    currentUser = null;
    showScreen('login-screen');
}

// --- LÓGICA DEL DASHBOARD ---

function updateDashboardView() {
    // Aquí es donde más adelante conectaremos con Google Sheets
    // para traer los números reales.
    
    // Simulamos unos números para que veas cómo queda
    document.querySelectorAll('.stat-number')[0].textContent = "2,350"; // Total Padrón
    document.querySelectorAll('.stat-number')[1].textContent = "0"; // Votos
    
    const contentDiv = document.getElementById('role-content');
    
    if(currentUser.rol === 'OBSERVATORIO') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px;">Acciones de Observatorio</h3>
            <button class="btn-primary" style="background:var(--color-secundario); margin-bottom:10px;">Ver Novedades Pendientes</button>
            <button class="btn-primary" style="margin-bottom:10px;">Generar Reporte PDF</button>
            <button class="btn-primary" style="background:var(--color-acento); color:#000;">Descargar CSV (Excel)</button>
        `;
    } else if (currentUser.rol === 'DIRECTOR') {
        contentDiv.innerHTML = `
            <h3 style="margin-bottom:15px;">Panel de Director</h3>
            <p style="margin-bottom:15px; font-size:14px;">Gestión de OPTs y personal central.</p>
            <button class="btn-primary" style="margin-bottom:10px;">Cargar Voto (Personal Central)</button>
            <button class="btn-primary" style="background:var(--color-secundario);">Gestionar Claves de Jefes de OPT</button>
        `;
    } else {
        contentDiv.innerHTML = `
            <h3>Visión Global</h3>
            <p>Panel de consulta de alto nivel.</p>
        `;
    }
}4