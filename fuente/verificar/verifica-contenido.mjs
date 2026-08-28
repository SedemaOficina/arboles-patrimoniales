import fs from 'fs';
import { fileURLToPath } from 'url';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const PRUEBA = '../prueba/';
let ok=0,mal=0; const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };
console.log('\n══ SECCIONES NUEVAS Y CITAS ══');
for(const f of [PRUEBA+'portada-vista-previa.html']){
  const s=fs.readFileSync(f,'utf8');
  t(f+' · sección «patrimonial no es intocable»', /id="cuidado"/.test(s)&&/Patrimonial no quiere decir intocable/.test(s));
  t(f+' · cita el numeral 6 sobre mantenimiento', /NADF-001-RNAT-2015, numeral 6\./.test(s)&&/potencian los servicios ambientales/.test(s));
  t(f+' · cita el límite de 25 % del follaje', /no puede superar el 25 % del follaje/.test(s)&&/numeral 6\.1\.8/.test(s));
  /* CAMBIÓ EL CRITERIO el 28 de agosto de 2026, por decisión del área: la
     tarjeta de por qué un árbol grande necesita atención perdió su cita —las
     cinco causas del numeral 6.3—. Lo que se sigue exigiendo es que la sección
     de cuidado NO quede sin fundamento: los dos numerales que sostienen lo que
     sí afirma —el mantenimiento del 6 y el límite del 25 % del 6.1.8— tienen
     que seguir citados. Una sección de cuidado sin ninguna cita sería una
     opinión de la Secretaría sobre cómo podar. */
  t(f+' · la sección de cuidado conserva sus citas normativas',
    /numeral 6\./.test(s) && /numeral 6\.1\.8/.test(s) && /NADF-001-RNAT-2015/.test(s));
  t(f+' · advierte sobre el desmoche con su numeral', /desmoche/.test(s)&&/numeral 6\.4\.2\.1\.6/.test(s));
  t(f+' · dice qué sí está prohibido', /sin autorización y sin dictamen técnico/.test(s));
  t(f+' · canaliza la denuncia a la PAOT', /Procuraduría Ambiental y del Ordenamiento Territorial/.test(s)&&/55 5265 0780/.test(s));

  t(f+' · sección para proponer un árbol', /id="postula"/.test(s));
  t(f+' · estado de la convocatoria: cerrada', /data-estado="cerrada"/.test(s)&&/La convocatoria está cerrada por ahora/.test(s));
  t(f+' · el botón está deshabilitado', /<button[^>]*disabled[^>]*aria-disabled="true"[^>]*>Convocatoria cerrada/.test(s));
  t(f+' · dice que la convocatoria es anual', /convocatoria cada año/.test(s));
  /* SE RETIRÓ LA SECUENCIA DE POSTULACIÓN el 28 de agosto de 2026, por
     decisión del área: la sección solo anuncia el estado de la convocatoria.
     Con ella se fueron de la portada el artículo 54 —quién puede promover—,
     el 55 —qué lleva la solicitud—, el 56 —el dictamen en 60 días— y el 57.
     Se voltean las comprobaciones en vez de borrarlas: lo que hay que impedir
     ahora es que la secuencia vuelva a medias. */
  t(f+' · la secuencia de postulación se retiró entera',
    !/class="linea__hito"/.test(s) && !/artículo 54/.test(s)
    && !/Confirma que el árbol califica/.test(s)
    && !/Comisión Interinstitucional del Patrimonio Cultural/.test(s));
  t(f+' · el plan de manejo viaja con el dictamen', /plan de manejo/.test(s));
  // El bloque de predio privado se retiró por decisión editorial.
  t(f+' · el bloque de predio privado ya no está', !/titularidad del predio/.test(s));
  // Por decisión editorial se retiró el bloque «¿Qué gana el árbol con la
  // Declaratoria?», el párrafo de recurso de revisión y revocación, y el
  // párrafo del artículo 62 en el bloque de cuidado: la sección de postulación
  // quedó centrada en cómo se postula, no en el articulado.
  t(f+' · sin el bloque de qué gana el árbol', !/Qué gana el árbol/.test(s));
  t(f+' · sin el párrafo de recurso y revocación', !/quince días hábiles/.test(s));
  t(f+' · sin el párrafo del artículo 62 en el bloque de cuidado',
    !/cualquier modificación del estado del bien/.test(s.replace(/<[^>]+>/g,'')));
  /* El plazo de 60 días y los requisitos del artículo 55 vivían en la
     secuencia retirada. Hoy la portada no promete ningún plazo ni ninguna
     ruta de trámite, y eso es lo que se comprueba: prometer media ruta sería
     peor que no prometer ninguna. Dónde debe vivir esa información —Recursos,
     probablemente— está anotado en pendientes.html. */
  t(f+' · la portada ya no describe el trámite',
    !/Artículo 55/.test(s) && !/Identificación oficial vigente/.test(s)
    && !/no ante la Secretaría del Medio Ambiente/.test(s)
    && !/60 días naturales/.test(s) && !/ostentar un emblema/.test(s));

  /* La cuenta bajó de nueve a seis el 28 de agosto de 2026, en tres pasos y
     todos por decisión del área: las tres tarjetas de la Ley de Patrimonio se
     integraron en una sola —el mismo articulado, citado igual, sin repetir
     tres veces la misma liga—, la secuencia de postulación se retiró, y se
     retiró la tarjeta de los artículos 106 y 107 de la Ley Ambiental. Lo que
     importa no cambió: que ningún instrumento citado se quede sin liga a su
     texto vigente. */
  t(f+' · al menos seis enlaces a los textos vigentes', (s.match(/class="norma__fuente"/g)||[]).length>=6, String((s.match(/class="norma__fuente"/g)||[]).length));
  /* LOS BENEFICIOS GENERALES NO PUEDEN PASAR POR MEDICIÓN. La sección de
     servicios publica dos cifras de ESTOS ejemplares, estimadas con i-Tree, y
     desde el 28 de agosto de 2026 también los beneficios que la investigación
     documenta del arbolado urbano en general. Son dos cosas distintas y el
     texto tiene que decirlo: sin esa frase, alguien cita «suben el valor del
     suelo» como si fuera un dato medido de un árbol del padrón. */
  t(f+' · los beneficios generales se distinguen de las cifras medidas',
    /Las dos cifras de arriba son de estos ejemplares/.test(s)
    && /del arbolado urbano en general/.test(s));
  t(f+' · las tres familias de beneficios están',
    />Ambiente</.test(s) && />Salud y vida en común</.test(s) && />Economía y ciudad</.test(s));
  /* Una afirmación tomada de la literatura sin su referencia es una afirmación
     sin dueño. La referencia va completa —autores, revista, volumen, número de
     artículo— y con liga al DOI, que es la dirección que no se rompe. */
  t(f+' · la fuente de los beneficios está citada y enlazada',
    /Trees, Forests and People/.test(s) && /101198/.test(s)
    && /Willams Oliveira/.test(s) && /Ariadna V. Lopes/.test(s)
    && /href="https:\/\/doi\.org\/10\.1016\/j\.tfp\.2026\.101198" target="_blank" rel="noopener"/.test(s));
  /* La tarjeta integrada tiene que seguir citando los cinco artículos, cada
     uno junto a lo que dispone. Integrar no puede ser diluir. */
  t(f+' · la tarjeta de la Ley de Patrimonio conserva sus cinco artículos',
    ['artículos 51 y 52','artículo 8, fracción I','artículo 56','artículo 13, fracción V']
      .every((c) => s.includes(c)));
  // El pie de la sección de propuestas se retiró. La ley se sigue enlazando
  // desde el bloque de normativa, que es donde vive el marco jurídico.
  t(f+' · sin el pie de la sección de propuestas', !/class="postula__pie"/.test(s));
  t(f+' · la ley se sigue enlazando desde la normativa', /1471-leydepatrimonio/.test(s));
  t(f+' · enlaza la Constitución', /data\.consejeria\.cdmx\.gob\.mx\/index\.php\/leyes\/constitucion/.test(s));
  t(f+' · enlaza la Ley de Patrimonio', /1471-leydepatrimonioculturalnaturalybioculturaldelaciudaddemexico/.test(s));
  t(f+' · enlaza la NADF-001 en PDF', /NADF-001-RNAT-2016\.pdf/.test(s));
  t(f+' · enlaza la Ley Ambiental', /1611-nueva-ley-31/.test(s));

  t(f+' · buscador del listado', /id="buscaPadron"/.test(s)&&/Nombre, especie, alcaldía o colonia/.test(s));
  // La descarga salió de la portada: ahora son archivos estáticos enlazados
  // desde Recursos. La portada no debe conservar ni los botones ni el bloque.
  t(f+' · la portada ya no fabrica la descarga',
    !/data-descarga=/.test(s) && !/alDescargarCsv/.test(s) && !/class="datos-abiertos"/.test(s));
  t(f+' · el cintillo ya no anuncia el total', !/Ejemplares declarados/.test(s));
  t(f+' · sin valoración económica', !/Valor estimado de sus beneficios/.test(s)&&!/atribuirle moneda/.test(s));
  t(f+' · el pie del mapa ya no habla del tamaño', !/El tamaño de cada marcador corresponde/.test(s));
  t(f+' · sin la capa de perímetros', !/data-capa="perimetros"/.test(s));
  t(f+' · filtros en barra propia sobre el mapa', /class="mapa-filtros" id="mapaFiltros"/.test(s)&&/\.mapa-filtros\{display:flex/.test(s));
  t(f+' · los filtros ya no flotan sobre el lienzo', !/mapa-controles/.test(s));
  // El panel de indicadores se retiró: sus cifras viven en el cintillo.
  t(f+' · sin panel de indicadores', !/id="mapaPanel"/.test(s));
  t(f+' · el panel de indicadores ya no se desplaza por dentro', !/\.panel-datos__lista\{overflow-y:auto/.test(s));
  t(f+' · control de pantalla completa', /pantalla completa/i.test(s)&&/mapa-marco--pleno/.test(s));
}
const m=fs.readFileSync('mapa.js','utf8');
t('mapa.js · marcadores uniformes y sin cifra', /TAMANO_PIN = 16/.test(m)&&/html: `<div class="pin"><\/div>`/.test(m));
t('mapa.js · botón para borrar filtros', /class="mapa-borrar" data-borrar/.test(m)&&/Borrar filtros/.test(m)&&/\[data-borrar\]/.test(m));
t('mapa.js · recorte a la Ciudad de México', /MASCARA_CDMX = GEO_CDMX/.test(m)&&/maxBounds/.test(m));
t('mapa.js · sin capa de perímetros', !/perimetro/i.test(m));
const dl=fs.readFileSync('modelo-portada.js','utf8');
t('Design · buscador en el estado', /busqueda: ""/.test(dl)&&/alBuscar/.test(dl));
t('Design · ya no arma la descarga en el navegador',
  !/descargar\(tipo, ejemplares\)/.test(dl) && !/alDescargarCsv/.test(dl));
// Los archivos se generan al construir y viven con dirección propia.
const rec = fs.readFileSync('recursos-cuerpo.html','utf8');
t('Recursos · enlaza el CSV y el JSON publicados',
  /href="datos\/arboles-patrimoniales-cdmx\.csv" download/.test(rec)
  && /href="datos\/arboles-patrimoniales-cdmx\.json" download/.test(rec));
t('Recursos · los archivos existen en la salida',
  fs.existsSync(PRUEBA+'datos/arboles-patrimoniales-cdmx.csv')
  && fs.existsSync(PRUEBA+'datos/arboles-patrimoniales-cdmx.json'));
console.log('\n══ EL EXPEDIENTE NO INVENTA FECHAS ══');
{
  /* El registro levanta una sola fecha con valor de acto: la del decreto. La
     de nominación se retiró del padrón v2 —el lector la deja en null— y no
     debe reaparecer en ninguna ficha. Volvió una vez después de haberse
     pedido que saliera; esto impide la tercera. */
  for (const f of ['ficha-logica.js', 'modelo-ficha.js']) {
    const s2 = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    t(f + ' · no publica «Fecha de nominación»', !/Fecha de nominación/.test(s2));
    t(f + ' · sí publica la del decreto', /Fecha del decreto/.test(s2));
  }
}

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
