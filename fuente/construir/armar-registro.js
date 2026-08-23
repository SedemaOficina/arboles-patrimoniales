/* REGENERA EL CONGELADO DESDE LA HOJA
 * ---------------------------------------------------------------------------
 * datos/registro.json es el piso del sitio: se incrusta en cada página y es lo
 * que se ve mientras la capa en vivo llega, y lo único que se ve si Google
 * falla. Hasta ahora ese archivo se hizo a mano una vez y nadie lo volvió a
 * tocar, de modo que envejecía en silencio: el día que la hoja no respondiera,
 * el sitio habría mostrado un padrón viejo sin que nadie se enterara.
 *
 * Este paso lo regenera desde la misma hoja publicada que lee el navegador.
 *
 * NO FORMA PARTE DE construir.sh, y es a propósito: armar el sitio no puede
 * depender de la red. Se corre a mano cuando el equipo capturó algo:
 *
 *     node construir/armar-registro.js            → informa, no escribe
 *     node construir/armar-registro.js --escribir → reescribe registro.json
 *
 * Después hay que construir, como siempre. Un registro nuevo sin construir no
 * cambia el sitio publicado.
 */
process.chdir(__dirname + '/..');
const fs = require('fs');

const ESCRIBIR = process.argv.includes('--escribir');
const RUTA = 'datos/registro.json';

(async () => {
  const contrato = JSON.parse(fs.readFileSync('datos/contrato-v2.json', 'utf8'));
  /* La dirección vive en el contrato, no aquí. Es el documento que revisa el
     área de datos: si la hoja cambia de sitio, se cambia ahí y este paso lo
     sigue solo. */
  const url = contrato.fuente && contrato.fuente.csv;
  if (!url) {
    console.error('El contrato no declara la dirección del CSV (fuente.csv). No hay de dónde bajar el registro.');
    process.exit(1);
  }

  const L = await import('../padron/lector-v2.js');

  console.log('Bajando la hoja publicada…');
  let texto;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    texto = await res.text();
  } catch (err) {
    console.error('No se pudo bajar el CSV: ' + err.message);
    console.error('El congelado se queda como está. Vuelve a intentarlo o revisa la publicación de la hoja.');
    process.exit(1);
  }
  if (/^\s*<(!doctype|html)/i.test(texto)) {
    console.error('Google devolvió HTML en lugar del CSV. Revisa que la hoja siga publicada en la web.');
    process.exit(1);
  }

  const registro = L.construirRegistro(texto, contrato);
  const nuevos = registro.ejemplares;

  console.log(`Filas leídas: ${registro.meta.filasLeidas} · ejemplares con id: ${nuevos.length}`);
  if (registro.meta.columnasFaltantes.length) {
    console.log('  ⚠ Columnas del contrato que la hoja no trae: ' + registro.meta.columnasFaltantes.join(', '));
  }
  if (registro.meta.columnasNoReconocidas.length) {
    console.log('  ⚠ Columnas que el contrato no conoce: ' + registro.meta.columnasNoReconocidas.join(', '));
  }
  registro.meta.advertencias.forEach((a) => console.log('  ⚠ ' + a));

  /* LA GUARDIA. Un registro vacío no sustituye a uno lleno.
     Es el mismo criterio que aplica el navegador con la capa en vivo, escrito
     aquí para que tampoco se pueda vaciar el congelado por accidente. */
  if (!nuevos.length) {
    console.error('');
    console.error('La hoja no trae ningún ejemplar con id. NO se reescribe ' + RUTA + '.');
    console.error('Si esto te sorprende, revisa que haya filas con el estado «Publicado» en el padrón.');
    process.exit(1);
  }

  // Qué cambia respecto de lo que hoy está publicado.
  let antes = { ejemplares: [] };
  try { antes = JSON.parse(fs.readFileSync(RUTA, 'utf8')); } catch (e) {}
  const porId = (lista) => new Map((lista || []).map((e) => [e.id, e]));
  const A = porId(antes.ejemplares), B = porId(nuevos);
  const altas = [...B.keys()].filter((k) => !A.has(k));
  const bajas = [...A.keys()].filter((k) => !B.has(k));
  const cambios = [...B.keys()].filter(
    (k) => A.has(k) && JSON.stringify(A.get(k)) !== JSON.stringify(B.get(k)));

  console.log('');
  console.log(`Contra el congelado actual: ${altas.length} alta(s), ${bajas.length} baja(s), ${cambios.length} modificado(s).`);
  if (altas.length) console.log('  + ' + altas.join(', '));
  if (bajas.length) console.log('  - ' + bajas.join(', '));
  if (cambios.length) console.log('  ~ ' + cambios.join(', '));

  /* Una baja no es un cambio menor: significa que un ejemplar declarado
     patrimonial dejó de aparecer en el registro público. Puede ser correcto
     —una baja por pérdida del ejemplar— pero nunca debe pasar inadvertido. */
  if (bajas.length) {
    console.log('');
    console.log('⚠ Hay ejemplares que estaban y ya no vienen. Confirma que sea deliberado antes de escribir.');
  }

  if (!ESCRIBIR) {
    console.log('');
    console.log('Informe solamente. Para reescribir el congelado: node construir/armar-registro.js --escribir');
    return;
  }

  fs.writeFileSync(RUTA, JSON.stringify(registro, null, 2) + '\n');
  console.log('');
  console.log(RUTA + ' reescrito con ' + nuevos.length + ' ejemplares.');
  console.log('Falta construir: fuente/construir/construir.sh   (y «produccion» cuando toque publicar).');
})();
