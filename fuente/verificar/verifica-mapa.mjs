import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
const D=JSON.parse(fs.readFileSync('/tmp/audit/datos-con-fotos.json','utf8'));
const M=await import('/tmp/audit/portada/mapa.js');
let ok=0,mal=0; const t=(n,c,d='')=>{c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d));};

console.log('══ MAPA · lógica ══');
const E=D.ejemplares, cc=E.filter(e=>e.coords);
t('Los 13 tienen coordenadas',cc.length===13,String(cc.length));
t('Todas dentro de la caja CDMX',cc.every(e=>e.coords.lat>19&&e.coords.lat<19.65&&e.coords.lng>-99.4&&e.coords.lng<-98.9));
t('Todos los marcadores miden lo mismo',M.TAMANO_PIN===16&&typeof M.tamanoPin==='undefined',String(M.TAMANO_PIN));
t('El tamaño es una constante, no un cálculo',Number.isInteger(M.TAMANO_PIN)&&M.TAMANO_PIN>0);
t('La máscara viaja incrustada, no por fetch',
  M.MASCARA_CDMX && M.MASCARA_CDMX.type==='FeatureCollection' && M.MASCARA_CDMX.features.length===2
  && M.MASCARA_CDMX.features.some(f=>f.properties.clase==='mascara')
  && M.MASCARA_CDMX.features.some(f=>f.properties.clase==='contorno')
  && M.LIMITES_CDMX.length===2, typeof M.MASCARA_CDMX);
t('Filtro por categoría',M.filtrar(E,{categoria:'NOTABLE'}).length===11,String(M.filtrar(E,{categoria:'NOTABLE'}).length));
t('Filtro por alcaldía',M.filtrar(E,{alcaldia:'Cuauhtémoc'}).length===4);
t('Filtro por especie',M.filtrar(E,{especie:'Taxodium mucronatum'}).length===10,String(M.filtrar(E,{especie:'Taxodium mucronatum'}).length));
t('Filtros combinados',M.filtrar(E,{categoria:'CENTENARIO',alcaldia:'Cuauhtémoc'}).length===2);
t('Sin filtros devuelve todo',M.filtrar(E,{}).length===13);
t('Combinación imposible devuelve vacío',M.filtrar(E,{alcaldia:'Milpa Alta'}).length===0);
t('Los dos sin categoría no aparecen en ningún filtro de categoría',
  ['CENTENARIO','HISTORICO','NOTABLE','SINGULAR'].every(c=>!M.filtrar(E,{categoria:c}).some(x=>x.categorias.length===0)));
t('Sin Leaflet, no revienta',(()=>{try{
  const cont={innerHTML:''}; const lista={querySelector:()=>({innerHTML:'',textContent:''}),querySelectorAll:()=>[]};
  M.crearMapa({contenedor:cont,lista,filtros:null,ejemplares:E}); return /listado de la derecha/.test(cont.innerHTML);
}catch(e){return false}})());
console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
if(mal) process.exitCode=1;
