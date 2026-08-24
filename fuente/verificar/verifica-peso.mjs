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
 * DOS COSAS DISTINTAS CRECEN, Y SE MIDEN POR SEPARADO.
 *
 * Una es el REGISTRO: `datos/registro.json` viaja incrustado en la portada y en
 * la ficha, así que cada ejemplar nuevo engorda dos páginas. Eso es crecimiento
 * previsto y legítimo. La primera versión de esta suite le puso un techo de 25 KB
 * —unos 50 ejemplares— calculado sobre el tope de 300 que tiene la hoja de
 * cálculo. Ese tope no refleja la realidad: declarar un árbol patrimonial es un
 * acto jurídico con decreto, y pasar de cien es improbable. Un aviso que suena
 * cuando todo va según lo esperado se aprende a ignorar, así que el techo se
 * subió a donde caben ~120 ejemplares y solo salta si el padrón desborda toda
 * previsión.
 *
 * La otra es EL PESO DE CADA EJEMPLAR, y esa sí es el accidente: un campo de
 * texto largo, una imagen en base64, un objeto que se duplica. Hoy son 607 bytes
 * comprimidos por ejemplar. Si eso sube, sube en todos a la vez y nadie lo nota
 * mirando el total. Tiene guardia propia.
 *
 * Y EL TECHO DE PÁGINA SE MIDE SIN EL REGISTRO, para que el crecimiento normal
 * del padrón no consuma el margen que vigila al resto del sitio. Así, un rojo
 * dice qué creció sin que haya que averiguarlo.
 *
 * CUANDO ESTA SUITE SE PONGA EN ROJO no se sube el número sin más. Si lo que
 * creció fue el registro más allá de lo previsto, la salida no es sacarlo del
 * HTML —el congelado existe para que haya algo que ver mientras la capa en vivo
 * llega— sino incrustar solo lo del primer pintado: con slug, nombre, especie,
 * alcaldía y coordenadas son 4.2 KB crudos. El resto ya llega por la capa viva.
 *
 * Subir un techo es una decisión, no un trámite. Si se sube, se anota por qué.
 */
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));   // fuente/

/* LOS TECHOS, EN KB COMPRIMIDOS, puestos el 24 de agosto de 2026.

   TECHO · la página SIN el registro incrustado. Ese día pesaban 125.5 la
   portada, 104.2 la ficha y 64.1 recursos; se dejó cerca de un 20% de holgura.

   TECHO_REGISTRO · lo que aporta el registro incrustado. Hoy 7.7 KB con 13
   ejemplares; 60 KB dan para unos 120, más de lo que el padrón va a crecer.

   BYTES_POR_EJEMPLAR · la guardia de verdad. Hoy 607 bytes comprimidos cada
   uno. Si un campo engorda, engorda en todos y el total no lo delata. */
const TECHO = { 'index.html': 145, 'ficha.html': 125, 'recursos.html': 80 };
const TECHO_REGISTRO = 60;
const BYTES_POR_EJEMPLAR = 900;

const DOCS = '../docs/';
let ok = 0, mal = 0;
const t = (n, c, d = '') => { c ? (ok++, console.log('  ✅', n)) : (mal++, console.log('  ❌', n, d)); };
/* Nivel fijo para que la medida no cambie entre máquinas. */
const kbGz = (txt) => zlib.gzipSync(Buffer.from(txt), { level: 9 }).length / 1024;
const uno = (n) => n.toFixed(1) + ' KB';

/* El registro se mide primero: hace falta para descontarlo de cada página. */
const reg = fs.existsSync('datos/registro.json') ? fs.readFileSync('datos/registro.json', 'utf8') : '';
const ejemplares = reg ? (JSON.parse(reg).ejemplares || []).length : 0;
const sinRegistro = (h) => (reg && h.includes(reg)) ? h.split(reg).join('') : h;

console.log('══ EL TECHO DE CADA PÁGINA, SIN EL REGISTRO ══');
const pesos = {};
for (const [pag, techo] of Object.entries(TECHO)) {
  if (!fs.existsSync(DOCS + pag)) { t(pag + ' existe', false, 'no está armado: corre construir.sh produccion'); continue; }
  const h = fs.readFileSync(DOCS + pag, 'utf8');
  pesos[pag] = { todo: kbGz(h), propio: kbGz(sinRegistro(h)) };
  t(`${pag} bajo ${techo} KB sin el registro`, pesos[pag].propio <= techo,
    `pesa ${uno(pesos[pag].propio)} · se pasa por ${uno(pesos[pag].propio - techo)}`);
}
for (const [pag, v] of Object.entries(pesos))
  console.log(`     ${pag.padEnd(15)} ${uno(v.propio).padStart(9)} de ${TECHO[pag]} KB` +
              `   (queda ${uno(TECHO[pag] - v.propio)}` +
              `${v.todo > v.propio ? ` · con el registro, ${uno(v.todo)}` : ''})`);

console.log('\n══ EL REGISTRO INCRUSTADO ══');
let visto = false;
for (const pag of ['index.html', 'ficha.html']) {
  if (!fs.existsSync(DOCS + pag) || !reg) continue;
  const h = fs.readFileSync(DOCS + pag, 'utf8');
  if (!h.includes(reg)) { console.log('  ·', pag, 'ya no lleva el registro entero — revisa si fue a propósito'); continue; }
  if (visto) continue;   // aporta lo mismo en las dos; se comprueba una vez
  visto = true;
  const aporta = kbGz(h) - kbGz(sinRegistro(h));
  const porEjemplar = aporta / Math.max(ejemplares, 1) * 1024;
  t(`El registro aporta menos de ${TECHO_REGISTRO} KB`, aporta <= TECHO_REGISTRO,
    `aporta ${uno(aporta)} con ${ejemplares} ejemplares`);
  t(`Cada ejemplar pesa menos de ${BYTES_POR_EJEMPLAR} B comprimidos`,
    porEjemplar <= BYTES_POR_EJEMPLAR,
    `${porEjemplar.toFixed(0)} B · algún campo engordó, y engorda en los ${ejemplares}`);
  console.log(`     ${uno(aporta)} de ${TECHO_REGISTRO} KB · ${ejemplares} ejemplares · ` +
              `${porEjemplar.toFixed(0)} B por ejemplar (tope ${BYTES_POR_EJEMPLAR})`);
  console.log(`     al ritmo de hoy, el techo de ${TECHO_REGISTRO} KB se alcanza cerca de ` +
              `${Math.round(TECHO_REGISTRO * 1024 / porEjemplar)} ejemplares`);
}
if (!visto && reg) t('Se pudo medir el registro incrustado', false, 'ninguna página lo lleva; ¿cambió el armado?');

console.log('\nTOTAL:', ok, 'aprobadas ·', mal, 'fallidas');
if (mal) process.exitCode = 1;
