/**
 * sellar.js · La huella de la fuente que produjo esta salida.
 *
 * EL PROBLEMA QUE RESUELVE
 * Editar `fuente/` no cambia el sitio: lo cambia armarlo. Un commit sin armar
 * deja `docs/` con la versión anterior y nada lo delata. Las trece suites
 * anteriores leen `fuente/` y la vista previa `prueba/`; ninguna mira lo que
 * de verdad se publica, así que todas dan verde con la salida atrasada.
 *
 * Este guión corre al final del armado y escribe en la salida un recibo con
 * la huella sha256 de cada archivo que el armado leyó. `verifica-deriva.mjs`
 * vuelve a calcular esas huellas sobre la fuente de hoy: si alguna no cuadra,
 * la salida es más vieja que la fuente y hay que volver a armar.
 *
 * Se compara la huella y no la fecha de modificación porque OneDrive
 * sincroniza esta carpeta y mueve las fechas hacia adelante sin que el
 * contenido cambie. La huella solo cambia si el contenido cambió.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DESTINO = process.env.DESTINO === 'produccion' ? 'produccion' : 'prueba';
const CARPETA = DESTINO === 'produccion' ? 'docs' : 'prueba';
const SALIDA = path.resolve(__dirname, '..', '..', CARPETA);

const sitio = require('./sitio.js');
process.chdir(path.resolve(__dirname, '..'));   // se planta en fuente/

/* LA LISTA NO SE ADIVINÓ: SE MIDIÓ.
   Se instrumentó `fs.readFileSync` y se corrió el armado de producción
   completo; esto es lo que abrió. Si se agrega un archivo a la fuente hay que
   clasificarlo aquí o en `verifica-deriva.mjs`, que falla cuando encuentra uno
   sin clasificar. Preferimos una lista explícita que se rompe a un barrido
   automático que calla. */
const SELLADOS = [
  'construir/armar-capa.js', 'construir/armar-datos.js', 'construir/armar-ficha.js',
  'construir/armar-recursos.js', 'construir/armar.js', 'construir/shapefile.js',
  'construir/aligerar.js', 'construir/arranque.js', 'construir/sitio.js',
  'cuerpo.html', 'ficha-cuerpo.html', 'recursos-cuerpo.html',
  'parciales/encabezado.html', 'parciales/pie.html',
  'datos/contrato-v2.json', 'datos/registro.json',
  'especies.js', 'estilos.css', 'ficha-logica.js', 'fotos.js', 'geo-cdmx.js',
  'indicadores.js', 'leaflet-diferido.js', 'logica.js', 'mapa.js', 'menu.js',
  'padron/fuente-viva.js', 'padron/lector-v2.js',
];

const huella = (f) =>
  crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);

/* EL RECIBO NO SE FIRMA SI NADIE ARMÓ.
   `sellar.js` no compara la salida con la fuente: sella la fuente del momento
   en que se le llama. Correrlo suelto —el rodeo que se usa cuando la
   herramienta no puede borrar la carpeta de destino— ponía la alarma en verde
   con la salida vieja. La alarma se apagaba sola, sin que nadie armara nada.

   Ahora cada armador deja su marca con el identificador de la corrida que
   `construir.sh` exporta, y el recibo solo se firma si las tres marcas son de
   ESTA corrida. Correr `node sellar.js` a secas ya no firma nada: avisa y
   termina en error.

   La marca va en un archivo aparte y no dentro de las páginas a propósito: si
   el identificador viajara incrustado, cada armado cambiaría las tres páginas
   aunque no hubiera cambiado nada, y el historial se llenaría de diferencias
   que no dicen nada. */
const MARCA = '.armado.json';

const marcarCorrida = (salida, pagina) => {
  const id = process.env.ARMADO_ID || '';
  const f = path.join(salida, MARCA);
  let m = {};
  try { m = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { m = {}; }
  if (m.armado_id !== id) m = { armado_id: id, paginas: {} };
  m.paginas[pagina] = true;
  fs.writeFileSync(f, JSON.stringify(m, null, 1) + '\n');
};

/* La lista se publica para que `verifica-deriva.mjs` la lea de aquí y no de una
   copia suya: dos listas que hay que recordar actualizar a la vez acaban
   separándose. Al importarse, este archivo no escribe nada. */
module.exports = { SELLADOS, huella, marcarCorrida, MARCA };
if (require.main !== module) return;

/* La comprobación, antes de firmar. */
const ID = process.env.ARMADO_ID || '';
let marca = null;
try { marca = JSON.parse(fs.readFileSync(path.join(SALIDA, MARCA), 'utf8')); } catch (_) {}
const alDia = marca && ID && marca.armado_id === ID &&
  ['portada', 'ficha', 'recursos'].every((p) => marca.paginas && marca.paginas[p]);
if (!alDia) {
  console.error('sellar.js: no firmo el recibo. Las páginas de ' + CARPETA + '/ no las armó esta corrida.');
  console.error('  Corre el armado entero:  fuente/construir/construir.sh ' +
    (DESTINO === 'produccion' ? 'produccion' : '') );
  console.error('  Un recibo firmado sin armar apaga la alarma de deriva y deja el sitio atrasado en silencio.');
  process.exit(1);
}

const fuentes = {};
for (const f of SELLADOS) fuentes[f] = huella(f);

const sello = {
  nota: 'Recibo del armado. Lo escribe construir/sellar.js; lo comprueba verificar/verifica-deriva.mjs. No se edita a mano.',
  destino: DESTINO,
  base: sitio.BASE,
  version_tarjeta: sitio.VERSION_TARJETA,
  armado_id: ID,
  fuentes,
};

fs.writeFileSync(path.join(SALIDA, '.construido.json'), JSON.stringify(sello, null, 1) + '\n');
console.log(DESTINO + '/.construido.json · ' + SELLADOS.length + ' fuentes selladas');
