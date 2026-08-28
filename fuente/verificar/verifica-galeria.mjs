import fs from 'fs';
import { fileURLToPath } from 'url';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const PRUEBA = '../prueba/';
const D=JSON.parse(fs.readFileSync('verificar/datos/datos-con-fotos.json','utf8'));
const S=await import('../especies.js');
class DCLogic{ setState(o){this.state={...this.state,...o};} }
globalThis.location={hash:''}; globalThis.window={addEventListener(){},removeEventListener(){},scrollTo(){}};
const F=new Function('DCLogic',fs.readFileSync('modelo-ficha.js','utf8')+'; return Component;')(DCLogic);
let ok=0,mal=0; const t=(n,c,d='')=>{c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d));};
const ver=(slug,foto=0)=>{const c=new F(); c._S=S;
  c.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,slug,mensajeError:'',foto}; return c.renderVals();};

console.log('══ GALERÍA ══');
const v=ver('viejo-del-agua');
t('Detecta las 3 fotografías',v.hayFotos&&v.fotos.length===3,String(v.fotos.length));
t('Muestra la primera por omisión',v.fotoActual.url.endsWith('viejo-del-agua-01-grande.jpg')&&v.fotos[0].activa===true);
t('Contador correcto',v.contadorFoto==='1 / 3',v.contadorFoto);
t('Pie y crédito separados',v.pieFoto.startsWith('El ejemplar desde la calle')&&v.creditoFoto.startsWith('Fotografía: Archivo'),v.creditoFoto);
// Con fotos, la guía calla: las imágenes hablan solas.
t('Con fotos la guía queda vacía',v.guiaGaleria==='',v.guiaGaleria);
t('Cada miniatura trae su acción',v.fotos.every(f=>typeof f.alElegir==='function'));
t('Texto alternativo en todas',v.fotos.every(f=>typeof f.alt==='string'));
const v2=ver('viejo-del-agua',2);
t('Cambiar de foto actualiza la principal',v2.fotoActual.url.endsWith('viejo-del-agua-03-grande.jpg')&&v2.contadorFoto==='3 / 3',v2.contadorFoto);
t('Solo una miniatura queda activa',v2.fotos.filter(f=>f.activa).length===1);
const v3=ver('viejo-del-agua',99);
t('Índice fuera de rango se acota',v3.contadorFoto==='3 / 3',v3.contadorFoto);
const v4=ver('tacuba');
// Las tres especies del registro tienen ilustración propia, así que el
// respaldo sin fotografías es la ILUSTRACIÓN de la especie, no la silueta
// dibujada. La silueta sigue en el código para una especie que aún no la
// tenga. (Esta prueba pasaba contra una copia vieja de especies.js: al
// apuntarla al archivo real salió el desfase.)
t('Sin fotos, se recurre a la ilustración de la especie',
  v4.sinFotos===true && v4.hayIlustracionEspecie===true && v4.haySilueta===false);

console.log('\n══ SILUETA DE RESPALDO ══');
const s1=ver('laureano');
t('Sin fotos activa el respaldo de especie',s1.sinFotos&&(s1.hayIlustracionEspecie||s1.haySilueta));
t('Reconoce Ficus microcarpa',s1.silueta.clave==='ficus'&&s1.especieSilueta==='Laurel de la India',s1.silueta.clave);
t('Laurel dibuja raíces aéreas',s1.siluetaRaices===true);
t('Contorno y fuste presentes',s1.silueta.contorno.startsWith('M')&&Number(s1.silueta.fusteAncho)>0);
const s2=ver('eugenio');
t('Reconoce Fraxinus uhdei',s2.silueta.clave==='fraxinus'&&s2.especieSilueta==='Fresno mexicano',s2.silueta.clave);
t('Fresno no dibuja raíces aéreas',s2.siluetaRaices===false);
const s3=ver('viejo-del-agua');
t('Con fotos no se calcula silueta',ver('viejo-del-agua').haySilueta===false);
const s4=ver('parque-espana');
t('Reconoce Taxodium mucronatum',s4.silueta.clave==='taxodium'&&s4.especieSilueta==='Ahuehuete');
t('Ahuehuete dibuja base ensanchada',s4.siluetaBase===true);
t('El ancho respeta la copa medida',Number(s4.silueta.ancho)>0&&Number(s4.silueta.alto)===230);

console.log('\n══ VISTA DE CALLE ══');
// Los 13 ya traen panorama propio. El respaldo por coordenadas se prueba
// construyendo un ejemplar al que se le retira ese dato a propósito.
const sinPan={...D,ejemplares:D.ejemplares.map(e=>e.slug==='tacuba'?{...e,vistaCalle:null}:e)};
const cp=new F(); cp._S=S; cp.state={estado:'listo',ejemplares:sinPan.ejemplares,meta:D.meta,slug:'tacuba',mensajeError:'',foto:0};
const vc=cp.renderVals();
t('Sin panorama propio, lo deriva de las coordenadas',vc.hayVistaCalle&&vc.urlVistaCalle.includes('cbll=19.457671,-99.188791'),vc.urlVistaCalle.slice(0,70));
t('Y sin clave usa el incrustado público',vc.urlVistaCalle.startsWith('https://maps.google.com/maps?q=&layer=c'));
t('Con panorama propio lo respeta',v.urlVistaCalle.startsWith('https://www.google.com/maps/embed?pb='));
t('Los 13 ejemplares traen su panorama propio',
  D.ejemplares.every(e=>e.vistaCalle),
  D.ejemplares.filter(e=>!e.vistaCalle).map(e=>e.nombreAsignado).join(', '));
t('Advierte que la imagen puede ser anterior',/no sustituye la verificación en campo/.test(v.pieVistaCalle));
const sinC={...D,ejemplares:D.ejemplares.map(e=>e.slug==='tacuba'?{...e,coords:null,vistaCalle:null}:e)};
const c=new F(); c._S=S; c.state={estado:'listo',ejemplares:sinC.ejemplares,meta:D.meta,slug:'tacuba',mensajeError:'',foto:0};
const vs=c.renderVals();
t('Sin coordenadas no arma iframe',vs.hayVistaCalle===false&&vs.sinCoords===true);
t('Y explica por qué',/Sin coordenadas capturadas/.test(vs.avisoVistaCalle));

console.log('\n══ LAS 13 SIGUEN RENDERIZANDO ══');
let f=0; for(const e of D.ejemplares){ try{ const r=ver(e.slug); if(r.nombre!==e.nombreAsignado||r.medidas.length!==6) f++; }catch(x){f++;console.log('   EXCEPCIÓN',e.slug,x.message);} }
t('Ninguna ficha se rompe',f===0,f+' con problema');
console.log('\nRESULTADO:',ok,'aprobadas ·',mal,'fallidas');
// El veredicto va al final del archivo, no aquí: aquí faltaban por correr
// la mitad de las comprobaciones y el código de salida se fijaba en cero.

console.log('\n══ SITUACIÓN DE CATEGORÍA ══');
const e13=ver('eugenio'), e07=ver('arbol-ahuehuete-sabino-de-san-juan-y-su-arboleda');
t('Eugenio: su decreto es anterior al programa',e13.etiquetas[0].texto==='Decreto anterior al programa',e13.etiquetas[0].texto);
t('Y se explica al usuario',e13.hayNotaCategoria&&/Su protección es exactamente la misma/.test(e13.notaCategoria));
// La explicación cabe en dos renglones: en la ficha va debajo de la etiqueta,
// y a 226 caracteres empujaba el resumen de medidas fuera de la portada.
t('Y lo hace corto: dos renglones, no un párrafo',e13.notaCategoria.length<=120,String(e13.notaCategoria.length));
t('Sabino de San Juan: declaratoria en trámite',e07.etiquetas[0].texto==='Declaratoria en trámite',e07.etiquetas[0].texto);
t('Y se explica que falta el decreto',/cuando se publique el decreto, que está en trámite/.test(e07.notaCategoria));
// En fila, la etiqueta se estiraba a la altura del párrafo de al lado y se
// dibujaba como un recuadro morado vacío de tres renglones.
{
  const csE = fs.readFileSync('estilos.css','utf8');
  t('La etiqueta de situación se apila sobre su nota, no a su lado',
    /\.etiquetas--situacion\{flex-direction:column/.test(csE));
  t('Y ninguna etiqueta se estira a la altura de su vecina',
    /\.etiquetas\{[^}]*align-items:flex-start/.test(csE));
  const flJ = fs.readFileSync('ficha-logica.js','utf8');
  t('La ficha marca la caja como situación para poder apilarla',
    /cajaEt\.className = "etiquetas etiquetas--situacion"/.test(flJ)
    && /cajaEt\.className = "etiquetas"/.test(flJ));
}
t('Los que sí tienen categoría no llevan nota',ver('tacuba').hayNotaCategoria===false);


console.log('\n══ VIEJO DEL AGUA · PLANTILLA DE REFERENCIA ══');
const V=ver('viejo-del-agua');
t('Tres fotografías reales',V.hayFotos&&V.fotos.length===3,String(V.fotos.length));
t('La primera es la vista general',V.fotoActual.url.includes('viejo-del-agua-01'),V.fotoActual.url);
t('El fondo desenfocado usa la misma imagen',V.fotoActual.fondo.includes('viejo-del-agua-01'));
t('Pie y crédito de archivo institucional',/grupo al pie/.test(V.pieFoto)&&/Archivo de la Secretaría/.test(V.creditoFoto));
t('Panorama propio, no el derivado de coordenadas',V.urlVistaCalle.includes('maps/embed?pb=')&&V.urlVistaCalle.includes('3LFEN1OPByfoKtxqiwkaZA'));
t('El pie declara que el encuadre es propio',/encuadrado sobre el ejemplar/.test(V.pieVistaCalle),V.pieVistaCalle.slice(0,44));
// Por etiqueta, no por posición: la lista cambió al retirar la nominación.
const proc=(c)=>V.procedencia.find(f=>(f.clave||f.etiqueta)===c);
t('Altura en el resumen y decreto legible',
  V.resumen[0].etiqueta==='Altura total'&&proc('Fecha del decreto').valor==='4 de agosto de 2025');
t('La ficha no publica fecha de nominación',!proc('Fecha de nominación'));
t('Nominado por SEDEMA',V.procedencia[0].valor==='SEDEMA',V.procedencia[0].valor);
t('Taxonomía ampliada a 15 filas',V.taxonomia.length===15,String(V.taxonomia.length));
t('Autoridad taxonómica presente',V.taxonomia.find(f=>f.clave==='Autoridad taxonómica').valor==='Ten., 1853');
t('Nivel de prioridad CONABIO',V.taxonomia.find(f=>f.clave==='Especie prioritaria').valor==='CONABIO 2012');
t('Ahuehuete no se marca como exótica',V.esExotica===false);
t('Este ejemplar no tiene valores negativos',V.grupos[3].filas.every(f=>!f.negativo));
const SB=ver('arbol-ahuehuete-sabino-de-san-juan-y-su-arboleda');
t('El Sabino sí los tiene y se conservan con su signo',SB.grupos[3].filas.filter(f=>f.negativo).length===4,String(SB.grupos[3].filas.filter(f=>f.negativo).length));
t('Con la advertencia de i-Tree',SB.grupos[3].hayNota===true);
t('Sin silueta: manda la fotografía',V.haySilueta===false);

console.log('\n══ LAUREANO · ESPECIE EXÓTICA PUBLICADA ══');
const L2=ver('laureano');
t('Se marca como exótica',L2.esExotica===true);
t('Con la explicación de por qué sigue siendo patrimonial',/no es originaria de la Cuenca de México/.test(L2.notaExotica));
/* CAMBIÓ EL CRITERIO. La fila se llamaba «Origen en la Ciudad» y el dato que
   trae responde otra pregunta: es la columna «Exótica / invasora» del padrón,
   fórmula heredada de la especie desde Taxonomia_SNIB. Doce de trece ejemplares
   la traen vacía, así que doce fichas publicaban «Origen en la Ciudad · Sin
   determinar», que un vecino lee como «no se sabe de dónde es este árbol»
   cuando lo que pasa es que el SNIB no clasificó a la especie como exótica.
   Ahora la fila lleva el rótulo del padrón y se comprueba eso: que el rótulo
   sea el mismo de la columna, y que la ausencia se declare, no se rellene. */
t('Y aparece en la ficha técnica con el rótulo del padrón',
  L2.taxonomia.find(f=>f.clave==='Exótica / invasora').valor==='Exótica');
t('Sin dato en el padrón, la ficha lo declara en vez de suponer origen',
  ver('tacuba').taxonomia.find(f=>f.clave==='Exótica / invasora').valor==='Sin determinar');

console.log('\n══ FOTOGRAFÍAS MONTADAS ══');
{
  const dirF = '../docs/assets/img/ejemplares';
  const regF = JSON.parse(fs.readFileSync('datos/registro.json','utf8'));
  const ejsF = regF.ejemplares || regF;
  const carpetas = fs.existsSync(dirF) ? fs.readdirSync(dirF) : [];
  /* CAMBIÓ EL CRITERIO el 28 de agosto de 2026. El trece dejó de ser una
     constante: el sitio publica los ejemplares que trae la hoja, hoy doce, y
     mañana catorce sin que nadie edite esta línea. Lo que se comprueba es lo
     mismo que antes —que ningún ejemplar publicado se quede sin fotografías y
     que ninguna carpeta ande suelta—, contra el registro y contra la lista
     declarada de ejemplares en espera (datos/en-espera.json), no contra un
     número escrito a mano. */
  const EN_ESPERA = (JSON.parse(fs.readFileSync('datos/en-espera.json','utf8')).ejemplares||[]).map(e=>e.id);
  const montados = [...ejsF.map(e=>e.id), ...EN_ESPERA];
  t('Hay carpeta de fotografías para cada ejemplar publicado',
    ejsF.length > 0 && ejsF.every(e => carpetas.includes(e.id)));
  t('No sobra ninguna carpeta', carpetas.every(c => montados.includes(c)),
    carpetas.filter(c => !montados.includes(c)).join(' '));
  let grandes = 0; const sinMini = [], huecos = [];
  for (const e of montados.map(id => ({ id }))) {
    if (!carpetas.includes(e.id)) continue;
    const todos = fs.readdirSync(`${dirF}/${e.id}`);
    const gr = todos.filter(f => /^\d{2}\.jpg$/.test(f)).sort();
    grandes += gr.length;
    // El descubrimiento se detiene en el primer número que falta: la
    // numeración tiene que ser correlativa desde 01, sin huecos.
    if (!gr.every((f, i) => f === String(i + 1).padStart(2, '0') + '.jpg')) huecos.push(e.id);
    for (const f of gr) if (!todos.includes(f.replace('.jpg', '-chica.jpg'))) sinMini.push(`${e.id}/${f}`);
  }
  t('La numeración es correlativa sin huecos', huecos.length === 0, huecos.join(' '));
  t('Cada fotografía tiene su miniatura de 480 px', sinMini.length === 0, sinMini.join(' '));
  /* Sigue siendo 88: cuenta las fotografías montadas en el disco —las de los
     ejemplares publicados MÁS las de los que están en espera—, que es lo que
     protege contra un borrado accidental. Si sube o baja, es porque alguien
     subió o quitó archivos, y eso tiene que verse. */
  t('Hay 88 fotografías montadas', grandes === 88, String(grandes));

  const ft = fs.readFileSync('fotos.js','utf8');
  t('fotos.js sabe construir la ruta de una miniatura', /export const rutaMiniatura/.test(ft) && /export const miniaturaDe/.test(ft));
  t('La miniatura se pide antes que la foto completa',
    ft.indexOf('candidatas.push(rutaMiniatura') < ft.indexOf('candidatas.push(rutaFoto'));
  t('Si no hay miniatura se cae a la foto completa', /candidatas\.push\(rutaFoto\(id, 1, e\)\)/.test(ft));
  const fl = fs.readFileSync('ficha-logica.js','utf8');
  t('El tirador de la galería usa miniaturas', /x\.miniatura \|\| x\.url/.test(fl));
  const cg = fs.readFileSync('estilos.css','utf8');
  /* CAMBIÓ EL CRITERIO. La galería era un visor con una columna vertical de
     miniaturas, y estas dos pruebas cuidaban esa columna: que midiera lo mismo
     que el visor para no crecer sin freno, y que sus miniaturas recortaran en
     vez de dejar franjas. El 24 de agosto de 2026 la columna desapareció —traía
     su propia barra de desplazamiento, dos barras verticales pegadas— y la
     galería pasó a mosaico: todas las fotografías a la vista en una retícula.
     Lo que hay que cuidar ahora es otra cosa: que la retícula reparta bien
     cuando hay menos de cinco fotografías —si no, deja celdas vacías— y que la
     foto grande conserve su criterio de encuadre, que es el que no cambió. */
  t('El mosaico reparte las celdas según cuántas fotografías haya',
    /\.galeria\{--alto-visor:/.test(cg)
    && /\.galeria--1 \.galeria__principal\{grid-column:span 5\}/.test(cg)
    && /\.galeria--2 \.galeria__pieza\{grid-column:span 2/.test(cg)
    && /\.galeria--3 \.galeria__pieza\{grid-row:span 2\}/.test(cg)
    && /\.galeria--4 \.galeria__pieza:last-child\{grid-column:span 2\}/.test(cg));
  t('Y la clase la pone quien sabe cuántas hay: el pintado',
    /galeria galeria--\$\{Math\.min\(fotos\.length, 5\)\}/.test(fl));
  /* La grande NO recorta: en un árbol alto el recorte se lleva la copa, que es
     justo lo que la fotografía debe mostrar. Las pequeñas sí: son un índice. */
  t('La foto grande sigue sin recortar, sobre el fondo desenfocado',
    /\.galeria__principal img\{[^}]*object-fit:contain/.test(cg)
    && /\.galeria__principal::before\{[^}]*background-image:var\(--foto\)/.test(cg));
  t('Las piezas del mosaico sí recortan', /\.galeria__pieza img\{[^}]*object-fit:cover/.test(cg));
}

console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
process.exit(mal ? 1 : 0);
