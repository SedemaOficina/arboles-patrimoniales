import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
let ok=0,mal=0; const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };
console.log('\n══ NAVEGACIÓN ══');
const m=fs.readFileSync('menu.js','utf8');
t('menu.js · botón de despliegue con estado accesible', /aria-expanded/.test(m)&&/aria-controls/.test(m));
t('menu.js · marca la sección en pantalla', /IntersectionObserver/.test(m)&&/aria-current/.test(m));
t('menu.js · se cierra al elegir, con Escape y al tocar fuera',
  /ev\.target\.closest\("a"\)/.test(m)&&/Escape/.test(m)&&/closest\(".barra"\)/.test(m));
t('menu.js · es idempotente', /menuListo/.test(m));
t('menu.js · degrada sin IntersectionObserver', /"IntersectionObserver" in window/.test(m));
const css=fs.readFileSync('estilos.css','utf8');
t('css · los enlaces tienen superficie pulsable', /\.barra nav a\{[^}]*padding:8px 12px[^}]*border-radius:999px/.test(css));
t('css · estado de paso del cursor', /\.barra nav a:hover\{background:rgba\(141,73,146/.test(css));
t('css · la sección activa se distingue', /\.barra nav a\[aria-current="true"\]\{color:#fff;background:var\(--jacaranda\)\}/.test(css));
t('css · el botón solo aparece cuando hace falta', /\.barra__abrir\{display:none/.test(css)&&/\.barra__abrir\{display:inline-flex\}/.test(css));
t('css · el menú angosto ya no desaparece', !/\.barra nav\{display:none\}/.test(css));
for (const f of [PRUEBA+'portada-vista-previa.html',PRUEBA+'ficha-vista-previa.html',PRUEBA+'portada.dc.html',PRUEBA+'ficha.dc.html']) {
  const s=fs.readFileSync(f,'utf8');
  t(f+' · trae el módulo del menú', /activarMenu/.test(s));
}

console.log('\n══ HILERA DE EJEMPLARES ══');
const lg = fs.readFileSync('logica.js','utf8');
const dc = fs.readFileSync('dc-logica.js','utf8');

// La ranura sale del dibujo. Con ancho fijo la ilustración de 30 m sobresalía
// 102 px por lado y los ejemplares se encimaban unos con otros.
t('logica.js · la ranura se toma del ancho del dibujo montado',
  /querySelectorAll\("\.bosque__arbol"\)/.test(lg) && /a\.style\.width\s*=\s*Math\.max\(ANCHO_MINIMO_RANURA/.test(lg));
t('logica.js · la ranura tiene piso para el nombre', /ANCHO_MINIMO_RANURA\s*=\s*13\d;/.test(lg));
t('dc-logica.js · la ranura viaja en los datos', /anchoRanura:\s*Math\.max\(132/.test(dc));
t('css · el ancho fijo quedó como piso, no como medida',
  /El ancho es un piso, no la medida/.test(css));
// Al PRINCIPIO, no al final: el renglón fijo del dibujo tiene que arrancar a
// la misma altura en todos, o el nombre que se parte en dos levanta su árbol
// del suelo y la regla de alturas lo lee de más.
t('css · los ejemplares no se tocan y arrancan todos del mismo punto',
  /\.bosque__pista\{position:relative;z-index:1;display:flex;align-items:flex-start;gap:18px/.test(css));

// La barra se fue de la portada; en su lugar va la guía. La ficha conserva la
// barra clásica, así que el modo tiene que ser opcional, no global.
t('menu.js · el modo guía es opcional', /const conGuia = String\(pista\.dataset\.desliza \|\| ""\)\.indexOf\("guia"\)/.test(m));
t('menu.js · la guía dice cómo se recorre', /Arrástrala de lado/.test(m));
t('menu.js · la guía dice que cada árbol abre su ficha', /abres su ficha/.test(m));
t('menu.js · los iconos son trazo, no glifos de fuente',
  /const FLECHAS_LR = '<svg/.test(m) && /const CURSOR = '<svg/.test(m));
t('menu.js · con guía los controles van ARRIBA de la hilera',
  /if \(conGuia\) marco\.insertAdjacentElement\("beforebegin", barra\)/.test(m));
// Y fuera del marco que declara serlo: dentro, el control caía debajo de la
// regla de alturas y la regla arrancaba por encima del suelo.
t('menu.js · el control se monta fuera del marco declarado',
  /const marco = pista\.closest\("\[data-desliza-marco\]"\) \|\| pista;/.test(m));
t('css · la guía se pinta por delante del relleno de la hilera',
  /\.deslizador--guia\{[^}]*z-index:6\}/.test(css));
// La guía es una leyenda, no un control: con borde, fondo y pastilla la gente
// intentaba pulsarla. Debe leerse bien (>=13 px) sin prometer un clic.
t('css · la guía no aparenta ser un botón',
  /\.deslizador__pista-guia\{[^}]*background:none[^}]*\}/.test(css)
  && /\.deslizador__pista-guia\{[^}]*border:0[^}]*\}/.test(css)
  && /\.deslizador__pista-guia\{[^}]*border-radius:0[^}]*\}/.test(css)
  && !/\.deslizador__pista-guia\{[^}]*border-radius:999px/.test(css));
t('css · la guía sigue siendo legible', /\.deslizador__pista-guia\{[^}]*font-size:13\.5px/.test(css));
t('css · lo único pulsable de esa fila son las flechas',
  /\.deslizador__pista-guia\{[^}]*cursor:default/.test(css));
t('logica.js · la hilera ya no dibuja la figura humana',
  !/svgPersona/.test(lg) && !/bosque__ref/.test(lg));
t('css · no quedan estilos de la referencia humana en la hilera', !/\.bosque__ref/.test(css));
t('menu.js · sin riel no se engancha nada que apunte a null',
  /if \(!riel \|\| !tirador\) \{ pintar\(\); return pintar; \}/.test(m));
t('menu.js · las flechas avisan del tope', /b\.disabled = haciaAdelante/.test(m));
t('css · la flecha al tope se apaga en vez de irse', /\.deslizador__paso\[disabled\]\{opacity:\.3/.test(css));
t('css · las flechas son moradas, como el resto de lo pulsable',
  /\.deslizador__paso\{[^}]*color:var\(--jacaranda\)/.test(css) && !/\.deslizador__paso\{[^}]*var\(--verde/.test(css));
t('css · el globo del árbol también es morado', /\.bosque__globo\{[^}]*background:var\(--jacaranda\)/.test(css));

// El arrastre sustituye a la barra: sin él, el ratón se queda sin camino.
t('menu.js · la hilera se arrastra', /export function activarArrastre/.test(m));
t('menu.js · el arrastre no le roba el gesto al dedo', /ev\.pointerType === "touch"/.test(m));
t('menu.js · un arrastre no abre la ficha del árbol donde se soltó',
  /recorrido > UMBRAL/.test(m) && /capture: true, once: true/.test(m));
t('menu.js · el arrastre se engancha con los demás controles', /activarArrastre\(p\)/.test(m));
t('css · la hilera se ve asible', /\.bosque__pista\{cursor:grab\}/.test(css));

// La portada arrancaba 226 px por debajo del filete: demasiado aire. El relleno
// se recortó de 64 a 38 px. Hoy vive en --aire-portada porque el sello, que
// antes encabezaba la sección, se posa sobre la acuarela y ya no está en el
// flujo: el primer renglón arranca en 58 px en pantalla ancha en lugar de los
// 182 px que sumaban relleno más sello. La guarda comprueba el propósito —que
// nadie devuelva el hueco— no la cadena literal de entonces.
t('css · la portada no vuelve al relleno de 64 px',
  /\.portada\{--aire-portada:38px;/.test(css) && /padding:var\(--aire-portada\) 0 0\}/.test(css));
const aireAncho = /@media\(min-width:1000px\)\{\s*\.portada\{--aire-portada:(\d+)px\}/.exec(css);
t('css · el aire de la portada en pantalla ancha se queda por debajo de los 64 px de antes',
  !!aireAncho && Number(aireAncho[1]) < 64);

// El sello firma la acuarela; si vuelve al flujo, reaparecen los 144 px y la
// portada vuelve a decir tres veces el mismo nombre en 150 px de alto.
t('css · el sello se posa sobre la ilustración, no encabeza la portada',
  /\.portada \.envoltura>\.sello\{position:absolute/.test(css));
// La posición se cuelga del alto de la caja de la ilustración para que suba y
// baje con ella. Un top en pixeles fijos se despega en cuanto cambia el clamp.
t('css · la posición del sello se calcula a partir del alto de la ilustración',
  /\.portada \.envoltura>\.sello\{[^}]*top:calc\(clamp\(380px,52vw,600px\)/.test(css));
// Entre 901 y 999 px el hueco pálido del ángulo inferior derecho mide 84 px:
// no sostiene un disco de 128. El sello vuelve al flujo por debajo de 1000 px.
t('css · el sello sobre la acuarela solo aplica de 1000 px en adelante',
  /@media\(min-width:1000px\)\{[\s\S]{0,400}\.portada \.envoltura>\.sello\{position:absolute/.test(css));
// En esa franja el parrafo de entrada se metia debajo del follaje.
t('css · la entrada se acorta en la franja de 901 a 999 px',
  /@media\(min-width:901px\) and \(max-width:999px\)\{\.entrada\{max-width:400px\}\}/.test(css));
t('css · el sello no vuelve a separarse 22 px', /\.sello\{display:block;width:132px;height:auto;margin:0 0 12px\}/.test(css));

const portada = fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8');
const portadaDC = fs.readFileSync(PRUEBA+'portada.dc.html','utf8');
t('portada · la hilera pide el modo guía', /data-desliza="guia"/.test(portada));
t('portada.dc · la hilera pide el modo guía', /data-desliza="guia"/.test(portadaDC));
t('portada.dc · el globo quedó solo con la llamada a la ficha',
  /bosque__globo">Ver su ficha/.test(portadaDC) && !/bosque__globo">\{\{ b\.nombre/.test(portadaDC));
t('portada.dc · la identificación va debajo del árbol', /bosque__pie/.test(portadaDC));

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
