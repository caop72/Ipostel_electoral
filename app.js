const API_URL = 'https://script.google.com/macros/s/AKfycbx9k3i2Agxy5C66uk1I03aoVHHICvpoVQev1OeBV6UnwZaPGxMbcMnp8Sx5xW_FinCz/exec';
let currentUser = null;
let authToken = null;

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`form-${tabName}`).classList.add('active');
}

async function handleLogin(event, tipo) {
    event.preventDefault();
    
    let bodyData = new URLSearchParams();
    bodyData.append('accion', 'login');
    bodyData.append('tipo', tipo);
    
    if(tipo === 'altos') {
        bodyData.append('rol', document.getElementById('rol-alto').value);
        bodyData.append('clave', document.getElementById('pass-alto').value);
    } else {
        bodyData.append('rol', document.getElementById('rol-director').value);
        bodyData.append('correo', document.getElementById('correo-director').value);
        bodyData.append('clave', document.getElementById('pass-director').value);
    }

    try {
        const res = await fetch(API_URL, { method: 'POST', body: bodyData });
        const result = await res.json();

        if (result.ok) {
            if (result.requiereCambio) {
                alert('Por seguridad, debe cambiar su clave inicial.');
                showScreen('change-pass-screen');
                sessionStorage.setItem('temp_correo', result.correo);
            } else {
                authToken = result.token;
                currentUser = result.usuario;
                document.getElementById('user-name-display').textContent = `${currentUser.nombre} (${currentUser.rol})`;
                showScreen('dashboard-screen');
                updateDashboardView();
            }
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Error de conexión. Intente de nuevo.');
    }
}

async function handleChangePass(event) {
    event.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    if(newPass.length !== 4) { alert('La clave debe ser de 4 dígitos.'); return; }

    let bodyData = new URLSearchParams();
    bodyData.append('accion', 'cambiarClave');
    bodyData.append('correo', sessionStorage.getItem('temp_correo'));
    bodyData.append('nuevaClave', newPass);

    try {
        const res = await fetch(API_URL, { method: 'POST', body: bodyData });
        const result = await res.json();
        
        if (result.ok) {
            alert('Clave actualizada. Ya puede iniciar sesión.');
            showScreen('login-screen');
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Error al cambiar la clave.');
    }
}

function logout() {
    currentUser = null; authToken = null;
    sessionStorage.clear();
    showScreen('login-screen');
}

async function updateDashboardView() {
    const contentDiv = document.getElementById('role-content');
    if (!currentUser) return;
    contentDiv.innerHTML = '<p style="text-align:center;">Cargando...</p>';

    let bodyData = new URLSearchParams();
    bodyData.append('accion', 'obtenerDashboard');
    bodyData.append('token', authToken);

    try {
        const res = await fetch(API_URL, { method: 'POST', body: bodyData });
        const result = await res.json();

        if (result.ok) {
            document.querySelectorAll('.stat-number')[0].textContent = result.data.totalPadron.toLocaleString();
            document.querySelectorAll('.stat-number')[1].textContent = result.data.totalVotos.toLocaleString();

            if(currentUser.rol === 'OBSERVATORIO') {
                contentDiv.innerHTML = `
                    <h3>Acciones de Observatorio</h3>
                    <button class="btn-primary" style="background:var(--color-acento); color:#000;" onclick="descargarCSV()">Descargar CSV</button>
                `;
            } else if (currentUser.rol === 'DIRECTOR') {
                contentDiv.innerHTML = `
                    <h3>Panel de Director</h3>
                    <button class="btn-primary" onclick="cargarVotoCentral()">Cargar Voto</button>
                `;
            }
        } else {
            contentDiv.innerHTML = `<p style="color:red;">${result.error}</p>`;
        }
    } catch (error) {
        contentDiv.innerHTML = `<p style="color:red;">Error de conexión.</p>`;
    }
}

function cargarVotoCentral() {
    const modalHTML = `
        <div id="modal-carga" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:25px; border-radius:10px; width:90%; max-width:400px; text-align:center;">
                <h3 style="color:#C8102E;">Cargar Voto</h3>
                <input type="text" id="input-cedula" placeholder="Cédula del votante" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ccc; border-radius:5px;">
                <input type="text" id="input-nombre" placeholder="Nombre completo" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ccc; border-radius:5px;">
                <input type="file" id="input-foto" accept="image/*" style="width:100%; margin-bottom:15px;">
                <button onclick="enviarVoto()" style="background:#C8102E; color:white; padding:10px 20px; border:none; border-radius:5px; width:100%; margin-bottom:10px; font-weight:bold;">Registrar</button>
                <button onclick="document.getElementById('modal-carga').remove()" style="background:#ccc; padding:10px 20px; border:none; border-radius:5px; width:100%;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function enviarVoto() {
    const cedula = document.getElementById('input-cedula').value.trim();
    const nombre = document.getElementById('input-nombre').value.trim();
    const fotoInput = document.getElementById('input-foto');
    if (!cedula || !nombre) { alert('Ingrese cédula y nombre.'); return; }

    let fotoUrl = '';
    if (fotoInput.files.length > 0) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => { reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(fotoInput.files[0]); });
        
        let bodyFoto = new URLSearchParams();
        bodyFoto.append('accion', 'subirFoto');
        bodyFoto.append('token', authToken);
        bodyFoto.append('base64', base64);
        bodyFoto.append('nombre', `voto_${cedula}.jpg`);
        
        try {
            const res = await fetch(API_URL, { method: 'POST', body: bodyFoto });
            const data = await res.json();
            if (data.ok) fotoUrl = data.url;
        } catch (e) {}
    }

    let bodyVoto = new URLSearchParams();
    bodyVoto.append('accion', 'cargarVoto');
    bodyVoto.append('token', authToken);
    bodyVoto.append('cedula_votante', cedula);
    bodyVoto.append('nombre_votante', nombre);
    bodyVoto.append('foto_url', fotoUrl);

    try {
        const res = await fetch(API_URL, { method: 'POST', body: bodyVoto });
        const result = await res.json();
        if (result.ok) {
            alert('✅ Voto registrado.'); 
            document.getElementById('modal-carga').remove(); 
            updateDashboardView();
        } else { alert('❌ ' + result.error); }
    } catch (error) { alert('Error de conexión.'); }
}

function descargarCSV() {
    let bodyData = new URLSearchParams();
    bodyData.append('accion', 'generarCSV');
    bodyData.append('token', authToken);
    fetch(API_URL, { method: 'POST', body: bodyData })
    .then(r => r.json()).then(res => { if (res.ok) window.open(res.url, '_blank'); else alert(res.error); });
}
