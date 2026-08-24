/**
 * EL SISTEMA DE CONSTANTES
 *
 * Esta suite no comprueba que el sitio se vea bien: comprueba que sus medidas
 * SALGAN DE UN SISTEMA y no de una decisión tomada a ojo cada vez.
 *
 * Nace de la auditoría «Los valores sueltos». La hoja tenía nueve medidas de
 * lectura, catorce capas de apilado, quince cortes de pantalla, veinticinco
 * tamaños de letra, treinta y nueve espaciados, noventa y dos colores a mano,
 * diez radios y seis duraciones. Limpiar eso una vez no sirve de nada si el
 * siguiente componente vuelve a inventar un número: lo que lo sostiene es esta
 * comprobación.
 *
 * Cada excepción que queda está escrita en la hoja con su motivo, y aquí se
 * cuenta. Si aparece una nueva, esto falla.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
let ok = 0, mal = 0;
const t = (n, c, d = '') => { c ? (ok++, console.log('  ✅', n)) : (mal++, console.log('  ❌', n, d)); };

console.log('\n══ EL SISTEMA DE CONSTANTES ══');
const bruto = fs.readFileSync('estilos.css', 'utf8');
const css = bruto.replace(/\/\*[\s\S]*?\*\//g, '');      // sin comentarios
const root = css.match(/:root\{([\s\S]*?)\n\}/)[1];
const cuerpo = css.split('\n}').slice(1).join('\n}');     // todo menos :root

console.log('\n-- 1 · las capas de apilado --');
{
  const capas = ['--capa-fondo','--capa-contenido','--capa-realce','--capa-realce-alto',
    '--capa-barra','--capa-mapa-aviso','--capa-mapa-pin','--capa-mapa-pin-activo',
    '--capa-mapa-globo','--capa-saltar','--capa-pleno'];
  t('Las once capas están declaradas y con nombre',
    capas.every(c => new RegExp(c + ':\\s*-?\\d+;').test(root)),
    capas.filter(c => !new RegExp(c + ':\\s*-?\\d+;').test(root)).join(', '));
  // La prueba de fuego: ni un solo z-index numérico fuera de :root.
  const sueltos = cuerpo.match(/z-index:\s*-?\d+/g) || [];
  t('Ningún z-index numérico suelto en el cuerpo de la hoja',
    sueltos.length === 0, sueltos.join(', '));
  /* El piso bajó de 30 a 29 el 23 de agosto: el encabezado de la ficha pasó a
     papel y con él se retiró la banda de degradado que separaba el campo
     oscuro del cuerpo. Esa regla era uno de los usos contados. Se baja el piso,
     no se inventa un uso para conservarlo: lo que esta prueba vigila es que
     nadie escriba un z-index numérico, y de eso se encarga la de arriba. */
  t('Todos los z-index del cuerpo usan un token',
    (cuerpo.match(/z-index:var\(--capa-/g) || []).length >= 29);
  // Las del mapa no son libres y hay que decir por qué, o alguien las «ordenará».
  t('Se advierte que las capas del mapa las dicta Leaflet',
    /numeración\s*\n?\s*interna de Leaflet/.test(bruto) && /entre 400 y 700/.test(bruto));
}

console.log('\n-- 2 · radios y duraciones --');
{
  t('Los dos radios están declarados',
    /--radio:2px;/.test(root) && /--radio-pastilla:999px;/.test(root));
  const radios = [...new Set((cuerpo.match(/border-radius:\s*([^;}]+)/g) || [])
    .map(x => x.split(':')[1].trim()))];
  const PERMITIDOS = ['var(--radio)', 'var(--radio-pastilla)', '0', '50%',
                      '0 0 3px 3px', '52% 52% 44% 44%'];
  t('No queda ningún radio suelto: solo tokens y formas',
    radios.every(r => PERMITIDOS.includes(r)),
    radios.filter(r => !PERMITIDOS.includes(r)).join(' · '));
  t('Se explica que 5, 6 y 7px eran la mitad del alto, no un radio elegido',
    /mitad del alto del elemento/.test(bruto));

  t('Las dos duraciones están declaradas',
    /--paso:\.16s;/.test(root) && /--paso-lento:\.22s;/.test(root));
  const dur = [...new Set((cuerpo.match(/transition[a-z-]*\s*:[^;}]+/g) || [])
    .flatMap(d => d.match(/[0-9.]+m?s/g) || []))];
  t('Ninguna transición lleva una duración escrita a mano',
    dur.every(d => d === '.01ms'), dur.join(', '));   // .01ms es el apagado por movimiento reducido
}

console.log('\n-- 3 · el espaciado --');
{
  const PROP = /(?:^|[;{])\s*(?:padding|margin|gap|row-gap|column-gap)(?:-top|-bottom|-left|-right)?\s*:\s*([^;}]+)/gm;
  const vals = [...cuerpo.matchAll(PROP)].flatMap(m => m[1].split(/\s+/))
    .filter(v => /^[0-9.]+px$/.test(v));
  const impares = [...new Set(vals.filter(v => {
    const n = parseFloat(v);
    return Number.isInteger(n) && n % 2 === 1 && n !== 1;
  }))];
  // El 1px se queda: es un filete, no un espacio. Llevarlo a 2 lo cambia de cosa.
  t('Ningún espaciado impar salvo el filete de 1 px',
    impares.length === 0, impares.join(', '));
  t('Se explica por qué el 1 px es la excepción', /es un filete, no un espacio/.test(bruto));
}

console.log('\n-- 4 · los colores con opacidad --');
{
  const hex = Object.fromEntries([...root.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)]
    .map(m => [m[1], m[2]]));
  const rgb = [...root.matchAll(/(--[a-z0-9-]+)-rgb\s*:\s*(\d+),(\d+),(\d+)\s*;/g)];
  t('Hay canales sueltos para los colores de la paleta', rgb.length >= 8);
  // Si el hexadecimal y sus canales se separan, el sitio pinta dos moradas
  // distintas y nadie se entera. Es el único riesgo de esta forma de hacerlo.
  const desajustes = rgb.filter(m => {
    const h = hex['' + m[1]];
    if (!h) return false;                       // color sin pareja: es propio
    const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    return c.join(',') !== [m[2], m[3], m[4]].join(',');
  });
  t('Cada canal suelto coincide con su hexadecimal',
    desajustes.length === 0, desajustes.map(m => m[1]).join(', '));
  // Ningún color de la identidad puede volver a escribirse a mano.
  const PALETA = ['42,22,48','141,73,146','122,62,127','199,159,202',
                  '178,142,92','217,188,145','45,122,62','254,247,228'];
  const aMano = PALETA.filter(p => new RegExp('rgba?\\(\\s*' + p.replace(/,/g, '\\s*,\\s*')).test(cuerpo));
  t('Ningún color de la paleta se escribe a mano en el cuerpo',
    aMano.length === 0, aMano.join(' · '));
  t('Los que quedan literales son blanco y negro puros',
    (cuerpo.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g) || [])
      .every(v => /\(\s*(255\s*,\s*255\s*,\s*255|0\s*,\s*0\s*,\s*0)/.test(v)));
}

console.log('\n-- 5 · los cortes de pantalla --');
{
  const vals = [...new Set([...css.matchAll(/@media[^{]*?(?:max|min)-width:\s*(\d+)px/g)]
    .map(m => +m[1]))].sort((a, b) => a - b);
  // Las parejas max/min del mismo corte van pegadas: cuentan como una.
  const familias = [];
  for (const v of vals) {
    if (familias.length && v - familias.at(-1).at(-1) <= 2) familias.at(-1).push(v);
    else familias.push([v]);
  }
  const ESPERADAS = [345, 430, 560, 700, 860, 899, 1000, 1100, 1240];
  t('Nueve familias de corte, no quince',
    familias.length === 9, String(familias.length) + ': ' + familias.map(f => f[0]).join(', '));
  t('Y son las nueve documentadas',
    JSON.stringify(familias.map(f => f[0])) === JSON.stringify(ESPERADAS),
    familias.map(f => f[0]).join(', '));
  // No se pueden tokenizar, y conviene que quien lea la hoja lo sepa.
  t('Se advierte que una consulta de medios no lee variables',
    /no lee variables de CSS/.test(bruto));
}

console.log('\n-- 6 · la escala tipográfica --');
{
  const pasos = ['--t-micro:11px','--t-nota:12.5px','--t-apoyo:14px','--t-cuerpo:16px',
    '--t-cuerpo-grande:18px','--t-subtitulo:20px','--t-titulo-3:24px','--t-titulo-2:28px',
    '--t-titulo-1:34px','--t-display:38px'];
  t('Los diez pasos están declarados',
    pasos.every(p => root.includes(p)), pasos.filter(p => !root.includes(p)).join(', '));
  const literales = [...new Set((cuerpo.match(/font-size\s*:\s*([0-9.]+px)/g) || [])
    .map(x => x.split(':')[1].trim()))];
  t('Solo queda un tamaño literal, el del logotipo institucional',
    literales.length === 1 && literales[0] === '8.5px', literales.join(', '));
  t('Y dice por qué está exento', /es el cuerpo con el que está dibujado el\s*\n?\s*logotipo/.test(bruto));
  t('La escala se usa de verdad',
    (cuerpo.match(/font-size\s*:\s*var\(--t-/g) || []).length >= 190);
  // Los clamp() no se tocan: cada uno resuelve un caso real de texto fluido.
  t('La tipografía fluida sigue viva',
    (cuerpo.match(/font-size\s*:\s*clamp\(/g) || []).length >= 15);
}

console.log('\n-- 7 · la medida de lectura, del barrido anterior --');
{
  t('Siguen siendo dos', /--medida:62ch;/.test(root) && /--medida-nota:52ch;/.test(root));
  const enCh = (cuerpo.match(/max-width:\s*(\d+ch)/g) || []).map(x => x.split(':')[1].trim());
  t('Y solo queda el tope documentado en ch', enCh.length === 1 && enCh[0] === '34ch', enCh.join(', '));
}


console.log('\n-- 8 · lo que la auditoría 360 dejó cerrado --');
{
  const cu = fs.readFileSync('cuerpo.html','utf8');
  const enc = fs.readFileSync('parciales/encabezado.html','utf8');
  const mn = fs.readFileSync('menu.js','utf8');
  const armar = fs.readFileSync('construir/armar.js','utf8');
  const pv = fs.readFileSync('../prueba/portada-vista-previa.html','utf8');

  /* IMÁGENES DE MARCA EN WEBP. Se comprobó píxel a píxel que el PNG y el WebP
     son la misma imagen; el ahorro es de unos 230 KB por visita. El del
     membrete de la ficha es el más llamativo: está oculto en pantalla y aun
     así el navegador lo descarga. */
  t('El sello de la portada ofrece WebP antes que PNG',
    /<source type="image\/webp"[^>]*emblema-color-media\.webp 128w/.test(cu));
  t('El emblema del pie, también',
    /<source type="image\/webp"[^>]*emblema-color-media\.webp 1x/.test(fs.readFileSync('parciales/pie.html','utf8')));
  /* RETIRADAS EL 24 DE AGOSTO DE 2026. Comprobaban que el membrete impreso de
     la ficha ofreciera WebP antes que PNG y que estuviera escrito por qué una
     imagen oculta igual pesa. Ya no hay membrete: la ficha para impresión se
     eliminó entera. El criterio —toda imagen de marca se sirve en WebP— sigue
     vivo en las dos aserciones de arriba y en la del cintillo. */
  t('La marca de agua del cintillo usa image-set con WebP',
    /background:image-set\(url\("assets\/img\/marca\/emblema-color-grande\.webp"\) type\("image\/webp"\)/.test(css));
  /* CAMBIÓ EL CRITERIO, 24 de agosto de 2026. Antes se exigía que el PNG grande
     siguiera EXISTIENDO en ficha-cuerpo.html como respaldo del <picture> del
     membrete. Retirada la hoja de impresión, ese respaldo desapareció con él:
     ahora se exige lo contrario, que no lo pida nadie. El encabezado del sitio
     sigue usando las variantes «chico» y «media», que no se tocaron. */
  t('Ninguna página pide ya el logotipo institucional grande',
    !/logo-institucional-grande/.test(css) &&
    !/logo-institucional-grande/.test(fs.readFileSync('ficha-cuerpo.html','utf8')));

  /* FOCO. El anillo existía, pero «transition:all» lo desvanecía durante 200 ms:
     un indicador de foco que se desvanece es peor que uno que aparece. */
  t('El filtro ya no anima su contorno de foco',
    !/\.filtro\{[^}]*transition:all/.test(css)
    && /\.filtro\{[^}]*transition:background var\(--paso\),border-color var\(--paso\),color var\(--paso\)/.test(css));

  /* OBJETIVO DE TOQUE. El más pequeño del sitio era el número de emergencias. */
  t('Los enlaces sueltos tienen ancho de toque, no solo alto',
    /min-width:24px;text-align:center\}/.test(css) && /min-height:32px;line-height:32px;min-width:32px/.test(css));
  t('Y se dice cuál era el caso que lo motivó',
    /911.{0,40}22 px de ancho/s.test(fs.readFileSync('estilos.css','utf8')));

  /* PESTAÑA NUEVA. Cuarenta y seis enlaces la abrían sin decirlo. */
  t('Hay marca visible en los enlaces que abren otra pestaña',
    /a\[target="_blank"\]::after\{content:"\\2197"/.test(css));
  t('Y aviso audible para lector de pantalla',
    /se abre en otra pestaña/.test(mn) && /export function avisarPestanaNueva/.test(mn));
  t('El aviso se vuelve a pasar cuando el sitio pinta enlaces nuevos',
    /avisarPestanaNueva\(\);/.test(mn) && mn.indexOf('avisarPestanaNueva();') < mn.indexOf('export function avisarPestanaNueva'));
  t('La flecha decorativa que ya existía se reaprovecha en vez de duplicarse',
    /decorativa\.textContent\.replace\(\/→\/g, "↗"\)/.test(mn)
    && /a\[target="_blank"\]\.sin-marca-externa::after\{content:none\}/.test(css));

  /* SIN JAVASCRIPT. Es lo que solo se ve mirando el sitio publicado. */
  t('Hay aviso para quien llega sin JavaScript', /<noscript>/.test(enc) && /sin-guion/.test(enc));
  t('El aviso manda a lo único que sí se lee sin guion: los datos abiertos',
    /__RECURSOS__#datos/.test(enc));
  t('Y llega a la página armada', /<noscript>/.test(pv));

  /* MAPA DEL SITIO. Con su alcance dicho: son tres direcciones, no dieciséis. */
  t('El armado genera sitemap.xml, y solo en producción',
    /DESTINO === 'produccion'[\s\S]{0,900}sitemap\.xml/.test(armar));
  t('Se advierte que las fichas no tienen dirección propia',
    /no tienen dirección propia/.test(armar));
}


/* El bloque 9 vigilaba dos parejas byte a byte idénticas —pie.html con
   pie-design.html, recursos-cuerpo.html con recursos-dc-cuerpo.html—. Existían
   para que la variante de Claude Design pudiera divergir algún día. Retirada
   esa rama, cada pareja se quedó con un solo archivo y la comprobación no tiene
   qué comparar. Se retira a conciencia, no copiando un archivo sobre el otro,
   que es la salida que su propio comentario prohibía. */
console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal ? 1 : 0);
