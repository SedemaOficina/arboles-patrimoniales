import fs from 'fs';
import { fileURLToPath } from 'url';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const PRUEBA = '../prueba/';
let ok=0,mal=0; const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };
console.log('\n══ CORRECCIONES DE LA AUDITORÍA ══');

const fl=fs.readFileSync('ficha-logica.js','utf8');
t('La navegación entre ejemplares se retiró por completo',
  !/pintarVecinos|vecinoIzq/.test(fl)
  && !/vecino/.test(fs.readFileSync('ficha-cuerpo.html','utf8'))
  && !/\.vecino/.test(fs.readFileSync('estilos.css','utf8'))
  && !/vecinoIzq|vecinoDer/.test(fs.readFileSync('ficha-dc-logica.js','utf8')));
// El eje del tiempo salió de la ficha: se comprueba que no quede rastro.
t('El eje del tiempo se retiró por completo',
  !/hayEje|escalaTiempo|germinacion/.test(fl)
  && !/eje__/.test(fs.readFileSync('estilos.css','utf8'))
  && !/hayEje/.test(fs.readFileSync('ficha-dc-logica.js','utf8')));

const m=fs.readFileSync('mapa.js','utf8');
t('Los avisos del mapa se buscan donde viven', /\(filtros && filtros\.querySelector\("\[data-aviso\]"\)\)\s*\n?\s*\|\| lista/.test(m));

const lg=fs.readFileSync('logica.js','utf8');
t('El mapa no se reconstruye dos veces', /let mapaCreado = false/.test(lg)&&/\|\| mapaCreado\) return/.test(lg));
t('Los escuchadores se registran una sola vez', (lg.match(/dataset\.escuchando/g)||[]).length>=6);
const dl=fs.readFileSync('dc-logica.js','utf8');
// El CSV ya no se arma en el navegador: lo genera construir/armar-datos.js.
const gen=fs.readFileSync('construir/armar-datos.js','utf8');
t('El CSV neutraliza fórmulas', /\^\[=\+\\-@\\t\\r\]/.test(gen));
// …pero NO a los números: con la regla anterior toda longitud de la Ciudad
// —siempre negativa— salía como texto y Excel dejaba de reconocerla.
t('La neutralización no toca los números',
  /const esNumero = \(v\) => typeof v === 'number'/.test(gen)
  && /if \(!esNumero\(v\) && \/\^\[=\+/.test(gen));
t('Ni la portada ni Design vuelven a armar el CSV',
  !/const columnas = \[/.test(lg) && !/const columnas = \[/.test(dl));

for (const f of ['logica.js','ficha-logica.js','mapa.js']) {
  const s=fs.readFileSync(f,'utf8');
  t(f+' · esc escapa la comilla simple',
    /\[&<>"'\]/.test(s) && /"'": "&#39;"/.test(s));
}
// ---- Lote 3 ----
const mn=fs.readFileSync('menu.js','utf8');
t('El barrido del deslizador se agrupa por cuadro', /requestAnimationFrame/.test(mn)&&/addedNodes\.length \|\| e\.removedNodes\.length/.test(mn));
t('Los observadores se desconectan al desaparecer la hilera', /o\.disconnect\(\)/.test(mn)&&/pista\.isConnected/.test(mn)&&/removeEventListener\("resize"/.test(mn));
t('La geometría reacciona al cambio de contenido', /mo\.observe\(pista, \{ childList: true \}\)/.test(mn));
const ind=fs.readFileSync('indicadores.js','utf8');
t('La unidad se calla cuando no hay cifra', /const uni = /.test(ind));
t('Sin unidades escritas a mano junto a cifras opcionales',
  !/unidad: "(años|litros al año|kg al año|metros)"/.test(ind), (ind.match(/unidad: "(años|litros al año|kg al año|metros)"/)||[])[0]||'');
for (const f of ['logica.js','ficha-logica.js','dc-logica.js','ficha-dc-logica.js','indicadores.js']) {
  t(f+' · el año se lee del reloj', !/= 2026;/.test(fs.readFileSync(f,'utf8')));
}

// ---- Lote 4 ----
const css=fs.readFileSync('estilos.css','utf8');
for (const sel of ['boton--linea','norma--ancha','estado__dato','bosque__copa','bosque__tronco','mapa-capa','eje__decano','dupla'])
  t('CSS sin el huérfano .'+sel, !new RegExp('\\.'+sel+'[{ ,:]').test(css));
t('La llamada a la acción ciudadana existe y se usa',
  /\.llamado\{/.test(css) && /class="llamado"/.test(fs.readFileSync('ficha-cuerpo.html','utf8')));
t('Sin la regla que pisaba la barra de filtros', !/\.mapa-filtros select\{width:100%/.test(css));
t('Sin el punto de quiebre inerte de 980px', !/@media\(max-width:980px\)\{\.mapa-zona/.test(css));
t('Llaves CSS balanceadas', (()=>{const c=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:[^"\\]|\\.)*"/g,'""');
  return c.split('{').length===c.split('}').length;})());
const mp=fs.readFileSync('mapa.js','utf8');
t('mapa.js sin restos de la capa de alcaldías', !/fijarAlcaldia|nombreDeRasgo|Perímetros de las alcaldías/.test(mp));
t('logica.js sin el eje muerto', !/pintarEje|ejePista/.test(fs.readFileSync('logica.js','utf8')));
t('dc-logica.js sin el eje muerto', !/marcasEje|arbolesEje|hayDecano/.test(fs.readFileSync('dc-logica.js','utf8')));
t('El aviso de datos desactualizados ya se pinta',
  /\{\{ avisoDato \}\}/.test(fs.readFileSync('dc-cuerpo.html','utf8')));
const ar=fs.readFileSync('construir/armar.js','utf8');
t('El ensamblador falla si se expone algo inexistente', /ya no define/.test(ar));

console.log('\n══ LISTADO DEL MAPA · fuera el recuadro verde ══');
const cs=fs.readFileSync('estilos.css','utf8');
t('El renglón ya no lleva el recuadro de altura', !/mapa-item__alt/.test(mp) && !/mapa-item__alt/.test(cs));
t('La altura pasó a la línea de datos', /m de alto/.test(mp) && /mapa-item__met/.test(mp));
// La miniatura se descubre en la carpeta del ejemplar; si no hay archivo, el
// <img> se retira y el renglón se queda sin columna de foto. La hoja de
// cálculo ya no interviene: sus rutas heredadas producían imágenes rotas.
t('La miniatura solo aparece si hay fotografía',
  /mapa-item--con-foto/.test(mp)
  && /<img class="mapa-item__foto" data-ejemplar=/.test(mp)
  && /else \{ img\.remove\(\); \}/.test(mp)
  && !/e\.fotos && e\.fotos\.length/.test(mp));
t('No se recurre a la silueta de la especie en el listado', !/svgSilueta|ilustracionDe/.test(mp));
t('La columna de la miniatura solo existe cuando hay foto',
  /\.mapa-item\{[^}]*grid-template-columns:1fr/.test(cs) && /\.mapa-item--con-foto\{grid-template-columns:64px 1fr\}/.test(cs));

console.log('\n══ AVISO DE UBICACIÓN ══');
t('Nace como pista y explica qué hace el botón',
  /mapa-aviso--pista/.test(mp) && /árbol patrimonial más cercano/.test(mp) && /Toca <span class="mapa-aviso__icono">◎/.test(mp));
t('Al ubicarte, la pista cede el lugar al resultado',
  /caja\.classList\.remove\("mapa-aviso--pista"\)/.test(mp));
t('Pista y resultado comparten lugar y se distinguen por estilo',
  /\.mapa-aviso--pista b\{/.test(cs) && /\.mapa-aviso__icono\{/.test(cs) && /\.mapa-aviso--dato\{/.test(cs));
// El aviso bajó a la esquina inferior izquierda: cruzado arriba tapaba el
// centro de la Ciudad, que es donde se apiñan más ejemplares.
t('El aviso se coloca abajo a la izquierda, lejos del centro y de los controles',
  /\.mapa-aviso\{position:absolute;left:12px;bottom:26px/.test(cs));
t('Y se puede cerrar: la pista solo hace falta una vez',
  /\.mapa-aviso__cerrar\{/.test(cs) && /data-cerrar-aviso/.test(mp));
t('El resultado destaca el nombre y la distancia',
  /mapa-aviso__nombre/.test(mp) && /mapa-aviso__pie/.test(mp)
  && /\.mapa-aviso__nombre\{[^}]*color:var\(--jacaranda\)/.test(cs));

console.log('\n══ PERÍMETRO DE LA CIUDAD ══');
const geo=JSON.parse(fs.readFileSync('geo-cdmx.js','utf8').replace(/^[\s\S]*?export const GEO_CDMX = /,'').replace(/;\s*$/,''));
t('El GeoJSON viaja en el código, no en una petición de red',
  /import \{ GEO_CDMX \} from ".\/geo-cdmx.js"/.test(mp) && /MASCARA_CDMX = GEO_CDMX/.test(mp));
t('ponerMascara acepta el objeto ya cargado', /if \(typeof fuente === "string"\)/.test(mp));
t('Trae máscara y contorno', geo.features.length===2
  && geo.features.some(f=>f.properties.clase==='mascara')
  && geo.features.some(f=>f.properties.clase==='contorno'));
{
  // La máscara debe ser un rectángulo del mundo con la Ciudad como hueco:
  // si el hueco se pierde, el recorte tapa también el centro del mapa.
  const m0=geo.features.find(f=>f.properties.clase==='mascara').geometry.coordinates;
  const dentro=(pt,anillo)=>{let d=false;for(let i=0,j=anillo.length-1;i<anillo.length;j=i++){
    const [xi,yi]=anillo[i],[xj,yj]=anillo[j];
    if((yi>pt[1])!==(yj>pt[1]) && pt[0] < (xj-xi)*(pt[1]-yi)/(yj-yi)+xi) d=!d;} return d;};
  const zocalo=[-99.1332,19.4326], toluca=[-99.6569,19.2926];
  t('El Zócalo queda dentro del hueco: el mapa no se tapa a sí mismo',
    dentro(zocalo,m0[0]) && dentro(zocalo,m0[1]));
  t('Toluca queda bajo la máscara', dentro(toluca,m0[0]) && !dentro(toluca,m0[1]));
}
t('El ensamblador incrusta el perímetro en la versión de una sola pieza',
  /geo-cdmx\.js/.test(fs.readFileSync('construir/armar.js','utf8'))
  && /GEO_CDMX/.test(fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8')));

console.log('\n══ SERVICIOS AMBIENTALES · lo que no se pudo estimar ══');
// Cambio de criterio: un servicio sin cifra ya NO se explica, se omite. Cuatro
// o cinco tarjetas con raya seguidas convertían el panel en un inventario de
// lo que falta y el ejemplar quedaba descrito por sus ausencias.
// El panel del mapa se retiró: ya no hay tarjetas que omitir ni identidad que
// pintar. Lo que sobrevive de indicadores.js es el modo agregado.
t('indicadores.js solo conserva el modo agregado',
  !/indicadoresEjemplar/.test(ind) && !/No se pudo estimar este servicio/.test(ind)
  && !/No fue posible determinar su edad/.test(ind));
t('Y sigue declarando la cobertura de cada suma',
  /function cobertura\(r\)/.test(ind) && /Calculado sobre \$\{r\.con\} de \$\{r\.de\}/.test(ind));
const fcuerpo=fs.readFileSync('ficha-cuerpo.html','utf8');
const fdc=fs.readFileSync('ficha-dc-cuerpo.html','utf8');
t('La ficha avisa cuáles renglones no se pudieron estimar',
  /no se pudieron estimar para este ejemplar/.test(fl) && /haySin/.test(fl));
t('El glosario metodológico está en las dos versiones',
  /glosario-servicios/.test(fcuerpo) && /glosario-servicios/.test(fdc) && /\.glosario-servicios\{/.test(cs));
t('Explica los cinco contaminantes que reporta i-Tree',
  ['Monóxido de carbono (CO)','Dióxido de nitrógeno (NO₂)','Ozono (O₃)','Partículas (PM 2.5)','Dióxido de azufre (SO₂)']
    .every(x=>fcuerpo.includes(x)));
t('Explica por qué la energía puede salir en negativo',
  /hoja perenne puede tapar el sol de invierno/.test(fcuerpo));
t('Dice qué beneficios no lleva cifra', /no pone cifra a todo/.test(fcuerpo));
t('La versión Design admite más de una nota por grupo',
  /<sc-for list="\{\{ gr.notas \}\}" as="nt">/.test(fdc)
  && /notas\.length > 0/.test(fs.readFileSync('ficha-dc-logica.js','utf8')));

console.log('\n══ ENSAMBLADO ══');
{
  const av=fs.readFileSync('construir/armar-ficha.js','utf8'), ap=fs.readFileSync('construir/armar.js','utf8');
  t('Los ensambladores fallan si el marcador de exportación cambió',
    /no encontré/.test(av) && /no encontré/.test(ap));
  const pv=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'), fv=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8');
  t('Ningún «export» sobrevive al ensamblado',
    !/\bexport (function|const|let|class|default|\{)/.test(pv) && !/\bexport (function|const|let|class|default|\{)/.test(fv));
  t('Ningún «import» sobrevive al ensamblado',
    !/^\s*import .*from ".\//m.test(pv) && !/^\s*import .*from ".\//m.test(fv));
}

console.log('\n══ POSTULACIÓN · secuencia, no rejilla ══');
{
  const pv=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        dc=fs.readFileSync(PRUEBA+'portada.dc.html','utf8'),
        cs2=fs.readFileSync('estilos.css','utf8');
  for (const [nom,s] of [['una pieza',pv],['Design',dc]]) {
    t(nom+' · la rejilla de siete tarjetas desapareció',
      !/class="pasos"/.test(s) && !/class="paso__numero"/.test(s));
    t(nom+' · cinco hitos numerados en una sola línea',
      (s.match(/class="linea__hito"/g)||[]).length===5
      && (s.match(/class="linea__numero"/g)||[]).length===5);
    t(nom+' · la numeración va 1,2,3,4,5 en orden',
      (s.match(/class="linea__numero" aria-hidden="true">(\d)</g)||[]).join('')
        .replace(/\D/g,'')==='12345');
    t(nom+' · cada hito dice quién lo hace',
      (s.match(/class="linea__actor"/g)||[]).length===5
      && (s.match(/Lo haces tú/g)||[]).length===3
      && (s.match(/Lo hace la autoridad/g)||[]).length===2);
    // El bloque de decisión de ruta —Patrimonio Natural frente a Patrimonio
    // Biocultural— y el de «¿Qué gana el árbol con la Declaratoria?» se
    // retiraron por decisión editorial: la sección explica cómo se postula, y
    // el encuadre entre las dos categorías se resuelve al recibir la
    // solicitud, no en la página.
    t(nom+' · sin el bloque de decisión de ruta',
      !/class="ruta"/.test(s) && !/Patrimonio Biocultural/.test(s)
      && !/consentimiento libre y previo/.test(s));
    t(nom+' · sin el bloque de qué gana el árbol',
      !/class="postula-dudas"/.test(s) && !/¿Qué gana el árbol con la Declaratoria\?/.test(s));
    t(nom+' · el bloque de predio privado se retiró por completo',
      !/titularidad del predio/.test(s) && !/Artículo 52 y artículo 56, fracción II/.test(s));
    // Las citas que sostienen los cinco hitos de la secuencia siguen ahí. Las
    // de los bloques retirados se fueron con ellos.
    t(nom+' · los hitos conservan su cita normativa',
      ['artículo 54','Artículo 55','Artículo 56, fracciones IV y V','Artículo 57',
       '60 días naturales'].every(c=>s.includes(c)));
  }
  t('El hilo conductor se dibuja y se detiene en el último hito',
    /\.linea::before\{content:""/.test(cs2) && /bottom:22px/.test(cs2));
}



console.log('\n══ AUDITORÍA 360 · lo que se corrigió, para que no vuelva ══');
{
  const loader = fs.readFileSync('patrimoniales-loader.js','utf8');
  const est = fs.readFileSync('estilos.css','utf8');
  const af = fs.readFileSync('construir/armar-ficha.js','utf8');
  const ar = fs.readFileSync('construir/armar-recursos.js','utf8');
  const adc = fs.readFileSync('construir/armar-dc.js','utf8');
  const pied = fs.readFileSync('parciales/pie-design.html','utf8');
  const fl = fs.readFileSync('ficha-logica.js','utf8');
  const reg = JSON.parse(fs.readFileSync('datos/registro.json','utf8'));

  /* Una celda con fecha se convertía en un entero de siete dígitos: la ficha
     de la Glorieta llegó a publicar «12,052,025 kg de CO2 al año». */
  t('datos · una celda con forma de fecha no se convierte en número',
    /if \(esFecha\(s0\)\) return null;/.test(loader) && /export function esFecha/.test(loader));
  t('datos · ni dos grupos de dígitos separados por letras',
    /if \(\/\\d\[\^\\d\.,\]\+\\d\/\.test\(s\)\) return null;/.test(loader));
  t('datos · no queda ningún valor con forma de fecha en el registro',
    (reg.ejemplares||reg).every((e) => Object.values(e.serviciosAmbientales||{})
      .every((v) => !(typeof v === 'number' && Number.isInteger(v) && Math.abs(v) >= 1e6))));

  /* La galería sondeaba los originales para contarlos: 2.9 MB por ficha. */
  t('peso · el censo de fotos no descarga los originales',
    /existeImagen\(rutaMiniatura\(id, n, e\)\)/.test(fs.readFileSync('fotos.js','utf8')));
  t('peso · las ilustraciones sirven el tamaño medio, con 2x en srcset',
    /taxodium-media\.webp/.test(fs.readFileSync('especies.js','utf8'))
    && /export function srcsetIlustracion/.test(fs.readFileSync('especies.js','utf8')));
  t('peso · el fondo de la portada también',
    /image-set\(url\("assets\/img\/portada\/ficus-media\.webp"\) 1x/.test(est));

  /* El dorado de marca daba 2.57-2.98:1 y el foco es un elemento de interfaz. */
  t('accesibilidad · el anillo de foco tiene color propio, con contraste',
    /--foco:#8F6E3E/.test(est) && /:focus-visible\{outline:3px solid var\(--foco\)/.test(est));
  t('accesibilidad · el renglón de datos se apila en pantallas angostas',
    /@media\(max-width:560px\)\{\n\s*\.dato-linea\{display:block\}/.test(est));

  /* Un canonical que apunta a otra página impide indexar esta. */
  t('metadatos · la ficha compone los suyos con el ejemplar',
    /<link rel="canonical" href="\$\{_urlFicha\}">/.test(af)
    && /<title>\$\{_esc\(_titulo\)\}<\/title>/.test(af));
  t('metadatos · Recursos tiene canonical, og:url y twitter completos',
    /<link rel="canonical" href="\$\{SITIO\.url\(NOMBRES\.recursos\)\}">/.test(ar)
    && /twitter:image/.test(ar));

  /* La expresión sin anclar daba esPortada=true en las tres páginas DC. */
  t('Design · esPortada solo es cierto en la portada',
    /\/\^dc-cuerpo\\\.html\$\/\.test\(cuerpo\)/.test(adc));
  t('Design · su pie usa los mismos testigos que el del sitio',
    (pied.match(/__PORTADA__/g)||[]).length >= 8 && !/href="#inicio"/.test(pied));

  /* Nueve fichas publicaban «1 kg/año» de carbono con cero decimales fijos. */
  t('cifras · los decimales los decide la magnitud',
    /const decimales = \(v\) => \(Math\.abs\(v\) < 10 \? 2 : Math\.abs\(v\) < 100 \? 1 : 0\);/.test(fl));
  t('cifras · el pie de cobertura cuenta bien las tarjetas',
    !/Las cuatro cifras/.test(fs.readFileSync('logica.js','utf8'))
    && !/Las cuatro cifras/.test(fs.readFileSync('dc-logica.js','utf8')));

  t('marcado · no quedan restos del panel retirado',
    !/panel-datos/.test(fs.readFileSync('cuerpo.html','utf8'))
    && !/panel-datos/.test(fs.readFileSync('dc-cuerpo.html','utf8')));
}

console.log('\n══ ENSAMBLADO · las listas de exposición no pueden quedarse cortas ══');
/* Los ensambladores encierran cada módulo en un IIFE y publican en window una
   lista de nombres ESCRITA A MANO. Tres veces ya se ha importado un símbolo
   nuevo sin añadirlo a esa lista, y el fallo no aparece al construir: aparece
   en el navegador, con la mitad de la página en blanco y un ReferenceError.
   Esta prueba cruza lo que cada módulo IMPORTA con lo que el ensamblador
   EXPONE, y falla antes de llegar al navegador. */
{
  const leer = (f) => fs.readFileSync(f, 'utf8');
  // Qué importa cada consumidor de cada módulo inlineado.
  const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importados = (archivo, modulo) => {
    const src = leer(archivo);
    const re = new RegExp('import\\s*\\{([^}]*)\\}\\s*from\\s*"\\./' + escapar(modulo) + '"', 'g');
    const fuera = [];
    let m;
    while ((m = re.exec(src))) fuera.push(...m[1].split(',').map((x) => x.trim()).filter(Boolean));
    return fuera;
  };
  const expuestos = (ensamblador, modulo) => {
    const src = leer(ensamblador);
    const lista = new RegExp("envolver\\('" + escapar(modulo) + "',\\[([^\\]]*)\\]").exec(src);
    if (lista) return lista[1].split(',').map((x) => x.trim().replace(/['"]/g, ''));
    // armar-ficha.js escribe la lista a mano, con window.X=X
    return [...src.matchAll(/window\.(\w+)\s*=/g)].map((m) => m[1]);
  };

  const casos = [
    // Cada ensamblador se cruza con LOS MÓDULOS QUE ÉL INLINEA, no con todos:
    // armar.js arma la portada (logica.js + mapa.js) y armar-ficha.js la ficha.
    ['construir/armar.js',       'especies.js',    ['logica.js']],
    ['construir/armar.js',       'fotos.js',       ['logica.js', 'mapa.js']],
    ['construir/armar.js',       'indicadores.js', ['logica.js']],
    ['construir/armar.js',       'leaflet-diferido.js', ['logica.js']],
    ['construir/armar-ficha.js', 'especies.js',    ['ficha-logica.js']],
    ['construir/armar-ficha.js', 'fotos.js',       ['ficha-logica.js']],
    ['construir/armar-ficha.js', 'leaflet-diferido.js', ['ficha-logica.js']],
  ];
  for (const [ens, mod, consumidores] of casos) {
    const publica = expuestos(ens, mod);
    const pide = [...new Set(consumidores.flatMap((c) => importados(c, mod)))];
    const faltan = pide.filter((n) => !publica.includes(n));
    t(`${ens.split('/').pop()} publica todo lo que se le pide de ${mod}`,
      faltan.length === 0, faltan.join(', '));
  }
}

console.log('\n══ FICHA · el recuadro morado es ahora el mapa del ejemplar ══');
{
  const fv=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8'),
        fd=fs.readFileSync(PRUEBA+'ficha.dc.html','utf8'),
        cs3=fs.readFileSync('estilos.css','utf8'),
        fdl=fs.readFileSync('ficha-dc-logica.js','utf8');
  for (const [nom,s] of [['una pieza',fv],['Design',fd]]) {
    t(nom+' · el texto del recuadro morado desapareció',
      !/Abre la ubicación exacta del ejemplar en Google Maps/.test(s));
    t(nom+' · hay lienzo de mapa y su pie', /class="mapa-caja__lienzo"/.test(s) && /mapa-caja__pie/.test(s));
    // El botón cuelga del recuadro del mapa, entre el lienzo y su pie. Se mide
    // sobre el bloque <div class="ubicacion">, no sobre el archivo entero: la
    // hoja de estilos nombra las mismas clases más arriba.
    {
      const i = s.indexOf('<div class="ubicacion">');
      const bloque = i < 0 ? '' : s.slice(i, s.indexOf('</section>', i));
      const bot = bloque.indexOf('class="ubicacion__accion"');
      t(nom+' · el botón cuelga del mapa, no de la tabla de datos',
        bot > bloque.indexOf('mapa-caja__lienzo')
        && bot < bloque.indexOf('mapa-caja__pie')
        && bloque.indexOf('class="tabla-datos"')>=0
        && bloque.indexOf('class="tabla-datos"') < bloque.indexOf('class="mapa-caja"'));
    }
    t(nom+' · Leaflet está cargado', /leaflet/i.test(s));
  }
  // Es vista de contexto, no herramienta de navegación: sin controles ni
  // arrastre, y a zoom 16 para no recortar los nombres de calle.
  t('El mapa de la ficha es una vista de contexto, no un navegador',
    /zoom: 16, scrollWheelZoom: false, zoomControl: false/.test(fl) && /dragging: false/.test(fl));
  t('Se destruye antes de reconstruir: Leaflet no admite dos mapas en un nodo',
    /if \(mapaFicha\) \{ mapaFicha\.remove\(\)/.test(fl)
    && /if \(this\._mapa\) \{ this\._mapa\.remove\(\)/.test(fdl));
  t('Sin coordenadas se dice, no se deja un recuadro gris',
    /mapa-caja__vacio/.test(fl) && /mapa-caja__vacio/.test(fs.readFileSync('ficha-dc-cuerpo.html','utf8')));
  // El punto plano se confundía con los marcadores comerciales del mapa base.
  t('El ejemplar lleva pin propio con silueta de árbol',
    /\.pin-arbol__gota\{fill:var\(--jacaranda\)/.test(cs3) && /pin-arbol__copa/.test(fl));
  t('El botón se lee sobre el crema, no solo sobre fondo oscuro',
    /\.enlace--mapa\{border-color:var\(--jacaranda\);color:var\(--jacaranda\)/.test(cs3)
    && /\.bloque--oscuro \.enlace--mapa\{/.test(cs3));
  t('El mapa interactivo no se imprime',
    /\.mapa-caja,[\s\S]{0,500}?display: none !important;/.test(cs3.slice(cs3.indexOf('@media print'))));
}

console.log('\n══ DATO FALTANTE · el sitio lo dice, no lo disimula ══');
{
  // Este bloque comprobaba contra pendientes.html que pendientes.html decía
  // ciertas cosas: circular. Una de esas aserciones daba verde por «la ruta
  // biocultural quedó documentada» mientras el sitio NO tenía ese contenido en
  // ninguna parte —se verificó la afirmación contra el documento que la hacía,
  // no contra la página—. Ahora se comprueba el comportamiento real.
  const fv=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8');
  const fl2=fs.readFileSync('ficha-logica.js','utf8');
  t('La ficha declara el dato faltante en lugar de fingir un cero',
    /Sin determinar/.test(fv));
  t('Las tarjetas sin dato no se dibujan vacías: se omiten',
    /\.filter\(\(\[, url\]\) => url\)/.test(fl2));
  t('Y si no queda ninguna fuente, el bloque entero se oculta',
    /if \(!fuentes\.length\) \{ if \(bloque\) bloque\.style\.display = "none"/.test(fl2));
  // La cobertura de una suma se declara: 1,200 años salen de 2 de 13 ejemplares.
  const pv7=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8');
  t('El cintillo declara cuántos ejemplares tienen edad dictaminada',
    /ejemplares tienen edad dictaminada/.test(pv7));
}

console.log('\n══ TARJETAS · fuera la barrita del punto verde ══');
{
  const pv=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        dc=fs.readFileSync(PRUEBA+'portada.dc.html','utf8'),
        cs4=fs.readFileSync('estilos.css','utf8'),
        lg=fs.readFileSync('logica.js','utf8'),
        dl=fs.readFileSync('dc-logica.js','utf8');
  t('El eje desapareció de las dos versiones y de la hoja de estilos',
    !/ficha__eje/.test(pv) && !/ficha__eje/.test(dc) && !/\.ficha__eje/.test(cs4));
  t('Y con él su cálculo: no queda código muerto',
    !/tieneEje|posicionEje/.test(dl) && !/construirEscala|anioGerminacion|ANIO_ACTUAL/.test(lg));
  t('La tarjeta conserva nombre, especie, ubicación y etiquetas',
    /ficha__especie/.test(pv) && /ficha__meta/.test(pv) && /class="etiquetas"/.test(pv));
}

console.log('\n══ «QUÉ SIGNIFICA» · protección sin cerrarle la puerta a la Secretaría ══');
{
  const pv=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        dc=fs.readFileSync(PRUEBA+'portada.dc.html','utf8'),
        ind=fs.readFileSync('indicadores.js','utf8');
  for (const [nom,s] of [['una pieza',pv],['Design',dc]]) {
    t(nom+' · el titular ya no es la prohibición',
      /Un árbol declarado patrimonio se cuida distinto/.test(s)
      && !/Un árbol patrimonial no se derriba a cambio de plantar otro/.test(s));
    t(nom+' · la entrada no afirma que solo se pueda intervenir por riesgo',
      !/solo puede intervenirse si representa un riesgo real y presente/.test(s));
    t(nom+' · la entrada sí dice que la Secretaría dictamina caso por caso',
      /dictamen técnico de la Secretaría del Medio Ambiente, que lo resuelve caso por caso/.test(s));
    t(nom+' · la restricción vive en la sección jurídica, con su numeral',
      s.indexOf('NADF-001-RNAT-2015 · numeral 7.5')>0
      && /No son susceptibles de ser derribados a cambio de una restitución/.test(s)
      && /salvo en caso de representar un riesgo real y presente/.test(s));
    // El párrafo sobre el turno del expediente se retiró por decisión editorial.
    t(nom+' · la tarjeta de la norma lleva su nombre completo',
      /Norma Ambiental NADF-001-RNAT-2015 · numeral 7.5/.test(s)
      && !/turna el expediente a la Secretaría del Medio Ambiente/.test(s));
    t(nom+' · el titular de protección va después de las cifras, no en la portada',
      s.indexOf('Un árbol declarado patrimonio se cuida distinto')>s.indexOf('class="cifras"'));
  }
  t('La cifra del listado ya no promete que nunca se derriban',
    !/No pueden derribarse a cambio de plantar otro/.test(ind)
    && !/esquema ordinario de compensación/.test(ind));
}

console.log('\n══ PALETA · el verde no entra al fondo profundo ══');
{
  const cs5=fs.readFileSync('estilos.css','utf8');
  const bloqueOscuro = cs5.split('\n').filter(l =>
    /\.grupo\{|\.grupo h3\{|\.servicio\{|\.servicio strong\{|\.cifra strong\{|\.glosario-servicios\{|\.ficha__retrato\{|\.ficha__edad small\{/.test(l));
  t('Ningún componente sobre jacaranda profundo usa verde',
    bloqueOscuro.length >= 7 && !bloqueOscuro.some(l => /verde-luz|143,199,127|verde-bosque/.test(l)),
    bloqueOscuro.filter(l=>/verde/.test(l)).join(' | '));
  t('El acento de ese fondo es el dorado claro, declarado con su contraste',
    /--dorado-luz:#D9BC91;.*9\.26:1/.test(cs5)
    && /\.cifra strong\{[^}]*var\(--dorado-luz\)/.test(cs5)
    && /\.grupo h3\{[^}]*var\(--dorado-luz\)/.test(cs5));
  t('La regla queda escrita en la propia paleta',
    /el verde solo va sobre fondo\s*\n?\s*claro/.test(cs5));
  // El verde vive en lo que ES vegetación y en la cartografía; el morado, en
  // lo institucional. El panel del mapa se retiró, así que su cabecera verde
  // ya no participa de la prueba.
  t('El verde sigue donde es vegetación y cartografía',
    /\.pin\{[^}]*var\(--verde-bosque\)/.test(cs5)
    && /\.silueta__copa\{fill:var\(--verde-hoja\)/.test(cs5)
    && /\.globo-mapa__boton\{[^}]*background:var\(--verde-bosque\)/.test(cs5));
  t('La nota del bosque dejó de usar verde lima sobre crema',
    /\.bosque__nota strong\{color:var\(--verde-bosque\)/.test(cs5));
}

console.log('\n══ LA FICHA EN PAPEL ══');
{
  const cs6=fs.readFileSync('estilos.css','utf8');
  const fv=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8'),
        fd=fs.readFileSync(PRUEBA+'ficha.dc.html','utf8');
  for (const [nom,s] of [['una pieza',fv],['Design',fd]]) {
    t(nom+' · lleva membrete con los dos logotipos',
      /class="hoja-cabeza"/.test(s) && /hoja-cabeza__gob/.test(s) && /hoja-cabeza__emblema/.test(s)
      && /logo-institucional-grande\.png/.test(s) && /emblema-media\.png/.test(s));
    t(nom+' · y pie de hoja con la fuente y el teléfono de denuncias',
      /class="hoja-pie"/.test(s) && /55 5265 0780/.test(s));
  }
  t('Membrete y pie no se ven en pantalla',
    /\.hoja-cabeza, \.hoja-pie \{ display: none; \}/.test(cs6));
  t('En papel sí, y con el filete institucional',
    /\.hoja-cabeza \{ display: flex !important;[\s\S]{0,220}?var\(--jacaranda\)/.test(cs6));
  t('Se descarta lo que solo funciona en pantalla',
    ['.galeria','.mapa-caja','.escala__lienzo','.vista-calle','.glosario-servicios','#fVisita','.barra']
      .every(x => cs6.slice(cs6.indexOf('@media print')).includes(x)));
  t('Las medidas sobreviven a que se vaya la ilustración',
    /\.escala \{ display: block !important; \}/.test(cs6));
  t('Los fondos profundos se apagan hijo por hijo, no solo el contenedor',
    /\.resumen, \.resumen > \*, \.resumen__nota/.test(cs6));
  t('Taxonomía y medidas van a dos columnas para no comerse una hoja',
    /\.tabla-datos \{ columns: 2;/.test(cs6) && /\.medidas \{ display: grid !important; grid-template-columns: 1fr 1fr/.test(cs6));
  t('Las secciones pueden partirse; los bloques pequeños no',
    /\.grupo, \.medida, \.dato-linea, \.hoja-pie, \.observacion \{ break-inside: avoid; \}/.test(cs6));
}

console.log('\n══ NOMBRE DEL SITIO ══');
{
  const pv=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        dc=fs.readFileSync(PRUEBA+'portada.dc.html','utf8'),
        fv=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8');
  t('El titular de la portada dice Árboles patrimoniales',
    /<h1>Árboles<em>patrimoniales<\/em><\/h1>/.test(pv) && /<h1>Árboles<em>patrimoniales<\/em><\/h1>/.test(dc));
  t('«Guardianes del tiempo» ya no aparece en ninguna pieza',
    !/Guardianes/.test(pv) && !/Guardianes/.test(dc) && !/Guardianes/.test(fv));
  t('Título de pestaña y metadatos para compartir, actualizados',
    /<title>Árboles patrimoniales de la Ciudad de México · Secretaría del Medio Ambiente<\/title>/.test(pv)
    && /og:title" content="Árboles patrimoniales de la Ciudad de México"/.test(pv));
}

console.log('\n══ RESUMEN DE LA FICHA · fuera todo lo derivado de la edad ══');
{
  const fl2=fs.readFileSync('ficha-logica.js','utf8'),
        fdl2=fs.readFileSync('ficha-dc-logica.js','utf8'),
        fdc2=fs.readFileSync('ficha-dc-cuerpo.html','utf8'),
        fv2=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8'),
        fd2=fs.readFileSync(PRUEBA+'ficha.dc.html','utf8');
  for (const [nom,s] of [['una pieza',fv2],['Design',fd2]]) {
    t(nom+' · sin «Años de edad estimada», «Germinó hacia» ni «Generaciones humanas»',
      !/Años de edad estimada/.test(s) && !/Germinó hacia/.test(s) && !/Generaciones humanas/.test(s));
    t(nom+' · sin la nota de edad no estimada',
      !/La edad de este ejemplar no se pudo estimar/.test(s));
    t(nom+' · el resumen lleva las cuatro medidas completas',
      /Altura total/.test(s) && /Diámetro del tronco/.test(s) && /Extensión de copa/.test(s) && /Alcaldía/.test(s));
  }
  t('Y no queda código muerto del cálculo',
    !/const generaciones = /.test(fl2) && !/sinEdadEstimada/.test(fdl2) && !/sinEdadEstimada/.test(fdc2));
}

console.log('\n══ NAVEGACIÓN ENTRE PÁGINAS ══');
{
  const pv3=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        fv3=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8'),
        pd3=fs.readFileSync(PRUEBA+'portada.dc.html','utf8'),
        fd3=fs.readFileSync(PRUEBA+'ficha.dc.html','utf8');
  t('Ningún testigo de ruta sobrevive al ensamblado',
    ![pv3,fv3,pd3,fd3].some(x => /__PORTADA__|__FICHA__/.test(x)));
  t('La portada de una pieza apunta al archivo de ficha',
    /RUTA_FICHA = "ficha-vista-previa\.html"/.test(pv3));
  t('La portada Design apunta a su propia ficha',
    /RUTA_FICHA = "ficha\.dc\.html"/.test(pd3));
  t('El menú de la ficha regresa a la portada, no a anclas inexistentes',
    /href="portada-vista-previa\.html#listado"/.test(fv3)
    && /href="portada-vista-previa\.html#mapa"/.test(fv3)
    && !/<a href="#listado"/.test(fv3));
  t('El mapa del sitio en el pie de la ficha también',
    /href="portada-vista-previa\.html#postula"/.test(fv3));
  t('Los tres ensambladores admiten los nombres de producción',
    ['construir/armar.js','construir/armar-ficha.js','construir/armar-dc.js'].every(a =>
      /process\.env\.RUTA_PORTADA/.test(fs.readFileSync(a,'utf8'))
      && /process\.env\.RUTA_FICHA/.test(fs.readFileSync(a,'utf8'))));
  t('Tarjeta, árbol del bosque y globo del mapa usan la misma ruta',
    (fs.readFileSync('logica.js','utf8').match(/\$\{RUTA_FICHA\}#ficha-/g)||[]).length===2
    && /\$\{RUTA_FICHA\}#ficha-/.test(fs.readFileSync('mapa.js','utf8')));
}

console.log('\n══ PÁGINA DE RECURSOS ══');
{
  const rec=fs.readFileSync(PRUEBA+'recursos-vista-previa.html','utf8'),
        recdc=fs.readFileSync(PRUEBA+'recursos.dc.html','utf8'),
        pv4=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        fv4=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8'),
        pd4=fs.readFileSync(PRUEBA+'portada.dc.html','utf8');
  t('Existe en las dos versiones', rec.length>50000 && recdc.length>50000);
  // El ancla del marco normativo pasó de #normativa a #normatividad: es el
  // destino de la liga que la portada añadió al final de «Lo que dice la ley»,
  // y las dos secciones legales tenían que poder señalarse entre sí.
  t('Trae las cinco secciones', ['id="videos"','id="normatividad"','id="datos"','id="metodologia"','id="directorio"']
    .every(x=>rec.includes(x)));
  t('El video salió de la portada y vive aquí',
    !/youtube-nocookie/.test(pv4) && !/youtube-nocookie/.test(pd4) && /youtube-nocookie/.test(rec));
  t('Explica i-Tree y enlaza al sitio oficial',
    /Qué es i-Tree/.test(rec) && /itreetools\.org/.test(rec)
    && /Servicio Forestal del Departamento de Agricultura/.test(rec));
  t('La portada remite a esa explicación',
    /Qué es i-Tree y cómo se calculan estas cifras/.test(pv4)
    && /recursos-vista-previa\.html#metodologia/.test(pv4));
  t('Explica la UICN y enlaza a la Lista Roja',
    /iucnredlist\.org\/es/.test(rec) && /iucnredlist\.org\/es/.test(fv4));
  t('Recursos está en el menú de las tres páginas',
    [rec,pv4,fv4].every(x=>/>Recursos<\/a>/.test(x)));
  t('Ningún testigo de ruta sobrevive', !/__RECURSOS__/.test(rec+pv4+fv4+pd4+recdc));
  t('El ensamblador de Recursos admite el nombre de producción',
    /process\.env\.RUTA_RECURSOS/.test(fs.readFileSync('construir/armar-recursos.js','utf8')));
}

console.log('\n══ NOTA DE LA UICN EN LA FICHA ══');
{
  const fv5=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8'),
        cs7=fs.readFileSync('estilos.css','utf8');
  // La aclaración pasó al pie de la propia tabla: al fondo de la sección
  // obligaba a bajar la vista para saber qué significa la sigla.
  t('La sigla se aclara junto al renglón que la usa',
    /medidas__aclara/.test(fv5) && /Unión Internacional para la Conservación de la Naturaleza/.test(fv5));
  t('Aclara que la categoría es de la especie, no del ejemplar',
    /riesgo de extinción de la especie, no de este ejemplar/.test(fv5));
  t('La tabla separa lo medido del ejemplar de lo que describe a la especie',
    /Medido en este ejemplar/.test(fv5) && /De la especie, no de este árbol/.test(fv5));
  t('Y lo dice con palabras, no solo cambiando de color',
    /\.medidas__titulo\{[^}]*text-transform:uppercase/.test(cs7));
  t('La aclaración tiene estilo propio, en letra chica', /\.medidas__aclara\{[^}]*font-size:var\(--t-nota\)/.test(cs7));
}

console.log('\n══ ARTÍCULO 107 · el porqué de este sitio ══');
{
  const pv6=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        pd6=fs.readFileSync(PRUEBA+'portada.dc.html','utf8'),
        cs8=fs.readFileSync('estilos.css','utf8');
  for (const [nom,s] of [['una pieza',pv6],['Design',pd6]]) {
    t(nom+' · el artículo 107 va destacado, no perdido en la lista',
      /class="cumplimiento"/.test(s)
      && /Este sitio web es parte del cumplimiento de la ley/.test(s)
      && /Sistema de Información Ambiental/.test(s));
  }
  t('Y tiene tratamiento visual propio', /\.cumplimiento\{/.test(cs8));
}

console.log('\n══ AUDITORÍA INTEGRAL · correcciones ══');
{
  const cs9=fs.readFileSync('estilos.css','utf8'),
        mp9=fs.readFileSync('mapa.js','utf8'),
        lg9=fs.readFileSync('logica.js','utf8'),
        pv9=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        fv9=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8'),
        rc9=fs.readFileSync(PRUEBA+'recursos-vista-previa.html','utf8');

  // --- accesibilidad ---
  t('Las tres páginas tienen enlace de salto al contenido',
    [pv9,fv9,rc9].every(x=>/class="saltar" href="#contenido"/.test(x) && /<main id="contenido">/.test(x)));
  t('Y es fijo, no absoluto: se ve aunque la página esté desplazada',
    /\.saltar\{position:fixed/.test(cs9));
  t('El ancla #inicio existe: el logotipo lleva a algún lado',
    /<section class="portada" id="inicio">/.test(pv9));
  // El panel del mapa se retiró: ya no hay datos que rotular ahí.
  t('El mapa ya no arma el panel de indicadores',
    !/data-panel-lista/.test(mp9) && !/pintarPanel/.test(mp9));

  // --- contraste ---
  t('No quedan estilos huérfanos del panel',
    !/\.panel-datos/.test(cs9) && !/\.dato__/.test(cs9));
  t('La etiqueta dorada sube por encima del mínimo', /\.etiqueta--dorada\{background:#F6EFE3;color:#7A5E33\}/.test(cs9));
  // «Sin dato» pasó de 6.72:1 a 10.7:1 y lleva recuadro: es un estado, no ruido.
  t('El crédito fotográfico y los renglones sin dato se leen',
    /\.galeria__pie b\{[^}]*color:#6F6A79/.test(cs9)
    && /\.sin-dato\{[^}]*color:rgba\(255,255,255,\.82\)/.test(cs9));

  // --- tipografía ---
  t('Leaflet no impone sus propias familias',
    /\.leaflet-container,\.leaflet-container \.leaflet-control/.test(cs9) && /font-family:var\(--texto\)!important/.test(cs9));

  // --- objetivos táctiles ---
  t('Los enlaces sueltos alcanzan 24 px, y 32 en pantallas de dedo',
    /min-height:24px;line-height:24px/.test(cs9) && /@media\(pointer:coarse\)/.test(cs9));
  t('El marcador del mapa tiene área de toque mayor que el punto',
    /TOQUE_PIN = 26/.test(mp9) && /const d = TOQUE_PIN/.test(mp9)
    && /\.leaflet-marker-icon \.pin\{position:absolute/.test(cs9));

  // --- coherencia del filtro ---
  t('Los marcadores fuera del filtro dejan de ser tocables y tabulables',
    /marcador--fuera/.test(mp9) && /setAttribute\("tabindex", dentro \? "0" : "-1"\)/.test(mp9)
    && /\.marcador--fuera\{pointer-events:none!important/.test(cs9));
  t('Al filtrar o limpiar, el mapa vuelve a encuadrar lo visible',
    /function reencuadrar\(\)/.test(mp9) && (mp9.match(/reencuadrar\(\)/g)||[]).length>=4);

  // --- persistencia ---
  t('El listado guarda filtro y búsqueda en la dirección',
    /guardarEstado/.test(lg9) && /params\.get\("cat"\)/.test(lg9) && /params\.get\("q"\)/.test(lg9));
  t('El mapa guarda sus tres filtros y la selección',
    /url\.get\("mcat"\)/.test(mp9) && /url\.get\("malc"\)/.test(mp9)
    && /url\.get\("mesp"\)/.test(mp9) && /url\.get\("sel"\)/.test(mp9));
  t('Y los selectores se rellenan con lo que traiga la dirección',
    /sl\.value = estado\[sl\.dataset\.filtro\]/.test(mp9));

  // --- responsivo ---
  // El tope bajó de 124 a 96 px al cambiar el titular: «ÁRBOLES PATRIMONIALES»
  // es más largo y a 124 px la segunda línea invadía la ilustración.
  // El tope bajó de 104 a 84 px: la columna mide 1 180 px a cualquier ancho,
  // así que la letra creciendo con el viewport metía el titular 270 px dentro
  // de la ilustración, fuera de la zona que difumina la máscara.
  t('El titular de la portada entra completo en 320 px y no invade la ilustración',
    /\.portada h1\{font-size:clamp\(34px,5\.4vw,84px\)/.test(cs9));
  // La tira completa pide 1153 px y la envoltura no los tiene hasta los 1236 px
  // de ventana: por eso el tramo apretado llega hasta 1240, no hasta 1180.
  t('La marca se aprieta antes que recortarse, en 1024 y en 320',
    /@media\(min-width:1001px\) and \(max-width:1240px\)/.test(cs9)
    && /@media\(min-width:1001px\) and \(max-width:1100px\)/.test(cs9)
    && /@media\(max-width:345px\)/.test(cs9));
}

console.log('\n══ FOTOGRAFÍAS POR CARPETA ══');
{
  const ft=fs.readFileSync('fotos.js','utf8'),
        lg=fs.readFileSync('logica.js','utf8'),
        mp=fs.readFileSync('mapa.js','utf8'),
        fl=fs.readFileSync('ficha-logica.js','utf8'),
        pv=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8'),
        fv=fs.readFileSync(PRUEBA+'ficha-vista-previa.html','utf8');
  t('La ruta es assets/img/ejemplares/<ID>/NN.ext',
    /CARPETA_FOTOS = "assets\/img\/ejemplares"/.test(ft)
    && /\$\{CARPETA_FOTOS\}\/\$\{id\}\/\$\{numeroFoto\(n\)\}\.\$\{ext\}/.test(ft));
  t('Numeración a dos dígitos', /padStart\(2, "0"\)/.test(ft));
  t('Se detiene en el primer hueco y tiene tope',
    /for \(const hay of presentes\) \{\n\s*if \(!hay\) break;/.test(ft) && /TOPE_FOTOS = 12/.test(ft));
  t('La extensión la fija la primera foto de la carpeta',
    /const ext = halladas\.find\(Boolean\) \|\| null;/.test(ft));
  /* El censo se hace contra la MINIATURA: existeImagen usa <img>, que descarga
     el archivo entero para responder si existe. Sondeando los originales, una
     ficha de diez fotografías bajaba 2.9 MB solo para contarlas. */
  t('El censo de fotos sondea la miniatura, no el original',
    /const sonda = \(n, e\) => existeImagen\(rutaMiniatura\(id, n, e\)\)/.test(ft));
  t('Y con respaldo al original si la carpeta no tiene miniaturas',
    /\.then\(\(hay\) => hay \|\| existeImagen\(rutaFoto\(id, n, e\)\)\)/.test(ft));
  t('Los sondeos van en paralelo, no encadenados con await',
    (ft.match(/await Promise\.all\(/g)||[]).length >= 2);
  t('El sondeo quita hidden y lazy: si no, la imagen nunca se carga',
    /img\.hidden = false;\s*\n\s*img\.removeAttribute\("loading"\);/.test(ft));
  t('La tarjeta y el renglón del mapa piden la foto por identificador',
    /data-ejemplar="\$\{esc\(e\.id \|\| ""\)\}"/.test(lg)
    && /data-ejemplar="\$\{esc\(e\.id \|\| ""\)\}"/.test(mp));
  t('Y se retiran solos cuando el ejemplar no tiene carpeta',
    /else \{ img\.remove\(\); \}/.test(lg) && /else \{ img\.remove\(\); \}/.test(mp));
  t('La ficha descubre toda la carpeta y repinta',
    /descubrirFotos\(e\.id/.test(fl) && /cargarFotos\(e\)\.then/.test(fl));
  t('Lo capturado en la hoja sigue mandando sobre la carpeta',
    /if \(!e\.fotos \|\| !e\.fotos\.length\) e\.fotos = halladas;/.test(fl));
  t('El módulo viaja en las dos versiones sin dejar imports sueltos',
    /window\.montarPrimeraFoto=montarPrimeraFoto/.test(pv)
    && /window\.descubrirFotos=descubrirFotos/.test(fv)
    && !/from "\.\/fotos\.js"/.test(pv) && !/from "\.\/fotos\.js"/.test(fv));
}

console.log('\n══ GUÍA DE IDENTIDAD ══');
{
  const g=fs.readFileSync(PRUEBA+'guia-identidad.html','utf8');
  t('Existe y trae las cinco secciones',
    ['id="paleta"','id="tipografia"','id="componentes"','id="reticula"','id="reglas"'].every(x=>g.includes(x)));
  t('Muestra los 21 colores de la paleta', (g.match(/class="muestra"/g)||[]).length===21);
  t('Y la tabla de contrastes, con doce pares medidos al ensamblar',
    (g.match(/:1<\/b>/g)||[]).length===12, String((g.match(/:1<\/b>/g)||[]).length));
  t('Usa el mismo estilos.css que el sitio, no una copia',
    /--jacaranda:#8D4992/.test(g) && /--dorado-luz:#D9BC91/.test(g));
  t('No se indexa: es documentación interna', /<meta name="robots" content="noindex">/.test(g));
}

console.log('\n══ GUÍA DE ALTA · el procedimiento completo ══');
{
  // La receta de fotografías vivía en pendientes.html. Se movió aquí por
  // instrucción del usuario: pendientes es la lista de lo que falta, no el
  // manual. Estas guardas siguen al contenido a su casa nueva.
  const ga=fs.readFileSync('guia-alta.html','utf8');
  const pe=fs.readFileSync('pendientes.html','utf8');

  t('La guía existe y cubre los nueve apartados',
    ['id="reunir"','id="hoja"','id="id"','id="fotos"','id="decreto"','id="ilustracion"',
     'id="publicar"','id="comprobar"','id="identificadores"'].every(x=>ga.includes(x)));
  t('El índice no manda a ningún ancla inexistente',
    (ga.match(/href="#([a-z]+)"/g)||[]).every(h=>ga.includes('id="'+h.slice(7,-1)+'"')));

  // Lo que rompe el descubrimiento de fotografías, que es lo que de verdad
  // hay que advertir: el sitio las pide en orden hasta que una falta.
  t('Advierte que un hueco en la numeración corta la galería',
    /sin interrupción/.test(ga) && /la galería se detiene/.test(ga));
  t('Advierte que no se pueden mezclar extensiones en una carpeta',
    /no se pueden mezclar/.test(ga) && /La primera que responde manda para toda la carpeta/.test(ga));
  t('Da la ruta de la carpeta y el nombrado de dos dígitos',
    /assets\/img\/ejemplares\//.test(ga) && /01\.jpg/.test(ga));
  t('Explica que cada foto lleva su miniatura y para qué sirve',
    /01-chica\.jpg/.test(ga) && /pidiéndolas, y lo hace contra las miniaturas/.test(ga));
  t('Conserva la restricción de derechos de imagen',
    /derechos tenga la Secretaría o que estén expresamente licenciadas para uso público/.test(ga));
  // Distintos, no coincidencias: el paso 3 usa uno de ellos como ejemplo.
  t('Lista los trece identificadores en uso',
    new Set(ga.match(/<code>2[45]-[A-Z]{3}-[A-Z]{3}-\d+[A-Z]+-\d{4}<\/code>/g)||[]).size===13);

  // El orden entre el ID y la carpeta de fotos es la trampa principal: el ID
  // se recalcula solo y deja huérfana la carpeta que se llama como él.
  t('Advierte que corregir un campo del ID renombra al árbol',
    /El ID se recalcula solo/.test(ga) && /deja huérfana la carpeta/.test(ga));

  // Los errores de captura que ya ocurrieron, para que no se repitan.
  t('Recoge el error de las fechas en columnas de número',
    /12,052,025/.test(ga) && /nunca fechas/.test(ga));
  t('Recoge el del nombre de la herramienta en lugar del enlace',
    /MyTree/.test(ga) && /Eso no es una dirección/.test(ga));

  t('Las tablas se desplazan solas en pantalla angosta', /overflow-x:auto/.test(ga));
  t('No se indexa: es documentación interna',
    /<meta name="robots" content="noindex, nofollow">/.test(ga));
  // Se abre suelta desde la carpeta de Drive: si enlazara estilos.css con ruta
  // relativa saldría sin diseño, que es justo lo que pasaba con pendientes.
  t('Es autocontenida: no depende de estilos.css por ruta relativa',
    !/href="assets\/css\/estilos\.css"/.test(ga) && /--jacaranda:#8D4992/.test(ga));

  t('Y pendientes ya no duplica la receta de fotografías',
    !/class="receta"/.test(pe) && !/pend-tabla/.test(pe));
}

console.log('\n══ PENDIENTES · solo lo que falta ══');
{
  const pe=fs.readFileSync('pendientes.html','utf8');
  // Misma razón que la guía: se abre suelta, descargada o adjunta.
  t('Es autocontenida: no depende de estilos.css por ruta relativa',
    !/href="assets\/css\/estilos\.css"/.test(pe) && /--jacaranda:#8D4992/.test(pe));
  t('No se indexa', /<meta name="robots" content="noindex, nofollow">/.test(pe));
  // Una lista de pendientes llena de tareas tachadas deja de leerse.
  t('No quedan tareas marcadas como hechas', !/pend--listo/.test(pe));
  t('El tablero no presume decretos publicados que no lo están',
    /Con PDF de decreto publicado/.test(pe) && !/Con decreto enlazado/.test(pe));
  t('Las fotografías siguen abiertas: falta cerrar la portada repetida',
    /<h3>Fotografías<\/h3>/.test(pe) && /No resuelto/.test(pe));
  t('La auditoría de interfaz sigue sin realizarse',
    /No realizada/.test(pe) && /consistencia del encabezado/.test(pe));
  t('La ficha imprimible espera validación en papel',
    /falta validar el formato en papel/.test(pe));
  t('Queda anotado que el sitio debe leer la hoja en vivo',
    /El sitio debe leer la hoja en vivo/.test(pe) && /registro\.json/.test(pe));
  t('Y la decisión de que los archivos vienen de Drive',
    /Drive compartido como origen de los archivos/.test(pe));
}

console.log('\n══ AUDITORÍA APLICADA · pasos 1 a 4 ══');
{
  const cs=fs.readFileSync('estilos.css','utf8');
  const pe=fs.readFileSync('pendientes.html','utf8');
  // P1
  t('P1.1 · el bloque de Gobierno usa corteza (6.88:1), no dorado',
    /text-transform:uppercase;color:var\(--corteza\)\}/.test(cs) && !/color:#B28E5C\}/.test(cs));
  t('P1.2 · el rótulo del aviso usa jacaranda-hondo (6.96:1)',
    /\.mapa-aviso__rotulo\{[\s\S]{0,140}?color:var\(--jacaranda-hondo\)/.test(cs));
  t('P1.3 · el código sobre la cabecera oscura usa la variante clara (5.45:1)',
    /\.pend-cabeza code\{color:var\(--jacaranda-luz\)/.test(pe));
  t('--jacaranda-bruma ya no se usa como color de texto',
    !/color:var\(--jacaranda-bruma\)/.test(cs));
  // P2.5
  t('P2.5 · no quedan verdes oscuros residuales',
    !/#16301D|#0F2115/i.test(cs));
  t('Y las superficies profundas usan el degradado morado',
    (cs.match(/var\(--jacaranda-noche\)/g)||[]).length>=3);
  // P2.1 a P2.3
  t('P2.1 · el color de cuerpo es un token',
    /--tinta-suave:#413647/.test(cs) && !/color:#413647/.test(cs)
    && (cs.match(/var\(--tinta-suave\)/g)||[]).length>=25);
  t('P2.2 · ningún hex duplica un token existente',
    !/color:#8D4992|color:#B28E5C|color:#8FC77F|solid #8D4992/.test(cs));
  t('P2.3 · el gris duplicado colapsó a --gris', !/#5A5660/i.test(cs));
  t('P2.4 · el guinda de Gobierno está declarado como marca ajena',
    /--guinda-gobierno:#9D2148/.test(cs) && /identidad ajena/.test(cs) && !/color:#9D2148/.test(cs));
  // P3.1
  t('P3.1 · la regla de estados quedó escrita',
    /ESTADOS\. REGLA: verde = resuelto/.test(cs) && /NUNCA se\s*\n?\s*comunica solo con color/.test(cs));
}

console.log('\n══ MARCA E ILUSTRACIÓN ENTREGADAS ══');
{
  const ex=(r)=>fs.existsSync(r);
  // WebP en los tres tamaños; PNG solo en chico y media. El PNG grande pesaba
  // el triple que su WebP y ningún navegador de los últimos ocho años lo pide.
  t('El emblema viene en tres versiones y tres tamaños',
    ['color','guinda','blanco'].every(v=>
      ['chico','media','grande'].every(t2=>ex(`assets/img/marca/emblema-${v}-${t2}.webp`))
      && ['chico','media'].every(t2=>ex(`assets/img/marca/emblema-${v}-${t2}.png`))));
  t('Los nombres históricos siguen apuntando a la versión de color',
    ex('assets/img/marca/emblema-chico.png') && ex('assets/img/marca/emblema-media.png') && ex('assets/img/marca/emblema-grande.png'));
  t('La ilustración de portada es la entregada por la Secretaría',
    ex('assets/img/portada/ficus-grande.webp') && ex('assets/img/portada/ficus-media.webp')
    && /ficus-grande\.webp/.test(fs.readFileSync('estilos.css','utf8')));
  // Se escala con el ancho disponible: el término en vw es el que despeja la
  // franja de la ilustración; el tope solo evita que crezca sin fin.
  const cssP = fs.readFileSync('estilos.css','utf8');
  t('El titular ya no se mete debajo de la ilustración',
    /\.portada h1\{font-size:clamp\(34px,5\.4vw,84px\)/.test(cssP));
  // Y la ilustración se ancla al borde de la COLUMNA, no al del monitor: con
  // right:0 quedaba a 690 px del titular en una pantalla de 2 560.
  t('La ilustración se ancla a la columna, no al borde de la pantalla',
    /\.portada::before\{[^}]*right:max\(0px, calc\(50% - 590px\)\)/.test(cssP));
}

console.log('\n══ AUDITORÍA · pasos 5 a 7 ══');
{
  const cs=fs.readFileSync('estilos.css','utf8');
  const lg=fs.readFileSync('logica.js','utf8');
  // P3.2 y P3.3
  t('P3.2 · el azul de trámite desapareció del sistema',
    !/#EDF0F6|#4C5B7A|#B9C8E4|160,180,215/i.test(cs));
  t('P3.3 · las tres situaciones son una sola familia neutra',
    /\.etiqueta--situacion\{/.test(cs)
    && /\.etiqueta--vacia,\.etiqueta--historica,\.etiqueta--tramite\{/.test(cs));
  t('Y la lógica las emite con esa clase',
    (lg.match(/etiqueta etiqueta--situacion/g)||[]).length===3);
  t('La categoría «Histórico» conserva su dorado: es categoría, no estado',
    /\.etiqueta--dorada\{background:#F6EFE3;color:#7A5E33\}/.test(cs));
  t('Se explica por qué se separó categoría de situación',
    /CATEGORIAS —lo que el decreto declara— y SITUACIONES/.test(cs));
  // P4.1
  t('P4.1 · el h3 conserva su semántica y declara su papel con la clase',
    /h3\.rotulo\{/.test(cs) && /NO se cambian esos h3 por/.test(cs));
  t('Y los h3 que son rótulos la llevan en el marcado',
    /<h3 class="rotulo">/.test(fs.readFileSync('parciales/pie.html','utf8')));
  // P5
  // El bloque de rutas se retiró; el punto de corte compartido lo siguen
  // sosteniendo las rejillas que quedan.
  t('P5.1 · las rejillas de dos columnas colapsan todas en 860 px',
    /@media\(max-width:860px\)\{\.cumplimiento/.test(cs)
    && /@media\(max-width:860px\)\{\.dos-columnas/.test(cs)
    && !/\.ruta__opciones/.test(cs));
  t('P5.2 · el h3 crece con la página, como la entrada de sección',
    /h3\{font-size:clamp\(19px,1\.7vw,24px\)/.test(cs));
}

console.log('\n══ ORGANIZACIÓN DEL PROYECTO ══');
{
  const enc=fs.readFileSync('parciales/encabezado.html','utf8');
  const pie=fs.readFileSync('parciales/pie.html','utf8');
  t('Encabezado y pie viven en un solo archivo cada uno',
    /<header class="barra">/.test(enc) && /<footer class="pie">/.test(pie));
  const cuerpos=['cuerpo.html','ficha-cuerpo.html','recursos-cuerpo.html',
                 'dc-cuerpo.html','ficha-dc-cuerpo.html','recursos-dc-cuerpo.html'];
  t('Ningún cuerpo conserva una copia suelta',
    cuerpos.every(c=>{ const s2=fs.readFileSync(c,'utf8');
      return !/<header class="barra">/.test(s2) && !/<footer class="pie">/.test(s2)
        && /<!--#encabezado-->/.test(s2) && /<!--#pie-->/.test(s2); }));
  // El bloque fino del pie se retiró: volcaba catorce renglones tal como venían
  // de la hoja de cálculo, en todas las páginas. Ese contenido, redactado y sin
  // repeticiones, vive ahora en la metodología de Recursos.
  t('El pie ya no publica notas ni procedencia',
    !/pieFino/.test(pie) && !/id="notas"/.test(pie) && !/id="procedencia"/.test(pie)
    && !/pintarPie/.test(fs.readFileSync('logica.js','utf8')));
  const met = fs.readFileSync('recursos-cuerpo.html','utf8');
  t('Las advertencias de i-Tree se conservan, redactadas, en Recursos',
    /descomposición de su madera muerta/.test(met)
    && /no se mide: se calcula/.test(met)
    && /mayor consumo/.test(met));
  t('La convención de campos vacíos y S\/D también', /«sin determinar»/.test(met));
  t('Y las abreviaturas, sin repetir lo que ya dice la tarjeta de i-Tree',
    /class="abreviaturas"/.test(met)
    && !/investigaciones del Servicio Forestal del USDA/.test(met));
  t('Los ensambladores escriben según el destino',
    ['construir/armar.js','construir/armar-ficha.js','construir/armar-dc.js','construir/armar-recursos.js']
      .every(a=>/DESTINO === 'produccion'/.test(fs.readFileSync(a,'utf8'))));
  t('Y los nombres de archivo cambian con él',
    /portada:'index\.html'/.test(fs.readFileSync('construir/armar.js','utf8')));
  t('Hay un guion para construir y otro para verificar',
    fs.existsSync('construir/construir.sh') && fs.existsSync('verificar/verificar.sh'));
}

console.log('\n══ LA HILERA A ESCALA REAL ══');
{
  const cs=fs.readFileSync('estilos.css','utf8');
  const lg=fs.readFileSync('logica.js','utf8');
  const mn=fs.readFileSync('menu.js','utf8');
  t('La identificación vive bajo el árbol, no en el globo',
    /class="bosque__pie"/.test(lg) && /bosque__nombre/.test(lg)
    && /bosque__alto/.test(lg) && /bosque__alcaldia/.test(lg));
  t('El globo se quedó con una sola cosa',
    /class="bosque__globo" aria-hidden="true">Ver su ficha/.test(lg)
    && !/bosque__globo-nombre|bosque__globo-especie|bosque__globo-alcaldia/.test(lg));
  t('El árbol entero sigue siendo el enlace: se llega sin ratón',
    /<a class="bosque__arbol" href="\$\{RUTA_FICHA\}#ficha-/.test(lg));
  t('El nombre no estira su columna: dos renglones y corta',
    /-webkit-line-clamp:2/.test(cs) && /\.bosque__arbol\{flex:0 0 auto;width:clamp\(112px,13vw,168px\)/.test(cs));
  t('El globo no invade la guía: se posa sobre la copa',
    /\.bosque__globo\{position:absolute;top:10px/.test(cs) && !/margin-top:-162px/.test(cs));
  /* DECISIÓN REVERTIDA, Y A PETICIÓN. La hilera tuvo superficie propia —un
     crema más hondo— para despegarse de la portada. A la vista eran dos beiges
     contiguos sin motivo y se leía como un recuadro sobrepuesto. Ahora el
     fondo es el MISMO papel: sigue siendo opaco, porque debajo de 1000 px la
     ilustración de la portada llega hasta aquí y se colaba entre las copas,
     pero ya no dibuja una caja. Lo que separa la pieza es su título. */
  t('La hilera comparte el papel de la portada y no se lee como recuadro',
    /\.bosque\{--lienzo-bosque:268px;position:relative;z-index:var\(--capa-realce\);margin:64px 0 0;padding:0 0 40px;\s*background:var\(--papel\)\}/.test(cs)
    && !/\.bosque\{[^}]*papel-hondo/.test(cs));
  t('Pero conserva fondo opaco: debajo de 1000 px la ilustración llega hasta aquí',
    /background:var\(--papel\)\}/.test(cs) && /la ilustración de la portada llega hasta aquí/.test(cs));
  t('El filete morado bajó del borde de la caja al pie del título',
    /\.bosque__titulo\{[^}]*border-bottom:2px solid var\(--jacaranda\)/.test(cs));
  t('El título de la hilera es encabezado, no rótulo de once píxeles',
    /\.bosque__rotulo\{font-family:var\(--display\)/.test(cs)
    && /<h2 class="bosque__rotulo">Los ejemplares, a escala real<\/h2>/.test(
        fs.readFileSync('cuerpo.html','utf8')));
  t('El velo de los bordes se funde con el fondo real de la hilera',
    /\.bosque__borde--izq\{left:0;background:linear-gradient\(90deg,var\(--papel\) /.test(cs)
    && !/bosque__borde--izq\{[^}]*papel-hondo/.test(cs));

  /* LA REGLA DE ALTURAS. «A escala real» era una afirmación que quien mira no
     podía comprobar: trece siluetas de distinto tamaño y nada contra qué
     medirlas. Las tres comprobaciones que la sostienen: que exista, que se
     dibuje con la misma escala que los árboles, y que el suelo sea común. */
  t('La regla de alturas existe y cuelga del lienzo del dibujo',
    /\.bosque__regla\{position:absolute;left:0;right:0;top:0;height:var\(--lienzo-bosque\)/.test(cs));
  t('Se dibuja con la MISMA función que dimensiona los árboles',
    /marcas\.push\(`<i class="bosque__marca" style="bottom:\$\{px\(m\)\.toFixed\(1\)\}px">/.test(lg));
  t('Y el paso es de cinco en cinco metros, con suelo rotulado',
    /const PASO = 5;/.test(lg) && /bosque__marca--suelo" style="bottom:0"><span>0<\/span>/.test(lg));
  // La altura del lienzo vive en dos sitios —la hoja y el guion— y tienen que
  // valer lo mismo: si se separan, la regla deja de coincidir con los árboles.
  t('El lienzo mide lo mismo en la hoja y en el guion',
    (/--lienzo-bosque:(\d+)px/.exec(cs) || [])[1] === (/LIENZO_BOSQUE = (\d+)/.exec(lg) || [])[1],
    `css ${(/--lienzo-bosque:(\d+)px/.exec(cs) || [])[1]} · js ${(/LIENZO_BOSQUE = (\d+)/.exec(lg) || [])[1]}`);
  t('La ranura reserva el lienzo en una retícula, para que todos pisen el mismo suelo',
    /\.bosque__arbol\{[^}]*display:grid;grid-template-rows:var\(--lienzo-bosque\) auto/.test(cs));
  // A la IZQUIERDA: el eje de alturas se busca antes de recorrer los árboles,
  // no después. Y ahí no tapa al último de la hilera.
  t('Los rótulos de la regla tienen canalón propio, a la izquierda',
    /\.bosque__lienzo\{position:relative;padding-left:46px\}/.test(cs)
    && /\.bosque__marca span\{position:absolute;left:0/.test(cs));
  t('El disco del borde es morado translúcido y dice hacia dónde',
    /\.bosque__borde::after\{[^}]*background:rgba\(var\(--jacaranda-rgb\),\.82\)/.test(cs)
    && /\.bosque__borde--der::after\{content:"›"\}/.test(cs));
  t('En pantalla táctil el pie hace todo el trabajo',
    /@media\(max-width:700px\)\{\.bosque__globo\{display:none\}/.test(cs));

  t('Los bordes arrastran la hilera al acercar el ratón',
    /export function activarBordes/.test(mn) && /bosque__borde/.test(cs));
  t('Y se apagan donde no hay puntero fino o se pide quietud',
    /\(hover:hover\) and \(pointer:fine\)/.test(mn) && /prefers-reduced-motion:reduce/.test(mn)
    && /@media\(hover:none\),\(pointer:coarse\)\{\.bosque__borde\{display:none\}\}/.test(cs));
  t('No señalan un borde al que ya no se puede avanzar',
    /if \(v < 0 && pista\.scrollLeft <= 0\) v = 0;/.test(mn));
  t('Y se detienen si alguien está leyendo un globo',
    /ev\.target\.closest\("\.bosque__globo"\)\) parar\(\)/.test(mn));
  t('La barra y las flechas se quedan: son el camino accesible',
    /export function activarDeslizador/.test(mn) && /deslizador__paso/.test(cs));
}


console.log('\n══ CARTOGRAFÍA Y DIRECCIÓN PÚBLICA ══');
{
  const mpj = fs.readFileSync('mapa.js','utf8');
  const flj = fs.readFileSync('ficha-logica.js','utf8');
  const fdj = fs.readFileSync('ficha-dc-logica.js','utf8');
  // La base de OSM trae farmacias, cimas y gasolineras: compiten con los
  // marcadores propios en un mapa cuyo único trabajo es ubicar un árbol.
  t('El mapa general usa una base sin puntos de interés',
    /basemaps\.cartocdn\.com\/light_all/.test(mpj) && !/tile\.openstreetmap\.org/.test(mpj));
  t('El mapa de la ficha usa la misma base',
    /basemaps\.cartocdn\.com\/light_all/.test(flj) && /basemaps\.cartocdn\.com\/light_all/.test(fdj));
  t('Pide teselas de doble densidad', /\{r\}\.png/.test(mpj));
  t('Declara los subdominios que CARTO necesita', /subdomains: "abcd"/.test(mpj));
  // La atribución no es opcional: los datos son de OSM y el dibujo de CARTO.
  t('Atribuye a OpenStreetMap y a CARTO',
    /openstreetmap\.org\/copyright/.test(mpj) && /carto\.com\/attributions/.test(mpj));
  t('Y también en el pie del mapa de la ficha', /teselas de CARTO/.test(flj));

  const pv = fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8');
  const sitio = fs.readFileSync('construir/sitio.js','utf8');
  t('La dirección pública vive en un solo archivo', /BASE_SITIO/.test(sitio) && /module\.exports/.test(sitio));
  t('Y ningún armador la trae escrita a mano',
    ['armar.js','armar-ficha.js','armar-recursos.js','armar-dc.js']
      .every((f) => !/sedema\.cdmx\.gob\.mx\/arboles-patrimoniales/.test(fs.readFileSync('construir/'+f,'utf8'))));
  // Un canonical hacia un dominio que aún no existe le dice al buscador que
  // ignore la versión publicada, y la imagen para compartir no resuelve.
  t('El canonical apunta a donde el sitio está de verdad',
    /rel="canonical" href="https:\/\/sedemaoficina\.github\.io\/arboles-patrimoniales\/"/.test(pv));
  // Absoluta y del mismo origen, y con el sufijo de versión: WhatsApp guarda
  // la miniatura por dirección, así que sin ?v= el reenvío sigue mostrando la
  // tarjeta anterior por semanas.
  t('La imagen para compartir es absoluta y del mismo origen',
    /og:image" content="https:\/\/sedemaoficina\.github\.io\/arboles-patrimoniales\/assets\/img\/portada\/compartir\.jpg\?v=\d+"/.test(pv));
}

// LAS DOS SECCIONES LEGALES SE SEÑALAN ENTRE SÍ.
// Una revisión externa las leyó como repetidas. No lo son —la portada es el
// argumento, Recursos es el catálogo, y Recursos trae tres instrumentos que la
// portada no—, pero nada se lo decía a quien lee. Cada una declara ahora qué
// es y remata con la liga a la otra.
{
  const pv5=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8');
  const rec5=fs.readFileSync(PRUEBA+'recursos-vista-previa.html','utf8');
  t('La portada manda al catálogo completo en Recursos',
    /href="recursos\.html#normatividad"/.test(pv5));
  t('Recursos manda de regreso al argumento de la portada',
    /href="index\.html#proteccion"/.test(rec5));
  t('El ancla existe de verdad en Recursos', /id="normatividad"/.test(rec5));
  t('El ancla existe de verdad en la portada', /id="proteccion"/.test(pv5));
}

// Los iconos del cintillo se retiraron: no comunicaban y le disputaban el
// dorado a la cifra. Si vuelven, que sea con pictogramas legibles.
{
  const pv6=fs.readFileSync(PRUEBA+'portada-vista-previa.html','utf8');
  t('El cintillo de cifras ya no dibuja iconos', !/class="cifra__icono"/.test(pv6));
  t('No queda la regla huérfana del icono en la hoja de estilo',
    !/\.cifra__icono\{/.test(fs.readFileSync('estilos.css','utf8')));
}

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
