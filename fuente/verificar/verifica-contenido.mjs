import fs from 'fs';
import { fileURLToPath } from 'url';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const PRUEBA = '../prueba/';
let ok=0,mal=0; const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };
console.log('\n══ SECCIONES NUEVAS Y CITAS ══');
for(const f of [PRUEBA+'portada.dc.html',PRUEBA+'portada-vista-previa.html']){
  const s=fs.readFileSync(f,'utf8');
  t(f+' · sección «patrimonial no es intocable»', /id="cuidado"/.test(s)&&/Patrimonial no quiere decir intocable/.test(s));
  t(f+' · cita el numeral 6 sobre mantenimiento', /NADF-001-RNAT-2015, numeral 6\./.test(s)&&/potencian los servicios ambientales/.test(s));
  t(f+' · cita el límite de 25 % del follaje', /no puede superar el 25 % del follaje/.test(s)&&/numeral 6\.1\.8/.test(s));
  t(f+' · cita las cinco causas para podar', /numeral 6\.3/.test(s)&&/estado fitosanitario/.test(s));
  t(f+' · advierte sobre el desmoche con su numeral', /desmoche/.test(s)&&/numeral 6\.4\.2\.1\.6/.test(s));
  t(f+' · dice qué sí está prohibido', /sin autorización y sin dictamen técnico/.test(s));
  t(f+' · canaliza la denuncia a la PAOT', /Procuraduría Ambiental y del Ordenamiento Territorial/.test(s)&&/55 5265 0780/.test(s));

  t(f+' · sección para proponer un árbol', /id="postula"/.test(s));
  t(f+' · estado de la convocatoria: cerrada', /data-estado="cerrada"/.test(s)&&/La convocatoria está cerrada por ahora/.test(s));
  t(f+' · el botón está deshabilitado', /<button[^>]*disabled[^>]*aria-disabled="true"[^>]*>Convocatoria cerrada/.test(s));
  t(f+' · dice que la convocatoria es anual', /convocatoria cada año/.test(s));
  t(f+' · las cinco vías del artículo 54', /artículo 54/.test(s)&&/barrio originario o comunidad indígena/.test(s)&&/mediante exhorto/.test(s));
  t(f+' · el hito 1 confirma si el árbol califica, con el numeral 7.5', /Confirma que el árbol califica/.test(s)&&/numeral 7\.5 y\s*definiciones del numeral 4/.test(s.replace(/\s+/g,' ')));
  t(f+' · los cuatro valores de la norma', /histórico/.test(s)&&/sociocultural/.test(s)&&/científico/.test(s)&&/estético/.test(s));
  t(f+' · la Comisión Interinstitucional en el trámite', /Comisión Interinstitucional del Patrimonio Cultural/.test(s)&&/Consejo Consultivo/.test(s));
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
  t(f+' · los cinco requisitos del artículo 55', /Artículo 55/.test(s)&&/Identificación oficial vigente/.test(s));
  t(f+' · aclara que va a la Secretaría de Cultura', /no ante la Secretaría del Medio Ambiente/.test(s));
  // El plazo y el emblema se retiraron de esa tarjeta; el plazo sigue en la
  // secuencia de postulación, que es donde le sirve a quien va a promover.
  t(f+' · el plazo de 60 días vive en la secuencia de postulación',
    /60 días naturales/.test(s) && !/ostentar un emblema/.test(s));

  // La cuenta creció al destacar el artículo 107 y al enlazar la metodología.
  // Lo que importa es que ningún instrumento se quede sin liga, no la cifra.
  t(f+' · al menos nueve enlaces a los textos vigentes', (s.match(/class="norma__fuente"/g)||[]).length>=9, String((s.match(/class="norma__fuente"/g)||[]).length));
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
const dl=fs.readFileSync('dc-logica.js','utf8');
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
console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
