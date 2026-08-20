/**
 * leaflet-diferido.js · Leaflet se descarga cuando hace falta, no antes.
 *
 * Leaflet pesa 145 KB de los 697 KB que la portada bajaba antes de las
 * imágenes, y no sirve para nada hasta que la persona llega al mapa —que está
 * a tres pantallas del titular—. En una conexión móvil eso es medio segundo
 * regalado en cada visita, incluida la de quien solo venía a leer el listado.
 *
 * Aquí se descarga cuando el contenedor del mapa se acerca a la pantalla. El
 * margen de 400 px hace que la petición salga antes de que el mapa se vea, de
 * modo que en la práctica ya está listo cuando llega.
 *
 * Casos que hay que sostener y por los que esto no es un `import()` a secas:
 *   · Sin IntersectionObserver —navegadores viejos— se carga de inmediato.
 *   · Con la página abierta en el ancla del mapa, el contenedor ya está a la
 *     vista al arrancar: el observador dispara solo, sin esperar a un scroll.
 *   · Dos llamadas simultáneas —portada y ficha comparten este archivo—
 *     comparten la MISMA promesa: no se descarga dos veces.
 *   · Si la descarga falla, la promesa se rechaza y quien llamó pinta su
 *     propio aviso; no se queda un recuadro gris sin explicación.
 */

export const RUTA_LEAFLET_JS = "vendor/leaflet.js";
export const RUTA_LEAFLET_CSS = "vendor/leaflet.css";

/** Margen de anticipación: la descarga arranca 400 px antes de que se vea. */
export const MARGEN_ANTICIPACION = "400px";

let promesa = null;

/** Descarga Leaflet una sola vez. Devuelve siempre la misma promesa. */
export function cargarLeaflet() {
  if (typeof window !== "undefined" && window.L) return Promise.resolve(window.L);
  if (promesa) return promesa;

  promesa = new Promise((resolver, rechazar) => {
    if (typeof document === "undefined") { rechazar(new Error("sin documento")); return; }

    // La hoja de estilos viaja aparte y no bloquea: si tardara más que el
    // guion, el mapa aparecería un instante sin estilos, no roto.
    if (!document.querySelector(`link[href$="${RUTA_LEAFLET_CSS}"]`)) {
      const hoja = document.createElement("link");
      hoja.rel = "stylesheet";
      hoja.href = RUTA_LEAFLET_CSS;
      document.head.appendChild(hoja);
    }

    const guion = document.createElement("script");
    guion.src = RUTA_LEAFLET_JS;
    guion.async = true;
    guion.onload = () => (window.L ? resolver(window.L) : rechazar(new Error("Leaflet no se registró")));
    guion.onerror = () => { promesa = null; rechazar(new Error("no se pudo descargar Leaflet")); };
    document.head.appendChild(guion);
  });
  return promesa;
}

/**
 * Ejecuta `alEstarListo` cuando el elemento se acerque a la pantalla y Leaflet
 * haya terminado de cargar. Si algo falla, ejecuta `alFallar`.
 */
export function cuandoSeAcerque(elemento, alEstarListo, alFallar) {
  if (!elemento) return;
  const arrancar = () => cargarLeaflet().then(alEstarListo).catch(() => { if (alFallar) alFallar(); });

  if (typeof IntersectionObserver === "undefined") { arrancar(); return; }

  const observador = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
      if (!entrada.isIntersecting) continue;
      observador.disconnect();
      arrancar();
      return;
    }
  }, { rootMargin: MARGEN_ANTICIPACION });
  observador.observe(elemento);
}
