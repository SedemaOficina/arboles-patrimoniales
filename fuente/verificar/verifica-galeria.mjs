import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
const D=JSON.parse(fs.readFileSync('verificar/datos/datos-con-fotos.json','utf8'));
const S=await import('../especies.js');
class DCLogic{ setState(o){this.state={...this.state,...o};} }
globalThis.location={hash:''}; globalThis.window={addEventListener(){},removeEventListener(){},scrollTo(){}};
const F=new Function('DCLogic',fs.readFileSync('ficha-dc-logica.js','utf8')+'; return Component;')(DCLogic);
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
t('Altura en el resumen y decreto legible',
  V.resumen[0].etiqueta==='Altura total'&&V.procedencia[2].valor==='4 de agosto de 2025');
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
t('Y aparece en la ficha técnica',L2.taxonomia.find(f=>f.clave==='Origen en la Ciudad').valor==='Exótica');

console.log('\n══ FOTOGRAFÍAS MONTADAS ══');
{
  const dirF = '../docs/assets/img/ejemplares';
  const regF = JSON.parse(fs.readFileSync('datos/registro.json','utf8'));
  const ejsF = regF.ejemplares || regF;
  const carpetas = fs.existsSync(dirF) ? fs.readdirSync(dirF) : [];
  t('Hay carpeta de fotografías para los 13 ejemplares',
    ejsF.length === 13 && ejsF.every(e => carpetas.includes(e.id)));
  t('No sobra ninguna carpeta', carpetas.every(c => ejsF.some(e => e.id === c)));
  let grandes = 0; const sinMini = [], huecos = [];
  for (const e of ejsF) {
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
  t('Hay 88 fotografías montadas', grandes === 88, String(grandes));

  const ft = fs.readFileSync('fotos.js','utf8');
  t('fotos.js sabe construir la ruta de una miniatura', /export const rutaMiniatura/.test(ft) && /export const miniaturaDe/.test(ft));
  t('La miniatura se pide antes que la foto completa',
    ft.indexOf('candidatas.push(rutaMiniatura') < ft.indexOf('candidatas.push(rutaFoto'));
  t('Si no hay miniatura se cae a la foto completa', /candidatas\.push\(rutaFoto\(id, 1, e\)\)/.test(ft));
  const fl = fs.readFileSync('ficha-logica.js','utf8');
  t('El tirador de la galería usa miniaturas', /x\.miniatura \|\| x\.url/.test(fl));
  const cg = fs.readFileSync('estilos.css','utf8');
  t('La columna de miniaturas no crece sin freno',
    /\.galeria\{--alto-visor:/.test(cg) && /\.galeria__tiras\{[^}]*height:var\(--alto-visor\)/.test(cg));
  t('La miniatura recorta en vez de dejar franjas', /\.miniatura img\{[^}]*object-fit:cover/.test(cg));
}

console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
process.exit(mal ? 1 : 0);
