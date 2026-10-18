// =================================================================
// CONFIGURACIÓN GLOBAL
// =================================================================
const ID_HOJA = '12fFo_WIsU9NwH4kaHw3eccpwByP4gBZhfKRu57OTLE4';
const CLAVE_INICIAL = 'Ipostel';

// =================================================================
// ENRUTADOR PRINCIPAL
// =================================================================
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'API funcionando.' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let parametros = {};
    if (e.postData && e.postData.contents) {
      parametros = JSON.parse(e.postData.contents);
    } else {
      parametros = e.parameter;
    }

    const accion = parametros.accion;
    let usuario = null;
    
    // Validar token (excepto en login)
    if (accion !== 'login') {
      usuario = validarToken_(parametros.token);
      if (!usuario) return respuestaJSON_({ ok: false, error: 'Sesión expirada o inválida.' });
    }
    
    switch (accion) {
      case 'login': return login_(parametros);
      case 'cambiarClave': return cambiarClave_(parametros);
      case 'cargarVoto': return cargarVoto_(parametros, usuario);
      case 'obtenerDashboard': return obtenerDashboard_(usuario);
      case 'generarCSV': return generarCSV_(parametros, usuario);
      default: return respuestaJSON_({ ok: false, error: 'Acción no válida.' });
    }
  } catch (error) {
    return respuestaJSON_({ ok: false, error: error.message });
  }
}

// =================================================================
// UTILIDADES
// =================================================================
function respuestaJSON_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getHoja_(nombre) {
  return SpreadsheetApp.openById(ID_HOJA).getSheetByName(nombre);
}

function validarToken_(token) {
  if (!token) return null;
  const hoja = getHoja_('SESIONES');
  if (!hoja) return null;
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === token && data[i][4] === 'ACTIVA') {
      if (data[i][3] === 'PERMANENTE' || new Date(data[i][3]) > new Date()) {
        return { correo: data[i][0], nombre: data[i][2], rol: data[i][5], estado: data[i][6], clave: data[i][7] };
      }
    }
  }
  return null;
}

function crearSesion_(correo, nombre, rol, estado, clave) {
  let hoja = getHoja_('SESIONES');
  if (!hoja) {
    const ss = SpreadsheetApp.openById(ID_HOJA);
    hoja = ss.insertSheet('SESIONES');
    hoja.appendRow(['Correo', 'Token', 'Nombre', 'Expiracion', 'Estado', 'Rol', 'Estado_Asignado', 'Clave']);
  }
  const token = Utilities.getUuid();
  hoja.appendRow([correo, token, nombre, 'PERMANENTE', 'ACTIVA', rol, estado, clave]);
  return token;
}

// =================================================================
// LÓGICA DE NEGOCIO
// =================================================================

function login_(params) {
  const { tipo, correo, clave, rol } = params;
  
  // LOGIN DE ALTOS CARGOS (Presidencia, Despacho, Observatorio)
  if (tipo === 'altos') {
    if (clave === CLAVE_INICIAL) {
      return respuestaJSON_({ ok: true, requiereCambio: true, mensaje: 'Debe cambiar su clave.', correo: 'admin_' + rol });
    } else {
      // Creamos la sesión directa
      const token = crearSesion_('admin@ipostel.gob.ve', 'Usuario ' + rol, rol, 'NACIONAL', clave);
      return respuestaJSON_({ ok: true, token: token, usuario: { nombre: 'Usuario ' + rol, rol: rol } });
    }
  } 
  
  // LOGIN DE DIRECTORES
  if (tipo === 'director') {
    const hoja = getHoja_('USUARIOS');
    if (!hoja) return respuestaJSON_({ ok: false, error: 'Base de datos no configurada.' });
    
    const data = hoja.getDataRange().getValues();
    let usuarioEncontrado = null;
    let filaUsuario = -1;
    
    // Buscar si el usuario (correo) existe en la columna 3 (índice 2)
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === correo) { // Columna C: Correo
        usuarioEncontrado = data[i];
        filaUsuario = i + 1;
        break;
      }
    }
    
    if (usuarioEncontrado) {
      // El usuario existe. Verificamos la clave (Columna H: Clave_Hash / Temporal)
      // Nota: En este código la clave se guarda en la columna 8 (índice 7)
      if (usuarioEncontrado[7] == clave || (usuarioEncontrado[7] == '' && clave === CLAVE_INICIAL)) {
        if (clave === CLAVE_INICIAL) {
          return respuestaJSON_({ ok: true, requiereCambio: true, mensaje: 'Debe cambiar su clave inicial.', correo: correo });
        } else {
          const token = crearSesion_(correo, usuarioEncontrado[1], 'DIRECTOR', usuarioEncontrado[4], clave);
          return respuestaJSON_({ ok: true, token: token, usuario: { nombre: usuarioEncontrado[1], rol: 'DIRECTOR', estado: usuarioEncontrado[4] } });
        }
      } else {
        return respuestaJSON_({ ok: false, error: 'Clave incorrecta.' });
      }
    } else {
      // El usuario NO existe. Si la clave es Ipostel, lo registramos.
      if (clave === CLAVE_INICIAL) {
        // Creamos la fila con los datos mínimos
        hoja.appendRow(['', '', correo, 'DIRECTOR', rol, 'TODAS', 'TODAS', '', CLAVE_INICIAL, 'ACTIVO', 'AUTOREGISTRO', new Date()]);
        return respuestaJSON_({ ok: true, requiereCambio: true, mensaje: 'Registro exitoso. Cambie su clave.', correo: correo });
      } else {
        return respuestaJSON_({ ok: false, error: 'Usuario no registrado. Regístrese usando la clave Ipostel.' });
      }
    }
  }
}

function cambiarClave_(params) {
  const { correo, nuevaClave } = params;
  
  const hoja = getHoja_('USUARIOS');
  const data = hoja.getDataRange().getValues();
  let encontrado = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === correo) { // Columna C: Correo
      hoja.getRange(i + 1, 8).setValue(nuevaClave); // Guardamos en columna H (Clave_Hash)
      encontrado = true;
      break;
    }
  }
  
  if (!encontrado && correo.startsWith('admin_')) {
    hoja.appendRow(['', 'Usuario ' + correo, correo, correo.replace('admin_', ''), 'NACIONAL', 'TODAS', 'TODAS', nuevaClave, '', 'ACTIVO', 'SISTEMA', new Date()]);
  }
  
  return respuestaJSON_({ ok: true, mensaje: 'Clave actualizada.' });
}

function cargarVoto_(params, usuario) {
  const { cedula_votante, nombre_votante, foto_url } = params;
  const hoja = getHoja_('REGISTRO_VOTOS');
  
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == cedula_votante && data[i][11] !== 'INACTIVO') {
      return respuestaJSON_({ ok: false, error: 'Esta cédula ya votó.' });
    }
  }
  
  hoja.appendRow([
    Utilities.getUuid(), cedula_votante, nombre_votante,
    usuario.estado || 'NACIONAL', 'TODAS', usuario.estado,
    'NO', '', foto_url || '',
    usuario.correo, usuario.rol, 'VALIDADO', new Date()
  ]);
  
  return respuestaJSON_({ ok: true, mensaje: 'Voto registrado.' });
}

function obtenerDashboard_(usuario) {
  const hojaPadron = getHoja_('PADRON');
  const hojaVotos = getHoja_('REGISTRO_VOTOS');
  
  let totalPadron = 0;
  if (hojaPadron) {
    totalPadron = hojaPadron.getDataRange().getValues().length - 1;
  }
  
  const votos = hojaVotos.getDataRange().getValues();
  let totalVotos = 0;
  
  for (let i = 1; i < votos.length; i++) {
    if (votos[i][11] !== 'INACTIVO') {
      if (usuario.rol === 'DIRECTOR') {
        if (usuario.estado === votos[i][3] || votos[i][5] === usuario.estado) totalVotos++;
      } else {
        totalVotos++;
      }
    }
  }
  
  return respuestaJSON_({ ok: true, data: { totalPadron: totalPadron, totalVotos: totalVotos } });
}

function generarCSV_(params, usuario) {
  const data = getHoja_('REGISTRO_VOTOS').getDataRange().getValues();
  let csv = 'Cedula,Nombre,Estado,Estatus,Fecha\n';
  for (let i = 1; i < data.length; i++) {
    csv += `"${data[i][1]}","${data[i][2]}","${data[i][3]}","${data[i][11]}","${data[i][12]}"\n`;
  }
  const archivo = DriveApp.createFile(Utilities.newBlob(csv, 'text/csv', 'Reporte.csv'));
  return respuestaJSON_({ ok: true, url: archivo.getUrl() });
}
