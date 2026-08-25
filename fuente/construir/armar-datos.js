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
  /* El carbono elemental ya no se publica: el padrón v2 lo captura y no lo
     exporta, y el CO2 equivalente de la siguiente columna es esa misma
     cantidad multiplicada por 3.667. Quien necesite el carbono lo obtiene
     dividiendo; publicar las dos columnas invitaba a sumarlas. */
  ['co2_absorbido_kg_anio', (e) => e.serviciosAmbientales.co2Absorbido_kg],
  ['precipitacion_interceptada_l_anio', (e) => e.serviciosAmbientales.precipitacionInterceptada_L],
  ['escorrentia_reducida_l_anio', (e) => e.serviciosAmbientales.escorrentiaReducida_L],
  ['link_decreto', (e) => e.linkDecreto],
];


/* EL DICCIONARIO DE DATOS.
   Publicar el CSV sin decir qué significa cada columna no es publicar datos
   abiertos: es publicar una descarga. Quien la baje tiene que adivinar si
   `diametro_cm` es el diámetro del tronco o el de la copa, y si las cifras de
   servicios ambientales son medidas o estimadas.
   Se genera aquí, junto al CSV que describe, para que no puedan separarse: si
   se agrega una columna arriba y no se describe abajo, el armado falla. */
const DICCIONARIO = {
  'id': ['Identificador único del ejemplar en el registro.', 'texto', '', 'Registro'],
  'consecutivo': ['Número consecutivo dentro del registro.', 'texto', '', 'Registro'],
  'nombre_asignado': ['Nombre con el que se conoce al ejemplar.', 'texto', '', 'Registro'],
  'especie': ['Nombre científico validado de la especie.', 'texto', '', 'Taxonomía validada'],
  'nombre_comun': ['Nombre común de la especie.', 'texto', '', 'Taxonomía validada'],
  'categorias': ['Categorías patrimoniales del ejemplar, separadas por punto y coma. Vacío si la declaratoria está en trámite.', 'texto', '', 'Decreto'],
  'fecha_decreto': ['Fecha del decreto que lo declara patrimonial. Vacío si está en trámite.', 'fecha', 'AAAA-MM-DD', 'Decreto'],
  'alcaldia': ['Alcaldía donde se encuentra.', 'texto', '', 'Ubicación de campo'],
  'colonia': ['Colonia donde se encuentra.', 'texto', '', 'Ubicación de campo'],
  'calle': ['Calle del domicilio del ejemplar.', 'texto', '', 'Ubicación de campo'],
  'numero': ['Número del domicilio. S/N cuando no lo tiene.', 'texto', '', 'Ubicación de campo'],
  'cp': ['Código postal.', 'texto', '', 'Ubicación de campo'],
  'tipo_ubicacion': ['Tipo de espacio donde está: parque, camellón, plaza, predio.', 'texto', '', 'Ubicación de campo'],
  'latitud': ['Latitud en grados decimales.', 'número', 'grados (WGS 84, EPSG:4326)', 'Medición de campo'],
  'longitud': ['Longitud en grados decimales.', 'número', 'grados (WGS 84, EPSG:4326)', 'Medición de campo'],
  'altura_m': ['Altura total del ejemplar.', 'número', 'metros', 'Medición de campo'],
  'diametro_cm': ['Diámetro del tronco a la altura del pecho (DAP).', 'número', 'centímetros', 'Medición de campo'],
  'circunferencia_cm': ['Circunferencia del tronco a la altura del pecho.', 'número', 'centímetros', 'Medición de campo'],
  'ancho_copa_m': ['Ancho de la copa.', 'número', 'metros', 'Medición de campo'],
  'largo_copa_m': ['Largo de la copa.', 'número', 'metros', 'Medición de campo'],
  'extension_copa_m': ['Extensión total de la copa.', 'número', 'metros', 'Medición de campo'],
  'edad_estimada_anios': ['Edad estimada. Vacío en la mayoría: solo se llena cuando hay dictamen.', 'número', 'años', 'Dictamen técnico'],
  'expectativa_vida': ['Expectativa de vida del ejemplar según su condición.', 'texto', '', 'Dictamen técnico'],
  'categoria_riesgo_uicn': ['Categoría de riesgo de la especie en la Lista Roja de la UICN.', 'texto', '', 'UICN'],
  'co2_absorbido_kg_anio': ['Dióxido de carbono absorbido al año. ESTIMACIÓN, no medición. Es el carbono elemental multiplicado por 3.667; no se publican las dos columnas para no invitar a sumarlas.', 'número', 'kilogramos al año', 'Estimación i-Tree'],
  'precipitacion_interceptada_l_anio': ['Precipitación interceptada por la copa al año. ESTIMACIÓN, no medición.', 'número', 'litros al año', 'Estimación i-Tree'],
  'escorrentia_reducida_l_anio': ['Escorrentía superficial evitada al año. ESTIMACIÓN, no medición.', 'número', 'litros al año', 'Estimación i-Tree'],
  'link_decreto': ['Nombre del archivo del decreto, o su dirección. Vacío mientras no esté publicado.', 'texto', '', 'Decreto'],
};

const columnasSinDescribir = columnas.map(([n]) => n).filter((n) => !DICCIONARIO[n]);
if (columnasSinDescribir.length) {
  throw new Error('armar-datos.js: estas columnas del CSV no están en el diccionario: '
    + columnasSinDescribir.join(', ') + '. Descríbelas antes de publicarlas.');
}

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
/* El diccionario viaja como CSV, igual que los datos que describe: se abre en
   la misma hoja de cálculo, se lee sin herramientas y se puede citar aparte. */
const diccionario = '\ufeff' + ['columna,descripcion,tipo,unidad,origen']
  .concat(columnas.map(([n]) => {
    const [desc, tipo, unidad, origen] = DICCIONARIO[n];
    return [n, desc, tipo, unidad, origen].map(celda).join(',');
  })).join('\r\n') + '\r\n';
fs.writeFileSync(SALIDA + 'diccionario-de-datos.csv', diccionario);
console.log(DESTINO + '/datos/diccionario-de-datos.csv ·', columnas.length, 'columnas descritas');

fs.writeFileSync(SALIDA + NOMBRE + '.csv', csv);
fs.writeFileSync(SALIDA + NOMBRE + '.json', json);

const kb = (t) => Math.max(1, Math.round(Buffer.byteLength(t) / 1024));
console.log(DESTINO + '/datos/' + NOMBRE + '.csv ·', kb(csv), 'KB ·', ejemplares.length, 'renglones');
console.log(DESTINO + '/datos/' + NOMBRE + '.json ·', kb(json), 'KB');
