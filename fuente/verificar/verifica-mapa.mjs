import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
const D=JSON.parse(fs.readFileSync('verificar/datos/datos-con-fotos.json','utf8'));
const M=await import('../mapa.js');
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


console.log('══ FICHA · fuentes y decreto ══');
t('fuentes · queda una tarjeta, la del decreto',
  /\["Consultar el decreto"/.test(fl)
  && !/"Fuente del registro"/.test(fl) && !/"Cálculo i-Tree"/.test(fl)
  && !/"Ejemplar en el SNIB"/.test(fl));
t('fuentes · nada lee ya urlSNIB', !/e\.urlSNIB/.test(fl) && !/e\.urlSNIB/.test(fdc));
t('fuentes · nada lee urlOrigen ni linkITree',
  !/e\.urlOrigen/.test(fl) && !/e\.linkITree/.test(fl)
  && !/e\.urlOrigen/.test(fdc) && !/e\.linkITree/.test(fdc));
// El registro guarda el NOMBRE del PDF, no una URL: publicado crudo, el
// navegador lo resolvía contra la raíz y devolvía 404.
t('decreto · el nombre de archivo se resuelve a la carpeta decretos/',
  /const CARPETA_DECRETOS = "decretos"/.test(fl) && /rutaDecreto\(e\.linkDecreto\)/.test(fl));
t('decreto · una dirección completa se respeta', /if \(\/\^https\?:\\\/\\\/\/i\.test\(bruto\)\) return bruto;/.test(fl));
t('decreto · el nombre se codifica para la URL', /encodeURIComponent\(archivo\)/.test(fl));
t('decreto · los espacios sobrantes se limpian', /replace\(\/\\s\+\/g, " "\)/.test(fl));
t('decreto · si el PDF no está, la tarjeta se apaga en vez de dar 404',
  /method: "HEAD"/.test(fl) && /apagarDecreto\(caja\)/.test(fl)
  && /aún no está publicado en este sitio/.test(fl));
t('decreto · la construcción copia la carpeta al sitio',
  /cp \.\.\/decretos\/\*\.pdf "\$DEST\/decretos\/"/.test(fs.readFileSync('construir/construir.sh','utf8')));

// Comprobación de la propia función, no del texto: se recorta y se ejecuta.
const cuerpoRuta = fl.slice(fl.indexOf('function rutaDecreto'));
const rutaDecreto = new Function('CARPETA_DECRETOS',
  cuerpoRuta.slice(0, cuerpoRuta.indexOf('\n}') + 2) + '; return rutaDecreto;')('decretos');
t('decreto · «DECRETO JUARISTA.pdf» → decretos/DECRETO%20JUARISTA.pdf',
  rutaDecreto('DECRETO JUARISTA.pdf')==='decretos/DECRETO%20JUARISTA.pdf', rutaDecreto('DECRETO JUARISTA.pdf'));
t('decreto · el espacio de más en «DECRETO_ JARDIN…» no duplica',
  rutaDecreto('DECRETO_  JARDIN DE SAN FERNANDO.pdf')==='decretos/DECRETO_%20JARDIN%20DE%20SAN%20FERNANDO.pdf',
  rutaDecreto('DECRETO_  JARDIN DE SAN FERNANDO.pdf'));
t('decreto · una URL completa pasa intacta',
  rutaDecreto('https://data.consejeria.cdmx.gob.mx/gaceta.pdf')==='https://data.consejeria.cdmx.gob.mx/gaceta.pdf');
t('decreto · vacío devuelve nulo', rutaDecreto('')===null && rutaDecreto(null)===null && rutaDecreto('   ')===null);
t('decreto · el acento sobrevive codificado',
  rutaDecreto('GOCDMX_26-06-01_ESPAÑA.pdf')==='decretos/GOCDMX_26-06-01_ESPA%C3%91A.pdf',
  rutaDecreto('GOCDMX_26-06-01_ESPAÑA.pdf'));

console.log('══ RECURSOS · créditos ══');
const rec = fs.readFileSync('recursos-cuerpo.html','utf8');
const pie = fs.readFileSync('parciales/pie.html','utf8');
t('créditos · hay sección con ancla propia', /id="creditos"/.test(rec));
t('créditos · el índice de Recursos la lista', /href="#creditos">Créditos y cómo citar<\/a>/.test(rec));
t('créditos · el mapa del sitio del pie la enlaza', /__RECURSOS__#creditos/.test(pie));
// El bloque de obras de terceros se retiró por decisión editorial. La
// atribución de la cartografía —que sí es obligación de licencia— la sigue
// llevando el propio mapa en su esquina, que es donde OpenStreetMap y CARTO
// la piden. Lo que queda en Recursos es la autoría y el cómo citar.
t('créditos · sin el bloque de obras de terceros',
  !/Obras de terceros que utiliza el sitio/.test(rec) && !/Licencia BSD de dos cláusulas/.test(rec));
t('créditos · la cartografía se sigue atribuyendo desde el mapa',
  /colaboradores de <a href="https:\/\/www\.openstreetmap\.org\/copyright">OpenStreetMap<\/a>/.test(src)
  && /teselas de <a href="https:\/\/carto\.com\/attributions">CARTO<\/a>/.test(src));
t('créditos · los campos de autoría quedan marcados como pendientes',
  (rec.match(/data-pendiente/g)||[]).length>=5);
t('créditos · lo pendiente se distingue a la vista', /\.creditos__lista dd\[data-pendiente\]/.test(css));


console.log('══ CINTILLO Y PANEL ══');
const lg = fs.readFileSync('logica.js','utf8');
const cu = fs.readFileSync('cuerpo.html','utf8');
const port = fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8');

// El panel del mapa dejó de repetir el resumen del registro: eso vive ahora en
// el cintillo, junto al dibujo de los trece.
// El panel del mapa se retiró por completo: en agregado repetía el cintillo y
// en modo ejemplar repetía la ficha, a la que el globo ya lleva en un clic.
t('panel · no queda nada de él en el mapa',
  !/pintarPanel/.test(src) && !/data-panel-titulo/.test(src)
  && !/Todo el listado/.test(src) && !/Este ejemplar/.test(src));
t('panel · el mapa ya no recibe el elemento del panel', !/, panel, ejemplares/.test(src));
t('panel · indicadores.js solo conserva el modo agregado',
  !/indicadoresEjemplar/.test(fs.readFileSync('indicadores.js','utf8'))
  && /export function indicadoresPadron/.test(fs.readFileSync('indicadores.js','utf8')));

// Las sumas NO se recalculan en el cintillo: se piden a la función que ya las
// hacía y que declara sobre cuántos ejemplares está calculado cada valor.
t('cintillo · reutiliza indicadoresPadron en vez de rehacer la aritmética',
  /const agregado = indicadoresPadron\(ejemplares, ejemplares\.length\)/.test(lg));
t('cintillo · el ensamblador expone indicadoresPadron',
  /envolver\('indicadores\.js',\['indicadoresPadron'\]\)/
    .test(fs.readFileSync('construir/armar.js','utf8'))
  && /window\.indicadoresPadron=/.test(port));
t('cintillo · lleva las ocho cifras', (lg.match(/^\s{4}\[/gm)||[]).length>=8);
for (const r of ['Ejemplares','Alcaldías','Especies','En \\$\\{alcaldia\\.cifra\\}',
                 'El más alto','Sumando sus alturas','Años del más antiguo','Años sumados']) {
  t(`cintillo · rótulo «${r.replace(/\\\\/g,'')}»`, new RegExp(r).test(lg));
}
t('cintillo · cuatro columnas fijas, no auto-fit',
  /#cifras\{display:grid;grid-template-columns:repeat\(4,1fr\)/.test(css)
  && !/\.cifras \.envoltura\{display:grid/.test(css));
t('cintillo · la cifra no se parte en dos renglones',
  /\.cifra strong\{[^}]*white-space:nowrap/.test(css));

// La salvedad es obligatoria: 1,200 años salen de dos ejemplares de trece.
t('cintillo · el pie declara la cobertura de la suma de edades',
  /Los años sumados salen de \$\{/.test(lg) && /edad dictaminada/.test(lg));
t('cintillo · el pie nombra las especies', /Las especies del registro: \$\{especies\.nota\}/.test(lg));
t('cintillo · el pie se oculta si no hay nada que decir',
  /pie\.hidden = renglones\.length === 0;/.test(lg));
t('cintillo · el pie existe en el cuerpo', /id="cifrasPie"/.test(cu));


console.log('══ RECURSOS · normativa, datos y capa ══');
const rec2 = fs.readFileSync('recursos-cuerpo.html','utf8');
t('normativa · el título habla de normatividad',
  /<h2>La normatividad que protege a estos árboles<\/h2>/.test(rec2));
t('normativa · seis tarjetas, no una lista',
  (rec2.match(/class="norma-tarjeta"/g)||[]).length===6 && !/class="recursos-lista"/.test(rec2));
t('normativa · cada tarjeta encabeza con su clave',
  (rec2.match(/class="norma-tarjeta__clave"/g)||[]).length===6);
t('normativa · en rejilla de varias columnas',
  /\.normas-rejilla\{display:grid;grid-template-columns:repeat\(auto-fit/.test(css));
t('datos abiertos · el título es corto y grande', /<h2>Datos abiertos<\/h2>/.test(rec2));
t('datos abiertos · sin el párrafo de formatos', !/El CSV abre en Excel sin configurar nada/.test(rec2));
t('recursos · fuera el perímetro y la taxonomía',
  !/Perímetro de la Ciudad de México/.test(rec2) && !/Clasificación taxonómica/.test(rec2));
t('recursos · fuera las obras de terceros', !/Obras de terceros que utiliza el sitio/.test(rec2));
t('recursos · se conservan los créditos y el cómo citar',
  /id="creditos"/.test(rec2) && /Cómo citar este sitio/.test(rec2));
t('capa · se descarga en los tres formatos',
  /datos\/arboles-patrimoniales-cdmx\.geojson" download/.test(rec2)
  && /datos\/arboles-patrimoniales-cdmx\.kml" download/.test(rec2)
  && /datos\/arboles-patrimoniales-cdmx-shp\.zip" download/.test(rec2));
t('capa · los tres archivos existen en la salida',
  ['geojson','kml','-shp.zip'].every((e)=>fs.existsSync(
    PRUEBA+'datos/arboles-patrimoniales-cdmx'+(e==='-shp.zip'?e:'.'+e))));
t('capa · se genera en la construcción, no a mano',
  /node armar-capa\.js/.test(fs.readFileSync('construir/construir.sh','utf8')));
// Un shapefile que recorta un domicilio a media calle sigue pareciendo un
// domicilio: el ancho se mide sobre los datos y truncar lanza error.
t('capa · el ancho de cada campo se mide sobre los datos',
  /Math\.min\(254, Math\.max\(8, mayor\)\)/.test(fs.readFileSync('construir/armar-capa.js','utf8')));
t('capa · truncar un campo lanza error en vez de callarse',
  /Ensancha el campo/.test(fs.readFileSync('construir/shapefile.js','utf8')));
t('i-Tree · la tarjeta ancha reparte el texto en dos columnas',
  /\.recurso--ancho\{column-count:2/.test(css) && /\.recurso--ancho p\{max-width:none\}/.test(css));

console.log('══ MENSAJES INSTITUCIONALES ══');
const cu2 = fs.readFileSync('cuerpo.html','utf8');
t('mensajes · la sección existe y nace oculta', /<section class="seccion seccion--niebla" id="mensaje" hidden>/.test(cu2));
t('mensajes · nombra a las dos titulares',
  /Clara Brugada Molina/.test(lg) && /Julia Álvarez Icaza/.test(lg));
// Los textos son BORRADORES: se muestran para poder verlos y editarlos, pero
// van marcados en el código como no autorizados. Si se vacían, la sección
// entera deja de mostrarse en vez de dejar un hueco.
t('mensajes · los borradores van marcados como no autorizados',
  (lg.match(/BORRADOR sin autorizar/g)||[]).length===2);
t('mensajes · hay texto en los dos', (lg.match(/mensaje: "[^"]{40,}"/g)||[]).length===2);
t('mensajes · sin texto, la sección entera no se muestra',
  /if \(!conTexto\.length\) \{ seccion\.hidden = true; return; \}/.test(lg));
t('mensajes · el retrato se descubre por archivo',
  /CARPETA_RETRATOS = "assets\/img\/personas"/.test(lg) && /img\.onerror = probar;/.test(lg));
t('mensajes · sin retrato queda el medallón de iniciales',
  /class="mensaje__iniciales"/.test(lg) && /\.mensaje__retrato--foto \.mensaje__iniciales\{display:none\}/.test(css));


console.log('══ LEAFLET DIFERIDO ══');
const dif = fs.readFileSync('leaflet-diferido.js','utf8');
const armar = fs.readFileSync('construir/armar.js','utf8');
const armarF = fs.readFileSync('construir/armar-ficha.js','utf8');
const fl2 = fs.readFileSync('ficha-logica.js','utf8');
// 158 KB que no sirven hasta llegar al mapa, tres pantallas más abajo.
t('diferido · ninguna página carga Leaflet por etiqueta',
  !/<script src="\.\/vendor\/leaflet\.js">/.test(armar)
  && !/<script src="\.\/vendor\/leaflet\.js">/.test(armarF));
t('diferido · y ninguna salida lo trae en el <head>',
  !/<script src="\.\/vendor\/leaflet\.js"><\/script>/.test(port)
  && !/<script src="\.\/vendor\/leaflet\.js"><\/script>/.test(fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8')));
t('diferido · se descarga al acercarse el contenedor',
  /new IntersectionObserver/.test(dif) && /rootMargin: MARGEN_ANTICIPACION/.test(dif));
t('diferido · con margen de anticipación, no justo al verse',
  /MARGEN_ANTICIPACION = "400px"/.test(dif));
// Dos llamadas simultáneas no deben disparar dos descargas.
t('diferido · una sola descarga aunque se pida dos veces',
  /if \(promesa\) return promesa;/.test(dif));
t('diferido · si ya está cargado, no vuelve a pedirlo',
  /if \(typeof window !== "undefined" && window\.L\) return Promise\.resolve\(window\.L\);/.test(dif));
// Sin IntersectionObserver el mapa tiene que seguir apareciendo.
t('diferido · sin IntersectionObserver carga de inmediato',
  /if \(typeof IntersectionObserver === "undefined"\) \{ arrancar\(\); return; \}/.test(dif));
// Si la descarga falla, el aviso ya escrito debe pintarse igual.
t('diferido · si falla la descarga se pinta el aviso, no un recuadro gris',
  /cuandoSeAcerque\(lienzo, montar, montar\)/.test(lg)
  && /cuandoSeAcerque\(lienzo, \(\) => dibujarMapaEjemplar/.test(fl2));
t('diferido · el ensamblador lo expone en las dos páginas',
  /envolver\('leaflet-diferido\.js',\['cargarLeaflet','cuandoSeAcerque'\]\)/.test(armar)
  && /window\.cuandoSeAcerque=cuandoSeAcerque/.test(armarF));


// LA CRUZ PARA CERRAR EL GLOBO.
// Leaflet la sirve en gris #757575 sin fondo, encima de la fotografía del
// ejemplar: 1.1:1 contra el follaje. Era invisible. Lleva disco de papel y
// tinta morada propios; si alguien afloja el selector, Leaflet vuelve a ganar
// porque su hoja se inyecta después de esta.
t('css · la cruz del globo gana a Leaflet por especificidad, no por !important',
  /\.leaflet-container \.leaflet-popup a\.leaflet-popup-close-button\{/.test(css));
t('css · la cruz lleva su propio fondo, no el de la fotografía',
  /a\.leaflet-popup-close-button\{[^}]*background:rgba\(254,247,228/.test(css));
t('css · la cruz usa la tinta morada de la marca, no el gris de Leaflet',
  /a\.leaflet-popup-close-button\{[^}]*color:var\(--jacaranda-hondo\)/.test(css));
t('css · el área táctil de la cruz llega a 44 px',
  /a\.leaflet-popup-close-button::before\{[^}]*width:44px;height:44px/.test(css));
t('css · la cruz tiene foco visible',
  /a\.leaflet-popup-close-button:focus-visible\{outline:3px/.test(css));

// El control que recupera el encuadre no lleva la cuenta en el rótulo: «Ver
// los 13» envejece solo el día que se declare el catorceavo ejemplar.
t('mapa.js · el control dice «Ver todos», sin la cuenta',
  /mapa-control__texto">Ver todos</.test(src) && !/mapa-control__texto">Ver los/.test(src));
t('mapa.js · la cuenta sigue viva en el título, que es donde ayuda',
  /b\.title = `Ver los \$\{conCoords\.length\} ejemplares/.test(src));

console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
if(mal) process.exitCode=1;
