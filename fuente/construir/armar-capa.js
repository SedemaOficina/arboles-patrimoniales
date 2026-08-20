/**
 * armar-capa.js · La capa geográfica del inventario, para SIG.
 *
 * Publica los ejemplares del registro como capa de puntos en los tres formatos
 * que pide cualquiera que quiera trabajarlos en QGIS, ArcGIS o Google Earth:
 * GeoJSON, KML y shapefile comprimido.
 *
 * Se genera en cada construcción, desde el mismo registro que alimenta al
 * sitio. Producirla aparte —exportando a mano desde un SIG— la dejaría atrás
 * en silencio la primera vez que cambie un dato.
 *
 * Los ejemplares SIN coordenada capturada no entran: una capa con puntos en
 * el origen del sistema es peor que una capa incompleta que dice cuántos trae.
 */
process.chdir(__dirname + '/..');
const fs = require('fs');
const path = require('path');
const { paquete } = require('./shapefile.js');

const DESTINO = process.env.DESTINO === 'produccion' ? 'produccion' : 'prueba';
const CARPETA = DESTINO === 'produccion' ? 'docs' : 'prueba';
const SALIDA = path.resolve(__dirname, '..', '..', CARPETA, 'datos') + '/';
fs.mkdirSync(SALIDA, { recursive: true });

const registro = JSON.parse(fs.readFileSync('datos/registro.json', 'utf8'));
const todos = registro.ejemplares || registro;
const conCoords = todos.filter((e) => e.coords && isFinite(e.coords.lat) && isFinite(e.coords.lng));

const NOMBRE = 'arboles-patrimoniales-cdmx';
const u = (e) => e.ubicacion || {};
const m = (e) => e.morfologia || {};

/* Los atributos que viajan con cada punto. El nombre del campo se limita a
   diez caracteres porque es el tope del formato DBF; el rótulo largo va en el
   LEEME y en el GeoJSON, que no tiene ese límite. */
const CAMPOS = [
  { nombre: 'ID',        largo: 30, tipo: 'C', rotulo: 'Identificador en el registro', de: (e) => e.id },
  { nombre: 'CONSEC',    largo: 6,  tipo: 'C', rotulo: 'Consecutivo',                  de: (e) => e.consecutivo },
  { nombre: 'NOMBRE',    largo: 80, tipo: 'C', rotulo: 'Nombre asignado',              de: (e) => e.nombreAsignado },
  { nombre: 'ESPECIE',   largo: 60, tipo: 'C', rotulo: 'Especie',                      de: (e) => e.especie },
  { nombre: 'N_COMUN',   largo: 40, tipo: 'C', rotulo: 'Nombre común',                 de: (e) => e.nombreComun },
  { nombre: 'CATEGORIA', largo: 60, tipo: 'C', rotulo: 'Categorías declaradas',        de: (e) => (e.categorias || []).join('; ') },
  { nombre: 'F_DECRETO', largo: 10, tipo: 'C', rotulo: 'Fecha del decreto',            de: (e) => e.fechaDecreto && e.fechaDecreto.iso },
  { nombre: 'ALCALDIA',  largo: 40, tipo: 'C', rotulo: 'Alcaldía',                     de: (e) => e.alcaldia },
  { nombre: 'COLONIA',   largo: 60, tipo: 'C', rotulo: 'Colonia',                      de: (e) => u(e).colonia },
  { nombre: 'DOMICILIO', largo: 90, tipo: 'C', rotulo: 'Calle y número',               de: (e) => [u(e).calle, u(e).numero].filter(Boolean).join(' ') },
  { nombre: 'TIPO_UBIC', largo: 30, tipo: 'C', rotulo: 'Tipo de ubicación',            de: (e) => u(e).tipo },
  { nombre: 'ALTURA_M',  largo: 8,  tipo: 'N', dec: 1, rotulo: 'Altura en metros',      de: (e) => m(e).altura_m },
  { nombre: 'DAP_CM',    largo: 9,  tipo: 'N', dec: 1, rotulo: 'Diámetro del tronco en centímetros', de: (e) => m(e).diametro_cm },
  { nombre: 'COPA_M',    largo: 8,  tipo: 'N', dec: 1, rotulo: 'Extensión promedio de copa en metros', de: (e) => m(e).extensionCopa_m },
  { nombre: 'EDAD_ANIO', largo: 6,  tipo: 'N', dec: 0, rotulo: 'Edad estimada en años', de: (e) => e.edadEstimada },
  { nombre: 'RIESGO', largo: 40, tipo: 'C', rotulo: 'Categoría de riesgo UICN de la especie', de: (e) => e.conservacion && e.conservacion.iucn },
];

const props = (e) => {
  const o = {};
  for (const c of CAMPOS) {
    const v = c.de(e);
    o[c.nombre] = v === undefined || v === '' ? null : v;
  }
  return o;
};

/* ---------- GeoJSON ---------- */
const geojson = {
  type: 'FeatureCollection',
  name: NOMBRE,
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  features: conCoords.map((e) => ({
    type: 'Feature',
    properties: props(e),
    geometry: { type: 'Point', coordinates: [e.coords.lng, e.coords.lat] },
  })),
};
fs.writeFileSync(SALIDA + NOMBRE + '.geojson', JSON.stringify(geojson, null, 1) + '\n');

/* ---------- KML ---------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const kml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n'
  + '<name>Árboles patrimoniales de la Ciudad de México</name>\n'
  + '<description>Capa de puntos del registro de árboles patrimoniales. Fuente: Secretaría del Medio Ambiente de la Ciudad de México.</description>\n'
  + conCoords.map((e) => {
    const p = props(e);
    const datos = CAMPOS.map((c) =>
      `<Data name="${esc(c.nombre)}"><displayName>${esc(c.rotulo)}</displayName>`
      + `<value>${esc(p[c.nombre])}</value></Data>`).join('');
    return `<Placemark><name>${esc(e.nombreAsignado || 'Sin nombre asignado')}</name>`
      + `<description>${esc(e.especie || '')}</description>`
      + `<ExtendedData>${datos}</ExtendedData>`
      + `<Point><coordinates>${e.coords.lng},${e.coords.lat},0</coordinates></Point></Placemark>`;
  }).join('\n')
  + '\n</Document></kml>\n';
fs.writeFileSync(SALIDA + NOMBRE + '.kml', kml);

/* ---------- shapefile comprimido ---------- */
const omitidos = todos.length - conCoords.length;
const leeme = [
  'Árboles patrimoniales de la Ciudad de México · capa de puntos',
  '='.repeat(60), '',
  'Fuente: Secretaría del Medio Ambiente de la Ciudad de México.',
  'Uso libre citando la fuente.', '',
  `Ejemplares en la capa: ${conCoords.length} de ${todos.length} del registro.`,
  omitidos ? `${omitidos} no traen coordenada capturada y por eso no aparecen.` : 'Todos traen coordenada capturada.',
  '',
  'Sistema de referencia: WGS 84 geográficas (EPSG:4326).',
  'Codificación de la tabla: UTF-8 (ver el archivo .cpg).', '',
  'CAMPOS', '-'.repeat(60),
  ...CAMPOS.map((c) => `  ${c.nombre.padEnd(11)}${c.tipo === 'N' ? '(número)' : '(texto) '}  ${c.rotulo}`),
  '',
  'Un campo vacío significa que el dato no aplica o no fue posible',
  'determinarlo al momento del registro.',
].join('\n') + '\n';

const puntos = conCoords.map((e) => ({ x: e.coords.lng, y: e.coords.lat, atributos: e }));

/* El ancho de cada campo de texto se mide sobre los datos, no se adivina.
   Escrito a mano, el primer domicilio largo que entre al registro se publicaría
   cortado a media calle —y seguiría pareciendo un domicilio—. El tope de 254
   es el del formato DBF; el mínimo de 8 evita columnas de un byte. */
const anchos = CAMPOS.map((c) => {
  if (c.tipo !== 'C') return c;
  const mayor = conCoords.reduce((max, e) => {
    const v = c.de(e);
    return Math.max(max, v === null || v === undefined ? 0 : Buffer.byteLength(String(v), 'utf8'));
  }, 0);
  return { ...c, largo: Math.min(254, Math.max(8, mayor)) };
});

fs.writeFileSync(SALIDA + NOMBRE + '-shp.zip', paquete(NOMBRE, puntos, anchos, leeme));

const kb = (f) => Math.max(1, Math.round(fs.statSync(SALIDA + f).size / 1024));
for (const f of [NOMBRE + '.geojson', NOMBRE + '.kml', NOMBRE + '-shp.zip']) {
  console.log(`${DESTINO}/datos/${f} ·`, kb(f), 'KB');
}
console.log(`  ${conCoords.length} de ${todos.length} ejemplares con coordenada`);
