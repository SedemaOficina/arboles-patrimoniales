/* Ejecutar desde cualquier sitio: el ensamblador se planta solo en fuente/.
   La SALIDA depende de la variable de entorno DESTINO:
     DESTINO=prueba      → ../../prueba/     (vista previa, datos congelados)
     DESTINO=produccion  → ../../docs/ (lo que sube al servidor)
   Sin variable, escribe en prueba, que es lo que se usa a diario. */
process.chdir(__dirname + '/..');
const DESTINO = process.env.DESTINO === 'produccion' ? 'produccion' : 'prueba';
// La dirección pública vive en un solo archivo: ver sitio.js.
const SITIO = require('./sitio.js');
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

const fs=require('fs');
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

/* Enlaces entre archivos. Los testigos __PORTADA__ y __FICHA__ se sustituyen
   aquí para que cada versión apunte a los nombres que realmente publica.
   Al desplegar en el servidor bastará con exportar RUTA_PORTADA=index.html y
   RUTA_FICHA=ficha.html antes de ensamblar. */
const RUTA_PORTADA = process.env.RUTA_PORTADA || NOMBRES.portada;
const RUTA_FICHA   = process.env.RUTA_FICHA   || NOMBRES.ficha;
const RUTA_RECURSOS = process.env.RUTA_RECURSOS || NOMBRES.recursos;
const enlazar = (h) => h.split('__PORTADA__').join(RUTA_PORTADA).split('__FICHA__').join(RUTA_FICHA).split('__RECURSOS__').join(RUTA_RECURSOS);

const css=fs.readFileSync('estilos.css','utf8');
const body=incluir(fs.readFileSync('cuerpo.html','utf8'), {esPortada:true});
// Cada módulo se aísla en su propio ámbito y publica su interfaz: al concatenar
// archivos que son módulos reales, sus ayudantes internos (esc, nf) colisionan.
const envolver=(archivo,expuestos)=>{
  const src=fs.readFileSync(archivo,'utf8').replace(/^export const /gm,'const ').replace(/^export function /gm,'function ').replace(/^export /gm,'');
  for (const n of expuestos) {
    if (!new RegExp(`(const|let|function|class)\\s+${n}\\b`).test(src)) {
      throw new Error(`armar.js: ${archivo} ya no define «${n}»; actualiza la lista de exposición.`);
    }
  }
  return `;(function(){\n${src}\n${expuestos.map(n=>`window.${n}=${n};`).join('')}\n})();`;
};
const ind=envolver('indicadores.js',['indicadores','indicadoresPadron']);
// El perímetro de la Ciudad viaja dentro del script: la versión anterior lo
// pedía con fetch a assets/geo y se quedaba sin recorte al abrir el archivo
// con doble clic o al publicar sin esa carpeta.
const geo=fs.readFileSync('geo-cdmx.js','utf8').replace(/^export const /gm,'const ');
// fotos.js se expone como módulo propio: lo usan tanto el mapa como el listado,
// así que inlinearlo dentro de uno de los dos lo dejaría invisible para el otro.
const fot=envolver('fotos.js',['montarPrimeraFoto','descubrirFotos','primeraFoto','rutaFoto','CARPETA_FOTOS','EXTENSIONES','TOPE_FOTOS']);
const mapa=envolver('mapa.js',['crearMapa','filtrar','TAMANO_PIN','TOQUE_PIN'])
  .replace(/^import .*indicadores.js";$/m,'')
  .replace(/^import .*geo-cdmx.js";$/m,()=>geo)
  .replace(/^import .*fotos.js";$/m,'');
// Mismo motivo que en armar-ficha.js: un «export» que sobrevive al ensamblado
// deja la página en blanco con un solo error de sintaxis.
const exigir=(src,marca,archivo)=>{ if(!src.includes(marca)) throw new Error(`armar.js: no encontré «${marca}» en ${archivo}`); return src; };
const js=exigir(fs.readFileSync('logica.js','utf8'),'export function pintarPortada','logica.js').replace(/^import .*mapa.js";$/m,'').replace('export function pintarPortada','function pintarPortada').replace(/^import .*especies.js";$/m,'').replace(/^import .*fotos.js";$/m,'');const menu=envolver('menu.js',['activarMenu']);
const esp=envolver('especies.js',['svgSilueta','svgPersona','perfilDe','ilustracionDe','PROPORCION_ILUSTRACION']);
const datos=fs.readFileSync('datos/registro.json','utf8');
const html=`<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Árboles patrimoniales de la Ciudad de México · Secretaría del Medio Ambiente</title>
  <meta name="description" content="Registro público de los árboles declarados patrimonio natural de la Ciudad de México: su ubicación, sus medidas, su estado y el marco jurídico que los protege. Secretaría del Medio Ambiente.">
  <meta name="author" content="Secretaría del Medio Ambiente de la Ciudad de México">
  <meta name="theme-color" content="#8D4992">
  <link rel="canonical" href="${SITIO.BASE}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Árboles patrimoniales de la Ciudad de México · Secretaría del Medio Ambiente">
  <meta property="og:locale" content="es_MX">
  <meta property="og:title" content="Árboles patrimoniales de la Ciudad de México">
  <meta property="og:description" content="Los árboles declarados patrimonio natural de la Ciudad de México: dónde están, qué los protege y qué hacen por la ciudad cada año.">
  <meta property="og:url" content="${SITIO.BASE}">
  <meta property="og:image" content="${SITIO.url('assets/img/portada/compartir.jpg')}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Árboles patrimoniales de la Ciudad de México">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Árboles patrimoniales de la Ciudad de México">
  <meta name="twitter:description" content="Los árboles declarados patrimonio natural de la Ciudad de México: dónde están, qué los protege y qué hacen por la ciudad cada año.">
  <meta name="twitter:image" content="${SITIO.url('assets/img/portada/compartir.jpg')}">
<link rel="icon" type="image/png" href="data:image/png;base64,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">
  <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="./vendor/leaflet.css">
<script src="./vendor/leaflet.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${esp}
${fot}
${menu}
${ind}
${mapa}
${js}
const DATOS=${datos};
pintarPortada(DATOS);
<\/script>
</body>
</html>`;
fs.writeFileSync(SALIDA+NOMBRES.portada,enlazar(html));
console.log(DESTINO+'/'+NOMBRES.portada+' ·',Math.round(html.length/1024),'KB');
