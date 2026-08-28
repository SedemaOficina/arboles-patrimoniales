/* EL PADRÓN QUE VIAJA CON LA PÁGINA
 * ---------------------------------------------------------------------------
 * El lector del CSV, la capa que va por él y el contrato recortado. Los tres
 * los necesitan por igual la portada y la ficha, y hasta el 28 de agosto de
 * 2026 solo los armaba armar.js: la portada leía la hoja publicada y la ficha
 * se quedaba con el registro congelado. Mientras la hoja estuvo vacía eso no
 * se notaba; en cuanto trajo datos, dos páginas del mismo sitio podían decir
 * cosas distintas del mismo árbol.
 *
 * Vive aquí y no duplicado en los dos armadores porque el recorte del contrato
 * es una decisión con criterio —qué necesita el navegador y qué no— y dos
 * copias divergen el día que alguien toque una.
 *
 * No viaja al sitio: es parte del armado.
 */
const fs = require('fs');
const ALIGERAR = require('./aligerar.js');

/** Convierte un módulo con `export` en un bloque autocontenido que publica lo
 *  que se le pide en `window`. Falla si el módulo dejó de definir algo. */
function envolver(archivo, expuestos) {
  const src = ALIGERAR.aligerarJS(fs.readFileSync(archivo, 'utf8'))
    .replace(/^export const /gm, 'const ')
    .replace(/^export function /gm, 'function ')
    .replace(/^export /gm, '');
  for (const n of expuestos) {
    if (!new RegExp(`(const|let|function|class)\\s+${n}\\b`).test(src)) {
      throw new Error(`padron-embebido.js: ${archivo} ya no define «${n}»; actualiza la lista de exposición.`);
    }
  }
  return `;(function(){\n${src}\n${expuestos.map((n) => `window.${n}=${n};`).join('')}\n})();`;
}

/** El lector del CSV. */
const lector = envolver('padron/lector-v2.js', ['construirRegistro']);

/* La capa que pide la hoja. Expone también FUENTE_VIVA_ACTIVA —el interruptor,
   que vive ahí y no en logica.js justamente para que la portada y la ficha
   obedezcan al mismo— y CLAVE_CACHE, para que apagarlo pueda olvidar lo
   guardado sin escribir la clave a mano en dos archivos. */
const viva = envolver('padron/fuente-viva.js',
  ['cargarEnVivo', 'hayCambio', 'CSV_URL', 'CLAVE_CACHE', 'FUENTE_VIVA_ACTIVA'])
  .replace(/^import .*lector-v2.js";$/m, '');

/* EL CONTRATO, RECORTADO.
   El lector solo necesita dos cosas del contrato: las claves de las columnas
   —para saber qué trae la hoja y qué le falta— y los rangos plausibles de
   cada medida. El documento completo pesa 47 KB y lleva catálogos, notas y
   procedencia que le sirven a quien lo revisa, no al navegador. */
const _contrato = JSON.parse(fs.readFileSync('datos/contrato-v2.json', 'utf8'));
const _rangos = {};
for (const [k, v] of Object.entries(_contrato.rangos)) {
  // Las notas en prosa son para quien revisa el documento, no para el
  // navegador: viajan los números y de dónde salen.
  if (k.startsWith('_')) continue;
  _rangos[k] = { min: v.min, max: v.max, de: v.de };
}
const contratoMin = JSON.stringify({
  campos: _contrato.campos.map((c) => ({ clave: c.clave })),
  rangos: _rangos,
});

module.exports = { envolver, lector, viva, contratoMin };
