import fs from 'fs';
import { fileURLToPath } from 'url';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const PRUEBA = '../prueba/';
const src=fs.readFileSync('ficha-dc-logica.js','utf8');
class DCLogic{ setState(o){ this.state={...this.state,...o}; } }
globalThis.location={hash:''}; globalThis.window={addEventListener(){},removeEventListener(){},scrollTo(){}};
const Component=new Function('DCLogic',src+'; return Component;')(DCLogic);
const datos=JSON.parse(fs.readFileSync('verificar/datos/datos-prueba-extremo.json','utf8'));

let ok=0,mal=0;
const t=(n,c,d='')=>{ if(c){ok++;console.log('  ✅',n);} else {mal++;console.log('  ❌',n,d);} };
const ver=(slug)=>{ const c=new Component();
  c.state={estado:'listo',ejemplares:datos.ejemplares,meta:datos.meta,slug,mensajeError:''};
  return c.renderVals(); };

console.log('\n══ FICHA PORTADA · ejemplar completo ══');
const v=ver('ahuehuete-de-chapultepec');
t('La navegación entre ejemplares salió de la ficha', v.vecinoIzq === undefined && v.vecinoDer === undefined);
t('Nombre y binomio',v.nombre==='Ahuehuete de Chapultepec'&&v.binomio==='Taxodium mucronatum');
// El nombre común se rotula en la plantilla; la lógica solo entrega el valor.
t('Nombre común en minúscula, sin frase alrededor',v.comun==='ahuehuete',v.comun);
t('Tres categorías con clase dorada',v.etiquetas.length===3&&v.etiquetas.some(e=>e.clase.includes('dorada')));
// El resumen solo lleva datos completos en los trece ejemplares: la edad y lo
// que se deriva de ella salieron por decisión editorial.
t('Resumen de cuatro medidas, sin edad',v.resumen.length===4
  && v.resumen.map(r=>r.etiqueta).join('|')==='Altura total|Diámetro del tronco|Extensión de copa|Alcaldía',
  v.resumen.map(r=>r.etiqueta).join('|'));
t('Ninguna celda del resumen habla de edad',
  !v.resumen.some(r=>/edad|germin|generacion/i.test(r.etiqueta)));
t('Alcaldía larga no usa tipografía de despliegue',v.resumen[3].clase==='largo',v.resumen[3].clase);
// El eje del tiempo se retiró de la ficha por decisión editorial.
t('El eje del tiempo ya no se calcula',v.arbolesEje===undefined&&v.hayEje===undefined);
t('Escala con altura y silueta',v.hayAltura===true&&/px$/.test(v.arbol.altoCopa)&&/px$/.test(v.persona.alto));
t('Reglas cada 5 m hasta el tope',v.reglas.length===6&&v.reglas[5].etiqueta==='30 m',JSON.stringify(v.reglas.map(r=>r.etiqueta)));
t('Seis medidas morfológicas',v.medidas.length===6&&v.medidas[0].valor==='26.5');
t('Dos filas de permanencia en la tabla de medidas',v.permanencia.length===2);
t('Expectativa de vida es la primera',v.permanencia[0].rotulo==='Expectativa de vida',v.permanencia[0].rotulo);
t('Las filas de permanencia usan clase de texto',v.permanencia.every(d=>d.clase.includes('medida--texto')),JSON.stringify(v.permanencia.map(d=>d.clase)));
t('Domicilio compuesto',/Avenida Principal 111, colonia Centro/.test(v.domicilio),v.domicilio);
t('Enlace a Google Maps armado',/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=19\.\d+,-99\.\d+$/.test(v.enlaceMapa),v.enlaceMapa);
t('La coordenada ya no se imprime en pantalla',v.coord===undefined&&!/\d{2}\.\d{6}/.test(v.coordNota),v.coordNota);
t('Cuatro grupos i-Tree con 15 filas',v.grupos.length===4&&v.grupos.reduce((a,g)=>a+g.filas.length,0)===15);
t('Carbono con miles correctos',v.grupos[0].filas[0].valor==='4,610',v.grupos[0].filas[0].valor);
t('La ficha ya no publica valoración económica',v.beneficio===undefined&&!JSON.stringify(v).includes('atribuirle moneda'));
t('Taxonomía completa en la ficha',v.taxonomia.length>=8,`${v.taxonomia.length} filas`);
// Queda un solo enlace externo: el SNIB. Se retiraron «Fuente del registro»
// —el mismo enlace de iNaturalist en los trece— y «Cálculo i-Tree», que no
// guardaba una dirección sino el texto «MyTree».
// La ficha ya no publica enlaces externos por ejemplar: «Fuente del registro»,
// «Cálculo i-Tree» y «Ejemplar en el SNIB» guardaban el MISMO valor en los
// trece, así que ninguno llevaba a información de ese árbol.
t('Sin enlaces externos por ejemplar', v.enlaces.length===0,
  JSON.stringify(v.enlaces.map(e=>e.texto)));
t('Trazabilidad con nominación',v.procedencia[0].valor==='Vecinos de la colonia');

console.log('\n══ FICHA · ejemplar sin ningún dato ══');
const x=ver('caso-sin-datos');
t('Edad y germinación como raya',x.resumen[0].valor==='—'&&x.resumen[1].valor==='—');
t('Sin eje del tiempo en ningún estado',x.hayEje===undefined);
t('Escala explica la falta de altura',x.hayAltura===false&&x.sinAltura===true&&/no tiene altura medida/.test(x.sinAlturaTexto));
t('Sin coordenadas, se explica',x.hayCoords===false&&/no tiene coordenadas capturadas/.test(x.coordNota));
t('Las seis medidas dicen "Sin medir"',x.medidas.every(m=>m.valor==='Sin medir'&&m.clase.includes('vacia')));
t('Los 15 servicios dicen "Sin dato"',x.grupos.reduce((a,g)=>a+g.filas.filter(f=>f.valor==='Sin dato').length,0)===15);
t('Sin observaciones, no se muestra el bloque',x.hayObservaciones===false);

console.log('\n══ FICHA · casos particulares ══');
const j=ver('la-jacaranda-de-reforma');
t('Observaciones del dictamen presentes',j.hayObservaciones===true&&/camellón/.test(j.observaciones));
const s=ver('el-gigante-de-santa-fe');
t('Coordenada invertida se corrige y el enlace sale bien',/query=19\./.test(s.enlaceMapa),s.enlaceMapa);
const d=ver('el-centinela-de-milpa-alta');
t('Ejemplar sin coordenadas',d.hayCoords===false);
t('Pero conserva su altura medida',d.hayAltura===true&&d.medidas[0].valor==='27.5',d.medidas[0].valor);
const inex=ver('slug-que-no-existe');
t('Slug inexistente cae al primer ejemplar sin romper',!!inex.nombre&&inex.medidas.length===6);

console.log('\n══ FICHA · estados ══');
const c1=new Component(); c1.state={estado:'cargando'}; const e1=c1.renderVals();
t('Carga no rompe el render',e1.estaCargando===true&&e1.grupos.length===0&&e1.resumen.length===0);
const c2=new Component(); c2.state={estado:'error',mensajeError:'Tiempo agotado',ejemplares:[]}; const e2=c2.renderVals();
t('Error expone el mensaje',e2.hayError===true&&e2.mensajeError==='Tiempo agotado');
const c3=new Component(); c3.state={estado:'listo',ejemplares:datos.ejemplares,slug:'',
  meta:{...datos.meta,degradado:true,alertas:['No fue posible actualizar el registro (HTTP 503).']}};
t('Dato degradado se avisa',c3.renderVals().hayAvisoDato===true);

console.log(`\nRESULTADO: ${ok} aprobadas · ${mal} fallidas`);
if(mal) process.exitCode=1;
