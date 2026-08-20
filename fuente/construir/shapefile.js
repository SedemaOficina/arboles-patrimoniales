/**
 * shapefile.js · Escritor mínimo de shapefile de puntos, en Node.
 *
 * Se escribe a mano y no con una biblioteca por una razón concreta: la capa
 * tiene que regenerarse con cada construcción, a partir del registro vigente.
 * Si el shapefile se produjera aparte —con QGIS o con un guion de Python— se
 * quedaría atrás en silencio la primera vez que cambie un dato, y nadie se
 * enteraría hasta que alguien comparara la capa con el listado.
 *
 * Solo cubre lo que este sitio necesita: geometría de PUNTO, atributos de
 * texto y de número, coordenadas geográficas. No es una biblioteca de uso
 * general y no pretende serlo.
 *
 * El paquete que produce trae los cinco archivos que QGIS y ArcGIS esperan:
 *   .shp  la geometría        .shx  su índice          .dbf  la tabla
 *   .prj  el sistema de referencia                     .cpg  la codificación
 */

/* ---------- ZIP (método «almacenado», sin comprimir) ---------- */

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ TABLA_CRC[(c ^ buf[i]) & 0xFF];
  return (c ^ -1) >>> 0;
}

/**
 * Empaqueta archivos en un ZIP sin compresión.
 * @param {Array<{nombre:string, datos:Buffer}>} archivos
 */
function zip(archivos) {
  const locales = [];
  const central = [];
  let desplazamiento = 0;
  for (const a of archivos) {
    const nombre = Buffer.from(a.nombre, "utf8");
    const crc = crc32(a.datos);
    const enc = Buffer.alloc(30);
    enc.writeUInt32LE(0x04034b50, 0);   // firma de cabecera local
    enc.writeUInt16LE(20, 4);           // versión necesaria
    enc.writeUInt16LE(0, 6);            // banderas
    enc.writeUInt16LE(0, 8);            // método: almacenado
    enc.writeUInt16LE(0, 10);           // hora
    enc.writeUInt16LE(33, 12);          // fecha fija: la del contenido no aporta
    enc.writeUInt32LE(crc, 14);
    enc.writeUInt32LE(a.datos.length, 18);
    enc.writeUInt32LE(a.datos.length, 22);
    enc.writeUInt16LE(nombre.length, 26);
    enc.writeUInt16LE(0, 28);
    locales.push(enc, nombre, a.datos);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8); cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(33, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(a.datos.length, 20);
    cen.writeUInt32LE(a.datos.length, 24);
    cen.writeUInt16LE(nombre.length, 28);
    cen.writeUInt32LE(desplazamiento, 42);
    central.push(cen, nombre);
    desplazamiento += 30 + nombre.length + a.datos.length;
  }
  const cuerpoCentral = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(cuerpoCentral.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, cuerpoCentral, fin]);
}

/* ---------- shapefile de puntos ---------- */

const TIPO_PUNTO = 1;

function cabecera(largoBytes, caja) {
  const b = Buffer.alloc(100);
  b.writeInt32BE(9994, 0);              // código de archivo
  b.writeInt32BE(largoBytes / 2, 24);   // longitud en palabras de 16 bits
  b.writeInt32LE(1000, 28);             // versión
  b.writeInt32LE(TIPO_PUNTO, 32);
  b.writeDoubleLE(caja.xmin, 36); b.writeDoubleLE(caja.ymin, 44);
  b.writeDoubleLE(caja.xmax, 52); b.writeDoubleLE(caja.ymax, 60);
  return b;
}

/**
 * @param {Array<{x:number, y:number, atributos:Object}>} puntos
 * @param {Array<{nombre:string, tipo:'C'|'N', largo:number, dec?:number, de:(a:Object)=>any}>} campos
 *   El nombre NO puede pasar de 10 caracteres: es el límite del formato DBF y
 *   los lectores truncan sin avisar, con lo que dos campos pueden colapsar en
 *   uno solo.
 */
function escribir(puntos, campos) {
  for (const c of campos) {
    if (Buffer.byteLength(c.nombre, "utf8") > 10) {
      throw new Error(`shapefile.js: el campo «${c.nombre}» pasa de 10 bytes; DBF lo truncaría.`);
    }
  }
  const caja = {
    xmin: Math.min(...puntos.map((p) => p.x)), ymin: Math.min(...puntos.map((p) => p.y)),
    xmax: Math.max(...puntos.map((p) => p.x)), ymax: Math.max(...puntos.map((p) => p.y)),
  };

  // --- .shp ---
  const partes = [];
  const indice = [];
  let pos = 50; // en palabras de 16 bits: la cabecera ocupa 50
  puntos.forEach((p, i) => {
    const r = Buffer.alloc(28);
    r.writeInt32BE(i + 1, 0);   // número de registro, base 1
    r.writeInt32BE(10, 4);      // longitud del contenido, en palabras
    r.writeInt32LE(TIPO_PUNTO, 8);
    r.writeDoubleLE(p.x, 12);
    r.writeDoubleLE(p.y, 20);
    partes.push(r);
    indice.push({ pos, largo: 10 });
    pos += 14;                  // 4 de cabecera + 10 de contenido
  });
  const cuerpoShp = Buffer.concat(partes);
  const shp = Buffer.concat([cabecera(100 + cuerpoShp.length, caja), cuerpoShp]);

  // --- .shx ---
  const cuerpoShx = Buffer.alloc(8 * puntos.length);
  indice.forEach((e, i) => {
    cuerpoShx.writeInt32BE(e.pos, i * 8);
    cuerpoShx.writeInt32BE(e.largo, i * 8 + 4);
  });
  const shx = Buffer.concat([cabecera(100 + cuerpoShx.length, caja), cuerpoShx]);

  // --- .dbf ---
  const largoRegistro = 1 + campos.reduce((a, c) => a + c.largo, 0);
  const largoCabecera = 32 + campos.length * 32 + 1;
  const cab = Buffer.alloc(largoCabecera);
  cab[0] = 0x03;
  // Fecha fija: la del día de construcción haría que el archivo cambiara en
  // cada ensamblado aunque los datos fueran idénticos.
  cab[1] = 0; cab[2] = 1; cab[3] = 1;
  cab.writeUInt32LE(puntos.length, 4);
  cab.writeUInt16LE(largoCabecera, 8);
  cab.writeUInt16LE(largoRegistro, 10);
  campos.forEach((c, i) => {
    const o = 32 + i * 32;
    cab.write(c.nombre, o, 11, "utf8");
    cab.write(c.tipo, o + 11, 1, "ascii");
    cab[o + 16] = c.largo;
    cab[o + 17] = c.dec || 0;
  });
  cab[largoCabecera - 1] = 0x0D;

  const filas = puntos.map((p) => {
    const r = Buffer.alloc(largoRegistro, 0x20); // relleno con espacios
    let o = 1;
    for (const c of campos) {
      const v = c.de(p.atributos);
      let txt;
      if (c.tipo === "N") {
        txt = (v === null || v === undefined || !isFinite(v)) ? "" : Number(v).toFixed(c.dec || 0);
        // Los números se alinean a la derecha, que es lo que el formato pide.
        const bytes = Buffer.from(txt, "utf8").subarray(0, c.largo);
        bytes.copy(r, o + c.largo - bytes.length);
      } else {
        txt = v === null || v === undefined ? "" : String(v);
        const bytes = Buffer.from(txt, "utf8");
        // Un campo corto NO se recorta en silencio: se avisa. Truncar sin
        // decirlo es la forma más discreta de publicar un dato equivocado —un
        // domicilio cortado a media calle sigue pareciendo un domicilio—. Si
        // esto salta, el ancho del campo se calcula mal en quien llama.
        if (bytes.length > c.largo) {
          throw new Error(
            `shapefile.js: «${c.nombre}» mide ${c.largo} bytes y el valor necesita `
            + `${bytes.length}: «${txt.slice(0, 40)}…». Ensancha el campo.`);
        }
        bytes.copy(r, o);
      }
      o += c.largo;
    }
    return r;
  });
  const dbf = Buffer.concat([cab, ...filas, Buffer.from([0x1A])]);

  return { shp, shx, dbf };
}

const PRJ_WGS84 =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],'
  + 'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

/** Paquete completo, listo para escribir a disco. */
function paquete(nombre, puntos, campos, leeme) {
  const { shp, shx, dbf } = escribir(puntos, campos);
  const archivos = [
    { nombre: `${nombre}.shp`, datos: shp },
    { nombre: `${nombre}.shx`, datos: shx },
    { nombre: `${nombre}.dbf`, datos: dbf },
    { nombre: `${nombre}.prj`, datos: Buffer.from(PRJ_WGS84, "utf8") },
    { nombre: `${nombre}.cpg`, datos: Buffer.from("UTF-8", "utf8") },
  ];
  if (leeme) archivos.push({ nombre: "LEEME.txt", datos: Buffer.from(leeme, "utf8") });
  return zip(archivos);
}

module.exports = { paquete, zip, crc32 };
