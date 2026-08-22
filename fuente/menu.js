/**
 * Barra de navegación: la vuelve visiblemente pulsable y, en pantalla angosta,
 * la convierte en un panel desplegable en vez de esconderla.
 *
 * Se activa sola al cargar. Es idempotente: llamarla dos veces no duplica nada.
 */
export function activarMenu() {
  const barra = document.querySelector(".barra");
  if (!barra || barra.dataset.menuListo === "si") return;
  barra.dataset.menuListo = "si";

  const nav = barra.querySelector("nav");
  if (!nav) return;
  nav.id = nav.id || "menuPrincipal";

  // --- botón de despliegue para pantallas angostas ---
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "barra__abrir";
  boton.setAttribute("aria-controls", nav.id);
  boton.setAttribute("aria-expanded", "false");
  boton.setAttribute("aria-label", "Abrir el menú");
  boton.innerHTML = '<span class="barra__rayas" aria-hidden="true"></span><span class="barra__abrir-texto">Menú</span>';
  nav.parentNode.insertBefore(boton, nav);

  const cerrar = () => {
    barra.classList.remove("barra--abierta");
    boton.setAttribute("aria-expanded", "false");
    boton.setAttribute("aria-label", "Abrir el menú");
  };
  const alternar = () => {
    const abierta = barra.classList.toggle("barra--abierta");
    boton.setAttribute("aria-expanded", String(abierta));
    boton.setAttribute("aria-label", abierta ? "Cerrar el menú" : "Abrir el menú");
  };
  boton.addEventListener("click", alternar);
  nav.addEventListener("click", (ev) => { if (ev.target.closest("a")) cerrar(); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") cerrar(); });
  document.addEventListener("click", (ev) => {
    if (!barra.classList.contains("barra--abierta")) return;
    if (!ev.target.closest(".barra")) cerrar();
  });

  // --- resaltado de la sección en pantalla ---
  const enlaces = [...nav.querySelectorAll('a[href*="#"]')];
  const porId = new Map();
  for (const a of enlaces) {
    const id = a.getAttribute("href").split("#")[1];
    const seccion = id && document.getElementById(id);
    if (seccion) porId.set(seccion, a);
  }
  if (!porId.size || !("IntersectionObserver" in window)) return;

  const marcar = (a) => {
    for (const x of enlaces) x.removeAttribute("aria-current");
    if (a) a.setAttribute("aria-current", "true");
  };
  const visibles = new Set();
  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.isIntersecting) visibles.add(e.target); else visibles.delete(e.target);
    }
    // Gana la sección visible que esté más arriba en el documento.
    const orden = [...porId.keys()].filter((s) => visibles.has(s));
    marcar(orden.length ? porId.get(orden[0]) : null);
  }, { rootMargin: "-64px 0px -55% 0px", threshold: 0 });
  for (const s of porId.keys()) observador.observe(s);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activarMenu, { once: true });
  } else {
    activarMenu();
  }
}

/**
 * Barra de desplazamiento propia para las hileras horizontales.
 *
 * Los navegadores modernos dibujan barras superpuestas y finísimas que
 * aparecen y desaparecen: imposibles de agarrar con el ratón. Esta es una
 * barra siempre visible, alta y con área de arrastre generosa, más dos
 * botones de avance. Se sincroniza en ambos sentidos con el desplazamiento
 * real, así que la rueda del ratón y el gesto táctil siguen funcionando.
 */
/** Iconos de la guia. Trazo, no glifo: un caracter Unicode se dibuja distinto
 *  en cada sistema y a este tamano se vuelve una mancha. */
const FLECHAS_LR = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7 3.5 12 8 17M16 7l4.5 5-4.5 5M3.5 12h17"/></svg>';
const CURSOR = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3.5 18.5 11l-5.6 1.6L10.6 18Z"/></svg>';

export function activarDeslizador(pista) {
  if (!pista || pista.dataset.deslizadorListo === "si") return;
  pista.dataset.deslizadorListo = "si";

  // Dos modos. Por omision, barra de arrastre entre las dos flechas. Con
  // data-desliza="guia" el riel se sustituye por una linea que dice como se
  // recorre la hilera y que cada arbol abre su ficha: en la portada la barra
  // competia con la hilera y nada avisaba que las siluetas eran enlaces.
  const conGuia = String(pista.dataset.desliza || "").indexOf("guia") !== -1;

  /* EN MODO GUIA YA NO HAY BOTONES ‹ ›.
     Se repetían con los discos ‹ › que asoman en los bordes de la hilera al
     acercar el ratón: dos pares de flechas para el mismo gesto, a diez píxeles
     uno de otro.
     Se quitan los de la barra, que son los que estorbaban, y NO se pierde el
     teclado: la hilera pasa a ser una región enfocable con nombre, y un
     contenedor con desplazamiento propio y foco se recorre con las flechas del
     teclado en todos los navegadores. Es el patrón estándar para una tira que
     se desplaza, y de paso deja de haber dos paradas de tabulación (los dos
     botones) antes de llegar al primer árbol. */
  const barra = document.createElement("div");
  barra.className = conGuia ? "deslizador deslizador--guia" : "deslizador";
  barra.innerHTML =
    (conGuia
      ? '<p class="deslizador__guia">' +
        '<span class="deslizador__pista-guia"><b aria-hidden="true">' + FLECHAS_LR + '</b>Arrástrala de lado</span>' +
        '<span class="deslizador__pista-guia"><b aria-hidden="true">' + CURSOR + '</b>Elige un árbol y abres su ficha</span>' +
        '</p>'
      : '<span class="deslizador__mando">' +
        '<button type="button" class="deslizador__paso" data-dir="-1" aria-label="Ver los anteriores">‹</button>' +
        '<div class="deslizador__riel" role="scrollbar" aria-orientation="horizontal" tabindex="0">' +
        '<div class="deslizador__tirador"></div></div>' +
        '<button type="button" class="deslizador__paso" data-dir="1" aria-label="Ver los siguientes">›</button>' +
        '</span>');

  // El teclado, sin botones: la hilera se enfoca y se recorre con las flechas.
  if (conGuia && !pista.hasAttribute("tabindex")) {
    pista.tabIndex = 0;
    pista.setAttribute("role", "region");
    if (!pista.hasAttribute("aria-label")) {
      pista.setAttribute("aria-label", "Los ejemplares a escala real. Usa las flechas para recorrerlos.");
    }
  }
  // Con guia, los controles y la instruccion van ARRIBA de la hilera: una
  // indicacion que se descubre despues de haber intentado usar la pieza llega
  // tarde. Sin guia —la ficha— la barra sigue debajo, que es donde una barra
  // de desplazamiento se espera.
  // Si la hilera vive dentro de un marco declarado, el control se monta FUERA
  // de él. En la portada ese marco contiene la regla de alturas, que se estira
  // desde su borde superior: metido dentro, el control quedaba tapado por la
  // primera marca y la regla arrancaba treinta píxeles por encima del suelo.
  const marco = pista.closest("[data-desliza-marco]") || pista;
  if (conGuia) marco.insertAdjacentElement("beforebegin", barra);
  else marco.insertAdjacentElement("afterend", barra);

  const riel = barra.querySelector(".deslizador__riel");
  const tirador = barra.querySelector(".deslizador__tirador");

  const maxScroll = () => Math.max(0, pista.scrollWidth - pista.clientWidth);

  const pintar = () => {
    const max = maxScroll();
    barra.hidden = max < 4;
    if (barra.hidden) return;
    // Las flechas dicen si queda camino: sin riel son la unica senal de tope.
    for (const b of barra.querySelectorAll(".deslizador__paso")) {
      const haciaAdelante = Number(b.dataset.dir) > 0;
      b.disabled = haciaAdelante ? pista.scrollLeft >= max - 1 : pista.scrollLeft <= 0;
    }
    if (!riel || !tirador) return;
    const proporcion = Math.max(0.12, pista.clientWidth / pista.scrollWidth);
    const anchoRiel = riel.clientWidth;
    const anchoTirador = Math.max(48, anchoRiel * proporcion);
    tirador.style.width = anchoTirador + "px";
    tirador.style.transform =
      "translateX(" + (pista.scrollLeft / max) * (anchoRiel - anchoTirador) + "px)";
    riel.setAttribute("aria-valuenow", Math.round((pista.scrollLeft / max) * 100));
    riel.setAttribute("aria-valuemin", "0");
    riel.setAttribute("aria-valuemax", "100");
  };

  const irA = (px) => {
    pista.scrollTo({ left: Math.max(0, Math.min(maxScroll(), px)), behavior: "smooth" });
  };

  pista.addEventListener("scroll", pintar, { passive: true });
  window.addEventListener("resize", pintar);
  // La caja de la hilera tiene alto fijo: cuando cambia su CONTENIDO —otra
  // ficha, otro filtro— el ResizeObserver no se entera y la barra quedaba
  // con la geometría de la hilera anterior. Se vigilan las dos cosas.
  const observadores = [];
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(pintar);
    ro.observe(pista);
    for (const hijo of pista.children) ro.observe(hijo);
    observadores.push(ro);
  }
  if ("MutationObserver" in window) {
    const mo = new MutationObserver(() => {
      if ("ResizeObserver" in window && observadores[0]) {
        for (const hijo of pista.children) observadores[0].observe(hijo);
      }
      pintar();
    });
    mo.observe(pista, { childList: true });
    observadores.push(mo);
  }
  // Si la hilera desaparece del documento, la barra y sus observadores se van
  // con ella: antes quedaban vivos apuntando a un nodo desprendido.
  if ("MutationObserver" in window) {
    const vigilante = new MutationObserver(() => {
      if (pista.isConnected) return;
      for (const o of observadores) o.disconnect();
      window.removeEventListener("resize", pintar);
      barra.remove();
      vigilante.disconnect();
    });
    vigilante.observe(document.body, { childList: true, subtree: true });
    observadores.push(vigilante);
  }

  for (const b of barra.querySelectorAll(".deslizador__paso")) {
    b.addEventListener("click", () => {
      irA(pista.scrollLeft + Number(b.dataset.dir) * pista.clientWidth * 0.8);
    });
  }

  // Sin riel no hay tirador que arrastrar ni scrollbar que gobernar con el
  // teclado: la hilera se recorre arrastrandola, con las flechas o con los
  // bordes sensibles. Se sale antes de enganchar nada que apunte a null.
  if (!riel || !tirador) { pintar(); return pintar; }

  // Arrastre del tirador y clic directo sobre el riel.
  let arrastrando = false;
  const desdeEvento = (ev) => {
    const r = riel.getBoundingClientRect();
    const anchoTirador = tirador.offsetWidth;
    const util = Math.max(1, r.width - anchoTirador);
    const t = (ev.clientX - r.left - anchoTirador / 2) / util;
    pista.scrollLeft = Math.max(0, Math.min(1, t)) * maxScroll();
  };
  tirador.addEventListener("pointerdown", (ev) => {
    arrastrando = true;
    tirador.setPointerCapture(ev.pointerId);
    barra.classList.add("deslizador--activo");
    ev.preventDefault();
  });
  tirador.addEventListener("pointermove", (ev) => { if (arrastrando) desdeEvento(ev); });
  const soltar = () => { arrastrando = false; barra.classList.remove("deslizador--activo"); };
  tirador.addEventListener("pointerup", soltar);
  tirador.addEventListener("pointercancel", soltar);
  riel.addEventListener("pointerdown", (ev) => { if (ev.target !== tirador) desdeEvento(ev); });
  riel.addEventListener("keydown", (ev) => {
    const paso = pista.clientWidth * 0.8;
    if (ev.key === "ArrowRight") { irA(pista.scrollLeft + paso); ev.preventDefault(); }
    if (ev.key === "ArrowLeft") { irA(pista.scrollLeft - paso); ev.preventDefault(); }
    if (ev.key === "Home") { irA(0); ev.preventDefault(); }
    if (ev.key === "End") { irA(maxScroll()); ev.preventDefault(); }
  });

  pintar();
  return pintar;
}

/**
 * Engancha todas las hileras que declaren data-desliza, ahora y cuando
 * aparezcan.
 *
 * El barrido no corre en cada mutación: el mapa repinta su listado en cada
 * cambio de filtro y cada selección, y recorrer el documento entero cientos
 * de veces por sesión es desperdicio puro. Se agrupan las mutaciones en un
 * solo barrido por cuadro de animación.
 */
/**
 * Arrastre directo de la hilera, del modo en que se empuja una fotografia
 * sobre una mesa.
 *
 * Al retirar la barra de la portada, el raton se quedaba sin forma de recorrer
 * la hilera salvo los bordes sensibles. Aqui la hilera entera es el asidero.
 * El detalle que lo hace utilizable: cada arbol es un enlace, asi que un
 * arrastre de 300 px terminaba abriendo la ficha del arbol donde se solto. Se
 * cuenta el recorrido y, pasado el umbral, se cancela el clic de ese gesto.
 */
export function activarArrastre(pista) {
  if (!pista || pista.dataset.arrastreListo === "si") return;
  pista.dataset.arrastreListo = "si";
  const UMBRAL = 6;

  let id = null, inicioX = 0, inicioScroll = 0, recorrido = 0;

  pista.addEventListener("pointerdown", (ev) => {
    // El arrastre es para raton y dedo. Con el dedo el navegador ya desplaza
    // solo, y robarle el gesto rompe el impulso nativo: se deja pasar.
    if (ev.pointerType === "touch" || ev.button !== 0) return;
    id = ev.pointerId; inicioX = ev.clientX; inicioScroll = pista.scrollLeft; recorrido = 0;
    pista.classList.add("bosque__pista--asiendo");
  });

  pista.addEventListener("pointermove", (ev) => {
    if (id === null || ev.pointerId !== id) return;
    const avance = ev.clientX - inicioX;
    if (Math.abs(avance) > recorrido) recorrido = Math.abs(avance);
    if (recorrido > UMBRAL) {
      // La captura se pide solo cuando ya es un arrastre de verdad: pedirla en
      // el pointerdown se comia los clics normales sobre los enlaces.
      if (!pista.hasPointerCapture(ev.pointerId)) pista.setPointerCapture(ev.pointerId);
      pista.scrollLeft = inicioScroll - avance;
      ev.preventDefault();
    }
  });

  const soltar = () => {
    if (id === null) return;
    pista.classList.remove("bosque__pista--asiendo");
    if (recorrido > UMBRAL) {
      // Un solo clic, el que cierra este gesto, y en captura para llegar antes
      // que el enlace.
      pista.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); },
        { capture: true, once: true });
    }
    id = null;
  };
  pista.addEventListener("pointerup", soltar);
  pista.addEventListener("pointercancel", soltar);
  // Arrastrar imagenes y texto compite con el gesto: el navegador levanta su
  // propio fantasma de la ilustracion y el desplazamiento se traba.
  pista.addEventListener("dragstart", (ev) => ev.preventDefault());
}

export function activarDeslizadores() {
  const enganchar = () => {
    for (const p of document.querySelectorAll("[data-desliza]")) { activarDeslizador(p); activarBordes(p); activarArrastre(p); }
    // Varios enlaces externos los pinta el sitio con los datos ya cargados, así
    // que el aviso de pestaña nueva se vuelve a pasar en cada cambio del árbol.
    avisarPestanaNueva();
  };
  enganchar();
  if (!("MutationObserver" in window)) return;
  let pendiente = false;
  const observador = new MutationObserver((entradas) => {
    // Solo interesa si apareció o desapareció algo: los cambios de atributo
    // o de texto no pueden traer una hilera nueva.
    const relevante = entradas.some((e) => e.addedNodes.length || e.removedNodes.length);
    if (!relevante || pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; enganchar(); });
  });
  observador.observe(document.body, { childList: true, subtree: true });
  return () => observador.disconnect();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activarDeslizadores, { once: true });
  } else {
    activarDeslizadores();
  }
}

/**
 * Arrastre por acercamiento al borde.
 *
 * Al acercar el raton al extremo izquierdo o derecho de una hilera con
 * desplazamiento, esta avanza sola. Es una AYUDA, no un sustituto: la barra y
 * las flechas se quedan porque son lo unico que funciona con teclado, con dedo
 * y con lector de pantalla, y lo unico que dice cuanto falta por ver.
 *
 * Se apaga donde no hay puntero fino —telefonos y tabletas— y cuando el sistema
 * pide movimiento reducido.
 */
export function activarBordes(pista) {
  if (!pista || pista.dataset.bordes === "si") return;
  const finoYConHover = window.matchMedia("(hover:hover) and (pointer:fine)");
  const quietud = window.matchMedia("(prefers-reduced-motion:reduce)");
  if (!finoYConHover.matches || quietud.matches) return;
  pista.dataset.bordes = "si";

  const marco = pista.parentNode;
  if (getComputedStyle(marco).position === "static") marco.style.position = "relative";
  const zona = (lado) => {
    const d = document.createElement("div");
    d.className = `bosque__borde bosque__borde--${lado}`;
    d.setAttribute("aria-hidden", "true");
    marco.appendChild(d);
    return d;
  };
  const izq = zona("izq"), der = zona("der");

  const ANCHO = 72;          // franja sensible, en pixeles
  // A trece pixeles por cuadro la hilera cruzaba trece ejemplares en poco mas
  // de un segundo: se pasaba de largo antes de poder leer un nombre. A seis,
  // el recorrido se puede seguir con la vista, que es para lo que sirve.
  const VELOCIDAD = 6;       // pixeles por cuadro en el borde mismo
  let rumbo = 0, cuadro = 0;

  const paso = () => {
    if (!rumbo) { cuadro = 0; return; }
    pista.scrollLeft += rumbo;
    cuadro = requestAnimationFrame(paso);
  };

  const mover = (ev) => {
    const r = pista.getBoundingClientRect();
    const x = ev.clientX - r.left;
    // La velocidad crece conforme el raton se acerca al extremo: junto al borde
    // avanza rapido, al filo de la franja apenas se mueve.
    let v = 0;
    if (x < ANCHO) v = -Math.round(((ANCHO - x) / ANCHO) * VELOCIDAD);
    else if (x > r.width - ANCHO) v = Math.round(((x - (r.width - ANCHO)) / ANCHO) * VELOCIDAD);
    // No tiene sentido señalar un borde al que ya no se puede avanzar.
    const tope = pista.scrollWidth - pista.clientWidth;
    if (v < 0 && pista.scrollLeft <= 0) v = 0;
    if (v > 0 && pista.scrollLeft >= tope - 1) v = 0;
    rumbo = v;
    izq.toggleAttribute("data-activo", v < 0);
    der.toggleAttribute("data-activo", v > 0);
    if (rumbo && !cuadro) cuadro = requestAnimationFrame(paso);
  };

  const parar = () => {
    rumbo = 0;
    if (cuadro) { cancelAnimationFrame(cuadro); cuadro = 0; }
    izq.removeAttribute("data-activo");
    der.removeAttribute("data-activo");
  };

  pista.addEventListener("mousemove", mover);
  pista.addEventListener("mouseleave", parar);
  // Si alguien esta leyendo un globo, no se le mueve la hilera bajo el raton.
  pista.addEventListener("mouseover", (ev) => { if (ev.target.closest(".bosque__globo")) parar(); });
}

/**
 * Dice, para quien usa lector de pantalla, que un enlace abre otra pestaña.
 *
 * La flecha «↗» que la hoja de estilos añade es la señal visible; esto es la
 * audible. No se toca el aria-label existente —hay enlaces de red social que
 * ya lo traen— sino que se añade un texto oculto al final, que es lo que el
 * lector lee después del nombre del enlace.
 *
 * Se hace con guion y no escribiéndolo cuarenta y cinco veces a mano porque
 * varios de esos enlaces los pinta el propio sitio a partir de los datos.
 */
export function avisarPestanaNueva(raiz = document) {
  const AVISO = " (se abre en otra pestaña)";
  for (const a of raiz.querySelectorAll('a[target="_blank"]')) {
    if (a.dataset.avisoExterno === "si") continue;
    a.dataset.avisoExterno = "si";

    /* Varios enlaces ya traían una flecha decorativa «→» en un span oculto al
       lector. Añadirles encima la «↗» de la hoja de estilos dejaba dos flechas
       seguidas. Se reaprovecha la que ya está: pasa a ser la diagonal, que dice
       más —«ir» y «se abre en otra parte»— y se apaga el pseudoelemento. */
    const decorativa = a.querySelector(':scope > span[aria-hidden="true"]');
    if (decorativa && /[→↗]/.test(decorativa.textContent)) {
      decorativa.textContent = decorativa.textContent.replace(/→/g, "↗");
      a.classList.add("sin-marca-externa");
    }

    const etiqueta = a.getAttribute("aria-label");
    if (etiqueta) { a.setAttribute("aria-label", etiqueta + AVISO); continue; }
    const vo = document.createElement("span");
    vo.className = "vo";
    vo.textContent = AVISO;
    a.appendChild(vo);
  }
}
