/**
 * LA DERIVA ENTRE LA FUENTE Y LO PUBLICADO
 * ---------------------------------------------------------------------------
 * Editar `fuente/` no cambia el sitio: lo cambia armarlo. Un commit sin armar
 * deja `docs/` con la versión anterior y hasta hoy nada lo delataba: las trece
 * suites anteriores leen la fuente y la vista previa `prueba/`, nunca la
 * carpeta que se publica. Todas daban verde con la salida atrasada.
 *
 * Esta suite mira `docs/`, que es lo único que ve el ciudadano.
 *
 * NO VUELVE A ARMAR PARA COMPARAR: armar borra `docs/assets` y tarda. Compara
 * contra el recibo que `construir/sellar.js` deja en cada armado
 * (`docs/.construido.json`), y byte a byte los archivos que se copian tal cual.
 *
 * Se comparan huellas, no fechas de modificación: OneDrive sincroniza esta
 * carpeta y adelanta las fechas sin que el contenido cambie.
 *
 * CUIDADO CON EL ATAJO. Si se arma corriendo los `armar-*.js` a mano en vez de
 * `construir.sh` —el rodeo que se usa cuando la herramienta no puede borrar—
 * hay que correr también `node construir/sellar.js`, o el recibo queda viejo y
 * esta suite avisa de una deriva que ya se resolvió.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));   // fuente/

/* La lista de fuentes selladas vive en sellar.js y se lee de ahí. Dos listas
   que hay que actualizar a la vez acaban separándose. */
const { SELLADOS, huella } = createRequire(import.meta.url)('../construir/sellar.js');
/* La salida de producción va sin comentarios: se aplica aquí la MISMA función
   que aplica el armado, importada de un solo sitio. Comparar contra la fuente
   cruda daría un rojo permanente, y volver a escribir la transformación aquí
   sería tener dos que hay que recordar cambiar a la vez. */
const { sinComentariosJS, sinComentariosCSS } =
  createRequire(import.meta.url)('../construir/aligerar.js');

const DOCS = '../docs/';
let ok = 0, mal = 0;
const t = (n, c, d = '') => { c ? (ok++, console.log('  ✅', n)) : (mal++, console.log('  ❌', n, d)); };
const hay = (f) => fs.existsSync(f);

/* Los siete módulos que `construir.sh` copia sin tocar a docs/assets/js/.
   Todo lo demás que aparezca ahí es un huérfano de un armado anterior. */
const COPIADOS_JS = ['mapa.js', 'indicadores.js', 'especies.js', 'menu.js',
                     'geo-cdmx.js', 'fotos.js', 'patrimoniales-loader.js'];

/* Fuente que NO viaja a producción, y por qué. Si un archivo de aquí empieza a
   viajar, o deja de existir, esta lista se actualiza a mano. */
const NO_VIAJA = {
  'pendientes.html':             'registro interno, lleva noindex y solo va a prueba/',
  'guia-alta.html':              'guía del equipo técnico, solo va a prueba/',
  'guia-cuerpo.html':            'cuerpo de la guía de identidad, solo va a prueba/',
  'modelo-ficha.js':             'oráculo de las suites; el armado no lo lee',
  'modelo-portada.js':           'oráculo de las suites; el armado no lo lee',
  'modelo-recursos.js':          'sin uso: no lo lee el armado ni ninguna suite',
  'construir/armar-guia.js':     'arma la guía de identidad, que solo va a prueba/',
  'construir/armar-registro.js': 'regenera el congelado desde la hoja; se corre a mano y necesita red',
  'construir/construir.sh':      'el guión del armado, no es contenido',
  'construir/sellar.js':         'escribe el recibo, no es contenido',
};

console.log('══ EL RECIBO DEL ARMADO ══');
const RECIBO = DOCS + '.construido.json';
const HAY_RECIBO = hay(RECIBO);
t('docs/.construido.json existe', HAY_RECIBO,
  'nunca se armó docs/ desde que existe sellar.js → fuente/construir/construir.sh produccion');
const sello = HAY_RECIBO ? JSON.parse(fs.readFileSync(RECIBO, 'utf8')) : null;
if (HAY_RECIBO) t('El recibo es de producción', sello.destino === 'produccion', String(sello.destino));

console.log('\n══ LA FUENTE DE HOY CONTRA LA QUE SE ARMÓ ══');
if (!HAY_RECIBO) {
  /* Sin recibo no se puede saber, y una casilla verde aquí sería mentira: un
     tablero que miente es peor que no tener tablero. */
  t('Se puede saber si la fuente cambió', false, 'no hay recibo con qué comparar');
} else {
  const cambiados = [];
  for (const [f, h] of Object.entries(sello.fuentes || {})) {
    if (!hay(f)) { cambiados.push(f + ' (ya no existe)'); continue; }
    if (huella(f) !== h) cambiados.push(f);
  }
  t('Ninguna fuente cambió desde el último armado', cambiados.length === 0,
    cambiados.length ? '\n     ' + cambiados.join('\n     ') +
    '\n     → corre fuente/construir/construir.sh produccion' : '');
}

console.log('\n══ TODA LA FUENTE ESTÁ CLASIFICADA ══');
/* Un archivo nuevo en fuente/ o entra al sello, o se copia tal cual, o se
   declara aquí como que no viaja. Nadie se queda sin clasificar en silencio. */
const candidatos = [];
for (const d of ['.', 'parciales', 'padron', 'datos', 'construir']) {
  for (const n of fs.readdirSync(d)) {
    const rel = d === '.' ? n : d + '/' + n;
    if (!fs.statSync(rel).isFile()) continue;
    if (/\.(js|css|html|json|sh)$/.test(n)) candidatos.push(rel);
  }
}
const sinClasificar = candidatos.filter((f) =>
  !SELLADOS.includes(f) && !COPIADOS_JS.includes(f) && !(f in NO_VIAJA));
t('Ningún archivo de fuente/ sin clasificar', sinClasificar.length === 0,
  sinClasificar.length ? '\n     ' + sinClasificar.join('\n     ') +
  '\n     → agrégalo a SELLADOS en construir/sellar.js, o a NO_VIAJA en esta suite' : '');
const sellados_ausentes = SELLADOS.filter((f) => !hay(f));
t('Todo lo sellado sigue existiendo', sellados_ausentes.length === 0, sellados_ausentes.join(', '));

console.log('\n══ LO QUE SE COPIA TAL CUAL ══');
const desigual = [];
const comparar = (origen, destino) => {
  if (!hay(origen)) return;
  if (!hay(destino)) { desigual.push(destino + ' (falta)'); return; }
  if (huella(origen) !== huella(destino)) desigual.push(destino);
};
comparar('estilos.css', DOCS + 'assets/css/estilos.css');
for (const j of COPIADOS_JS) comparar(j, DOCS + 'assets/js/' + j);
const recorrer = (dir, fn) => {
  if (!hay(dir)) return;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    fs.statSync(p).isDirectory() ? recorrer(p, fn) : fn(p);
  }
};
recorrer('assets', (p) => comparar(p, DOCS + p));
recorrer('vendor', (p) => comparar(p, DOCS + p));
for (const p of (hay('decretos') ? fs.readdirSync('decretos') : []))
  if (p.endsWith('.pdf')) comparar('decretos/' + p, DOCS + 'decretos/' + p);
t('Todo lo copiado coincide con la fuente', desigual.length === 0,
  desigual.length ? '\n     ' + desigual.slice(0, 20).join('\n     ') +
  (desigual.length > 20 ? `\n     … y ${desigual.length - 20} más` : '') : '');

console.log('\n══ EL CSS QUE DE VERDAD SE SIRVE ══');
/* Las páginas no enlazan la hoja: la llevan incrustada. Copiar estilos.css a
   docs/assets/css/ y no rearmar las páginas deja el sitio con el CSS viejo
   aunque el archivo suelto ya esté al día. */
const css = hay('estilos.css') ? sinComentariosCSS(fs.readFileSync('estilos.css', 'utf8')) : '';
for (const pag of ['index.html', 'ficha.html', 'recursos.html']) {
  const h = hay(DOCS + pag) ? fs.readFileSync(DOCS + pag, 'utf8') : '';
  t(pag + ' lleva incrustada la hoja de hoy', css !== '' && h.includes(css),
    'la página se armó con una versión anterior de estilos.css, o el aligerado de producción cambió');
}

console.log('\n══ EL JAVASCRIPT QUE DE VERDAD SE SIRVE ══');
/* La comprobación de arriba solo miraba el CSS. La lógica también viaja
   incrustada, y era justo la mitad que nadie comprobaba: se podía editar
   `logica.js`, copiar el archivo suelto y publicar páginas con el guion
   anterior sin que nada chistara.
   Los armadores incrustan cada módulo con la misma regla —quitar los `export`
   y las líneas de `import`—, así que aquí se repite esa normalización y se
   exige que el resultado esté, tal cual, dentro de la página. Los trozos
   cortos se ignoran: lo que se busca es el cuerpo del módulo, no una línea
   suelta que podría coincidir por casualidad. */
const normalizar = (src) => src
  .replace(/^export const /gm, 'const ')
  .replace(/^export function /gm, 'function ')
  .replace(/^export /gm, '')
  /* Los testigos de enlace también se sustituyen dentro del guion incrustado
     —el armado los resuelve en todo el documento, no solo en el cuerpo—, así
     que aquí se resuelven igual o la comparación falla por una diferencia que
     no es deriva. En producción son estos tres nombres. */
  .split('__PORTADA__').join('index.html')
  .split('__FICHA__').join('ficha.html')
  .split('__RECURSOS__').join('recursos.html');
/* Las líneas de `import` se sustituyen por vacío —o, en la ficha, por el
   perímetro de la Ciudad—, así que parten el texto: se comprueba trozo a
   trozo en vez de exigir el módulo entero de una pieza. */
const trozos = (src) => normalizar(sinComentariosJS(src)).split(/^import .*$/gm)
  .map((x) => x.trim()).filter((x) => x.length > 400);

const INCRUSTADOS = {
  'index.html':   ['especies.js', 'fotos.js', 'menu.js', 'indicadores.js',
                   'leaflet-diferido.js', 'mapa.js', 'geo-cdmx.js',
                   'padron/lector-v2.js', 'padron/fuente-viva.js', 'logica.js'],
  'ficha.html':   ['especies.js', 'fotos.js', 'menu.js', 'leaflet-diferido.js',
                   'geo-cdmx.js', 'ficha-logica.js'],
  'recursos.html': ['menu.js'],
};
for (const [pag, modulos] of Object.entries(INCRUSTADOS)) {
  const h = hay(DOCS + pag) ? fs.readFileSync(DOCS + pag, 'utf8') : '';
  const viejos = modulos.filter((m) =>
    !hay(m) || !trozos(fs.readFileSync(m, 'utf8')).every((x) => h.includes(x)));
  t(pag + ' lleva incrustado el guion de hoy', h !== '' && viejos.length === 0,
    viejos.length ? viejos.join(', ') + ' → corre fuente/construir/construir.sh produccion' : 'no se pudo leer la página');
}

console.log('\n══ EL RECIBO LO FIRMÓ UN ARMADO DE VERDAD ══');
/* `sellar.js` sella la fuente del momento en que se le llama: no compara nada
   con la salida. Correrlo suelto ponía la alarma en verde con las páginas
   viejas. Ahora los armadores dejan su marca y el recibo la copia; si las dos
   no coinciden, el recibo se firmó sin armar. */
const MARCA = DOCS + '.armado.json';
const marca = hay(MARCA) ? JSON.parse(fs.readFileSync(MARCA, 'utf8')) : null;
t('Las tres páginas dejaron su marca de armado',
  !!(marca && marca.paginas && marca.paginas.portada && marca.paginas.ficha && marca.paginas.recursos),
  'falta docs/.armado.json o alguna página no se armó en la última corrida');
if (HAY_RECIBO)
  t('El recibo es de la misma corrida que las páginas',
    !!(marca && sello.armado_id && sello.armado_id === marca.armado_id),
    'el recibo se firmó en una corrida distinta de la que armó las páginas');

console.log('\n══ NADA DE MÁS EN LO PUBLICADO ══');
/* Un archivo que se retira de la fuente sobrevive en la salida si nadie lo
   borra. `construir.sh` limpia assets/ y vendor/ antes de copiar; el rodeo de
   correr los armar-*.js a mano no, y ahí es donde aparecen los huérfanos. */
const jsPublicados = hay(DOCS + 'assets/js') ? fs.readdirSync(DOCS + 'assets/js') : [];
const huerfanos = jsPublicados.filter((n) => !COPIADOS_JS.includes(n));
t('docs/assets/js/ no tiene huérfanos', huerfanos.length === 0,
  huerfanos.map((n) => n + ' · nadie lo carga, el armado lo incrusta en la página').join(', '));

/* La documentación interna nunca se publica: `construir.sh` solo la copia
   cuando el destino es prueba. Si aparece en docs/ es que alguien la movió. */
for (const n of ['pendientes.html', 'guia-alta.html', 'guia-identidad.html'])
  t('No se publicó ' + n, !hay(DOCS + n), 'documentación interna en el sitio público');

console.log('\n══ LA DIRECCIÓN PUBLICADA ══');
const sitio = createRequire(import.meta.url)('../construir/sitio.js');
const portada = hay(DOCS + 'index.html') ? fs.readFileSync(DOCS + 'index.html', 'utf8') : '';
t('El canonical apunta a la base de sitio.js',
  portada.includes('rel="canonical" href="' + sitio.BASE), sitio.BASE);
if (HAY_RECIBO)
  t('El recibo se armó con esa misma base', sello.base === sitio.BASE,
    sello.base + ' ≠ ' + sitio.BASE);

console.log('\nTOTAL:', ok, 'aprobadas ·', mal, 'fallidas');
if (mal) process.exitCode = 1;
