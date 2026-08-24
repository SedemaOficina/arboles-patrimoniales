/**
 * LO QUE PESA CADA PÁGINA
 * ---------------------------------------------------------------------------
 * Un sitio no se vuelve lento de golpe: engorda de a poco y nadie lo nota
 * hasta que ya pesa. Esta suite le pone un techo a cada página y lo comprueba
 * en cada revisión.
 *
 * SE MIDE COMPRIMIDO, que es como el servidor lo manda por el cable. La
 * portada son 435 KB en el disco pero 133 KB de verdad. Medir el archivo
 * crudo asusta sin razón y esconde lo que importa.
 *
 * LO QUE CRECE SOLO ES EL REGISTRO. `datos/registro.json` viaja incrustado en
 * la portada y en la ficha. Con 13 ejemplares aporta 7.7 KB comprimidos, un 6%
 * de la portada: no estorba. Medido con los mismos campos, 50 ejemplares serían
 * 26 KB, 100 serían 49 y 300 —el tope de la hoja de cálculo— serían 143 KB en
 * cada página, que duplicaría la portada. Por eso tiene techo propio.
 *
 * CUANDO ESTA SUITE SE PONGA EN ROJO no se sube el número sin más: se mira qué
 * creció. Si fue el registro, la salida no es sacarlo del HTML —el congelado
 * existe para que haya algo que ver mientras la capa en vivo llega— sino
 * incrustar solo lo que necesita el primer pintado: con slug, nombre, especie,
 * alcaldía y coordenadas son 4.2 KB crudos. El resto ya llega por la capa viva.
 *
 * Subir un techo es una decisión, no un trámite. Si se sube, se anota por qué.
 */
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));   // fuente/

/* LOS TECHOS, EN KB COMPRIMIDOS. Puestos el 24 de agosto de 2026 con holgura
   sobre lo que pesaba ese día, para que avisen a tiempo y no den lata a diario:
     portada 133 → 160   ·   ficha 112 → 160   ·   recursos 64 → 90
   El registro incrustado va aparte: 7.7 → 25, que se alcanza alrededor de los
   cincuenta ejemplares. Ahí es donde queremos el aviso. */
const TECHO = { 'index.html': 160, 'ficha.html': 160, 'recursos.html': 90 };
const TECHO_REGISTRO = 25;

const DOCS = '../docs/';
let ok = 0, mal = 0;
const t = (n, c, d = '') => { c ? (ok++, console.log('  ✅', n)) : (mal++, console.log('  ❌', n, d)); };
/* Nivel fijo para que la medida no cambie entre máquinas. */
const kbGz = (txt) => zlib.gzipSync(Buffer.from(txt), { level: 9 }).length / 1024;
const uno = (n) => n.toFixed(1) + ' KB';

console.log('══ EL TECHO DE CADA PÁGINA ══');
const pesos = {};
for (const [pag, techo] of Object.entries(TECHO)) {
  if (!fs.existsSync(DOCS + pag)) { t(pag + ' existe', false, 'no está armado: corre construir.sh produccion'); continue; }
  const p = kbGz(fs.readFileSync(DOCS + pag, 'utf8'));
  pesos[pag] = p;
  t(`${pag} bajo ${techo} KB`, p <= techo,
    `pesa ${uno(p)} · se pasa por ${uno(p - techo)}`);
}
for (const [pag, p] of Object.entries(pesos))
  console.log(`     ${pag.padEnd(15)} ${uno(p).padStart(9)}  de ${TECHO[pag]} KB   (queda ${uno(TECHO[pag] - p)})`);

console.log('\n══ EL REGISTRO INCRUSTADO ══');
const reg = fs.existsSync('datos/registro.json') ? fs.readFileSync('datos/registro.json', 'utf8') : '';
const ejemplares = reg ? (JSON.parse(reg).ejemplares || []).length : 0;
let visto = false;
for (const pag of ['index.html', 'ficha.html']) {
  if (!fs.existsSync(DOCS + pag) || !reg) continue;
  const h = fs.readFileSync(DOCS + pag, 'utf8');
  if (!h.includes(reg)) { console.log('  ·', pag, 'ya no lleva el registro entero — revisa si fue a propósito'); continue; }
  visto = true;
  const aporta = kbGz(h) - kbGz(h.split(reg).join(''));
  t(`El registro aporta menos de ${TECHO_REGISTRO} KB en ${pag}`, aporta <= TECHO_REGISTRO,
    `aporta ${uno(aporta)} con ${ejemplares} ejemplares`);
  console.log(`     ${uno(aporta)} de ${TECHO_REGISTRO} KB · ${ejemplares} ejemplares · ` +
              `${(aporta / Math.max(ejemplares, 1) * 1024).toFixed(0)} B comprimidos por ejemplar`);
}
if (!visto && reg) t('Se pudo medir el registro incrustado', false, 'ninguna página lo lleva; ¿cambió el armado?');

console.log('\nTOTAL:', ok, 'aprobadas ·', mal, 'fallidas');
if (mal) process.exitCode = 1;
