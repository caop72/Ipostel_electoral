// CONFIGURACIÓN INICIAL
const API_URL = 'https://script.google.com/macros/s/AKfycbx9k3i2Agxy5C66uk1I03aoVHHICvpoVQev1OeBV6UnwZaPGxMbcMnp8Sx5xW_FinCz/exec'; // URL de tu Web App

// Variables de estado
let currentUser = null;
let authToken = null;

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

// --- LÓGICA DE AUTENTICACIÓN ---

async function handleLogin(event, tipo) {
    event.preventDefault();
    
    let params = {};
    if(tipo === 'altos') {
        params = {
            accion: 'login',
            tipo: 'altos',
            rol: document.getElementById('rol-alto').value,
            clave: document.getElementById('pass-alto').value
        };
    } else {
        params = {
            accion: 'login',
            tipo: 'director',
            rol: document.getElementById('rol-director').value,
            correo: document.getElementById('correo-director').value,
            clave: document.getElementById('pass-director').value
        };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(params)
        });
        const result = await response.json();

        if (result.ok) {
            if (result.requiereCambio) {
                // Si usa la clave inicial, forzar cambio
                alert('Debe cambiar su clave inicial.');
                showScreen('change-pass-screen');
                // Guardamos el rol y el correo temporalmente para el cambio de clave
                sessionStorage.setItem('temp_rol', params.rol);
                sessionStorage.setItem('temp_correo', params.correo || '');
            } else {
                authToken = result.token;
                currentUser = result.usuario;
                document.getElementById('user-name-display').textContent = `${currentUser.nombre} (${currentUser.rol})`;
                showScreen('dashboard-screen');
                updateDashboardView();
            }
        } else {
            alert(result.error || 'Error en el login.');
        }
    } catch (error) {
        alert('Error de conexión. Intente de nuevo.');
        console.error(error);
    }
}

async function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    
    if(newPass.length !== 4) {
        alert('La clave debe tener exactamente 4 dígitos.');
        return;
    }

    const rol = sessionStorage.getItem('temp_rol');
    const correo = sessionStorage.getItem('temp_correo');
    
    // Enviamos la nueva clave al backend
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                accion: 'cambiarClave',
                cedula: correo, // Usamos el correo como identificador para directores
                nuevaClave: newPass,
                token: 'temp_token' // Token temporal, el backend debería permitir este cambio
            })
        });
        const result = await response.json();
        
        if (result.ok) {
            alert('Clave actualizada correctamente. Iniciando sesión...');
            // Hacemos login automático con la nueva clave
            await handleLogin({ preventDefault: () => {} }, rol === 'DIRECTOR' ? 'director' : 'altos');
        } else {
            alert(result.error || 'Error al cambiar la clave.');
        }
    } catch (error) {
        alert('Error de conexión al cambiar la clave.');
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    sessionStorage.clear();
    showScreen('login-screen');
}

// --- LÓGICA DEL DASHBOARD ---

async function updateDashboardView() {
    const contentDiv = document.getElementById('role-content');
    
    if (!currentUser) return;

    // Mostrar un mensaje de carga
    contentDiv.innerHTML = '<p style="text-align: center;">Cargando estadísticas...</p>';

    try {
        // Obtener estadísticas del backend
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                accion: 'obtenerDashboard',
                token: authToken
            })
        });
        const result = await response.json();

        if (result.ok) {
            const data = result.data;
            document.querySelectorAll('.stat-number')[0].textContent = data.totalPadron.toLocaleString();
            document.querySelectorAll('.stat-number')[1].textContent = data.totalVotos.toLocaleString();

            // Construir el HTML según el rol
            if(currentUser.rol === 'OBSERVATORIO') {
                contentDiv.innerHTML = `
                    <h3 style="margin-bottom:15px;">Acciones de Observatorio</h3>
                    <button class="btn-primary" style="background:var(--color-secundario); margin-bottom:10px;" onclick="verNovedades()">Ver Novedades Pendientes</button>
                    <button class="btn-primary" style="margin-bottom:10px;" onclick="verDirectores()">Autorizar Directores</button>
                    <button class="btn-primary" style="background:var(--color-acento); color:#000;" onclick="descargarCSV()">Descargar CSV (Excel)</button>
                `;
            } else if (currentUser.rol === 'DIRECTOR') {
                contentDiv.innerHTML = `
                    <h3 style="margin-bottom:15px;">Panel de Director</h3>
                    <p style="margin-bottom:15px; font-size:14px;">Gestión de OPTs y personal central.</p>
                    <button class="btn-primary" style="margin-bottom:10px;" onclick="cargarVotoCentral()">Cargar Voto (Personal Central)</button>
                    <button class="btn-primary" style="background:var(--color-secundario);" onclick="gestionarClaves()">Gestionar Claves de Jefes de OPT</button>
                `;
            } else {
                contentDiv.innerHTML = `
                    <h3>Visión Global</h3>
                    <p>Panel de consulta de alto nivel.</p>
                `;
            }
        } else {
            contentDiv.innerHTML = `<p style="color: red;">Error al cargar datos: ${result.error}</p>`;
        }
    } catch (error) {
        contentDiv.innerHTML = `<p style="color: red;">Error de conexión con el servidor.</p>`;
        console.error(error);
    }
}

// --- ACCIONES ESPECÍFICAS ---

function verNovedades() {
    alert('Función de Novedades en desarrollo. Próximamente podrá validar casos especiales.');
}

function verDirectores() {
    alert('Función de Autorización de Directores en desarrollo. Próximamente podrá aprobar accesos.');
}

async function descargarCSV() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                accion: 'generarCSV',
                token: authToken
            })
        });
        const result = await response.json();
        if (result.ok) {
            window.open(result.url, '_blank');
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Error al generar el CSV.');
    }
}

function cargarVotoCentral() {
    // Lógica para cargar votos del personal central
    const cedula = prompt('Ingrese la cédula del votante:');
    if (!cedula) return;
    
    const nombre = prompt('Ingrese el nombre del votante:');
    if (!nombre) return;

    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
            accion: 'cargarVoto',
            token: authToken,
            cedula_votante: cedula,
            nombre_votante: nombre,
            es_novedad: false,
            commit_novedad: '',
            foto_url: ''
        })
    }).then(r => r.json()).then(res => {
        if (res.ok) {
            alert('Voto registrado exitosamente.');
            updateDashboardView();
        } else {
            alert(res.error);
        }
    });
}

function gestionarClaves() {
    alert('Función de Gestión de Claves en desarrollo. Próximamente podrá generar claves para Jefes de OPT.');
}
