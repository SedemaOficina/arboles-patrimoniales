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
// OJO con el número. El contrato en prosa habla de «las 16 cifras de i-Tree»,
// una frase anterior a los dos cambios de esta versión: salió carbono_kg y
// entró url_itree. Hoy bajo la compuerta hay 16 CAMPOS, pero son 15 cifras más
// la liga de la corrida. Conviene corregir esa frase en el documento.
t('Bajo la compuerta i-Tree van 16 campos: 15 cifras y la liga de la corrida',
  condicionales.length===16, String(condicionales.length));
t('De esos, 15 son cifras', condicionales.filter(c=>c.clave!=='url_itree').length===15);
t('Y todos viven en el bloque de servicios ambientales',
  condicionales.every(c=>/SERVICIOS AMBIENTALES/.test(c.bloque)));
// Si hay cifras tiene que haber liga: es la fuente citable de la tarjeta.
t('La liga de la corrida está bajo la misma compuerta que las cifras',
  condicionales.some(c=>c.clave==='url_itree'));
t('Y el sitio la consume: es lo que sostiene la tarjeta de servicios ambientales',
  C.consumo.linkITree && C.consumo.linkITree.clave==='url_itree');

console.log('\n-- la dirección de la que se lee --');
t('Apunta a un CSV publicado, no al documento',
  /\/spreadsheets\/d\/e\/2PACX-/.test(C.fuente.csv) && /output=csv/.test(C.fuente.csv));
t('Lee una sola hoja', /single=true/.test(C.fuente.csv) && C.fuente.hoja==='Salida_Publica');
// Publicar un CSV publica la pestaña ENTERA. Leer el Listado expondría las
// observaciones internas y el nombre de quien dictamina.
t('Queda advertido que el Listado nunca se lee',
  /Listado/.test(C.fuente.advertencia) && /observaciones internas/.test(C.fuente.advertencia));

console.log('\n-- las reglas que costaron un incidente --');
// El carbono ya no viaja al CSV: publicar las dos unidades sería contar lo
// mismo dos veces. La regla tiene que decir además cómo recuperarlo, para que
// nadie pida la columna de vuelta.
t('El carbono no viaja al CSV y la regla explica por qué',
  C.reglas.some(r=>/carbono_kg ya no viaja/.test(r) && /3\.667/.test(r)));
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

console.log('\n-- pueblo o barrio originario --');
// El vacío dejó de ser un valor legítimo. Si volviera a admitirse, se perdería
// la diferencia entre «no cae en ninguno» y «todavía no se captura».
const pb=C.campos.find(c=>c.clave==='pueblo_barrio');
t('pueblo_barrio ya no admite vacío', pb && pb.presencia==='siempre', pb && pb.presencia);
t('Es catálogo, no texto libre', pb && /Cat[áa]logo/i.test(pb.tipo));
t('Tiene sus dos valores fijos',
  C.catalogos.pueblo_barrio.includes('No aplica') && C.catalogos.pueblo_barrio.includes('Por confirmar'));
t('Está declarado como catálogo ABIERTO: el registro de SEPI crece',
  !!C.catalogos_abiertos && !!C.catalogos_abiertos.pueblo_barrio);
// El sitio no debe llevar copia de la lista: quedaría desactualizada sola.
t('Y queda advertido que el sitio no lleva copia de la lista',
  /NO lleva copia/.test(C.catalogos_abiertos.pueblo_barrio.nota));
t('La fuente del catálogo está nombrada, no inventada',
  /SEPI/.test(C.catalogos_abiertos.pueblo_barrio.fuente));
t('El sitio lo consume y sabe que son tres estados',
  C.consumo['ubicacion.puebloBarrio'] && /tres estados/i.test(C.consumo['ubicacion.puebloBarrio'].nota));
t('Y también publica el suelo de conservación',
  C.consumo['ubicacion.sueloConservacion'] &&
  C.consumo['ubicacion.sueloConservacion'].clave==='suelo_conservacion');

console.log('\n-- los catálogos --');
for (const [n,v] of Object.entries(C.catalogos))
  t(`El catálogo «${n}» trae valores y ninguno vacío`, v.length>0 && v.every(x=>x&&x.trim()));
t('Las 16 alcaldías', C.catalogos.alcaldia.length===16, String(C.catalogos.alcaldia.length));
// La grafía es la de la norma, con acentos: se comparan tal cual.
t('La expectativa de vida lleva acento y la palabra «años»',
  C.catalogos.expectativa_vida[0]==='Más de 40 años');
t('La condición general usa el masculino de la norma',
  C.catalogos.condicion_general.includes('Bueno') && !C.catalogos.condicion_general.includes('Buena'));

console.log('\n-- contra el CSV real, no contra el contrato --');
{
  /* Hasta aquí todo se comprobó contra el propio contrato: coherente, pero
     circular. Esta parte lo confronta con el encabezado que la hoja publica
     de verdad, descargado de Salida_Publica el 21 de agosto de 2026.

     Es una muestra congelada a propósito: una suite que pide el CSV por red
     falla los días que Google tiene un mal día y deja de creerse. Cuando la
     hoja cambie de estructura hay que volver a descargarla, y esa descarga es
     justamente el momento de revisar si el contrato sigue siendo cierto. */
  const crudo = fs.readFileSync('verificar/datos/salida-publica-muestra.csv','utf8');
  const enc = crudo.replace(/^\uFEFF/,'').split(/\r?\n/)[0].split(',');
  t('La hoja publica exactamente 83 columnas', enc.length===83, String(enc.length));
  t('Y son las del contrato, en el mismo orden',
    JSON.stringify(enc)===JSON.stringify(C.campos.map(c=>c.clave)),
    enc.filter((x,i)=>x!==C.campos[i]?.clave).join(', '));
  t('carbono_kg ya no aparece en la hoja', !enc.includes('carbono_kg'));
  t('url_itree sí aparece', enc.includes('url_itree'));
  t('Los encabezados van en minúsculas, sin acentos ni espacios',
    enc.every(k=>/^[a-z0-9_]+$/.test(k)));
}

console.log('\n-- el formato con el que la hoja entrega los datos --');
{
  /* Medido sobre el CSV real con cinco registros de prueba. No son defectos
     del contrato sino de cómo Sheets aplica el formato de PRESENTACIÓN a lo
     que debería salir en crudo. Quedan escritos aquí para que el lector los
     defienda aunque se arreglen en origen: un CSV público lo consume más gente
     que este sitio. */
  const F = C.formato_observado;
  t('Queda registrado con qué se midió', !!F && /Salida_Publica/.test(F.medido));
  // Number("1,240.50") es NaN. Y solo pasa arriba de mil: con cifras pequeñas
  // el defecto es invisible hasta que un ejemplar rebasa los 1000.
  t('Las tres columnas con separador de miles están nombradas',
    F.separador_miles.length===3 && F.separador_miles.includes('beneficio_economico'));
  t('Y se advierte que el defecto solo asoma arriba de mil',
    /invisible/.test(F.nota_separador));
  t('El formato real de las fechas queda documentado',
    F.fechas.fecha_decreto==='dd/mm/aaaa' && /serie/.test(F.fechas.fecha_itree));
  t('El lector tiene regla para el separador de miles',
    C.reglas.some(r=>/separador de miles/.test(r) && /NaN/.test(r)));
  t('Y regla para las fechas que no llegan en ISO',
    C.reglas.some(r=>/dd\/mm\/aaaa/.test(r)));
}

console.log('\n-- las compuertas, comprobadas sobre datos reales --');
{
  const lineas = fs.readFileSync('verificar/datos/salida-publica-muestra.csv','utf8')
    .replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  t('De los cinco registros de prueba, solo cuatro cruzan la compuerta',
    lineas.length-1===4, String(lineas.length-1));
  t('El que está «En evaluación» no aparece', !/Fresno de la Curva/.test(lineas.join('\n')));
  // Con el bloque sin validar las cifras llegan vacías POR DISEÑO.
  const enRevision = lineas.find(l=>/En revisión/.test(l));
  t('Con i-Tree «En revisión» las cifras llegan vacías',
    !!enRevision && /,En revisión,,,,,,/.test(enRevision));
  const noPublicable = lineas.find(l=>/No publicable/.test(l));
  t('Con i-Tree «No publicable», también',
    !!noPublicable && /,No publicable,,,,,,/.test(noPublicable));
  // Los textos con comas y comillas tienen que llegar enteros.
  t('Los textos entrecomillados sobreviven al CSV',
    /Colectivo ""Los Guardianes de Prueba"", A\.C\./.test(lineas.join('\n')));
}

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
