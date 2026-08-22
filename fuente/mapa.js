/**
 * mapa.js · Árboles patrimoniales
 * Mapa del listado de árboles patrimoniales sobre sus coordenadas verificadas.
 *
 * Requiere Leaflet cargado globalmente (window.L). El listado lateral funciona
 * aunque el mapa no cargue: es la vía accesible al mismo contenido.
 */

import { GEO_CDMX } from "./geo-cdmx.js";
import { montarPrimeraFoto } from "./fotos.js";

/**
 * Cartografía base.
 *
 * La de OpenStreetMap trae todos sus puntos de interés: farmacias, cimas,
 * gasolineras, cajeros. Sobre un mapa cuyo único trabajo es decir DÓNDE ESTÁ
 * UN ÁRBOL, esa simbología compite con los marcadores propios y no aporta:
 * nadie llega a un ahuehuete guiándose por una cruz de farmacia.
 *
 * Positron conserva lo que sí sirve para ubicarse —trazado de calles y sus
 * nombres, colonias, cuerpos de agua— y retira el resto. Además su gris claro
 * convive con el crema y el morado del sitio, donde el verde y el rosa de OSM
 * peleaban con los marcadores.
 *
 * El sufijo {r} pide la versión de doble densidad en pantallas que la admiten.
 */
const TESELAS = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

/** Máscara que apaga todo lo que queda fuera de la Ciudad de México y dibuja
 *  su perímetro oficial. Cartografía: INEGI, CVEGEO 09.
 *  Es el objeto GeoJSON, no una ruta: pedirlo por fetch fallaba al abrir el
 *  sitio con file://, al publicar sin la carpeta assets/geo y en Claude Design. */
export const MASCARA_CDMX = GEO_CDMX;
/** Límites de la Ciudad de México: el mapa no se puede arrastrar más allá. */
export const LIMITES_CDMX = [[18.98, -99.43], [19.66, -98.87]];

// La atribución es obligatoria: los datos siguen siendo de OpenStreetMap y el
// dibujo de las teselas es de CARTO.
const ATRIBUCION = 'Cartografía base © colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · teselas de <a href="https://carto.com/attributions">CARTO</a>';

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = (n, d = 1) => (n === null || n === undefined || !isFinite(n) ? "—" : Number(n).toLocaleString("es-MX", { maximumFractionDigits: d }));

/** Diámetro del pin en función de la altura del ejemplar, para que el mapa también informe. */
/** Todos los marcadores son iguales y no llevan cifra dentro: el mapa responde
 *  dónde está cada ejemplar. Su altura se lee en la ficha y en el listado. */
/* El botón del globo lleva a OTRO archivo, no a un ancla de esta página.
   El ensamblador sustituye el testigo por el nombre real de la ficha. */
export const RUTA_FICHA = "__FICHA__";

export const TAMANO_PIN = 16;

/** Área de toque del marcador. El punto visible sigue midiendo TAMANO_PIN. */
export const TOQUE_PIN = 26;

/** Ejemplares que pasan los filtros activos. */
export function filtrar(ejemplares, { categoria = "", alcaldia = "", especie = "" } = {}) {
  return ejemplares.filter((e) => {
    if (categoria && !e.categorias.includes(categoria)) return false;
    if (alcaldia && e.alcaldia !== alcaldia) return false;
    if (especie && e.especie !== especie) return false;
    return true;
  });
}

/** Nombre de la alcaldía dentro de un rasgo GeoJSON, sea cual sea su esquema. */

export function crearMapa({ contenedor, lista, filtros, ejemplares, alSeleccionar, mascara = MASCARA_CDMX }) {
  const conCoords = ejemplares.filter((e) => e.coords);
  const sinCoords = ejemplares.length - conCoords.length;

  /* Los filtros del mapa viajan en la dirección, igual que los del listado:
     así se pueden compartir y sobreviven al botón «atrás». */
  const url = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
  const estado = { categoria: url.get("mcat") || "", alcaldia: url.get("malc") || "",
                   especie: url.get("mesp") || "", activo: url.get("sel") || null };

  function guardarEstado() {
    if (typeof history === "undefined" || !history.replaceState) return;
    const p = new URLSearchParams(location.search);
    const par = { mcat: estado.categoria, malc: estado.alcaldia, mesp: estado.especie, sel: estado.activo };
    for (const [k, v] of Object.entries(par)) { v ? p.set(k, v) : p.delete(k); }
    const cad = p.toString();
    history.replaceState(null, "", location.pathname + (cad ? "?" + cad : "") + location.hash);
  }
  const marcadores = new Map();
  let mapa = null, marcadorUsuario = null;
  // Estas dos se leen durante el montaje del mapa, que ocurre antes de las
  // funciones que las usan: declararlas junto a ellas las dejaba en zona muerta
  // y el montaje reventaba con «Cannot access before initialization».
  let pistaVistaEnMemoria = false;   // la pista de ubicación ya se cerró
  let slugResultado = null;          // ejemplar que respondió «el más cercano»

  /* ---------- mapa ---------- */
  if (typeof L !== "undefined" && conCoords.length) {
    mapa = L.map(contenedor, { scrollWheelZoom: true, zoomControl: true,
      maxBounds: L.latLngBounds(LIMITES_CDMX), maxBoundsViscosity: 0.85, minZoom: 9 });
    L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19, subdomains: "abcd", bounds: L.latLngBounds(LIMITES_CDMX) }).addTo(mapa);
    mapa.fitBounds(conCoords.map((e) => [e.coords.lat, e.coords.lng]), { padding: [48, 48] });
    ponerMascara(mascara);
    // El aviso vive sobre el lienzo: bajo los filtros pasaba desapercibido.
    const marcoAviso = contenedor.closest(".mapa-marco") || contenedor.parentNode;
    if (marcoAviso && !marcoAviso.querySelector("[data-aviso]")) {
      // Nace como pista: nadie adivina qué hace el botón de ubicación si no se
      // le dice. Al usarlo, el mismo recuadro pasa a dar el resultado.
      marcoAviso.insertAdjacentHTML("beforeend",
        '<div class="mapa-aviso mapa-aviso--pista" data-aviso role="status">'
        + '<button type="button" class="mapa-aviso__cerrar" data-cerrar-aviso aria-label="Ocultar este mensaje">×</button>'
        + '<b>¿Cuál es tu árbol patrimonial más cercano?</b> Toca <span class="mapa-aviso__icono">◎</span> '
        + 'arriba a la izquierda y te lo decimos, con la distancia desde donde estás.</div>');
      const cajaP = marcoAviso.querySelector("[data-aviso]");
      // La pista solo hace falta la primera vez. Se recuerda por sesión, y si el
      // navegador no deja guardar —modo privado, sandbox— se degrada a esta
      // corrida: peor es no poder cerrarla.
      if (pistaYaVista()) cajaP.hidden = true;
      const cerrar = cajaP.querySelector("[data-cerrar-aviso]");
      L.DomEvent.disableClickPropagation(cajaP);
      cerrar.addEventListener("click", () => { cajaP.hidden = true; recordarPista(); });
    }

    // Control de ubicación de la persona usuaria.
    const Ubicar = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const c = L.DomUtil.create("div", "leaflet-bar mapa-control");
        const b = L.DomUtil.create("a", "", c);
        b.href = "#"; b.title = "Mostrar mi ubicación"; b.setAttribute("role", "button");
        b.setAttribute("aria-label", "Mostrar mi ubicación en el mapa");
        b.innerHTML = "◎";
        L.DomEvent.on(b, "click", (ev) => { L.DomEvent.stop(ev); ubicarme(b); });
        return c;
      },
    });
    mapa.addControl(new Ubicar());

    // Volver a la vista de los trece. Con el botón de ubicación el mapa se
    // acerca a una zona y el resto del listado sale de cuadro: sin una salida
    // explícita la única forma de recuperar el conjunto era alejar a mano.
    const encuadreCompleto = () =>
      mapa.fitBounds(conCoords.map((e) => [e.coords.lat, e.coords.lng]), { padding: [48, 48] });
    const VerTodos = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const c = L.DomUtil.create("div", "leaflet-bar mapa-control mapa-control--todos");
        const b = L.DomUtil.create("a", "", c);
        b.href = "#"; b.setAttribute("role", "button");
        // El rótulo no lleva la cuenta. «Ver los 13» obliga a quien lee a
        // saber de qué trece se habla, y además envejece: el día que se
        // declare el catorceavo, el botón miente hasta que alguien lo note.
        // La cuenta vive en el título, que es donde sí ayuda.
        b.title = `Ver los ${conCoords.length} ejemplares en el mapa`;
        b.setAttribute("aria-label", b.title);
        b.innerHTML = `<span class="mapa-control__texto">Ver todos</span>`;
        L.DomEvent.on(b, "click", (ev) => { L.DomEvent.stop(ev); encuadreCompleto(); });
        c.hidden = true;
        contenedor._verTodos = c;
        return c;
      },
    });
    mapa.addControl(new VerTodos());
    // Solo aparece cuando hay algo a lo que volver: si la vista ya abarca a los
    // trece, el botón sobra y solo estorba junto a los demás controles.
    const revisarVerTodos = () => {
      const caja = contenedor._verTodos;
      if (!caja) return;
      const vista = mapa.getBounds();
      const todosDentro = conCoords.every((e) => vista.contains([e.coords.lat, e.coords.lng]));
      caja.hidden = todosDentro;
    };
    mapa.on("moveend zoomend", revisarVerTodos);
    mapa.whenReady(revisarVerTodos);

    // Pantalla completa. Se usa la API del navegador cuando existe; si no
    // (Safari en iOS no la expone en elementos), se recurre a una clase que
    // fija el marco sobre la ventana. En ambos casos hay que avisar a Leaflet
    // de que su contenedor cambió de tamaño.
    const marco = contenedor.closest(".mapa-marco") || contenedor;
    const PantallaCompleta = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const c = L.DomUtil.create("div", "leaflet-bar mapa-control");
        const b = L.DomUtil.create("a", "", c);
        b.href = "#"; b.setAttribute("role", "button");
        b.innerHTML = "⤢";
        const rotular = () => {
          const activo = marco.classList.contains("mapa-marco--pleno") || document.fullscreenElement === marco;
          b.title = activo ? "Salir de pantalla completa" : "Ver el mapa en pantalla completa";
          b.setAttribute("aria-label", b.title);
          b.setAttribute("aria-pressed", String(activo));
          b.innerHTML = activo ? "⤡" : "⤢";
        };
        L.DomEvent.on(b, "click", (ev) => {
          L.DomEvent.stop(ev);
          alternarPleno();
          rotular();
        });
        rotular();
        contenedor._rotularPleno = rotular;
        return c;
      },
    });
    mapa.addControl(new PantallaCompleta());

    function reajustar() { setTimeout(() => mapa.invalidateSize(), 210); }

    // Fuera de la Ciudad de México el mapa se apaga: un polígono con la Ciudad
    // recortada como hueco, más el contorno oficial marcado encima. Si la
    // cartografía no carga, el mapa sigue funcionando sin la máscara.
    /** Admite el GeoJSON ya cargado (lo normal) o una ruta, por si algún día
     *  conviene servirlo aparte. */
    async function ponerMascara(fuente) {
      if (!fuente) return;
      try {
        let geo = fuente;
        if (typeof fuente === "string") {
          const r = await fetch(fuente);
          if (!r.ok) return;
          geo = await r.json();
        }
        L.geoJSON(geo, {
          interactive: false,
          style: (f) => f.properties && f.properties.clase === "contorno"
            ? { color: "#8D4992", weight: 2, opacity: 0.8, fill: false, dashArray: null }
            : { color: "transparent", weight: 0, fillColor: "#FEF7E4", fillOpacity: 0.88 },
        }).addTo(mapa).bringToBack();
      } catch (err) { /* sin máscara, el mapa sigue siendo utilizable */ }
    }

    function alternarPleno() {
      const nativo = marco.requestFullscreen || marco.webkitRequestFullscreen;
      if (nativo && !marco.classList.contains("mapa-marco--pleno")) {
        if (document.fullscreenElement === marco) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
          const r = nativo.call(marco);
          if (r && r.catch) r.catch(() => { marco.classList.add("mapa-marco--pleno"); reajustar(); });
        }
        reajustar();
        return;
      }
      marco.classList.toggle("mapa-marco--pleno");
      document.body.classList.toggle("sin-desplazamiento", marco.classList.contains("mapa-marco--pleno"));
      reajustar();
    }

    document.addEventListener("fullscreenchange", () => {
      reajustar();
      if (contenedor._rotularPleno) contenedor._rotularPleno();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && marco.classList.contains("mapa-marco--pleno")) {
        marco.classList.remove("mapa-marco--pleno");
        document.body.classList.remove("sin-desplazamiento");
        reajustar();
        if (contenedor._rotularPleno) contenedor._rotularPleno();
      }
    });

    conCoords.forEach((e) => {
      // El punto se ve de TAMANO_PIN, pero el icono mide TOQUE_PIN: un dedo
      // necesita 24 px y el marcador visible se quedaba en 16.
      const d = TOQUE_PIN;
      const icono = L.divIcon({
        className: "", iconSize: [d, d], iconAnchor: [d / 2, d / 2],
        html: `<div class="pin"></div>`,
      });
      const m = L.marker([e.coords.lat, e.coords.lng], { icon: icono, title: e.nombreAsignado || "Ejemplar",
        alt: `${e.nombreAsignado || "Ejemplar"}, ${nf(e.morfologia.altura_m)} metros` }).addTo(mapa);
      /* autoPanPaddingTopLeft reserva la esquina donde viven los controles de
         acercamiento, ubicación y pantalla completa: sin esa reserva el globo
         se abría encima de ellos y tapaba los botones. */
      m.bindPopup(globo(e), { closeButton: true, maxWidth: 238, minWidth: 238,
        autoPan: true, autoPanPaddingTopLeft: [66, 16], autoPanPaddingBottomRight: [16, 96] });
      m.on("popupopen", (ev) => {
        const caja = ev.popup.getContent();
        const img = caja && caja.querySelector && caja.querySelector("img[data-ejemplar]");
        if (!img || img.dataset.montada === "1") return;
        img.dataset.montada = "1";
        montarPrimeraFoto(img, (ok) => {
          if (ok) img.classList.add("globo-mapa__foto--cargada"); else img.remove();
          // Recoloca el globo: al aparecer o desaparecer la banda de 118 px
          // cambia su altura y la punta dejaría de apuntar al marcador.
          if (ev.popup.isOpen()) ev.popup.update();
        });
      });
      m.on("click", () => seleccionar(e.slug, false));
      marcadores.set(e.slug, m);
    });
  } else if (contenedor) {
    contenedor.innerHTML = `<div class="mapa-vacio">El mapa no pudo cargarse. El listado de la derecha contiene los mismos ejemplares con su ubicación.</div>`;
  }

  /* ---------- memoria de la pista ---------- */
  const CLAVE_PISTA = "arboles-patrimoniales:pista-ubicacion";
  function pistaYaVista() {
    if (pistaVistaEnMemoria) return true;
    try { return sessionStorage.getItem(CLAVE_PISTA) === "1"; } catch (_) { return false; }
  }
  function recordarPista() {
    pistaVistaEnMemoria = true;
    try { sessionStorage.setItem(CLAVE_PISTA, "1"); } catch (_) { /* sin almacenamiento: basta la memoria */ }
  }

  /* ---------- ubicación de la persona ---------- */

  /** Dibuja el punto de la persona, su anillo de precisión y resuelve cuál es
   *  su ejemplar más próximo. Se llama dos veces: con la posición rápida y,
   *  si llega, con la afinada. */
  function pintarUbicacion(lat, lng, accuracy, encuadrar) {
    if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
    // El anillo iba a un pixel de trazo y 12 % de relleno: sobre el beige y
    // el café de la cartografía, a zoom alto, prácticamente no se veía. Se
    // engrosa, se le sube la opacidad y lleva halo blanco por CSS para que
    // se lea sobre cualquier fondo del mapa.
    marcadorUsuario = L.layerGroup([
      L.circle([lat, lng], { radius: Math.max(accuracy || 0, 25), className: "anillo-precision",
        color: "#7A3E7F", weight: 3, opacity: 0.95, fillColor: "#8D4992", fillOpacity: 0.2 }),
      L.marker([lat, lng], { icon: L.divIcon({ className: "", iconSize: [18, 18], html: '<div class="pin-usuario"></div>' }),
        title: "Tu ubicación aproximada" }),
    ]).addTo(mapa);

    const dentro = lat > 19 && lat < 19.65 && lng > -99.4 && lng < -98.9;
    if (!dentro) {
      avisar("Tu ubicación queda fuera de la Ciudad de México; el mapa se mantiene sobre el listado.");
      return;
    }
    const cerca = masCercano(lat, lng);
    if (!cerca) { if (encuadrar) mapa.setView([lat, lng], 15); return; }

    if (encuadrar) {
      // Antes se hacía zoom 15 sobre la persona y desaparecían los otros doce
      // marcadores y el contorno de la Ciudad: quedabas ubicado pero perdido.
      // El encuadre abarca a la persona y a los DOS ejemplares más próximos.
      const vecinos = masCercanos(lat, lng, 2).map((c) => [c.e.coords.lat, c.e.coords.lng]);
      mapa.fitBounds(L.latLngBounds([[lat, lng], ...vecinos]), { padding: [80, 80], maxZoom: 15 });
    }
    avisar(`<span class="mapa-aviso__rotulo">Tu árbol patrimonial más cercano</span>`
      + `<b class="mapa-aviso__nombre">${esc(cerca.e.nombreAsignado || "Sin nombre asignado")}</b>`
      + `<span class="mapa-aviso__pie">a <b>${esc(formatoDistancia(cerca.d))}</b> de tu ubicación aproximada</span>`);
    // El resultado también se marca en el listado: antes el renglón del
    // ejemplar encontrado se veía igual que los otros doce.
    seleccionar(cerca.e.slug, false);
    marcarResultado(cerca.e.slug);
  }

  /**
   * Ubicación en dos tiempos.
   *
   * Con enableHighAccuracy en verdadero el navegador enciende el GPS y espera
   * a que fije satélites: en una computadora de escritorio eso tarda entre
   * cinco y quince segundos, y el botón parecía trabado. Para la pregunta que
   * este mapa responde —cuál de trece árboles, separados por kilómetros, te
   * queda más cerca— una posición de red con cien metros de error da la misma
   * respuesta que una de cinco.
   *
   * Así que primero se pide la rápida (red y caché de hasta diez minutos), que
   * suele volver en menos de un segundo, y con ella ya se responde. En paralelo
   * se pide la fina; si llega y mueve el punto más de cincuenta metros, se
   * redibuja sin volver a encuadrar el mapa para no marear a quien ya está
   * leyendo el resultado.
   */
  function ubicarme(boton) {
    if (!navigator.geolocation) { avisar("Tu navegador no permite compartir la ubicación."); return; }
    boton.classList.add("mapa-control--buscando");
    avisar('<span class="mapa-aviso__rotulo">Buscando tu ubicación…</span>');

    let respondido = false;
    let base = null;

    const listo = () => { respondido = true; boton.classList.remove("mapa-control--buscando"); };

    const fallo = () => {
      if (respondido) return;
      listo();
      avisar("No pudimos obtener tu ubicación. Revisa los permisos del navegador.");
    };

    // 1. Posición rápida: red, con caché reciente. Es la que responde.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        listo();
        base = pos.coords;
        pintarUbicacion(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, true);
      },
      fallo,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );

    // 2. Posición fina, en segundo plano. Solo afina; nunca es la que informa
    //    del fracaso, para no contradecir a la rápida si esa sí funcionó.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!base) { listo(); pintarUbicacion(lat, lng, accuracy, true); return; }
        if (distancia(base.latitude, base.longitude, lat, lng) < 50) return;
        base = pos.coords;
        pintarUbicacion(lat, lng, accuracy, false);
      },
      () => { /* la rápida ya respondió o ya avisó del fallo */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  /** Marca en el listado cuál ejemplar salió del botón de ubicación y lo trae
   *  a la vista. Es distinto de la selección: la selección puede cambiar con
   *  cada clic, esto responde a una pregunta que la persona hizo. */
  function marcarResultado(slug) {
    slugResultado = slug;
    pintarLista();
    pintarPinResultado();
    traerFilaAlaVista(slug);
  }

  /** El marcador del ejemplar más cercano lleva halo y pulso, en verde, igual
   *  que el punto de la persona lleva el suyo en morado. Así la pareja
   *  «dónde estoy / cuál es mi árbol» se lee de un vistazo, sin buscar cuál de
   *  los trece puntos verdes es el que respondió a la pregunta. */
  function pintarPinResultado() {
    marcadores.forEach((m, s) => {
      const el = m.getElement();
      const pin = el && el.querySelector(".pin");
      if (pin) pin.classList.toggle("pin--cercano", s === slugResultado);
    });
  }

  /* EL ANILLO GEOGRÁFICO VERDE SE RETIRÓ, Y NO POR ADORNO DE MENOS.
     Era un círculo de 90 m de radio alrededor del árbol, gemelo visual del
     anillo morado de la persona. Pero el morado SIGNIFICA algo —su radio es la
     precisión que reporta el GPS: «estás en algún punto de aquí dentro»— y el
     verde no significaba nada: se puso para replicar el gesto gráfico. Quien
     entiende el morado lee el verde igual y concluye que la posición del árbol
     tiene noventa metros de incertidumbre, cuando está verificada.

     Copiar la forma de un elemento que comunica un dato, sin el dato, no es
     decoración: es afirmar algo falso. Se retira. La pareja «aquí estoy / aquí
     está tu árbol» la sostienen el color y el pulso, que no prometen precisión.

     De paso el marcador queda legible: llevaba cinco círculos encimados —borde
     blanco, sombra en anillo, parpadeo del propio punto, pulso que se expande y
     este anillo con su relleno— y a cierto acercamiento se leían como una
     mancha. Ahora son el punto, un anillo suave fijo y un solo pulso. */

  /** Los n ejemplares más próximos, del más cercano al más lejano. */
  function masCercanos(lat, lng, n) {
    return conCoords
      .map((e) => ({ e, d: distancia(lat, lng, e.coords.lat, e.coords.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n);
  }

  function masCercano(lat, lng) {
    return masCercanos(lat, lng, 1)[0] || null;
  }

  /** Distancia sobre la esfera, en metros. */
  function distancia(a1, o1, a2, o2) {
    const R = 6371000, r = Math.PI / 180;
    const da = (a2 - a1) * r, do_ = (o2 - o1) * r;
    const x = Math.sin(da / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(do_ / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  const formatoDistancia = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} metros` : `${(m / 1000).toFixed(1)} kilómetros`);

  /** Muestra un mensaje en el recuadro que flota en la esquina del mapa.
   *  Sustituye a la pista: el resultado ocupa su mismo lugar, con más peso. */
  function avisar(html) {
    // El aviso vive junto a los filtros, que desde el rediseño ya no
    // forman parte del listado. Se busca en ambos por compatibilidad.
    const caja = document.querySelector(".mapa-marco [data-aviso]")
      || (filtros && filtros.querySelector("[data-aviso]"))
      || lista.querySelector("[data-aviso]");
    if (caja) {
      caja.classList.remove("mapa-aviso--pista");
      caja.classList.add("mapa-aviso--dato");
      caja.innerHTML = html;
      caja.hidden = !html;
    }
  }

  function globo(e) {
    /* La fotografía NO se toma de e.fotos: ese campo viene de la hoja de
       cálculo y en varios ejemplares trae rutas heredadas que ya no existen,
       de ahí el icono de imagen rota que sólo aparecía en un globo. Se usa el
       mismo descubrimiento por carpeta que el listado —montarPrimeraFoto—, que
       prueba las extensiones y retira el <img> si no hay archivo. Así o se ve
       la foto real o no se ve nada, nunca un hueco roto. */
    const meta = [e.alcaldia, e.morfologia.altura_m != null ? `${nf(e.morfologia.altura_m)} m de alto` : null,
                  e.edadEstimada != null ? `${nf(e.edadEstimada, 0)} años` : null].filter(Boolean).join(" · ");
    /* Se devuelve un ELEMENTO, no una cadena. Con cadena, cada llamada de
       popup.update() —la que hace falta para recolocar el globo cuando la foto
       carga— vuelve a construir el contenido desde el texto original y borra
       lo que el montaje de la imagen acababa de hacer. Con elemento, Leaflet
       lo reinserta tal cual y el trabajo sobrevive. */
    const caja = document.createElement("div");
    caja.className = "globo-mapa";
    caja.innerHTML = `
      <img class="globo-mapa__foto" data-ejemplar="${esc(e.id || "")}" alt="">
      <div class="cuerpo">
        <h3>${esc(e.nombreAsignado || "Sin nombre asignado")}</h3>
        <p class="esp">${esc(e.especie || "Especie por determinar")}</p>
        <p class="met">${esc(meta)}</p>
        <a class="globo-mapa__boton" href="${RUTA_FICHA}#ficha-${esc(e.slug)}">Ver la ficha completa</a>
      </div>`;
    return caja;
  }

  /* ---------- listado ---------- */
  function pintarLista() {
    guardarEstado();
    const vis = filtrar(ejemplares, estado)
      .sort((a, b) => (b.morfologia.altura_m ?? -1) - (a.morfologia.altura_m ?? -1));
    const visibles = new Set(vis.map((e) => e.slug));

    // Los ejemplares que el filtro deja fuera no se borran del mapa: se atenúan,
    // para no perder la referencia de dónde están los demás. Pero dejan de ser
    // interactivos —clic y teclado— porque un punto que el filtro excluyó y aun
    // así abre su globo contradice al propio filtro.
    marcadores.forEach((m, slug) => {
      const el = m.getElement();
      if (!el) return;
      const dentro = visibles.has(slug);
      const pin = el.querySelector(".pin");
      if (pin) pin.classList.toggle("pin--atenuado", !dentro);
      // El filtro repinta los marcadores; sin esto, la marca del más cercano
      // se perdía al mover cualquier filtro después de ubicarse.
      if (pin) pin.classList.toggle("pin--cercano", slug === slugResultado && dentro);
      el.classList.toggle("marcador--fuera", !dentro);
      el.setAttribute("tabindex", dentro ? "0" : "-1");
      el.setAttribute("aria-hidden", dentro ? "false" : "true");
    });

    const cuerpo = vis.length
      ? vis.map((e) => {
          // La miniatura es la fotografía del ejemplar. No se usa la silueta de
          // la especie: solo hay tres especies en el registro y trece siluetas
          // repetidas se leen como un error de carga, no como información.
          // La miniatura se busca en la carpeta del ejemplar, no en los datos:
          // el <img> lleva data-ejemplar y lo resuelve montarPrimeraFoto.
          const met = [e.alcaldia || "Ubicación por determinar",
                       e.morfologia.altura_m == null ? null : `${nf(e.morfologia.altura_m)} m de alto`,
                       e.coords ? null : "sin coordenadas"].filter(Boolean).join(" · ");
          const esResultado = e.slug === slugResultado;
          return `<button class="mapa-item${esResultado ? " mapa-item--resultado" : ""}" data-slug="${esc(e.slug)}" aria-current="${e.slug === estado.activo}">
          <img class="mapa-item__foto" data-ejemplar="${esc(e.id || "")}" alt="">
          <span class="mapa-item__texto">
            ${esResultado ? '<span class="mapa-item__marca">Tu más cercano</span>' : ""}
            <strong>${esc(e.nombreAsignado || "Sin nombre asignado")}</strong>
            <em>${esc(e.especie || "Especie por determinar")}</em>
            <span class="mapa-item__met">${esc(met)}</span>
          </span>
        </button>`;
        }).join("")
      : `<div class="mapa-vacio">Ningún ejemplar cumple con los filtros elegidos.</div>`;

    lista.querySelector("[data-lista]").innerHTML = cuerpo;
    // Las miniaturas se resuelven después: el renglón ya se lee sin esperarlas.
    lista.querySelectorAll("img[data-ejemplar]").forEach((img) => {
      montarPrimeraFoto(img, (ok) => {
        const fila = img.closest(".mapa-item");
        if (ok) { img.classList.add("mapa-item__foto--cargada"); if (fila) fila.classList.add("mapa-item--con-foto"); }
        else { img.remove(); }
      });
    });
    // El conteo vive junto a los filtros, que flotan sobre el mapa y ya no
    // forman parte del listado.
    if (filtros) {
      const b = filtros.querySelector("[data-borrar]");
      if (b) b.hidden = !(estado.categoria || estado.alcaldia || estado.especie);
    }
    const conteo = (filtros && filtros.querySelector("[data-conteo]")) || lista.querySelector("[data-conteo]");
    if (conteo) {
      conteo.textContent = `${vis.length} de ${ejemplares.length} ejemplares`
        + (sinCoords ? ` · ${sinCoords} sin coordenadas, no aparecen en el mapa` : "");
    }

    lista.querySelectorAll(".mapa-item").forEach((b) =>
      b.addEventListener("click", () => seleccionar(b.dataset.slug, true)));

  }

  /* El panel de indicadores del mapa se retiró por completo.
     En su modo agregado repetía el cintillo de la portada; en su modo de
     ejemplar repetía la ficha, que es donde ese dato tiene contexto y a la que
     el globo del marcador ya lleva en un clic. Un tercer lugar donde leer lo
     mismo solo obligaba a decidir cuál de los tres estaba al día. */

  /** Devuelve la vista a todos los ejemplares visibles. Sin esto, al quitar la
   *  selección o al borrar los filtros el listado se restauraba pero el mapa
   *  seguía acercado sobre el último ejemplar elegido: la mitad de los puntos
   *  quedaba fuera de cuadro y parecía que el filtro no había hecho nada. */
  function reencuadrar() {
    if (!mapa) return;
    const vis = filtrar(ejemplares, estado).filter((e) => e.coords);
    if (!vis.length) return;
    const caja = L.latLngBounds(vis.map((e) => [e.coords.lat, e.coords.lng]));
    mapa.fitBounds(caja, { padding: [46, 46], maxZoom: 15, animate: true });
  }

  /**
   * Trae el renglón de un ejemplar al centro del listado.
   *
   * scrollIntoView con block:"nearest" dejaba el renglón pegado al borde
   * inferior, medio tapado por la sombra del contenedor: se veía la franja
   * morada pero no el nombre ni la foto. Y con behavior:"smooth" arrastraba
   * también la página, no sólo la columna. Aquí se calcula el desplazamiento
   * dentro del propio contenedor: la página no se mueve y el renglón queda a
   * media altura, con contexto arriba y abajo.
   */
  let temporizadorFila = null;
  function traerFilaAlaVista(slug) {
    // El listado se vuelve a pintar entero en cada selección y sus fotografías
    // se montan después: mientras no cargan, los renglones miden menos y el
    // desplazamiento se calcula sobre una altura que aún va a crecer. Por eso
    // se repite el cálculo un instante más tarde, cuando la columna ya tiene
    // su altura definitiva.
    colocarFila(slug);
    clearTimeout(temporizadorFila);
    temporizadorFila = setTimeout(() => colocarFila(slug), 420);
  }

  function colocarFila(slug) {
    if (!lista || !slug) return;
    const fila = lista.querySelector(`.mapa-item[data-slug="${slug}"]`);
    if (!fila) return;
    // Se mide con rectángulos, no con offsetTop: offsetTop cuenta desde el
    // ancestro posicionado, que no siempre es el contenedor del listado, y con
    // el último renglón dejaba el cálculo corto.
    const alto = lista.clientHeight;
    const rl = lista.getBoundingClientRect();
    const rf = fila.getBoundingClientRect();
    const arriba = rf.top - rl.top + lista.scrollTop;
    const destino = Math.max(0, Math.min(arriba - (alto - rf.height) / 2,
      lista.scrollHeight - alto));
    // Si ya está cómodamente a la vista no se mueve nada: desplazar en cada
    // clic marea a quien está recorriendo el listado con el ratón.
    if (rf.top >= rl.top + 8 && rf.bottom <= rl.bottom - 8) return;
    if (lista.scrollTo) lista.scrollTo({ top: destino, behavior: "smooth" });
    else lista.scrollTop = destino;
  }

  function seleccionar(slug, centrar) {
    estado.activo = estado.activo === slug && !centrar ? null : slug;
    if (!estado.activo) { marcadores.forEach((m) => { const el = m.getElement(); const pin = el && el.querySelector(".pin"); if (pin) pin.classList.remove("pin--activo"); }); pintarLista(); return; }
    slug = estado.activo;
    marcadores.forEach((m, s) => {
      const el = m.getElement();
      const pin = el && el.querySelector(".pin");
      if (pin) pin.classList.toggle("pin--activo", s === slug);
    });
    const m = marcadores.get(slug);
    if (m && centrar && mapa) { mapa.setView(m.getLatLng(), Math.max(mapa.getZoom(), 16), { animate: true }); m.openPopup(); }
    pintarLista();
    // El renglón se pinta de morado, pero si queda fuera de la ventana del
    // listado la marca no sirve de nada: hay que traerlo.
    traerFilaAlaVista(slug);
    if (typeof alSeleccionar === "function") alSeleccionar(slug);
  }

  /* ---------- filtros ---------- */
  if (filtros) {
    const cats = [...new Set(ejemplares.flatMap((e) => e.categorias))].sort();
    const alcs = [...new Set(ejemplares.map((e) => e.alcaldia).filter(Boolean))].sort();
    const esps = [...new Set(ejemplares.map((e) => e.especie).filter(Boolean))].sort();
    const sel = (id, etiqueta, ops) =>
      `<select data-filtro="${id}" aria-label="${etiqueta}"><option value="">${etiqueta}</option>${
        ops.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`;
    filtros.innerHTML = `${sel("categoria", "Todas las categorías", cats)}
      ${sel("alcaldia", "Todas las alcaldías", alcs)}
      ${sel("especie", "Todas las especies", esps)}
      <button type="button" class="mapa-borrar" data-borrar hidden>Borrar filtros</button>
      <span class="mapa-conteo" data-conteo></span>`;
    // Lo que venía en la dirección se refleja en los selectores.
    filtros.querySelectorAll("[data-filtro]").forEach((sl) => { sl.value = estado[sl.dataset.filtro] || ""; });
    filtros.querySelectorAll("[data-filtro]").forEach((s) =>
      s.addEventListener("change", () => { estado[s.dataset.filtro] = s.value; estado.activo = null; pintarLista(); reencuadrar(); }));
    const borrar = filtros.querySelector("[data-borrar]");
    if (borrar) borrar.addEventListener("click", () => {
      estado.categoria = ""; estado.alcaldia = ""; estado.especie = ""; estado.activo = null;
      filtros.querySelectorAll("[data-filtro]").forEach((s) => { s.value = ""; });
      pintarLista();
      reencuadrar();
    });
  }

  pintarLista();
  return { estado, marcadores, seleccionar, pintarLista, mapa,
           limpiarSeleccion: () => {
             estado.activo = null;
             pintarLista();
             marcadores.forEach((m) => { const el = m.getElement(); const p = el && el.querySelector(".pin"); if (p) p.classList.remove("pin--activo"); });
             if (mapa) mapa.closePopup();
             reencuadrar();
           } };
}
