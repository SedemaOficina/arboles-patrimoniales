import fs from 'fs';
/* Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
   solas en fuente/ para poder ejecutarse desde cualquier sitio. */
process.chdir(new URL('..', import.meta.url).pathname);
let ok=0, mal=0;
const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };

console.log('\n══ CONTRATO DE DATOS · padrón v2 ══');

/* POR QUÉ EXISTE ESTA SUITE.
   El sitio va a dejar de leer un archivo congelado del repositorio para leer
   una hoja que un equipo edita todos los días. Un campo que se renombra allá
   no rompe el sitio: lo VACÍA. La clave no se encuentra, devuelve cadena
   vacía, y una cadena vacía se dibuja como una ficha sin ese dato. Nadie se
   entera hasta que lo nota un ciudadano.

   El contrato convierte esa deriva silenciosa en un error de construcción. */

const C = JSON.parse(fs.readFileSync('datos/contrato-v2.json','utf8'));
const claves = C.campos.map(c=>c.clave);
const juego = new Set(claves);

console.log('\n-- el contrato es coherente consigo mismo --');
t('Declara los 83 campos de la salida pública', C.campos.length===83, String(C.campos.length));
t('Ninguna clave está repetida', juego.size===C.campos.length);
t('Las claves son minúsculas, sin acentos ni espacios',
  claves.every(k=>/^[a-z0-9_]+$/.test(k)), claves.filter(k=>!/^[a-z0-9_]+$/.test(k)).join(', '));
t('El orden va de 1 a 83 sin huecos',
  C.campos.map(c=>c.orden).sort((a,b)=>a-b).every((n,i)=>n===i+1));
t('Cada campo declara bloque, tipo y presencia',
  C.campos.every(c=>c.bloque&&c.tipo&&c.presencia));
t('Los nueve bloques del padrón están representados',
  new Set(C.campos.map(c=>c.bloque)).size===9);

console.log('\n-- el consumo del sitio apunta a campos que existen --');
const consumidas=new Set();
const rotas=[];
for (const [interno,v] of Object.entries(C.consumo)) {
  for (const k of [v.clave, ...(v.claves_extra||[])].filter(Boolean)) {
    consumidas.add(k);
    if (!juego.has(k)) rotas.push(`${interno} → ${k}`);
  }
}
t('Ninguna clave consumida falta del contrato', rotas.length===0, rotas.join(' · '));
t('Todo campo interno declara origen: clave, derivado o retirado',
  Object.entries(C.consumo).every(([,v])=>v.clave||v.derivado||v.retirado),
  Object.entries(C.consumo).filter(([,v])=>!(v.clave||v.derivado||v.retirado)).map(([k])=>k).join(', '));
t('Todo campo retirado explica por qué',
  Object.values(C.consumo).filter(v=>v.retirado).every(v=>v.nota&&v.nota.length>30));
t('Todo campo derivado explica de dónde sale',
  Object.values(C.consumo).filter(v=>v.derivado).every(v=>v.nota&&v.nota.length>20));

console.log('\n-- lo que el padrón publica y el sitio no dibuja --');
const sin = claves.filter(k=>!consumidas.has(k));
t('La lista de campos sin consumo está al día',
  JSON.stringify(sin)===JSON.stringify(C.sin_consumo.claves),
  `calculado ${sin.length}: ${sin.join(', ')}`);
console.log(`     (${sin.length} campos disponibles y no publicados: ${sin.join(', ')})`);

console.log('\n-- las dos compuertas --');
t('La compuerta del ejemplar es estado = Publicado',
  C.compuertas.ejemplar.campo==='estado' && C.compuertas.ejemplar.publica_si==='Publicado');
t('La compuerta ambiental es validacion_itree = Validado',
  C.compuertas.itree.campo==='validacion_itree' && C.compuertas.itree.publica_si==='Validado');
t('Los dos campos de compuerta se consumen',
  consumidas.has('estado') && consumidas.has('validacion_itree'));
t('Los valores de las compuertas existen en su catálogo',
  C.catalogos.estado.includes(C.compuertas.ejemplar.publica_si)
  && C.catalogos.validacion_itree.includes(C.compuertas.itree.publica_si));
// Las 16 cifras ambientales tienen que estar marcadas como condicionales: si
// alguna se declarara "siempre", el sitio la trataría como dato faltante
// cuando en realidad la compuerta la está reteniendo a propósito.
const condicionales=C.campos.filter(c=>/i-Tree Validado/.test(c.presencia));
t('Las 16 cifras ambientales se declaran condicionales', condicionales.length===16, String(condicionales.length));
t('Y todas viven en el bloque de servicios ambientales',
  condicionales.every(c=>/SERVICIOS AMBIENTALES/.test(c.bloque)));

console.log('\n-- la dirección de la que se lee --');
t('Apunta a un CSV publicado, no al documento',
  /\/spreadsheets\/d\/e\/2PACX-/.test(C.fuente.csv) && /output=csv/.test(C.fuente.csv));
t('Lee una sola hoja', /single=true/.test(C.fuente.csv) && C.fuente.hoja==='Salida_Publica');
// Publicar un CSV publica la pestaña ENTERA. Leer el Listado expondría las
// observaciones internas y el nombre de quien dictamina.
t('Queda advertido que el Listado nunca se lee',
  /Listado/.test(C.fuente.advertencia) && /observaciones internas/.test(C.fuente.advertencia));

console.log('\n-- las reglas que costaron un incidente --');
t('No sumar el CO₂ equivalente al carbono',
  C.reglas.some(r=>/3\.667/.test(r) && /no sumarlo/i.test(r)));
t('No publicar el beneficio económico sin su moneda',
  C.reglas.some(r=>/moneda_itree/.test(r)));
t('Descartar la fila sin id',
  C.reglas.some(r=>/id venga vacío/.test(r)));
t('No dibujar una cifra fuera de rango plausible',
  C.reglas.some(r=>/plausible/.test(r)));
// El carbono sale de la salida pública por decisión: la unidad que se publica
// es el CO₂ equivalente, que es la de la convención internacional.
t('El carbono queda declarado como retirado de la salida pública',
  C.consumo['serviciosAmbientales.carbonoSecuestrado_kg'].retirado===true);
t('Y el CO₂ equivalente queda declarado como derivado, no como medición',
  /No es medición independiente/.test(C.consumo['serviciosAmbientales.co2Absorbido_kg'].nota||''));

console.log('\n-- los catálogos --');
for (const [n,v] of Object.entries(C.catalogos))
  t(`El catálogo «${n}» trae valores y ninguno vacío`, v.length>0 && v.every(x=>x&&x.trim()));
t('Las 16 alcaldías', C.catalogos.alcaldia.length===16, String(C.catalogos.alcaldia.length));
// La grafía es la de la norma, con acentos: se comparan tal cual.
t('La expectativa de vida lleva acento y la palabra «años»',
  C.catalogos.expectativa_vida[0]==='Más de 40 años');
t('La condición general usa el masculino de la norma',
  C.catalogos.condicion_general.includes('Bueno') && !C.catalogos.condicion_general.includes('Buena'));

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
