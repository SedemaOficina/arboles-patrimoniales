/* Ejecutar desde cualquier sitio: el ensamblador se planta solo en fuente/.
   La SALIDA depende de la variable de entorno DESTINO:
     DESTINO=prueba      → ../../prueba/     (vista previa, datos congelados)
     DESTINO=produccion  → ../../docs/ (lo que sube al servidor)
   Sin variable, escribe en prueba, que es lo que se usa a diario. */
process.chdir(__dirname + '/..');
const DESTINO = process.env.DESTINO === 'produccion' ? 'produccion' : 'prueba';
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

// Ensambla la guía de identidad. Es una página interna, no forma parte del
// sitio público: no lleva menú del sitio ni se enlaza desde él. Muestra la
// paleta y los componentes pintados con el MISMO estilos.css que gobierna el
// micrositio, de modo que no puede quedar desfasada respecto de la realidad.
const fs = require('fs');
const css = fs.readFileSync('estilos.css', 'utf8');
const body = fs.readFileSync('guia-cuerpo.html', 'utf8');

/* La tabla de contrastes se calcula al ensamblar, con la fórmula de las Pautas
   de Accesibilidad. Escribirla a mano invita a que envejezca. */
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const razon = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const PARES = [
  ['#1A1A1A', '#FEF7E4', 'Tinta sobre papel', 'Cuerpo de texto'],
  ['#5E5563', '#FEF7E4', 'Gris sobre papel', 'Texto secundario y notas'],
  ['#8D4992', '#FEF7E4', 'Jacaranda sobre papel', 'Títulos y enlaces'],
  ['#7A3E7F', '#FEF7E4', 'Jacaranda hondo sobre papel', 'Texto pequeño y enlaces de nota'],
  ['#1E4D2B', '#FEF7E4', 'Verde bosque sobre papel', 'Cifras del panel de datos'],
  ['#6B5136', '#FFFDF7', 'Corteza sobre blanco', 'Notas de cobertura'],
  ['#FFFFFF', '#8D4992', 'Blanco sobre jacaranda', 'Botón sólido'],
  ['#FFFFFF', '#2A1630', 'Blanco sobre tinta jacaranda', 'Texto de bloques profundos'],
  ['#C79FCA', '#2A1630', 'Jacaranda luz sobre tinta jacaranda', 'Rótulos y nombres científicos'],
  ['#D9BC91', '#2A1630', 'Dorado luz sobre tinta jacaranda', 'Cifras y títulos de grupo'],
  ['#7A5E33', '#F6EFE3', 'Etiqueta histórica', 'Categoría dorada'],
  ['#C0392B', '#FEF7E4', 'Alerta sobre papel', 'Emergencias y sanciones'],
];
const filas = PARES.map(([f, b, nombre, uso]) => {
  const r = razon(f, b);
  const grande = r >= 3 && r < 4.5;
  return `<li>
    <h3>${nombre}</h3>
    <p>${uso}</p>
    <p class="recurso__nota">
      <span style="display:inline-block;width:15px;height:15px;vertical-align:-3px;background:${f};border:1px solid rgba(42,22,48,.3)"></span>
      <code>${f}</code> sobre
      <span style="display:inline-block;width:15px;height:15px;vertical-align:-3px;background:${b};border:1px solid rgba(42,22,48,.3)"></span>
      <code>${b}</code> · <b>${r.toFixed(2)}:1</b> · ${grande ? 'AA para texto grande' : 'AA'}
    </p>
  </li>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Identidad digital · Árboles patrimoniales de la Ciudad de México</title>
<meta name="description" content="Sistema de diseño del micrositio de árboles patrimoniales: paleta, tipografía, componentes y reglas. Secretaría del Medio Ambiente de la Ciudad de México.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#8D4992">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
${body.replace('<div class="recursos-lista" id="tablaContraste"></div>', `<ul class="recursos-lista">${filas}</ul>`)}
</body>
</html>`;

fs.writeFileSync(SALIDA+'guia-identidad.html', html);
console.log(DESTINO+'/guia-identidad.html ·', Math.round(html.length / 1024), 'KB');
