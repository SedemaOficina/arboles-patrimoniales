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

console.log('══ MAPA · globo, halo y desplazamiento ══');
const src = fs.readFileSync('mapa.js','utf8');
const css = fs.readFileSync('estilos.css','utf8');

// El globo dejó de leer la fotografía de la hoja de cálculo: varios ejemplares
// arrastraban rutas heredadas que ya no existen y sólo uno mostraba el icono
// de imagen rota. Ahora la descubre por carpeta, igual que el listado.
t('globo · nada lee ya la fotografía de la hoja', !/const foto = e\.fotos/.test(src));
t('globo · la foto se descubre por carpeta', /globo-mapa__foto" data-ejemplar=/.test(src));
t('globo · se monta al abrirse', /m\.on\("popupopen"/.test(src) && /montarPrimeraFoto\(img/.test(src));
t('globo · si no hay archivo, se retira el hueco', /else img\.remove\(\)/.test(src));
// Con contenido en cadena, popup.update() reconstruye el HTML y borra la foto
// recién montada; con elemento, Leaflet lo reinserta tal cual.
t('globo · el contenido es un elemento, no una cadena',
  /caja = document\.createElement\("div"\)/.test(src) && /return caja;/.test(src));
t('globo · la banda de la foto no ocupa espacio hasta que carga',
  /\.globo-mapa img\.globo-mapa__foto\{height:0/.test(css)
  && /\.globo-mapa img\.globo-mapa__foto--cargada\{height:118px/.test(css));

// El globo se abría bajo los botones de acercamiento y ubicación.
t('globo · reserva la esquina de los controles al desplazarse',
  /autoPanPaddingTopLeft: \[66, 16\]/.test(src));
t('globo · queda por encima de los controles (Leaflet los pone en 1000)',
  /\.leaflet-pane\.leaflet-popup-pane\{z-index:1010\}/.test(css));

// Halo del ejemplar más cercano: anillo geográfico verde, gemelo del morado.
t('halo · hay anillo geográfico verde', /className: "anillo-cercano"/.test(src));
t('halo · el anillo va detrás del marcador', /anilloCercano\.bringToBack\(\)/.test(src));
t('halo · el anillo se retira antes de redibujarse',
  /if \(anilloCercano\) \{ mapa\.removeLayer\(anilloCercano\); anilloCercano = null; \}/.test(src));
t('halo · el punto parpadea, no sólo pulsa', /@keyframes parpadeo-cercano/.test(css)
  && /\.pin--cercano\{[^}]*animation:parpadeo-cercano/.test(css));
t('halo · el anillo verde lleva el mismo halo blanco que el morado',
  /\.anillo-cercano\{filter:drop-shadow/.test(css));

// Un transform sin translate descentra el punto ocho pixeles: deja de señalar
// el árbol. Se revisan TODAS las reglas de .pin que llevan transform.
// Se excluyen los pseudoelementos —que se centran con margin, no con
// translate— y la guía de identidad, donde los pines se pintan en flujo
// estático y no los posiciona Leaflet.
const reglasPin = [...css.matchAll(/(^|\})\s*(\.pin[^{@]*)\{([^}]*transform:[^;}]+)/gm)]
  .map(m=>({sel:m[2].trim(), cuerpo:m[3]}))
  .filter(r=>!/::/.test(r.sel) && !/guia-pines/.test(r.sel));
t('pin · ninguna regla pierde el centrado', reglasPin.length>=2
  && reglasPin.every(r=>/transform:translate\(-50%,-50%\)/.test(r.cuerpo)),
  reglasPin.filter(r=>!/translate\(-50%,-50%\)/.test(r.cuerpo)).map(r=>r.sel).join(' | '));
const cuadrosParpadeo = [...css.matchAll(/@keyframes parpadeo-cercano\{([^}]*\}[^}]*)\}/g)];
t('pin · el parpadeo tampoco lo pierde',
  /0%,100%\{transform:translate\(-50%,-50%\) scale\(1\)/.test(css)
  && /50%\s*\{transform:translate\(-50%,-50%\) scale\(1\.4\)/.test(css));

// Ubicación en dos tiempos: con GPS obligatorio el botón tardaba segundos.
t('ubicación · la primera petición no exige GPS',
  /enableHighAccuracy: false, timeout: 8000, maximumAge: 600000/.test(src));
t('ubicación · la fina va después y sólo afina',
  /enableHighAccuracy: true, timeout: 15000, maximumAge: 0/.test(src));
t('ubicación · la fina no vuelve a encuadrar el mapa',
  /pintarUbicacion\(lat, lng, accuracy, false\)/.test(src));
t('ubicación · el botón avisa mientras busca', /Buscando tu ubicación…/.test(src));

// El renglón se pintaba de morado aunque quedara fuera de la ventana.
t('listado · elegir un punto del mapa trae su renglón a la vista',
  /traerFilaAlaVista\(slug\);\n    if \(typeof alSeleccionar/.test(src));
t('listado · el cálculo usa rectángulos, no offsetTop', /rf\.top - rl\.top \+ lista\.scrollTop/.test(src));
t('listado · se repite cuando las fotos ya crecieron los renglones',
  /setTimeout\(\(\) => colocarFila\(slug\), 420\)/.test(src));
t('listado · si ya está a la vista no se mueve nada',
  /if \(rf\.top >= rl\.top \+ 8 && rf\.bottom <= rl\.bottom - 8\) return;/.test(src));
t('listado · sólo se desplaza la columna, no la página',
  !/scrollIntoView\(\{ block: "nearest"/.test(src));


console.log('══ ESCALA · el rótulo de 1.70 m ══');
const fl = fs.readFileSync('ficha-logica.js','utf8');
t('escala · 1.70 m se rotula una sola vez a la vista',
  (fl.match(/>1\.70 m</g)||[]).length===1);
t('escala · el dato sigue existiendo para lector de pantalla',
  /<b class="vo">Figura humana de referencia: 1\.70 metros<\/b>/.test(fl));
t('escala · nada cuelga bajo el lienzo', !/\.escala__persona b\{[^}]*bottom:-/.test(css));


console.log('══ FICHA · sin coordenadas de catastro ══');
const fc = fs.readFileSync('ficha-cuerpo.html','utf8');
const fdc = fs.readFileSync('ficha-dc-logica.js','utf8');
t('ficha · no queda el desplegable de uso técnico',
  !/fUbicacionTecnica/.test(fc) && !/fUbicacionTecnica/.test(fl) && !/datos-tecnicos/.test(css));
// Se busca en el código, no en los comentarios: el comentario que explica por
// qué se retiró el dato menciona la palabra y no debe hacer fallar la prueba.
const sinComentarios = (txt) => txt.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
t('ficha · no se publica el UTM',
  !/UTM/.test(sinComentarios(fl)) && !/UTM/.test(sinComentarios(fdc)) && !/UTM/.test(fc));
t('ficha · tampoco el par de latitud y longitud suelto',
  !/coords\.lat\.toFixed\(6\)/.test(fl));
// Lo que sí debe quedar: el mapa y el botón que traza la ruta.
t('ficha · sigue el botón que abre la ruta', /google\.com\/maps\/search/.test(fl));
t('ficha · sigue el mapa del ejemplar', /pintarMapaEjemplar\(e\)/.test(fl));

console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
if(mal) process.exitCode=1;
