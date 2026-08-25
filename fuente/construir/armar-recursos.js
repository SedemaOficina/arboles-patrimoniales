/* Ejecutar desde cualquier sitio: el ensamblador se planta solo en fuente/.
   La SALIDA depende de la variable de entorno DESTINO:
     DESTINO=prueba      → ../../prueba/     (vista previa, datos congelados)
     DESTINO=produccion  → ../../docs/ (lo que sube al servidor)
   Sin variable, escribe en prueba, que es lo que se usa a diario. */
process.chdir(__dirname + '/..');
const DESTINO = process.env.DESTINO === 'produccion' ? 'produccion' : 'prueba';
// La dirección pública vive en un solo archivo: ver sitio.js.
const SITIO = require('./sitio.js');
const ALIGERAR = require('./aligerar.js');
// La carpeta publicada se llama docs/ porque es el nombre que GitHub Pages
// reconoce para servir un sitio desde una subcarpeta de la rama principal.
const CARPETA = DESTINO === 'produccion' ? 'docs' : 'prueba';
const SALIDA = require('path').resolve(__dirname, '..', '..', CARPETA) + '/';
require('fs').mkdirSync(SALIDA, { recursive: true });
/* Los nombres de archivo cambian con el destino. En pruebas conviene que se
   note que son pruebas; en produccion mandan los nombres que espera un
   servidor web. Los enlaces entre paginas se resuelven con estos mismos
   nombres, asi que basta cambiarlos aqui. */
const NOMBRES = DESTINO === 'produccion'
  ? { portada:'index.html', ficha:'ficha.html', recursos:'recursos.html' }
  : { portada:'portada-vista-previa.html', ficha:'ficha-vista-previa.html', recursos:'recursos-vista-previa.html' };

// Ensambla la página de Recursos. Es una página aparte del sitio de una sola
// pantalla: aquí viven los videos, el marco normativo, los datos abiertos y la
// metodología, que no tienen por qué alargar el desplazamiento de la portada.
// No consume el registro: es contenido estático, así que no carga los datos.
const fs = require('fs');
/* Parciales. El encabezado y el pie viven en un solo archivo cada uno y se
   insertan aqui. Antes habia cinco copias de cada bloque repartidas en los
   cuerpos, y ya habian divergido entre si: dos variantes de encabezado y tres
   de pie. Un cambio de telefono en el pie obligaba a tocar cinco archivos y a
   confiar en que nadie olvidara uno.
   __PORTADA__ se resuelve a cadena vacia cuando la pagina ES la portada, de
   modo que ahi los enlaces del menu siguen siendo anclas de la misma pagina y
   no recargan. */
const parcial = (n) => fs.readFileSync(`parciales/${n}.html`, 'utf8').trim();
const incluir = (html, {pie = 'pie', esPortada = false} = {}) => {
  let h = html.split('<!--#encabezado-->').join(parcial('encabezado'))
              .split('<!--#pie-->').join(parcial(pie));
  if (esPortada) h = h.split('__PORTADA__#').join('#').split('href="__PORTADA__"').join('href="#inicio"');
  return h;
};


const RUTA_PORTADA = process.env.RUTA_PORTADA || NOMBRES.portada;
const RUTA_FICHA   = process.env.RUTA_FICHA   || NOMBRES.ficha;
const RUTA_RECURSOS= process.env.RUTA_RECURSOS|| NOMBRES.recursos;
/* LA FECHA DE PUBLICACIÓN, resuelta al armar.
   La sección legal declara de cuándo son las cifras. Ponerla a mano envejece
   sin que nadie se dé cuenta: la escribe el armado, así que siempre es la del
   sitio que está en línea. */
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];
const _h = new Date();
const FECHA_PUBLICACION = `${_h.getDate()} de ${MESES[_h.getMonth()]} de ${_h.getFullYear()}`;
const enlazar = (h) => h
  .split('__PORTADA__').join(RUTA_PORTADA)
  .split('__FICHA__').join(RUTA_FICHA)
  .split('__RECURSOS__').join(RUTA_RECURSOS)
  .split('__FECHA_PUBLICACION__').join(FECHA_PUBLICACION);

const css = ALIGERAR.aligerarCSS(fs.readFileSync('estilos.css', 'utf8'));
const body = incluir(fs.readFileSync('recursos-cuerpo.html', 'utf8'));
const menu = ';(function(){\n' + ALIGERAR.aligerarJS(fs.readFileSync('menu.js', 'utf8'))
  .replace(/^export function /gm, 'function ').replace(/^export /gm, '') + '\n})();';

const html = `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recursos · Árboles patrimoniales de la Ciudad de México</title>
<meta name="description" content="Videos, marco normativo, datos abiertos y metodología del registro de árboles patrimoniales de la Ciudad de México. Secretaría del Medio Ambiente.">
<meta name="author" content="Secretaría del Medio Ambiente de la Ciudad de México">
<meta name="theme-color" content="#8D4992">
<link rel="canonical" href="${SITIO.url(NOMBRES.recursos)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Árboles patrimoniales de la Ciudad de México · Secretaría del Medio Ambiente">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="Recursos · Árboles patrimoniales de la Ciudad de México">
<meta property="og:description" content="Videos, marco normativo, datos abiertos y metodología del registro de árboles patrimoniales de la Ciudad de México.">
<meta property="og:url" content="${SITIO.url(NOMBRES.recursos)}">
<meta property="og:image" content="${SITIO.urlTarjeta()}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Árboles patrimoniales de la Ciudad de México">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Recursos · Árboles patrimoniales de la Ciudad de México">
<meta name="twitter:description" content="Videos, marco normativo, datos abiertos y metodología del registro de árboles patrimoniales de la Ciudad de México.">
<meta name="twitter:image" content="${SITIO.urlTarjeta()}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${menu}
<\/script>
</body>
</html>`;

fs.writeFileSync(SALIDA+NOMBRES.recursos, enlazar(html));
require('./sellar.js').marcarCorrida(SALIDA,'recursos');
console.log(DESTINO+'/'+NOMBRES.recursos+' ·', Math.round(html.length / 1024), 'KB');
