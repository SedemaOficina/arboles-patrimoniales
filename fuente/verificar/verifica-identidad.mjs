import fs from 'fs';
import { fileURLToPath } from 'url';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const PRUEBA = '../prueba/';
let ok=0,mal=0; const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };
console.log('\n══ IDENTIDAD, ENCABEZADO Y CARTOGRAFÍA ══');

const paginas=[PRUEBA+'portada.dc.html',PRUEBA+'ficha.dc.html',PRUEBA+'portada-vista-previa.html',PRUEBA+'ficha-vista-previa.html'];
for(const f of paginas){
  const s=fs.readFileSync(f,'utf8');
  // El emblema salió del encabezado por decisión editorial: competía con el
  // logotipo de Gobierno. El encabezado lleva el nombre del sitio; el emblema
  // sigue en la portada, el pie y el favicon.
  t(f+' · el encabezado ya no lleva el emblema', !/class="marca__emblema"/.test(s));
  t(f+' · el encabezado nombra Árboles patrimoniales',
    /<span class="marca__sitio">Árboles<br>patrimoniales<\/span>/.test(s) && !/marca__sitio">Guardianes/.test(s));
  t(f+' · logotipo institucional con el Sistema de Información Ambiental',
    /logo-institucional-media\.png/.test(s) && /Sistema de Información Ambiental/.test(s));
  t(f+' · el logotipo anterior ya no se pide', !/logo-sedema\.svg/.test(s));
  t(f+' · el logotipo se sirve en webp con respaldo png',
    /logo-institucional-media\.webp/.test(s) && /<source type="image\/webp"/.test(s));
  t(f+' · respaldo tipográfico si falta el logotipo', /marca--sin-logo/.test(s)&&s.indexOf("classList.add('marca--sin-logo')")<s.indexOf('this.remove()',s.indexOf('marca--sin-logo')));
  t(f+' · emblema también en el pie', /class="pie__emblema"/.test(s));
  // El sello salió de la cabecera de la ficha: ahí competía con el logotipo
  // institucional del encabezado y con el nombre del sitio, tres marcas en una
  // pantalla. Sigue en la portada, el pie, el favicon y el membrete impreso.
  t(f+' · el emblema no compite en la cabecera de la ficha',
    !/class="sello sello--ficha"/.test(s));
  t(f+' · favicon con el emblema', /rel="icon" type="image\/png" href="data:image\/png;base64,/.test(s));
  t(f+' · el emblema sigue en portada, pie y favicon', (s.match(/emblema-(chico|media|grande)\.png/g)||[]).length>=3);
  t(f+' · logotipo con interlínea holgada', /line-height:\.96/.test(s)||/line-height:1;letter-spacing/.test(s));
  // El globo se posa SOBRE la copa, dentro de la hilera. Antes sobresalía por
  // arriba y la hilera se subía 162 px con margen negativo para darle sitio:
  // ese hueco es donde ahora vive la guía, y se encimaban.
  t(f+' · el globo vive dentro de la hilera, no encima',
    /\.bosque__globo\{position:absolute;top:10px/.test(s) && !/margin-top:-162px/.test(s));
}
const p=fs.readFileSync(PRUEBA+'portada.dc.html','utf8');
const geo=JSON.parse(p.split('data-perimetros>')[1].split('</scr')[0]);
const m=fs.readFileSync('mapa.js','utf8');
t('mapa.js · máscara de la Ciudad de México incrustada', /MASCARA_CDMX = GEO_CDMX/.test(m) && /import \{ GEO_CDMX \}/.test(m));
t('mapa.js · límites y pantalla completa', /LIMITES_CDMX/.test(m)&&/maxBounds/.test(m)&&/mapa-marco--pleno/.test(m));
const geoArch=JSON.parse(fs.readFileSync('assets/geo/cdmx-mascara.geojson','utf8'));
t('máscara con contorno y recorte', geoArch.features.length===2 && geoArch.features.some(f=>f.properties.clase==='mascara') && geoArch.features.some(f=>f.properties.clase==='contorno'));

console.log('\n══ ENCABEZADO ══');
const cssI = fs.readFileSync('estilos.css','utf8');
t('css · logotipo y nombre del sitio comparten renglón con el menú',
  /\.barra \.marca\{display:flex;align-items:center/.test(cssI) && !/\.franja-gob\{/.test(cssI));
t('css · el logotipo cede ancho para caber en la tira', /\.marca__logo\{display:block;width:372px/.test(cssI));
t('css · el encabezado no se imprime: el membrete lo sustituye', /\.barra, \.pie/.test(cssI));
t('css · el membrete impreso da renglón propio al logotipo',
  /\.hoja-cabeza__gob \{ flex: 1 0 100%/.test(cssI));
t('css · la tilde del titular ya no se encima con el rótulo', /\.portada h1\{[^}]*padding-top:\.16em/.test(cssI));
t('css · no quedan reglas de la franja retirada', !/franja-gob/.test(cssI));
t('fuente · el archivo del logotipo anterior fue borrado', !fs.existsSync('assets/img/logo-sedema.svg'));
for (const n of ['chico','media','grande'])
  for (const e of ['png','webp'])
    t(`assets · logo-institucional-${n}.${e} entregado`, fs.existsSync(`assets/img/marca/logo-institucional-${n}.${e}`));

// LA VISTA PREVIA AL COMPARTIR.
// WhatsApp guarda la miniatura por DIRECCIÓN, no por contenido: durante
// semanas siguió mostrando «GUARDIANES DEL TIEMPO» aunque el archivo ya se
// había redibujado. El sufijo ?v= es lo único que obliga al servicio a
// descargarla otra vez. Si alguien lo quita, el problema vuelve en silencio.
for (const f of paginas) {
  const s = fs.readFileSync(f, 'utf8');
  t(f + ' · og:image lleva el sufijo de versión que rompe la caché de WhatsApp',
    /<meta property="og:image" content="[^"]+\/compartir\.jpg\?v=\d+">/.test(s));
  t(f + ' · twitter:image lleva el mismo sufijo',
    /<meta name="twitter:image" content="[^"]+\/compartir\.jpg\?v=\d+">/.test(s));
  t(f + ' · la tarjeta declara las medidas que piden los servicios',
    /<meta property="og:image:width" content="1200">/.test(s) &&
    /<meta property="og:image:height" content="630">/.test(s));
}
// La tarjeta ya no puede anunciar el nombre anterior del sitio.
t('fuente · compartir.jpg fue redibujado con el nombre vigente',
  fs.existsSync('assets/img/portada/compartir.jpg') &&
  fs.statSync('assets/img/portada/compartir.jpg').size !== 174182);


console.log('\n-- la medida de lectura --');
{
  /* POR QUÉ ESTA COMPROBACIÓN.
     La hoja llegó a tener NUEVE topes de medida distintos —52, 56, 62, 64, 70,
     74, 78 y 82 ch, más seis en píxeles— puestos uno a uno, sin criterio
     común. El resultado no se leía como decisión sino como descuido: párrafos
     de anchos arbitrarios en la misma página. Ahora hay dos tokens por rol, y
     esta suite impide que vuelva a aparecer un décimo valor suelto. */
  const cs = fs.readFileSync('estilos.css','utf8');
  t('Existen las dos medidas, y solo dos',
    /--medida:62ch;/.test(cs) && /--medida-nota:52ch;/.test(cs));
  t('Se advierte que «ch» no es un carácter real',
    /62ch se leen como unos 68 caracteres reales/.test(cs));
  t('El texto corrido se acoge a la medida',
    (cs.match(/max-width:var\(--medida\)/g)||[]).length >= 9);
  t('Y las notas y pies, a la suya',
    (cs.match(/max-width:var\(--medida-nota\)/g)||[]).length >= 11);

  /* Las excepciones se permiten, pero se cuentan y cada una lleva escrito por
     qué su ancho no lo decide la lectura. Si aparece una décima, esto falla. */
  /* Se cuentan solo los topes en «ch»: ahí vivía el zoológico. Los de píxeles
     que quedan son anchos de caja o puntos de corte de media query, no medidas
     de lectura, y los cuatro que sí lo eran están anotados abajo. */
  const enCh = [...cs.matchAll(/max-width:(\d+ch)/g)].map(m => m[1]);
  t('Solo queda un tope en ch sin token, y es el documentado',
    enCh.length === 1 && enCh[0] === '34ch', enCh.join(', '));
  for (const marca of ['EXENTA DE LA MEDIDA','EXENTO: no es un párrafo',
                       'EXENTO: mensaje de estado','EXENTO: vive dentro de una caja']) {
    t(`La excepción «${marca.slice(0, 34)}…» dice por qué`, cs.includes(marca));
  }
}

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
