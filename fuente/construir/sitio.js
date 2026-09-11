/**
 * sitio.js · La dirección pública del sitio, en un solo lugar.
 *
 * El «canonical», el «og:url» y el «og:image» tienen que ser absolutos: una
 * imagen para compartir con ruta relativa no la resuelve ningún servicio, y
 * un canonical que apunte a un dominio que todavía no existe le dice a los
 * buscadores que ignoren la versión que sí está publicada.
 *
 * Se cambia AQUÍ, una vez, el día que el sitio se mude al servidor definitivo.
 * Se puede sobrescribir sin tocar el archivo:
 *
 *   BASE_SITIO=https://sedema.cdmx.gob.mx/arboles-patrimoniales/ ./construir.sh produccion
 */
// 9 de septiembre de 2026: el sitio ya responde en su dominio definitivo. La
// dirección de publicación anterior (sedemaoficina.github.io) sigue sirviendo
// el mismo docs/, pero la dirección pública es esta.
const PORDEFECTO = "https://sedema.sia.cdmx.gob.mx/arboles-patrimoniales/";

// Se garantiza la diagonal final: sin ella, unir rutas produce direcciones rotas.
const crudo = process.env.BASE_SITIO || PORDEFECTO;
const BASE = crudo.endsWith("/") ? crudo : crudo + "/";

/**
 * VERSION_TARJETA · el número que obliga a WhatsApp a volver a mirar.
 *
 * WhatsApp, Facebook y Telegram guardan la vista previa de un enlace la
 * primera vez que alguien lo comparte y la reutilizan durante semanas. La
 * guardan por DIRECCIÓN, no por contenido: si el archivo cambia pero la
 * dirección no, el reenvío sigue mostrando la imagen vieja. Por eso la
 * portada anunciaba «GUARDIANES DEL TIEMPO» mucho después de que el sitio
 * dejara de llamarse así.
 *
 * Al subir este número la dirección deja de ser la misma y el servicio
 * descarga la imagen otra vez. SE SUBE CADA VEZ QUE SE REDIBUJE compartir.jpg.
 */
// 3 desde el 9 de septiembre de 2026: cambió el dominio y WhatsApp guarda la
// vista previa por dirección completa, así que hay que obligarlo a mirar.
const VERSION_TARJETA = 3;

const url = (ruta = "") => BASE + String(ruta).replace(/^\//, "");

/**
 * GA_ID · el identificador de medición de Google Analytics 4.
 *
 * Mientras esté VACÍO, medicion() no emite ni una línea:
 * el sitio se construye y se publica exactamente como hasta hoy, sin tocar a
 * ningún tercero. Vaciarlo (GA_ID= ./construir.sh) apaga la medición por completo
 * sin tocar ningún otro archivo: es el interruptor, y es de una sola pieza.
 *
 * Se puede probar sin tocar el archivo:
 *
 *   GA_ID=G-XXXXXXXXXX ./construir.sh
 *
 * POR QUÉ NO SE DEJÓ UN `G-` DE EJEMPLO: este repositorio es público. Un
 * identificador inventado en un archivo publicado es basura que alguien va a
 * copiar creyendo que es el bueno, y un identificador real de otra propiedad
 * sería peor.
 */
// 11 de septiembre de 2026: la propiedad existe y este es su identificador.
const GA_ID = (process.env.GA_ID || "G-699W152ZM0").trim();

/**
 * medicion() · el bloque de medición, con el consentimiento CERRADO de origen.
 *
 * EL ORDEN DE ESTE BLOQUE NO ES NEGOCIABLE, y es la única razón de que exista
 * como una sola función en vez de repartido en cuatro plantillas:
 *
 *   1. Se declara el consentimiento en «denied».
 *   2. HASTA ENTONCES se carga gtag.js.
 *
 * Invertirlo produce el peor resultado posible: el sitio mide mientras la
 * persona todavía está leyendo el aviso que le promete lo contrario. El banner
 * se vuelve decorativo y la página afirma por escrito algo que no cumple.
 *
 * Eso no depende de la buena voluntad de quien edite esto después. El
 * despliegue del SIA (`infra/deploy/deploy-arboles-patrimoniales.sh`,
 * comprobación 2.3) revisa el orden en la salida construida y **aborta** si se
 * invierte. Si un día este archivo se rompe, el sitio no se actualiza.
 *
 * SOBRE EL BANNER: lleva «Aceptar» y «Rechazar» con el mismo peso visual. Un
 * aviso con una sola salida no recoge una decisión, la fuerza — y no serviría
 * para lo que se puso.
 *
 * Va todo junto —marcas, estilo y lógica— porque cada página del sitio viaja
 * con su hoja incrustada: repartirlo obligaría a tocar estilos.css y los
 * cuerpos, y a confiar en que los cuatro armadores no se desincronicen. Ya
 * pasó con el encabezado; no se repite.
 */
const medicion = () => {
  if (!GA_ID) return "";
  const j0 = JSON.stringify(GA_ID);
  return [
    '<!-- Medición · NADA se carga hasta que la persona acepta. Ver ADR-019 del SIA. -->',
    '<script>',
    '  window.dataLayer = window.dataLayer || [];',
    '  function gtag(){dataLayer.push(arguments);}',
    '  gtag("consent", "default", {',
    '    analytics_storage: "denied",',
    '    ad_storage: "denied",',
    '    ad_user_data: "denied",',
    '    ad_personalization: "denied"',
    '  });',
    '  // MODO BASICO, NO AVANZADO, Y LA DIFERENCIA SE MIDIO.',
    '  //',
    '  // Si gtag.js se carga de entrada --el modo "avanzado" que Google',
    '  // recomienda-- la biblioteca manda igual un ping "sin cookies" a',
    '  // google-analytics.com/g/collect ANTES de que nadie acepte. Medido en el',
    '  // navegador el 2026-09-11: un POST con en=page_view, la URL completa en',
    '  // dl=, un identificador en cid= y, por el solo hecho de la peticion, la',
    '  // IP del visitante. "Sin cookies" no es "sin datos".',
    '  //',
    '  // La nota que sustenta la autorizacion dice que lo que se valora es LA',
    '  // TRANSMISION, no el almacenamiento. Por eso aqui la biblioteca no se',
    '  // carga hasta que hay un si: antes de eso el navegador no habla con',
    '  // Google ni una vez.',
    '  //',
    '  // Esto NO lo atrapa una revision del archivo: en las dos variantes el',
    '  // texto queda en el mismo orden. Solo se ve abriendo la pestaña de red.',
    '  function activarMedicion(){',
    '    if (window.__medicionActiva) return;',
    '    window.__medicionActiva = true;',
    '    var e = document.createElement("script");',
    '    e.async = true;',
    '    e.src = "https://www.googletagmanager.com/gtag/js?id=' + GA_ID + '";',
    '    document.head.appendChild(e);',
    '    gtag("js", new Date());',
    '    gtag("config", ' + j0 + ');',
    '  }',
    '  try {',
    '    if (localStorage.getItem("medicion-consentimiento") === "granted") {',
    '      gtag("consent", "update", { analytics_storage: "granted" });',
    '      activarMedicion();',
    '      activarMedicion();',
    '    }',
    '  } catch (e) {}',
    '</script>',
    '<style>',
    '  .aviso-medicion{position:fixed;left:0;right:0;bottom:0;z-index:9999;',
    '    background:#2b2b2b;color:#fff;padding:14px 18px;',
    '    font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
    '    display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;',
    '    justify-content:center;box-shadow:0 -2px 12px rgba(0,0,0,.25)}',
    '  .aviso-medicion p{margin:0;max-width:62ch}',
    '  .aviso-medicion a{color:#e7b9ec}',
    '  .aviso-medicion div{display:flex;gap:10px;flex:none}',
    '  .aviso-medicion button{font:inherit;font-weight:600;cursor:pointer;',
    '    padding:9px 20px;border-radius:4px;border:1px solid #fff;',
    '    background:transparent;color:#fff}',
    '  .aviso-medicion button.si{background:#8D4992;border-color:#8D4992}',
    '  .aviso-medicion button:focus-visible{outline:2px solid #e7b9ec;outline-offset:2px}',
    '  @media (max-width:640px){.aviso-medicion{justify-content:stretch}',
    '    .aviso-medicion div{width:100%}.aviso-medicion button{flex:1}}',
    '</style>',
    '<script>',
    '(function(){',
    '  var CLAVE = "medicion-consentimiento";',
    '  function leer(){ try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }',
    '  function guardar(v){ try { localStorage.setItem(CLAVE, v); } catch (e) {} }',
    '  // Ya decidió: no se le vuelve a preguntar, diga lo que diga.',
    '  if (leer()) return;',
    '  function pintar(){',
    '    var c = document.createElement("div");',
    '    c.className = "aviso-medicion";',
    '    c.setAttribute("role", "region");',
    '    c.setAttribute("aria-label", "Aviso sobre medición de uso");',
    '    var t = document.createElement("p");',
    '    t.innerHTML = "Este sitio puede medir su uso de forma anónima para saber qué ' +
      'contenido resulta útil. La medición <b>no se activa</b> hasta que usted lo autorice.";',
    '    var b = document.createElement("div");',
    '    var no = document.createElement("button");',
    '    no.type = "button"; no.textContent = "Rechazar";',
    '    var si = document.createElement("button");',
    '    si.type = "button"; si.className = "si"; si.textContent = "Aceptar";',
    '    no.onclick = function(){ guardar("denied"); c.remove(); };',
    '    si.onclick = function(){',
    '      guardar("granted");',
    '      gtag("consent", "update", { analytics_storage: "granted" });',
    '      activarMedicion();',
    '      c.remove();',
    '    };',
    '    b.appendChild(no); b.appendChild(si);',
    '    c.appendChild(t); c.appendChild(b);',
    '    document.body.appendChild(c);',
    '  }',
    '  if (document.readyState === "loading")',
    '    document.addEventListener("DOMContentLoaded", pintar);',
    '  else pintar();',
    '})();',
    '</script>'
  ].join("\n");
};

module.exports = {
  BASE,
  VERSION_TARJETA,
  GA_ID,
  url,
  medicion,
  // La imagen para compartir se pide siempre por aquí, nunca con url() a secas.
  urlTarjeta: () => url("assets/img/portada/compartir.jpg") + "?v=" + VERSION_TARJETA,
};
