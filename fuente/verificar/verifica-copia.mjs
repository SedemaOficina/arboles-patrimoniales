import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
let ok=0,mal=0; const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };
console.log('\n══ COPIA SIN DEPENDENCIA DEL NÚMERO ══');
const paginas=[PRUEBA+'portada.dc.html',PRUEBA+'ficha.dc.html',PRUEBA+'portada-vista-previa.html',PRUEBA+'ficha-vista-previa.html'];
for(const f of paginas){
  const s=fs.readFileSync(f,'utf8');
  // Se mide sobre el texto visible, no sobre los comentarios del código: un
  // comentario que dice «para los trece ejemplares» no es copia de la página.
  const visible = s.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');
  t(f+' · sin «los trece» ni «conoce a los N»', !/los trece|conoce a los|Los trece/i.test(visible),
    (visible.match(/.{0,30}(los trece|conoce a los).{0,20}/i)||[])[0]||'');
  t(f+' · sin tabla de numerales en palabra', !/"once","doce","trece"/.test(s));
  t(f+' · sin la sección «Repartidos en la ciudad»', !/Repartidos en la ciudad/.test(s));
  t(f+' · sin enlaces a #donde', !/href="(index\.html)?#donde"/.test(s));
}
const p=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8');
t('portada · llamada genérica «Conoce el listado»', /Conoce el listado/.test(p));
t('portada · sin la palabra «padrón» a la vista', !/padrón|Padrón/.test(p.replace(/<!--[\s\S]*?-->/g,'').replace(/\/\/[^\n]*/g,'')), (p.match(/.{0,26}[Pp]adrón.{0,20}/)||[])[0]||'');
t('portada · título genérico del padrón', /Los árboles patrimoniales/.test(p));
t('portada · rótulo genérico de la franja', /Los ejemplares, a escala real/.test(p));
t('portada · filtro «Todos» sin cifra', /etiqueta: "Todos"/.test(p));
// La identificación bajó al pie del árbol, donde se ve siempre. El globo se
// quedó solo con la llamada a la ficha.
t('portada · el pie del árbol identifica al ejemplar sin necesidad de ratón',
  /bosque__nombre/.test(p) && /bosque__alto/.test(p) && /bosque__alcaldia/.test(p));
t('portada · y el globo solo llama a la ficha',
  /class="bosque__globo" aria-hidden="true">Ver su ficha/.test(p));
// El destino se compone en tiempo de ejecución: la constante trae el archivo
// y la plantilla el ancla. Se comprueban las dos piezas.
t('portada · el globo enlaza al archivo de ficha',
  /Ver la ficha completa/.test(p)
  && /RUTA_FICHA = "ficha-vista-previa\.html"/.test(p)
  && /RUTA_FICHA\}#ficha-\$\{esc\(e\.slug\)\}">Ver la ficha completa/.test(p));
// El color pasó a token en la auditoría: --tinta-suave es #413647.
t('portada · la silueta humana es visible sobre crema', /\.persona__cuerpo\{fill:var\(--tinta-suave\)\}/.test(p));
t('portada · barra de desplazamiento propia y ancha', /\.deslizador__tirador\{position:relative;height:14px/.test(p)&&/deslizador__paso/.test(p));
t('portada · los controles de la hilera son morados, no verdes',
  /\.deslizador__paso\{[^}]*color:var\(--jacaranda\)/.test(p) && !/\.deslizador__paso\{[^}]*var\(--verde/.test(p));
t('portada · el globo se posa sobre la copa, no encima de la hilera',
  /\.bosque__globo\{position:absolute;top:10px/.test(p) && !/margin-top:-162px/.test(p));
t('portada · filtros en barra propia sobre el mapa', /class="mapa-filtros" id="mapaFiltros"/.test(p)&&/\.mapa-filtros\{display:flex/.test(p));
t('portada · el mapa y sus controles son un solo marco', /class="mapa-marco"/.test(p));
// El video se mudó a la página de Recursos: en la portada ya no debe estar.
const rec = fs.readFileSync(PRUEBA+'recursos-vista-previa.html','utf8');
t('portada · sin video incrustado', !/youtube-nocookie\.com\/embed/.test(p));
t('recursos · video institucional incrustado', /youtube-nocookie\.com\/embed\/-CK1wiS2m3Q/.test(rec));
t('portada · el video usa dominio sin cookies', !/youtube\.com\/embed/.test(p));
t('recursos · enlace de respaldo al video', /watch\?v=-CK1wiS2m3Q/.test(rec));
t('portada · el respaldo del logotipo imita el lockup oficial', /marca__gob/.test(p)&&/marca__dep/.test(p)&&/Capital de la Transformación/.test(p));
const d=fs.readFileSync(PRUEBA+'portada.dc.html','utf8');
t('recursos.dc · mismo video', /youtube-nocookie\.com\/embed\/-CK1wiS2m3Q/.test(fs.readFileSync(PRUEBA+'recursos.dc.html','utf8')));
t('portada.dc · misma barra de filtros', /class="mapa-filtros" id="mapaFiltros"/.test(d));
console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
