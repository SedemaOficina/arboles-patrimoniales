/**
 * LA FUENTE VIVA
 * ---------------------------------------------------------------------------
 * lector-v2.js convierte texto en datos y ya está probado. Esta suite prueba
 * lo otro: la capa que va por ese texto, lo guarda y decide si sustituye o no
 * al registro congelado.
 *
 * La aserción que manda sobre todas: UNA HOJA VACÍA NO PUEDE VACIAR EL SITIO.
 * Hoy la hoja está vacía de verdad, así que ese camino no es una hipótesis de
 * laboratorio: es el que se recorre cada vez que alguien abre la página.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as V from '../padron/fuente-viva.js';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

console.log('\n══ LA FUENTE VIVA ══');
let ok = 0, mal = 0;
const t = (rotulo, cond, detalle = '') => {
  if (cond) { ok++; console.log(`  ✅ ${rotulo}`); }
  else { mal++; console.log(`  ❌ ${rotulo}${detalle ? ' → ' + detalle : ''}`); }
};

const C = JSON.parse(fs.readFileSync('datos/contrato-v2.json', 'utf8'));
const MUESTRA = fs.readFileSync('verificar/datos/salida-publica-muestra.csv', 'utf8');
const ENCABEZADO = MUESTRA.split('\n')[0];

/* Un almacén de mentira, con las mismas trampas que el de verdad: se le puede
   pedir que reviente al escribir, que es lo que hace el navegador cuando la
   cuota está llena o cuando la persona bloqueó el almacenamiento. */
function almacenFalso({ revientaAlEscribir = false } = {}) {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (revientaAlEscribir) throw new Error('cuota llena'); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _mapa: m,
  };
}

const respuesta = (texto, { ok: bien = true, status = 200 } = {}) =>
  ({ ok: bien, status, text: async () => texto });

console.log('\n-- la dirección de la hoja --');
{
  t('La dirección del CSV es la misma que declara el contrato',
    V.CSV_URL === C.fuente.csv, `${V.CSV_URL}\n       contrato: ${C.fuente.csv}`);
  t('Apunta a la hoja de salida pública, no al Listado',
    /gid=283285465/.test(V.CSV_URL) && C.fuente.hoja === 'Salida_Publica');
}

console.log('\n-- la caché --');
{
  const st = almacenFalso();
  const registro = { ejemplares: [{ id: 'X' }], meta: {}, stats: {} };

  t('Un registro vacío no se guarda',
    V.escribirCache({ ejemplares: [] }, { st }) === false && st._mapa.size === 0);
  t('Un registro con ejemplares sí se guarda',
    V.escribirCache(registro, { st, ahora: 1000 }) === true);
  t('Lo guardado se devuelve mientras está vigente',
    V.leerCache({ st, ahora: 1000 + V.VIGENCIA_MS - 1 })?.registro.ejemplares.length === 1);
  t('Pasada la vigencia ya no se devuelve como bueno',
    V.leerCache({ st, ahora: 1000 + V.VIGENCIA_MS + 1 }) === null);
  t('Pero sigue disponible como respaldo hasta siete días',
    V.leerCache({ st, ahora: 1000 + V.VIGENCIA_MS + 1, permitirRespaldo: true })?.registro.ejemplares.length === 1);
  t('Más allá de siete días ni como respaldo',
    V.leerCache({ st, ahora: 1000 + V.RESPALDO_MAX_MS + 1, permitirRespaldo: true }) === null);
  // Un reloj que va hacia atrás —zona horaria mal puesta, equipo con la hora
  // perdida— haría que lo guardado pareciera del futuro. No se confía.
  t('Un registro con fecha futura se ignora', V.leerCache({ st, ahora: 500 }) === null);

  const viejo = almacenFalso();
  viejo.setItem(V.CLAVE_CACHE, JSON.stringify({ esquema: V.ESQUEMA - 1, guardadoEn: 1000, registro }));
  t('Una caché de un esquema anterior se ignora', V.leerCache({ st: viejo, ahora: 1000 }) === null);

  const roto = almacenFalso();
  roto.setItem(V.CLAVE_CACHE, '{no es json');
  t('Una caché corrupta no revienta: se ignora', V.leerCache({ st: roto, ahora: 1000 }) === null);

  t('Sin almacén disponible no revienta',
    V.leerCache({ st: null }) === null && V.escribirCache(registro, { st: null }) === false);
  t('Si el almacén revienta al escribir, se sigue sin caché',
    V.escribirCache(registro, { st: almacenFalso({ revientaAlEscribir: true }) }) === false);
}

console.log('\n-- la descarga --');
{
  const bajar = (texto, opciones) => V.bajarTexto('http://prueba', { traer: async () => texto, dormir: async () => {}, ...opciones });

  t('Un CSV normal se devuelve tal cual',
    await bajar(respuesta('a,b\n1,2\n')) === 'a,b\n1,2\n');

  let msg = '';
  try { await bajar(respuesta('', { ok: false, status: 404 })); } catch (e) { msg = e.message; }
  t('Un 404 dice que la hoja pudo despublicarse', /404/.test(msg) && /despublicado/.test(msg), msg);

  msg = '';
  try { await bajar(respuesta('<!DOCTYPE html><html>…')); } catch (e) { msg = e.message; }
  t('Una página HTML no se confunde con un CSV', /HTML/.test(msg), msg);

  // Que reintente es la diferencia entre un parpadeo de red y una caída.
  let intentos = 0;
  const texto = await V.bajarTexto('http://prueba', {
    dormir: async () => {},
    traer: async () => { intentos++; if (intentos < 3) throw new Error('red'); return respuesta('ok'); },
  });
  t('Reintenta antes de rendirse', intentos === 3 && texto === 'ok', `intentos: ${intentos}`);

  intentos = 0;
  msg = '';
  try {
    await V.bajarTexto('http://prueba', { dormir: async () => {}, traer: async () => { intentos++; throw new Error('red caída'); } });
  } catch (e) { msg = e.message; }
  t('No reintenta para siempre', intentos === V.REINTENTOS + 1, `intentos: ${intentos}`);
  t('Y devuelve el último error con su motivo', /red caída/.test(msg), msg);
}

console.log('\n-- la guardia: una hoja vacía no vacía el sitio --');
{
  const solos = async (texto, extra = {}) => V.cargarEnVivo({
    contrato: C, st: almacenFalso(), traer: async () => respuesta(texto), ...extra,
  });

  const soloEncabezado = await solos(ENCABEZADO + '\n');
  t('Solo el encabezado: no sustituye nada', soloEncabezado.registro === null);
  t('Y dice por qué, en una frase legible',
    /no hay ejemplares publicados|sin ninguna fila/.test(soloEncabezado.motivo || ''), soloEncabezado.motivo);

  /* EL CASO DE HOY, TAL CUAL.
     Las fórmulas de Salida_Publica llegan hasta la fila 301, así que la hoja
     publica trescientos renglones de comas aunque no haya un solo ejemplar.
     No son basura ni un error de exportación: son la compuerta cerrada. */
  const comas = ENCABEZADO + '\n' + Array(300).fill(','.repeat(82)).join('\n') + '\n';
  const vacia = await solos(comas);
  t('Trescientas filas vacías tampoco sustituyen nada', vacia.registro === null);
  t('Y se dice cuántas filas llegaron, para no confundirlo con una caída',
    /300 fila/.test(vacia.motivo || ''), vacia.motivo);

  const st = almacenFalso();
  await V.cargarEnVivo({ contrato: C, st, traer: async () => respuesta(comas) });
  t('Una hoja vacía nunca se guarda en la caché', st._mapa.size === 0);

  const sinContrato = await V.cargarEnVivo({ contrato: null, st: almacenFalso(), traer: async () => respuesta(MUESTRA) });
  t('Sin contrato no se lee la hoja', sinContrato.registro === null && /contrato/.test(sinContrato.motivo));
}

console.log('\n-- la hoja con datos --');
{
  const st = almacenFalso();
  const r = await V.cargarEnVivo({ contrato: C, st, traer: async () => respuesta(MUESTRA), ahora: 5000 });
  t('Con datos, el registro llega y viene de la red',
    r.registro && r.registro.ejemplares.length > 0 && r.origen === 'red',
    `${r.registro ? r.registro.ejemplares.length : 0} ejemplares · ${r.motivo || ''}`);
  t('Trae la forma que el sitio ya consume',
    r.registro && Array.isArray(r.registro.ejemplares) && r.registro.meta && r.registro.stats);
  t('Y se guarda en la caché', st._mapa.size === 1);

  // La segunda visita no vuelve a la red: para eso está la caché.
  let llamadas = 0;
  const r2 = await V.cargarEnVivo({ contrato: C, st, ahora: 5001, traer: async () => { llamadas++; return respuesta(MUESTRA); } });
  t('La visita siguiente se sirve de la caché, sin volver a la red',
    llamadas === 0 && r2.origen === 'cache');
  const r3 = await V.cargarEnVivo({ contrato: C, st, ahora: 5001, forzar: true, traer: async () => { llamadas++; return respuesta(MUESTRA); } });
  t('Salvo que se fuerce', llamadas === 1 && r3.origen === 'red');
}

console.log('\n-- cuando la red falla --');
{
  const caida = async () => { throw new Error('sin red'); };

  const sinNada = await V.cargarEnVivo({ contrato: C, st: almacenFalso(), traer: caida, dormir: async () => {} });
  t('Sin caché previa, no sustituye: manda el congelado', sinNada.registro === null);
  t('Y lo dice sin lenguaje de máquina',
    /Se conserva el registro publicado/.test(sinNada.motivo || ''), sinNada.motivo);

  const st = almacenFalso();
  await V.cargarEnVivo({ contrato: C, st, traer: async () => respuesta(MUESTRA), ahora: 1000 });
  const conRespaldo = await V.cargarEnVivo({
    contrato: C, st, traer: caida, ahora: 1000 + V.VIGENCIA_MS + 1,
  });
  t('Con caché vieja, se usa el respaldo antes que quedarse sin actualizar',
    conRespaldo.registro !== null && conRespaldo.origen === 'respaldo');
  t('El respaldo viaja marcado, no disfrazado de dato fresco',
    /No se pudo actualizar/.test(conRespaldo.motivo || '') && conRespaldo.edadMs > V.VIGENCIA_MS);
}

console.log('\n-- la huella: no repintar de balde --');
{
  const A = { ejemplares: [{ id: '1', nombreAsignado: 'Uno', categorias: ['NOTABLE'], morfologia: { altura_m: 12 } }] };
  const B = JSON.parse(JSON.stringify(A));
  t('Dos registros iguales no son un cambio', V.hayCambio(A, B) === false);

  B.ejemplares[0].morfologia.altura_m = 13;
  t('Una medida distinta sí lo es', V.hayCambio(A, B) === true);

  const C2 = JSON.parse(JSON.stringify(A));
  C2.meta = { advertencias: ['otra corrida'] };
  t('Un diagnóstico distinto no es un cambio de contenido', V.hayCambio(A, C2) === false);

  const D = JSON.parse(JSON.stringify(A));
  D.ejemplares.push({ id: '2', nombreAsignado: 'Dos', categorias: [], morfologia: {} });
  t('Un ejemplar nuevo sí lo es', V.hayCambio(A, D) === true);
}

console.log('\n-- la capa viva no toca el sitio --');
{
  const src = fs.readFileSync('padron/fuente-viva.js', 'utf8');
  t('No toca el DOM', !/document\./.test(src));
  t('No pinta ni conoce la portada', !/innerHTML|pintarPortada/.test(src));
  t('No lanza hacia afuera desde cargarEnVivo',
    /export async function cargarEnVivo/.test(src) && /catch \(err\)/.test(src));
}

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal ? 1 : 0);
