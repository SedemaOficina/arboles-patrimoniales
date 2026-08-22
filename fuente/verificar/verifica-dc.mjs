import fs from 'fs';
import { fileURLToPath } from 'url';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const PRUEBA = '../prueba/';
const src = fs.readFileSync('dc-logica.js','utf8');
class DCLogic { setState(o){ this.state = { ...this.state, ...o }; } }
const Component = new Function('DCLogic', src + '; return Component;')(DCLogic);
const datos = JSON.parse(fs.readFileSync('verificar/datos/datos-fixture.json','utf8'));

const c = new Component();
c.state = { estado:'listo', ejemplares:datos.ejemplares, meta:datos.meta, stats:datos.stats, filtro:'', mensajeError:'' };
const v = c.renderVals();

let ok=0, mal=0;
const t=(n,cond,det='')=>{ if(cond){ok++;console.log('  ✅',n);} else {mal++;console.log('  ❌',n,det);} };

console.log('\n══ PORTADA · verificación del render ══');
t('El eje del tiempo salió de la portada', v.arbolesEje === undefined && v.marcasEje === undefined && v.ejeNota === undefined);
t('La entrada no cita el tamaño del padrón', /^Los árboles patrimoniales/.test(v.entradaPortada) && !/\d/.test(v.entradaPortada), v.entradaPortada.slice(0,50));
t('Título del padrón es genérico', v.tituloPadron === 'Los árboles patrimoniales', v.tituloPadron);
t('El cintillo no anuncia el tamaño del listado', v.cifras.length === 4 && !v.cifras.some(c=>/Ejemplares declarados/.test(c.etiqueta)), v.cifras.map(c=>c.etiqueta).join(' | '));
t('Cuatro categorías con conteo', v.categorias.length === 4 && v.categorias[0].cuenta === '6 ejemplares', v.categorias.map(c=>c.cuenta).join('|'));
t('Filtros sin cifra, con plurales correctos', v.filtros.map(f=>f.etiqueta).join(',') === 'Todos,Centenarios,Históricos,Notables,Singulares', v.filtros.map(f=>f.etiqueta).join(','));
t('Padrón completo ordenado de mayor a menor altura', v.fichas.length===13 && parseFloat(v.fichas[0].edad)>=parseFloat(v.fichas[12].edad), `${v.fichas[0].edad} → ${v.fichas[12].edad}`);
t('Cada ficha declara su altura con unidad', v.fichas.every(f=>/ m$/.test(f.edad)), v.fichas.map(f=>f.edad).join(' '));
// El enlace ya no es un ancla de la misma página: apunta al archivo de ficha.
// En la lógica sin ensamblar el nombre del archivo es todavía el testigo.
t('Enlaces de ficha al archivo, con el slug',
  /^(__FICHA__|[\w.-]+\.html)#ficha-[a-z0-9-]+$/.test(v.fichas[0].enlace), v.fichas[0].enlace);
t('Alguna ficha luce etiqueta de categoría dorada', v.fichas.some(f=>f.etiquetas.some(e=>e.clase.includes('dorada'))), JSON.stringify(v.fichas.flatMap(f=>f.etiquetas.map(e=>e.clase))));
t('La copia no depende del tamaño del listado', !/\d/.test(v.entradaPortada)&&v.ctaPadron==='Conoce el listado'&&v.tituloPadron==='Los árboles patrimoniales', `${v.ctaPadron} / ${v.tituloPadron}`);
t('Servicios ambientales presentes', v.servicios.length===3, String(v.servicios.length));
t('Lluvia interceptada encabeza los servicios', /Lluvia/.test(v.servicios[0].texto) && v.servicios[0].valor === '475,800', `${v.servicios[0].texto} = ${v.servicios[0].valor}`);
t('Tres servicios, sin valoración económica', v.servicios.length === 3 && !v.servicios.some(x=>/Valor|beneficio/i.test(x.texto)), v.servicios.map(x=>x.texto).join(' | '));
t('Carbono cierra la serie con separador de miles', /Carbono/.test(v.servicios[2].texto) && v.servicios[2].valor === '39,780', `${v.servicios[2].texto} = ${v.servicios[2].valor}`);
t('Ningún servicio marcado incompleto', v.servicios.every(s=>!s.incompleto));
t('Cobertura consolidada declarada', /los 13 ejemplares/.test(v.coberturaServicios), v.coberturaServicios);
// El pie dejó de publicar las notas de la hoja y la procedencia: ese contenido
// vive redactado en la metodología de Recursos.
t('El pie ya no recibe notas ni procedencia',
  v.notas === undefined && v.procedencia === undefined);
t('Sin aviso de dato degradado', v.hayAvisoDato === false);

// filtro activo
c.state.filtro='CENTENARIO';
const v2=c.renderVals();
t('Filtro CENTENARIO reduce el padrón', v2.fichas.length===6, `${v2.fichas.length}`);
t('El filtro elegido queda marcado', v2.filtros.find(f=>f.etiqueta==='Centenarios').activo===true);

// estados
c.state={estado:'cargando'}; const v3=c.renderVals();
t('Estado de carga no rompe el render', v3.estaCargando===true && v3.fichas.length===0);
c.state={estado:'error',mensajeError:'Sin conexión'}; const v4=c.renderVals();
t('Estado de error expone el mensaje', v4.hayError===true && v4.mensajeError==='Sin conexión');

// dato degradado
c.state={estado:'listo',ejemplares:datos.ejemplares,stats:datos.stats,filtro:'',
  meta:{...datos.meta,origen:'cache-stale',degradado:true,alertas:['No fue posible actualizar el registro (timeout). Se muestran datos guardados del 18/08/2026.']}};
const v5=c.renderVals();
t('Dato degradado se avisa al usuario', v5.hayAvisoDato===true && /No fue posible actualizar/.test(v5.avisoDato));
// El aviso de dato degradado sigue existiendo —es lo que la persona necesita
// saber—; la línea de procedencia del pie ya no.
t('Sin línea de procedencia en el pie', v5.procedencia === undefined);

console.log(`\nRESULTADO: ${ok} aprobadas · ${mal} fallidas`);
if(mal) process.exitCode=1;
