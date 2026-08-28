/**
 * fotos.js · Fotografías de los ejemplares
 *
 * Las fotos NO viven en la hoja de cálculo: viven en el disco, una carpeta por
 * ejemplar nombrada con su identificador del registro. La hoja solo aporta el
 * crédito fotográfico.
 *
 *   assets/img/ejemplares/25-AZC-TAX-19405GIMNO-0006/01.jpg
 *                                                   /02.jpg
 *                                                   /03.jpg
 *
 * Un sitio estático no puede preguntar qué archivos hay dentro de una carpeta:
 * solo puede pedir uno y ver si existe. Por eso la convención de nombres es
 * obligatoria y correlativa —01, 02, 03…— sin huecos: el descubrimiento se
 * detiene en el primer número que falta. Si alguien sube 01 y 03, la 03 no
 * aparece, y eso es preferible a hacer doce peticiones fallidas por ejemplar.
 *
 * La extensión se resuelve una sola vez, con la primera foto: el resto de la
 * carpeta se pide con esa misma. Mezclar .jpg y .webp en un mismo ejemplar
 * triplicaría las peticiones para cubrir un caso que no se da en la práctica.
 */

export const CARPETA_FOTOS = "assets/img/ejemplares";

/** En orden de preferencia. La primera que responda manda para toda la carpeta. */
export const EXTENSIONES = ["jpg", "webp", "png", "jpeg", "JPG"];

/** Tope de seguridad: nadie va a publicar más de doce fotos de un árbol, y sin
 *  tope un error de nombres dispararía peticiones sin fin. */
export const TOPE_FOTOS = 12;

/** Dos dígitos: 01, 02… Ordena bien en el explorador de archivos y en el disco. */
export const numeroFoto = (n) => String(n).padStart(2, "0");

export const rutaFoto = (id, n, ext) => `${CARPETA_FOTOS}/${id}/${numeroFoto(n)}.${ext}`;

/**
 * Ruta de la miniatura: el mismo nombre con el sufijo -chica.
 *
 *   01.jpg  →  1400 px, el visor de la galería
 *   01-chica.jpg  →  480 px, la tarjeta del listado, el renglón del mapa y el
 *                    tirador de miniaturas de la propia galería
 *
 * Sin esta separación, abrir una ficha de once fotografías descargaba las once
 * a tamaño completo —unos 3 MB— nada más para dibujar el tirador de abajo.
 */
export const SUFIJO_CHICA = "-chica";
export const rutaMiniatura = (id, n, ext) =>
  `${CARPETA_FOTOS}/${id}/${numeroFoto(n)}${SUFIJO_CHICA}.${ext}`;

/** Convierte la ruta de una foto en la de su miniatura. Devuelve la original si
 *  no reconoce la forma: es preferible una imagen pesada a ninguna. */
export const miniaturaDe = (url) =>
  typeof url === "string" && /\/\d{2}\.[A-Za-z]+$/.test(url)
    ? url.replace(/(\/\d{2})(\.[A-Za-z]+)$/, `$1${SUFIJO_CHICA}$2`)
    : url;

/** Resuelve verdadero si la imagen carga. No usa fetch: con file:// y con
 *  ciertas configuraciones de servidor, fetch falla donde <img> funciona. */
export function existeImagen(url) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") { resolve(false); return; }
    const img = new Image();
    let resuelto = false;
    const fin = (v) => { if (!resuelto) { resuelto = true; resolve(v); } };
    img.onload = () => fin(img.naturalWidth > 0);
    img.onerror = () => fin(false);
    // Una imagen que nunca responde no debe dejar la galería colgada.
    setTimeout(() => fin(false), 8000);
    img.src = url;
  });
}

/**
 * Descubre las fotografías de un ejemplar recorriendo su carpeta por convención.
 * @param {string} id  Identificador del registro, tal cual nombra la carpeta.
 * @param {{credito?:string, tope?:number}} opciones
 * @returns {Promise<Array<{url:string, pie:string|null, credito:string|null, alt:string}>>}
 */
export async function descubrirFotos(id, opciones = {}) {
  if (!id) return [];
  const tope = opciones.tope || TOPE_FOTOS;
  const credito = opciones.credito || null;

  /* El sondeo va contra la MINIATURA, no contra la fotografía completa.
     `existeImagen` usa <img>, que descarga el archivo entero para responder si
     existe. Sondeando los originales, abrir una ficha de diez fotografías
     bajaba los diez a tamaño completo —2.9 MB— solo para contarlos, y de esos
     diez la galería enseña uno. Con la miniatura el mismo censo cuesta 0.4 MB
     y el visor pide el original únicamente de la foto que se está viendo.
     Si la carpeta no tiene miniaturas generadas, se cae al original: vale más
     una galería pesada que una galería vacía. */
  const sonda = (n, e) => existeImagen(rutaMiniatura(id, n, e)).then((hay) => hay || existeImagen(rutaFoto(id, n, e)));

  /* 1. La extensión de la carpeta la fija la primera foto.
     Se probaban las cinco EN PARALELO, y como son excluyentes eso significaba
     CUATRO peticiones fallidas garantizadas por ejemplar, siempre. Las 176
     fotografías montadas son .jpg, así que el caso raro pagaba el caso común.
     Ahora se prueba la primera de la lista sola; solo si no está se abren las
     otras cuatro en paralelo. En el caso común, cero peticiones fallidas; en
     el raro, un viaje de ida y vuelta más, que nadie nota. */
  let ext = (await sonda(1, EXTENSIONES[0])) ? EXTENSIONES[0] : null;
  if (!ext) {
    const halladas = await Promise.all(
      EXTENSIONES.slice(1).map((e) => sonda(1, e).then((hay) => (hay ? e : null))));
    ext = halladas.find(Boolean) || null;
  }
  if (!ext) return [];

  /* 2. El resto se pide con esa extensión hasta el primer hueco, en tandas.
     Antes se pedían de una vez los once números posibles: para una carpeta de
     cinco fotografías eso son SIETE peticiones fallidas, y para una de una,
     once. El tope existe para que un error de nombres no dispare peticiones
     sin fin, no para pedirlas todas siempre.
     Ahora se avanza de tres en tres y se corta en el primer hueco. Una carpeta
     de cinco cuesta dos peticiones fallidas en vez de siete, y la más grande
     que hay —once— sigue resolviéndose en cuatro viajes. El paralelismo dentro
     de la tanda se conserva: el corte lo decide el primer hueco, no el orden
     de llegada. */
  const urls = [rutaFoto(id, 1, ext)];
  const TANDA = 3;
  for (let n = 2; n <= tope; ) {
    const numeros = [];
    for (let k = 0; k < TANDA && n + k <= tope; k++) numeros.push(n + k);
    const hay = await Promise.all(numeros.map((i) => sonda(i, ext)));
    const hueco = hay.indexOf(false);
    const hasta = hueco === -1 ? numeros.length : hueco;
    for (let k = 0; k < hasta; k++) urls.push(rutaFoto(id, numeros[k], ext));
    if (hueco !== -1) break;
    n += numeros.length;
  }

  return urls.map((url, i) => ({
    url,
    miniatura: miniaturaDe(url),
    pie: null,
    credito,
    alt: `Fotografía ${i + 1} del ejemplar`,
  }));
}

/**
 * Coloca en un <img> la primera foto que exista para ese ejemplar, probando las
 * extensiones en orden. No usa peticiones previas: deja que el propio <img>
 * intente y, si falla, salta a la siguiente. Así la imagen se ve en cuanto
 * carga, sin esperar a que termine ningún sondeo.
 * @param {HTMLImageElement} img  Debe traer data-ejemplar con el identificador.
 * @param {(ok:boolean)=>void} [alTerminar]
 */
export function montarPrimeraFoto(img, alTerminar) {
  const id = img.getAttribute("data-ejemplar");
  if (!id) { if (alTerminar) alTerminar(false); return; }
  // Una imagen con hidden (display:none) y loading="lazy" NO se carga nunca: el
  // navegador la considera fuera de pantalla para siempre, así que ni siquiera
  // pide el archivo y no hay forma de saber si existe. Se le quitan las dos
  // cosas antes de sondear; la ocultación mientras tanto la hace el CSS con
  // opacidad, que sí deja cargar.
  img.hidden = false;
  img.removeAttribute("loading");
  // Se prueba primero la versión de 480 px y sólo si no está se cae a la
  // completa: así una carpeta con fotos sueltas, sin miniaturas generadas,
  // sigue funcionando aunque pese más.
  const candidatas = [];
  for (const e of EXTENSIONES) candidatas.push(rutaMiniatura(id, 1, e));
  for (const e of EXTENSIONES) candidatas.push(rutaFoto(id, 1, e));
  let i = 0;
  const intentar = () => {
    if (i >= candidatas.length) { if (alTerminar) alTerminar(false); return; }
    img.src = candidatas[i++];
  };
  img.addEventListener("error", intentar);
  img.addEventListener("load", () => { if (alTerminar) alTerminar(true); }, { once: true });
  intentar();
}

/** Solo la primera foto. Es lo que necesitan las tarjetas del listado y los
 *  renglones del mapa, y evita recorrer doce números por cada uno de los trece
 *  ejemplares nada más para pintar una miniatura. */
export async function primeraFoto(id, credito) {
  if (!id) return null;
  for (const e of EXTENSIONES) {
    const chica = rutaMiniatura(id, 1, e);
    if (await existeImagen(chica)) {
      return { url: chica, miniatura: chica, pie: null, credito: credito || null, alt: "Fotografía del ejemplar" };
    }
    const u = rutaFoto(id, 1, e);
    if (await existeImagen(u)) {
      return { url: u, miniatura: u, pie: null, credito: credito || null, alt: "Fotografía del ejemplar" };
    }
  }
  return null;
}
