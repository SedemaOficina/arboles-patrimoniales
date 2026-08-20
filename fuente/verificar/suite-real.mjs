import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
const D=JSON.parse(fs.readFileSync('/tmp/audit/datos-reales.json','utf8'));
class DCLogic{ setState(o){this.state={...this.state,...o};} }
globalThis.location={hash:''}; globalThis.window={addEventListener(){},removeEventListener(){},scrollTo(){}};
let ok=0,mal=0; const t=(n,c,d='')=>{c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d));};

const P=new Function('DCLogic',fs.readFileSync('dc-logica.js','utf8')+'; return Component;')(DCLogic);
const p=new P(); p.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,stats:D.stats,filtro:'',mensajeError:''};
const v=p.renderVals();
console.log('══ PORTADA · REGISTRO REAL ══');
t('13 ejemplares en el padrón',v.fichas.length===13);
t('Bosque con las 13 siluetas',v.hayBosque&&v.bosque.length===13,String(v.bosque.length));
t('Ordenado del más alto al más bajo',v.bosque[0].alto==='30 m'&&v.bosque[12].alto==='20.2 m',v.bosque[0].alto+'→'+v.bosque[12].alto);
t('La hilera ya no lleva figura humana de referencia', v.alturaPersona===undefined && v.personaD===undefined);
t('Rango de alturas declarado',v.bosqueRango==='20.2 — 30 m',v.bosqueRango);
t('La nota del esquema no cita conteos',!/\d+ de \d+|Solo \d/.test(v.bosqueNota),v.bosqueNota);
t('Cifras de cabecera reales, sin el total',v.cifras.map(c=>c.valor).join('|')==='6|3|700|30 m',v.cifras.map(c=>c.valor).join('|'));
t('Lluvia encabeza los servicios',v.servicios[0].valor==='911,487',v.servicios[0].valor);
t('Sin valoración económica entre los servicios',!v.servicios.some(x=>/Valor|beneficio/i.test(x.texto))&&v.servicios.length===3,v.servicios.map(x=>x.texto).join(' | '));
t('Cobertura parcial marcada en lluvia',v.servicios[0].incompleto===true&&/5 de 13/.test(v.servicios[0].cobertura),v.servicios[0].cobertura);
t('CO2 y carbono con dato completo',v.servicios[1].incompleto===false&&v.servicios[2].incompleto===false);
t('Las 14 notas al pie llegan al pie',v.notas.length===14,String(v.notas.length));
t('El filtro del mapa abre en «Todos», sin cifra',v.filtros[0].etiqueta==='Todos',v.filtros[0].etiqueta);
t('Alcaldía normalizada a nombre oficial',v.fichas.some(f=>/Miguel Hidalgo/.test(f.meta)),v.fichas[0].meta);
// Auditoría P3.2/P3.3: las tres variantes de SITUACIÓN colapsaron en una sola
// familia neutra. Lo que las distingue ahora es su texto, no su color.
const sinCat=v.fichas.filter(f=>f.etiquetas.some(e=>/situacion/.test(e.clase)));
t('Los 2 sin categoría se explican, no se marcan como omisión',sinCat.length===2,String(sinCat.length));
t('Uno tiene decreto anterior al programa',sinCat.some(f=>f.etiquetas[0].texto==='Decreto anterior al programa'),sinCat.map(f=>f.etiquetas[0].texto).join(' | '));
t('El otro tiene la declaratoria en trámite',sinCat.some(f=>f.etiquetas[0].texto==='Declaratoria en trámite'));
t('Ninguno se rotula como dato faltante',!sinCat.some(f=>f.etiquetas[0].texto==='Categoría por asignar'));
t('Slugs únicos',new Set(D.ejemplares.map(e=>e.slug)).size===13);
p.state.filtro='NOTABLE';
t('Filtro Notables da 11',p.renderVals().fichas.length===11,String(p.renderVals().fichas.length));

const F=new Function('DCLogic',fs.readFileSync('ficha-dc-logica.js','utf8')+'; return Component;')(DCLogic);
console.log('\n══ FICHA · REGISTRO REAL ══');
let f2=0;
for(const e of D.ejemplares){ const c=new F(); c.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,slug:e.slug,mensajeError:''};
  try{ const r=c.renderVals(); if(r.nombre!==e.nombreAsignado||r.medidas.length!==6||r.grupos.reduce((a,g)=>a+g.filas.length,0)!==15) f2++; }
  catch(err){f2++;console.log('   EXCEPCIÓN',e.slug,err.message);} }
t('Las 13 fichas renderizan',f2===0,f2+' con problema');
const c=new F(); c.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,slug:'viejo-del-agua',mensajeError:''};
const r=c.renderVals();
t('Expectativa de vida con la acentuación restituida',r.permanencia[0].valor==='Más de 40',r.permanencia[0].valor);
t('Fecha de decreto legible',r.procedencia[2].valor==='4 de agosto de 2025',String(r.procedencia[2].valor));
t('Fecha de nominación legible',String(r.procedencia[1].valor).includes(' de '),String(r.procedencia[1].valor));
t('El resumen abre con la altura, no con la edad',
  r.resumen[0].etiqueta==='Altura total' && /m$/.test(r.resumen[0].valor),
  r.resumen[0].etiqueta+': '+r.resumen[0].valor);
const cx=new F(); cx.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,slug:'laureano',mensajeError:''};
// Todos los ejemplares tienen morfología completa: ninguna celda queda en raya.
t('Un ejemplar sin edad ya no muestra ninguna raya',
  cx.renderVals().resumen.every(r=>r.valor!=='—'),
  cx.renderVals().resumen.map(r=>r.valor).join('|'));
const cs=new F(); cs.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,slug:'viejo-del-agua',mensajeError:''};
const rs=cs.renderVals();
t('Ejemplar sin categoría no inventa etiquetas',(new F(),true));
t('Servicios con S/D marcados como sin dato',rs.grupos.reduce((a,g)=>a+g.filas.filter(f=>f.valor==='Sin dato').length,0)>0);
console.log('\nRESULTADO:',ok,'aprobadas ·',mal,'fallidas');


console.log('\n══ FICHA · valores negativos de i-Tree ══');
const cn=new F(); cn.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,slug:'arbol-ahuehuete-sabino-de-san-juan-y-su-arboleda',mensajeError:''};
const rn=cn.renderVals();
const gEner=rn.grupos[3];
t('El grupo de energía existe',gEner.titulo==='Efecto sobre el consumo de energía',gEner.titulo);
t('Los valores negativos se marcan',gEner.filas.filter(f=>f.negativo).length===4,gEner.filas.filter(f=>f.negativo).length+' negativos');
t('Se muestra la advertencia de i-Tree',gEner.hayNota===true&&/mayor consumo o emisión/.test(gEner.nota));
t('Clima y carbono ya no mezcla el dato de energía',rn.grupos[0].filas.length===2,String(rn.grupos[0].filas.length));
t('Total de 15 filas de servicio',rn.grupos.reduce((a,g)=>a+g.filas.length,0)===15,String(rn.grupos.reduce((a,g)=>a+g.filas.length,0)));
const cv=new F(); cv.state={estado:'listo',ejemplares:D.ejemplares,meta:D.meta,slug:'viejo-del-agua',mensajeError:''};
t('S/D sigue marcándose como sin dato',cv.renderVals().grupos.reduce((a,g)=>a+g.filas.filter(f=>f.valor==='Sin dato').length,0)===2);
console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
process.exit(mal ? 1 : 0);
