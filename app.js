// =================================================================
// CONFIGURACIÓN GLOBAL
// =================================================================
const ID_HOJA = '12fFo_WIsU9NwH4kaHw3eccpwByP4gBZhfKRu57OTLE4';
const ID_CARPETA_FOTOS = '1h1QFnQ53RVV24F3PiS_nC6MLaacDIc52';
const CLAVE_INICIAL = 'Ipostel';

// =================================================================
// ENRUTADOR PRINCIPAL
// =================================================================
function doGet(e) {
  return respuestaJSON_({ ok: true, message: 'API funcionando.' });
}

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function doPost(e) {
  try {
    let parametros = {};
    if (e.postData && e.postData.contents) {
      try {
        parametros = JSON.parse(e.postData.contents);
      } catch (error) {
        parametros = e.parameter;
      }
    } else {
      parametros = e.parameter;
    }

    const accion = parametros.accion;
    const accionesPublicas = ['login', 'cambiarClave', 'obtenerOPTs'];
    let usuario = null;

    if (!accionesPublicas.includes(accion)) {
      usuario = validarToken_(parametros.token);
      if (!usuario) return respuestaJSON_({ ok: false, error: 'Sesión expirada o inválida.' });
    }

    switch (accion) {
      case 'login': return login_(parametros);
      case 'cambiarClave': return cambiarClave_(parametros);
      case 'cargarVoto': return cargarVoto_(parametros, usuario);
      case 'obtenerDashboard': return obtenerDashboard_(usuario);
      case 'subirFoto': return subirFoto_(parametros, usuario);
      case 'consultarPadron': return consultarPadron_(parametros, usuario);
      case 'obtenerNovedades': return obtenerNovedades_(parametros, usuario);
      case 'gestionarNovedad': return gestionarNovedad_(parametros, usuario);
      case 'obtenerOPTs': return obtenerOPTs_(parametros, usuario);
      case 'obtenerGerentesPorDirector': return obtenerGerentesPorDirector_(parametros, usuario);
      case 'obtenerOptsPorEstado': return obtenerOptsPorEstado_(parametros, usuario);
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
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
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
  
  // 1. ALTOS CARGOS
  if (tipo === 'altos') {
    if (clave === CLAVE_INICIAL) {
      return respuestaJSON_({ ok: true, requiereCambio: true, mensaje: 'Debe cambiar su clave.', correo: 'admin_' + rol });
    } else {
      const token = crearSesion_('admin@ipostel.gob.ve', 'Usuario ' + rol, rol, 'NACIONAL', clave);
      return respuestaJSON_({ ok: true, token: token, usuario: { nombre: 'Usuario ' + rol, rol: rol } });
    }
  } 
  
  // 2. DIRECTORES
  if (tipo === 'director') {
    const hoja = getHoja_('USUARIOS');
    if (!hoja) return respuestaJSON_({ ok: false, error: 'Base de datos no configurada.' });
    const data = hoja.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === correo) {
        if (data[i][7] == clave || (data[i][7] == '' && clave === CLAVE_INICIAL)) {
          if (clave === CLAVE_INICIAL) {
            return respuestaJSON_({ ok: true, requiereCambio: true, mensaje: 'Debe cambiar su clave inicial.', correo: correo });
          } else {
            const token = crearSesion_(correo, data[i][1] || correo, 'DIRECTOR', rol, clave);
            return respuestaJSON_({ ok: true, token: token, usuario: { nombre: data[i][1] || correo, rol: 'DIRECTOR', estado: rol } });
          }
        } else {
          return respuestaJSON_({ ok: false, error: 'Clave incorrecta.' });
        }
      }
    }
    if (clave === CLAVE_INICIAL) {
      hoja.appendRow(['', '', correo, 'DIRECTOR', rol, 'TODAS', 'TODAS', CLAVE_INICIAL, '', 'ACTIVO', 'AUTOREGISTRO', new Date()]);
      return respuestaJSON_({ ok: true, requiereCambio: true, mensaje: 'Registro exitoso. Cambie su clave.', correo: correo });
    } else {
      return respuestaJSON_({ ok: false, error: 'Usuario no registrado. Regístrese usando la clave Ipostel.' });
    }
  }
  
  // 3. JEFES DE OPT
  if (tipo === 'opt') {
    const hoja = getHoja_('USUARIOS');
    const data = hoja.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][3] === 'JEFE_OPT' && data[i][5] === rol) {
        if (data[i][7] == clave) {
           const token = crearSesion_(data[i][2], data[i][1], 'JEFE_OPT', rol, clave);
           return respuestaJSON_({ ok: true, token: token, usuario: { nombre: data[i][1], rol: 'JEFE_OPT', estado: rol } });
        } else {
           return respuestaJSON_({ ok: false, error: 'Clave incorrecta para esta OPT.' });
        }
      }
    }
    if (clave.length === 4) {
        const token = crearSesion_('opt_' + rol, 'Jefe de ' + rol, 'JEFE_OPT', rol, clave);
        return respuestaJSON_({ ok: true, token: token, usuario: { nombre: 'Jefe de ' + rol, rol: 'JEFE_OPT', estado: rol } });
    } else {
        return respuestaJSON_({ ok: false, error: 'Usuario no registrado o clave inválida.' });
    }
  }

  // 4. GERENTES DE ESTADO
  if (tipo === 'gerente') {
    if (clave.length === 4) {
        const token = crearSesion_('gerente_' + rol, 'Gerente de ' + rol, 'GERENTE_ESTADO', rol, clave);
        return respuestaJSON_({ ok: true, token: token, usuario: { nombre: 'Gerente de ' + rol, rol: 'GERENTE_ESTADO', estado: rol } });
    } else {
        return respuestaJSON_({ ok: false, error: 'Clave inválida.' });
    }
  }

  return respuestaJSON_({ ok: false, error: 'Tipo de usuario no válido.' });
}

function cambiarClave_(params) {
  const { correo, nuevaClave } = params;
  const hoja = getHoja_('USUARIOS');
  const data = hoja.getDataRange().getValues();
  let encontrado = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === correo) {
      hoja.getRange(i + 1, 8).setValue(nuevaClave);
      encontrado = true;
      break;
    }
  }
  if (!encontrado && correo.startsWith('admin_')) {
    hoja.appendRow(['', 'Usuario ' + correo, correo, 'ADMIN', 'NACIONAL', 'TODAS', 'TODAS', nuevaClave, '', 'ACTIVO', 'SISTEMA', new Date()]);
  }
  return respuestaJSON_({ ok: true, mensaje: 'Clave actualizada.' });
}

function cargarVoto_(params, usuario) {
  const { cedula_votante, nombre_votante, foto_url, commit_novedad } = params;
  const hojaVotos = getHoja_('REGISTRO_VOTOS');
  const hojaPadron = getHoja_('PADRON');
  
  const dataVotos = hojaVotos.getDataRange().getValues();
  for (let i = 1; i < dataVotos.length; i++) {
    if (String(dataVotos[i][1]).trim() === String(cedula_votante).trim() && dataVotos[i][11] !== 'INACTIVO') {
      return respuestaJSON_({ ok: false, error: 'Esta cédula ya votó.' });
    }
  }
  
  let esNovedad = 'SI';
  let nombreOficial = nombre_votante || '';
  
  if (hojaPadron) {
    const dataPadron = hojaPadron.getDataRange().getValues();
    for (let i = 1; i < dataPadron.length; i++) {
      if (String(dataPadron[i][0]).trim() === String(cedula_votante).trim()) {
        esNovedad = 'NO';
        nombreOficial = dataPadron[i][1] || nombre_votante;
        break;
      }
    }
  }
  
  if (esNovedad === 'SI' && (!commit_novedad || commit_novedad.trim() === '')) {
    return respuestaJSON_({ ok: false, error: 'La cédula no está en el padrón. Debe escribir un commit.', requiereCommit: true });
  }
  
  hojaVotos.appendRow([
    Utilities.getUuid(), 
    cedula_votante, 
    nombreOficial,
    usuario.estado || 'NACIONAL', 
    'TODAS', 
    usuario.estado,
    esNovedad, 
    commit_novedad || '', 
    foto_url || '',
    usuario.correo, 
    usuario.rol, 
    esNovedad === 'SI' ? 'PENDIENTE_OBSERVATORIO' : 'VALIDADO',
    new Date()
  ]);
  
  return respuestaJSON_({ ok: true, mensaje: esNovedad === 'SI' ? 'Registrado como Novedad. Pendiente por Observatorio.' : 'Voto validado correctamente contra el padrón.' });
}

function obtenerDashboard_(usuario) {
  const hojaPadron = getHoja_('PADRON');
  const hojaVotos = getHoja_('REGISTRO_VOTOS');
  let totalPadron = hojaPadron ? hojaPadron.getDataRange().getValues().length - 1 : 0;
  const votos = hojaVotos.getDataRange().getValues();
  let totalVotos = 0;
  for (let i = 1; i < votos.length; i++) {
    if (votos[i][11] !== 'INACTIVO') {
      if (usuario.rol === 'DIRECTOR' || usuario.rol === 'JEFE_OPT' || usuario.rol === 'GERENTE_ESTADO') {
        if (usuario.estado === votos[i][3] || votos[i][5] === usuario.estado) totalVotos++;
      } else {
        totalVotos++;
      }
    }
  }
  return respuestaJSON_({ ok: true, data: { totalPadron: totalPadron, totalVotos: totalVotos } });
}

function subirFoto_(params, usuario) {
  try {
    const blob = Utilities.newBlob(Utilities.base64Decode(params.base64), 'image/jpeg', params.nombre);
    const archivo = DriveApp.getFolderById(ID_CARPETA_FOTOS).createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return respuestaJSON_({ ok: true, url: archivo.getUrl() });
  } catch (e) { 
    return respuestaJSON_({ ok: false, error: e.message }); 
  }
}

function consultarPadron_(params, usuario) {
  const { cedula } = params;
  const hojaPadron = getHoja_('PADRON');
  if (!hojaPadron) return respuestaJSON_({ ok: false, error: 'Hoja de padrón no encontrada.' });
  const data = hojaPadron.getDataRange().getValues();
  const cedulaBuscada = String(cedula).trim(); 
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === cedulaBuscada) {
      return respuestaJSON_({ ok: true, encontrado: true, datos: { nombre: data[i][1] || 'Sin Nombre', cargo: data[i][2] || 'Sin Cargo', ubicacion: data[i][3] || 'Sin Ubicación' } });
    }
  }
  return respuestaJSON_({ ok: true, encontrado: false });
}

function obtenerNovedades_(params, usuario) {
  if (usuario.rol !== 'OBSERVATORIO' && usuario.rol !== 'PRESIDENCIA' && usuario.rol !== 'DESPACHO') {
    return respuestaJSON_({ ok: false, error: 'No tiene permisos.' });
  }
  const hoja = getHoja_('REGISTRO_VOTOS');
  const data = hoja.getDataRange().getValues();
  const novedades = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === 'SI' && data[i][11] === 'PENDIENTE_OBSERVATORIO') {
      novedades.push({ fila: i + 1, cedula: data[i][1], nombre: data[i][2], estado: data[i][3], reportadoPor: data[i][9], commit: data[i][7], fecha: data[i][12] });
    }
  }
  return respuestaJSON_({ ok: true, data: novedades });
}

function gestionarNovedad_(params, usuario) {
  if (usuario.rol !== 'OBSERVATORIO') return respuestaJSON_({ ok: false, error: 'Solo Observatorio.' });
  const { fila, accionNovedad } = params; 
  const hoja = getHoja_('REGISTRO_VOTOS');
  const nuevoEstatus = accionNovedad === 'VALIDAR' ? 'VALIDADO' : 'INACTIVO';
  hoja.getRange(fila, 12).setValue(nuevoEstatus);
  return respuestaJSON_({ ok: true, mensaje: 'Novedad ' + (accionNovedad === 'VALIDAR' ? 'validada' : 'inactivada') + ' correctamente.' });
}

function obtenerOPTs_(params, usuario) {
  const hojaPadron = getHoja_('PADRON');
  if (!hojaPadron) return respuestaJSON_({ ok: false, error: 'No hay padrón.' });
  const data = hojaPadron.getDataRange().getValues();
  const optsUnicas = new Set();
  for (let i = 1; i < data.length; i++) {
    if (data[i][4]) optsUnicas.add(data[i][4]);
  }
  return respuestaJSON_({ ok: true, data: Array.from(optsUnicas).sort() });
}

function obtenerGerentesPorDirector_(params, usuario) {
  const mapaDirectores = {
    'CAPITAL': ['DISTRITO CAPITAL', 'MIRANDA', 'LA GUAIRA'],
    'LARA': ['LARA'],
    'ZULIA': ['ZULIA'],
    'CARABOBO_SUCRE': ['CARABOBO', 'SUCRE'],
    'ARAGUA': ['ARAGUA'],
    'TRUJILLO_FALCON': ['TRUJILLO', 'FALCON'],
    'MONAGAS_DELTA': ['MONAGAS', 'DELTA AMACURO'],
    'BOLIVAR': ['BOLÍVAR'],
    'TACHIRA_MERIDA': ['TÁCHIRA', 'MÉRIDA'],
    'BARINAS': ['BARINAS'],
    'COJEDES': ['COJEDES'],
    'APURE_AMAZONAS': ['APURE', 'AMAZONAS'],
    'PORTUGUESA_NUEVA_ESPARTA': ['PORTUGUESA', 'NUEVA ESPARTA'],
    'ANZOATEGUI': ['ANZOÁTEGUI'],
    'GUARICO_YARACUY': ['GUÁRICO', 'YARACUY']
  };
  const estados = mapaDirectores[usuario.estado] || [];
  return respuestaJSON_({ ok: true, data: estados });
}

function obtenerOptsPorEstado_(params, usuario) {
  const { estado } = params;
  const hojaPadron = getHoja_('PADRON');
  if (!hojaPadron) return respuestaJSON_({ ok: false, error: 'No hay padrón.' });
  
  const data = hojaPadron.getDataRange().getValues();
  const optsUnicas = new Set();
  
  // Normalizamos el estado que viene del frontend (quitamos tildes, "ESTADO ", y pasamos a mayúsculas)
  const estadoBuscado = String(estado || '')
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^ESTADO\s+/, "")
    .trim();

  for (let i = 1; i < data.length; i++) {
    // Normalizamos el estado de la fila del padrón de la misma forma
    const estadoEnFila = String(data[i][3] || '')
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/^ESTADO\s+/, "")
      .trim();

    const optEnFila = String(data[i][4] || '').trim();
    
    // Si el estado coincide y hay una OPT, la agregamos
    if (estadoEnFila === estadoBuscado && optEnFila) {
      optsUnicas.add(optEnFila);
    }
  }
  
  return respuestaJSON_({ ok: true, data: Array.from(optsUnicas).sort() });
}
