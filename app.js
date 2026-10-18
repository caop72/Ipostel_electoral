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
                alert('Debe cambiar su clave inicial.');
                showScreen('change-pass-screen');
                // Guardamos los datos temporalmente para el cambio de clave
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
            // Si el error es que debe registrarse, lo forzamos a registrar
            if (result.error && result.error.includes('registrado')) {
                alert('Su cuenta ya está registrada. Por favor, asegúrese de que la clave sea la correcta o contacte al Observatorio.');
            } else {
                alert(result.error || 'Error en el login.');
            }
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
    // Abrimos un modal para que el Director cargue el voto del personal central
    const modalHTML = `
        <div id="modal-carga" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:25px; border-radius:10px; width:90%; max-width:400px; text-align:center;">
                <h3 style="margin-bottom:15px; color:#C8102E;">Cargar Voto (Personal Central)</h3>
                <input type="text" id="input-cedula" placeholder="Cédula del votante" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ccc; border-radius:5px;">
                <input type="text" id="input-nombre" placeholder="Nombre completo" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ccc; border-radius:5px;">
                <input type="file" id="input-foto" accept="image/*" style="width:100%; margin-bottom:15px;">
                <button onclick="enviarVoto()" style="background:#C8102E; color:white; padding:10px 20px; border:none; border-radius:5px; width:100%; margin-bottom:10px; font-weight:bold;">Registrar Voto</button>
                <button onclick="cerrarModalCarga()" style="background:#ccc; color:black; padding:10px 20px; border:none; border-radius:5px; width:100%;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModalCarga() {
    const modal = document.getElementById('modal-carga');
    if (modal) modal.remove();
}

async function enviarVoto() {
    const cedula = document.getElementById('input-cedula').value.trim();
    const nombre = document.getElementById('input-nombre').value.trim();
    const fotoInput = document.getElementById('input-foto');

    if (!cedula || !nombre) {
        alert('Debe ingresar cédula y nombre.');
        return;
    }

    let fotoUrl = '';

    // Si hay foto, la subimos primero
    if (fotoInput.files.length > 0) {
        const file = fotoInput.files[0];
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });

        try {
            const resFoto = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    accion: 'subirFoto',
                    token: authToken,
                    base64: base64,
                    nombre: `voto_${cedula}.jpg`
                })
            });
            const dataFoto = await resFoto.json();
            if (dataFoto.ok) fotoUrl = dataFoto.url;
        } catch (e) {
            console.warn('Error subiendo foto, se registrará sin foto.');
        }
    }

    // Ahora enviamos el voto
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                accion: 'cargarVoto',
                token: authToken,
                cedula_votante: cedula,
                nombre_votante: nombre,
                es_novedad: false,
                commit_novedad: '',
                foto_url: fotoUrl
            })
        });
        const result = await response.json();

        if (result.ok) {
            alert('✅ Voto registrado exitosamente.');
            cerrarModalCarga();
            updateDashboardView(); // Refrescamos las estadísticas
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        alert('Error de conexión al registrar el voto.');
        console.error(error);
    }
}

function gestionarClaves() {
    alert('Función de Gestión de Claves en desarrollo. Próximamente podrá generar claves para Jefes de OPT.');
}
