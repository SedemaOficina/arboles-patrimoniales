/**
 * QUE CADA FICHA TENGA LO SUYO
 * ---------------------------------------------------------------------------
 * Trece ejemplares es un padrón pequeño, y eso hace esta suite más rentable,
 * no menos: un árbol con una fotografía rota es el 7.7% del sitio. Con
 * trescientos sería ruido; con trece lo ve cualquiera que entre.
 *
 * `verifica-galeria.mjs` comprueba cómo se COMPORTA la galería sobre datos de
 * prueba. Esta comprueba que los ARCHIVOS estén donde el registro dice, y no
 * repite nada de aquélla.
 *
 * DOS TOPES SILENCIOSOS, QUE SON LA RAZÓN DE SER DE ESTA SUITE:
 *
 * 1. `descubrirFotos` pide 01, 02, 03… y se detiene en el primer hueco
 *    (`if (!hay) break`). Si falta 03.jpg, las fotos 04 en adelante existen en
 *    el servidor y NO LAS VE NADIE. No hay error, no hay aviso: simplemente
 *    dejan de aparecer.
 * 2. `TOPE_FOTOS` vale 12. La foto trece de un ejemplar no se busca nunca. Hoy
 *    hay tres ejemplares con diez y once.
 *
 * LO QUE ESTA SUITE NO CONVIERTE EN FALLA. Los decretos que faltan son un
 * hueco de contenido, no un defecto de código: se llenan cuando el equipo
 * publique los PDF, y un rojo que dura meses enseña a ignorar el tablero. Se
 * imprimen contados en cada corrida, que es lo que hace falta para que no se
 * olviden.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));   // fuente/

let ok = 0, mal = 0;
const t = (n, c, d = '') => { c ? (ok++, console.log('  ✅', n)) : (mal++, console.log('  ❌', n, d)); };
const hay = (p) => fs.existsSync(p);

const R = JSON.parse(fs.readFileSync('datos/registro.json', 'utf8'));
const E = R.ejemplares || [];
const DIR = 'assets/img/ejemplares';
const TOPE_FOTOS = 12;   // el mismo de fotos.js; si allá cambia, aquí también

console.log('══ LAS CARPETAS Y EL REGISTRO SE CORRESPONDEN ══');
t('Hay ejemplares que revisar', E.length > 0, 'el registro vino vacío');
const carpetas = hay(DIR) ? fs.readdirSync(DIR).filter((n) => fs.statSync(path.join(DIR, n)).isDirectory()) : [];
const ids = new Set(E.map((e) => e.id));
const sinCarpeta = E.filter((e) => !carpetas.includes(e.id)).map((e) => e.slug);
const huerfanas = carpetas.filter((c) => !ids.has(c));
t('Cada ejemplar tiene su carpeta de fotografías', sinCarpeta.length === 0, sinCarpeta.join(', '));
t('Ninguna carpeta sobra', huerfanas.length === 0,
  huerfanas.join(', ') + ' · no corresponden a ningún ejemplar del registro');

console.log('\n══ LAS FOTOGRAFÍAS ══');
const vacias = [], sinMiniatura = [], sinGrande = [], raros = [], conHueco = [], enElTope = [];
const cuenta = {};
for (const e of E) {
  const d = path.join(DIR, e.id);
  if (!hay(d)) continue;
  const f = fs.readdirSync(d);
  const grandes = f.filter((n) => /^\d+\.jpe?g$/i.test(n));
  const chicas = f.filter((n) => /^\d+-chica\.jpe?g$/i.test(n));
  cuenta[e.slug] = grandes.length;
  if (!grandes.length) { vacias.push(e.slug); continue; }
  for (const g of grandes) if (!f.includes(g.replace(/\.(jpe?g)$/i, '-chica.$1'))) sinMiniatura.push(e.slug + '/' + g);
  for (const c of chicas) if (!f.includes(c.replace('-chica', ''))) sinGrande.push(e.slug + '/' + c);
  for (const n of f) if (!/^\d+(-chica)?\.jpe?g$/i.test(n)) raros.push(e.slug + '/' + n);
  /* El hueco es lo que de verdad hace daño: descubrirFotos se detiene ahí. */
  const nums = grandes.map((n) => parseInt(n, 10)).sort((a, b) => a - b);
  const tope = nums[nums.length - 1];
  const faltan = [];
  for (let i = 1; i <= tope; i++) if (!nums.includes(i)) faltan.push(String(i).padStart(2, '0'));
  if (faltan.length) conHueco.push(`${e.slug}: falta ${faltan.join(', ')} · las de después no las verá nadie`);
  if (grandes.length >= TOPE_FOTOS) enElTope.push(`${e.slug} (${grandes.length})`);
}
t('Ninguna carpeta está vacía', vacias.length === 0, vacias.join(', '));
t('Cada fotografía tiene su miniatura', sinMiniatura.length === 0, sinMiniatura.join(', '));
t('Cada miniatura tiene su fotografía', sinGrande.length === 0, sinGrande.join(', '));
t('No hay archivos ajenos en las carpetas', raros.length === 0, raros.join(', '));
t('La numeración no tiene huecos', conHueco.length === 0, '\n     ' + conHueco.join('\n     '));
t(`Ningún ejemplar llega al tope de ${TOPE_FOTOS} fotografías`, enElTope.length === 0,
  enElTope.join(', ') + ' · la siguiente no se buscaría nunca');
const cerca = Object.entries(cuenta).filter(([, n]) => n >= TOPE_FOTOS - 2 && n < TOPE_FOTOS);
console.log(`     ${Object.values(cuenta).reduce((a, b) => a + b, 0)} fotografías en ${E.length} ejemplares` +
  (cerca.length ? ` · cerca del tope: ${cerca.map(([s, n]) => `${s} (${n})`).join(', ')}` : ''));

console.log('\n══ LAS ILUSTRACIONES DE ESPECIE ══');
/* Son el respaldo cuando un ejemplar no tiene fotografía: si falta la
   ilustración de su especie, esa ficha se queda sin ninguna imagen. */
const DIRE = 'assets/img/especies';
const ils = hay(DIRE) ? fs.readdirSync(DIRE) : [];
const generos = [...new Set(E.map((e) => String(e.especie || '').split(' ')[0].toLowerCase()).filter(Boolean))];
const faltanIl = [];
for (const g of generos) for (const tam of ['grande', 'media'])
  if (!ils.some((n) => n.toLowerCase().startsWith(g + '-' + tam))) faltanIl.push(g + '-' + tam);
t('Cada especie del registro tiene sus dos ilustraciones', faltanIl.length === 0, faltanIl.join(', '));
const ilHuerfanas = [...new Set(ils.map((n) => n.split('-')[0].toLowerCase()))].filter((g) => !generos.includes(g));
t('Ninguna ilustración sobra', ilHuerfanas.length === 0, ilHuerfanas.join(', '));

console.log('\n══ LOS DECRETOS ══');
const pdfs = hay('decretos') ? fs.readdirSync('decretos').filter((n) => /\.pdf$/i.test(n)) : [];
const citados = {};
for (const e of E) if (e.linkDecreto && !/^https?:/i.test(e.linkDecreto))
  (citados[e.linkDecreto] = citados[e.linkDecreto] || []).push(e.slug);
/* Un PDF que nadie cita se publica y no lo abre nadie; y peor, puede ser el
   que alguien creyó haber enlazado con otro nombre. */
const pdfHuerfanos = pdfs.filter((n) => !(n in citados));
t('Ningún PDF publicado sin ejemplar que lo cite', pdfHuerfanos.length === 0, pdfHuerfanos.join(', '));

const faltantes = Object.entries(citados).filter(([n]) => !pdfs.includes(n));
const compartidos = Object.entries(citados).filter(([, v]) => v.length > 1);
const sinLink = E.filter((e) => !e.linkDecreto).map((e) => e.slug);
console.log(`     ${pdfs.length} PDF publicados · ${faltantes.length} nombres esperan archivo · ` +
            `${sinLink.length} ejemplares sin nombre capturado`);
if (faltantes.length) console.log('     faltan: ' + faltantes.map(([n]) => n).join(' · '));
if (sinLink.length) console.log('     sin capturar: ' + sinLink.join(', '));
for (const [n, v] of compartidos)
  console.log(`     ⚠ «${n}» lo citan ${v.length} ejemplares: ${v.join(' + ')} — ¿es una sola declaratoria?`);
console.log('     (los decretos que faltan son captura pendiente, no falla de esta suite)');

console.log('\nTOTAL:', ok, 'aprobadas ·', mal, 'fallidas');
if (mal) process.exitCode = 1;
