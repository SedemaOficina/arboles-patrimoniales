/* Genera los archivos de datos abiertos como archivos estáticos del sitio.
 *
 * Antes la portada los fabricaba en el navegador: un botón armaba el CSV en
 * memoria y lo entregaba como Blob. Eso tenía tres inconvenientes. El archivo
 * no tenía dirección propia, así que no se podía citar en un oficio ni
 * enlazar desde otro sitio; no existía sin JavaScript; y obligaba a que la
 * página que llevara los botones cargara el registro completo, cosa que la de
 * Recursos no hace.
 *
 * Como archivos estáticos, cada formato tiene su URL estable, se descarga con
 * un enlace normal y la página de Recursos no necesita datos.
 *
 * Ejecutar desde cualquier sitio: se planta solo en fuente/.
 */
process.chdir(__dirname + '/..');
const fs = require('fs');
const path = require('path');

const DESTINO = process.env.DESTINO === 'produccion' ? 'produccion' : 'prueba';
const CARPETA = DESTINO === 'produccion' ? 'docs' : 'prueba';
const SALIDA = path.resolve(__dirname, '..', '..', CARPETA, 'datos') + '/';
fs.mkdirSync(SALIDA, { recursive: true });

const registro = JSON.parse(fs.readFileSync('datos/registro.json', 'utf8'));
const ejemplares = registro.ejemplares || registro;

/* Las columnas del CSV. El orden es el que se publica: primero la identidad,
   luego la ubicación, luego las medidas de campo y al final lo estimado. */
const columnas = [
  ['id', (e) => e.id],
  ['consecutivo', (e) => e.consecutivo],
  ['nombre_asignado', (e) => e.nombreAsignado],
  ['especie', (e) => e.especie],
  ['nombre_comun', (e) => e.nombreComun],
  ['categorias', (e) => (e.categorias || []).join('; ')],
  ['fecha_decreto', (e) => e.fechaDecreto && e.fechaDecreto.iso],
  ['alcaldia', (e) => e.alcaldia],
  ['colonia', (e) => e.ubicacion && e.ubicacion.colonia],
  ['calle', (e) => e.ubicacion && e.ubicacion.calle],
  ['numero', (e) => e.ubicacion && e.ubicacion.numero],
  ['cp', (e) => e.ubicacion && e.ubicacion.cp],
  ['tipo_ubicacion', (e) => e.ubicacion && e.ubicacion.tipo],
  ['latitud', (e) => e.coords && e.coords.lat],
  ['longitud', (e) => e.coords && e.coords.lng],
  ['altura_m', (e) => e.morfologia.altura_m],
  ['diametro_cm', (e) => e.morfologia.diametro_cm],
  ['circunferencia_cm', (e) => e.morfologia.circunferencia_cm],
  ['ancho_copa_m', (e) => e.morfologia.anchoCopa_m],
  ['largo_copa_m', (e) => e.morfologia.largoCopa_m],
  ['extension_copa_m', (e) => e.morfologia.extensionCopa_m],
  ['edad_estimada_anios', (e) => e.edadEstimada],
  ['expectativa_vida', (e) => e.expectativaVida],
  ['categoria_riesgo_uicn', (e) => e.conservacion && e.conservacion.iucn],
  ['carbono_secuestrado_kg_anio', (e) => e.serviciosAmbientales.carbonoSecuestrado_kg],
  ['co2_absorbido_kg_anio', (e) => e.serviciosAmbientales.co2Absorbido_kg],
  ['precipitacion_interceptada_l_anio', (e) => e.serviciosAmbientales.precipitacionInterceptada_L],
  ['escorrentia_reducida_l_anio', (e) => e.serviciosAmbientales.escorrentiaReducida_L],
  ['link_decreto', (e) => e.linkDecreto],
];

/* Comillas dobles y separador de coma: el dialecto que leen Excel y R sin
   configurar nada. El BOM evita que Excel rompa los acentos.
   Un valor que empiece por = + - @ o tabulador lo ejecuta Excel como fórmula
   al abrir el archivo. Se le antepone una comilla simple, que las hojas de
   cálculo interpretan como «esto es texto» y no muestran. */
const esNumero = (v) => typeof v === 'number' && isFinite(v);
const celda = (v) => {
  if (v === null || v === undefined) return '';
  let t = String(v);
  // La comilla NO se le pone a los números. Con la regla anterior toda
  // longitud de la Ciudad de México —siempre negativa— salía como
  // «'-99.188791» y Excel la abría como texto: la columna dejaba de servir
  // para mapear. El riesgo de fórmula existe en los campos de texto, no en
  // una cifra que el propio registro guarda como número.
  if (!esNumero(v) && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

const csv = '﻿' + [columnas.map((c) => c[0]).join(',')]
  .concat(ejemplares.map((e) => columnas.map(([, f]) => celda(f(e))).join(',')))
  .join('\r\n') + '\r\n';

/* El JSON no lleva marca de tiempo de generación: haría que el archivo
   cambiara en cada construcción aunque los datos fueran idénticos, y cada
   construcción aparecería como una modificación en el control de versiones.
   La fecha que importa es la del registro, no la del ensamblado. */
const json = JSON.stringify({
  nombre: 'Árboles patrimoniales de la Ciudad de México',
  fuente: 'Secretaría del Medio Ambiente de la Ciudad de México',
  licencia: 'Uso libre citando la fuente',
  total: ejemplares.length,
  ejemplares,
}, null, 2) + '\n';

const NOMBRE = 'arboles-patrimoniales-cdmx';
fs.writeFileSync(SALIDA + NOMBRE + '.csv', csv);
fs.writeFileSync(SALIDA + NOMBRE + '.json', json);

const kb = (t) => Math.max(1, Math.round(Buffer.byteLength(t) / 1024));
console.log(DESTINO + '/datos/' + NOMBRE + '.csv ·', kb(csv), 'KB ·', ejemplares.length, 'renglones');
console.log(DESTINO + '/datos/' + NOMBRE + '.json ·', kb(json), 'KB');
