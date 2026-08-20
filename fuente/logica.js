/* Árboles patrimoniales · lógica de la portada.
   Consume la estructura que emite patrimoniales-loader.js v2. */

import { svgSilueta, ilustracionDe, perfilDe, PROPORCION_ILUSTRACION } from "./especies.js";
import { crearMapa } from "./mapa.js";
import { montarPrimeraFoto } from "./fotos.js";

/* Los enlaces entre la portada y la ficha son a ARCHIVOS distintos, no anclas
   de la misma página. Antes decían solo «#ficha-tacuba»: el navegador cambiaba
   el hash y se quedaba donde estaba, porque en la portada no existe ningún
   elemento con ese id. El ensamblador sustituye el testigo por el nombre real
   del archivo de ficha que publique cada versión. */
const RUTA_FICHA = "__FICHA__";

const LIENZO_BOSQUE = 268;  // altura del ejemplar más alto en la hilera

const DEF_CATEGORIA = {
  CENTENARIO: { titulo: "Centenario", plural: "Centenarios", texto: "Rebasó los cien años de vida. Germinó cuando la ciudad todavía cabía dentro de sus canales.", dorada: false },
  HISTORICO:  { titulo: "Histórico",  plural: "Históricos",  texto: "Está ligado a un hecho, una persona o un lugar que la ciudad recuerda. Su valor no está solo en el árbol.", dorada: true },
  NOTABLE:    { titulo: "Notable",    plural: "Notables",    texto: "Destaca por su tamaño, su porte o su especie frente a cualquier otro ejemplar de la ciudad.", dorada: false },
  SINGULAR:   { titulo: "Singular",   plural: "Singulares",   texto: "No hay otro igual: una forma, una rareza o una condición que no se repite en el arbolado urbano.", dorada: true },
};

const SITUACION_CATEGORIA = {
  "anterior-a-las-categorias": {
    etiqueta: "Decreto anterior al programa",
    clase: "etiqueta etiqueta--situacion",
    explicacion: "Su decreto es anterior al programa que creó las categorías. Su protección es exactamente la misma.",
  },
  "declaratoria-en-tramite": {
    etiqueta: "Declaratoria en trámite",
    clase: "etiqueta etiqueta--situacion",
    explicacion: "Su categoría se asignará cuando se publique el decreto, que está en trámite.",
  },
  pendiente: {
    etiqueta: "Categoría por asignar",
    clase: "etiqueta etiqueta--situacion",
    explicacion: "El registro aún no tiene capturada su categoría.",
  },
};

const nf = (n, dec = 0) =>
  n === null || n === undefined || !isFinite(n) ? "—" : Number(n).toLocaleString("es-MX", { maximumFractionDigits: dec });


/** Minúsculas sin acentos: la base de cualquier comparación de texto. */
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


/** Ilustración de la especie si existe; si no, la silueta vectorial. */
function arbolDibujado(e, alturaPx, anchoMax) {
  const ilu = ilustracionDe(e.especie);
  if (ilu) {
    const p = perfilDe(e.especie);
    const razon = PROPORCION_ILUSTRACION[p.clave] || 1;
    // Altura y ancho conservan su proporción real: la hilera se desplaza en
    // horizontal antes que deformar un ejemplar para que quepa.
    const ancho = alturaPx * razon;
    const alto = alturaPx;
    return `<img class="ilustracion-arbol" src="${ilu}" alt="" loading="lazy" width="${ancho.toFixed(0)}" height="${alto.toFixed(0)}" style="width:${ancho.toFixed(1)}px;height:${alto.toFixed(1)}px">`;
  }
  return svgSilueta(e.especie, alturaPx, e.morfologia.extensionCopa_m, e.morfologia.altura_m, { anchoMax });
}

/** El bosque a escala: los ejemplares dibujados con su altura real, ordenados de mayor a menor. */
function pintarBosque(ejemplares) {
  const pista = document.getElementById("bosquePista");
  const conAltura = ejemplares.filter((e) => e.morfologia.altura_m != null)
    .sort((a, b) => b.morfologia.altura_m - a.morfologia.altura_m);
  const sinAltura = ejemplares.length - conAltura.length;
  if (!conAltura.length) { pista.innerHTML = ""; return; }

  const tope = Math.max(...conAltura.map((e) => e.morfologia.altura_m));
  const LIENZO = LIENZO_BOSQUE;
  const px = (m) => (m / tope) * LIENZO;

  const arboles = conAltura.map((e) => {
    const h = px(e.morfologia.altura_m);
    // La identificación del ejemplar va DEBAJO del árbol, siempre visible.
    // Antes vivía en un globo que solo aparecía al pasar el ratón, y que en
    // teléfono estaba desactivado: la tira de trece árboles no decía de quién
    // era ninguno. El globo se queda solo con la llamada a la ficha, y el
    // árbol entero sigue siendo el enlace, así que con dedo o con teclado se
    // llega igual sin necesitar el globo.
    const rotulo = [e.nombreAsignado, e.especie, e.nombreComun, e.alcaldia,
      `${nf(e.morfologia.altura_m, 1)} metros`].filter(Boolean).join(", ");
    const pie = [
      `<b class="bosque__nombre">${esc(e.nombreAsignado || "Sin nombre asignado")}</b>`,
      `<span class="bosque__alto">${nf(e.morfologia.altura_m, 1)} m</span>`,
      e.alcaldia ? `<span class="bosque__alcaldia">${esc(e.alcaldia)}</span>` : "",
    ].filter(Boolean).join("");
    return `<a class="bosque__arbol" href="${RUTA_FICHA}#ficha-${esc(e.slug)}" aria-label="${esc(rotulo)}">
      <span class="bosque__globo" aria-hidden="true">Ver su ficha <b>→</b></span>
      ${arbolDibujado(e, h)}
      <span class="bosque__pie">${pie}</span>
    </a>`;
  }).join("");

  pista.innerHTML = arboles;

  // La ranura de cada arbol tenia un ancho fijo (clamp 112-168 px) mientras
  // que el dibujo se escala con la altura real: Eugenio salia a 373 px dentro
  // de una ranura de 168 y se metia 102 px encima de cada vecino. La ranura se
  // toma del dibujo ya montado —vale para <img> y para <svg>, sin repetir la
  // formula de proporciones— con un piso que deje respirar al nombre de abajo.
  const ANCHO_MINIMO_RANURA = 132;
  for (const a of pista.querySelectorAll(".bosque__arbol")) {
    const dibujo = a.querySelector("img, svg");
    if (!dibujo) continue;
    const ancho = dibujo.offsetWidth || parseFloat(dibujo.getAttribute("width")) || 0;
    if (ancho) a.style.width = Math.max(ANCHO_MINIMO_RANURA, Math.ceil(ancho)) + "px";
  }
  document.getElementById("bosqueRango").textContent =
    `${nf(Math.min(...conAltura.map((e) => e.morfologia.altura_m)), 1)} — ${nf(tope, 1)} m`;

  document.getElementById("bosqueNota").textContent =
    `Cada silueta está dibujada con la altura real medida en campo${sinAltura ? `; ${sinAltura} sin medir` : ""}.`;
}


function pintarCifras(stats, ejemplares) {
  const decano = ejemplares.filter((e) => e.edadEstimada != null).sort((a, b) => b.edadEstimada - a.edadEstimada)[0];
  const datos = [
    [stats.totalAlcaldias, "Alcaldías"],
    [stats.totalEspecies, "Especies"],
    [decano ? nf(decano.edadEstimada) : "—", "Años del más antiguo"],
    [stats.alturaMaxima ? nf(stats.alturaMaxima, 1) + " m" : "—", "El más alto"],
  ];
  document.getElementById("cifras").innerHTML = datos
    .map(([v, l]) => `<div class="cifra"><strong>${v}</strong><span>${l}</span></div>`).join("");
}

function pintarCategorias(stats) {
  const mapa = { CENTENARIO: "centenarios", HISTORICO: "historicos", NOTABLE: "notables", SINGULAR: "singulares" };
  document.getElementById("categorias").innerHTML = Object.entries(DEF_CATEGORIA).map(([clave, d]) => {
    const n = stats.totalPorCategoria[mapa[clave]] || 0;
    return `<article class="categoria${d.dorada ? " categoria--dorada" : ""}">
      <h3>${d.titulo}</h3>
      <p>${d.texto}</p>
      <div class="cuenta">${n} ${n === 1 ? "ejemplar" : "ejemplares"}</div>
    </article>`;
  }).join("");
}

function tarjetaFicha(e) {
  const cats = e.categorias.length
    ? e.categorias.map((c) => {
        const d = DEF_CATEGORIA[c];
        return `<span class="etiqueta${d && d.dorada ? " etiqueta--dorada" : ""}">${d ? d.titulo : esc(c)}</span>`;
      }).join("")
    : (() => {
        const d = SITUACION_CATEGORIA[e.situacionCategoria] || SITUACION_CATEGORIA.pendiente;
        return `<span class="${d.clase}" title="${esc(d.explicacion)}">${d.etiqueta}</span>`;
      })();
  // La barrita con el punto verde se retiró de las tarjetas: solo 2 de 13
  // ejemplares tienen edad dictaminada, así que aparecía en dos tarjetas y
  // faltaba en once. Una marca que casi nunca sale se lee como un defecto.
  return `<a class="ficha" href="${RUTA_FICHA}#ficha-${esc(e.slug)}" data-cats="${esc(e.categorias.join(" "))}" data-alcaldia="${esc(e.alcaldia || "")}">
    <div class="ficha__retrato">
      <!-- La foto no viene en los datos: se busca en la carpeta del ejemplar.
           Si no existe, la etiqueta se queda sin src y se retira sola. -->
      <img class="ficha__foto" data-ejemplar="${esc(e.id || "")}" alt="">
      <div class="ficha__edad">${e.morfologia.altura_m == null ? "—" : nf(e.morfologia.altura_m, 1) + " m"}<small>${e.edadEstimada != null ? `${nf(e.edadEstimada)} años estimados` : (e.nombreComun || "Altura total")}</small></div>
    </div>
    <div class="ficha__cuerpo">
      <h3>${esc(e.nombreAsignado || "Sin nombre asignado")}</h3>
      <p class="ficha__especie">${esc(e.especie || "Especie por determinar")}</p>
      <p class="ficha__meta">${esc(e.alcaldia || "Ubicación por determinar")}${e.ubicacion.tipo ? ` · ${esc(e.ubicacion.tipo)}` : ""}</p>
      <div class="etiquetas">${cats}</div>
    </div>
  </a>`;
}

function pintarPadron(ejemplares, stats) {
  const orden = [...ejemplares].sort((a, b) => (b.morfologia.altura_m ?? -1) - (a.morfologia.altura_m ?? -1));
  const cont = document.getElementById("listaPadron");

  const filtros = [{ clave: "", etiqueta: "Todos" }].concat(
    Object.keys(DEF_CATEGORIA)
      .filter((c) => ejemplares.some((e) => e.categorias.includes(c)))
      .map((c) => ({ clave: c, etiqueta: DEF_CATEGORIA[c].plural }))
  );
  const catInicial = new URLSearchParams(location.search).get("cat") || "";
  document.getElementById("filtros").innerHTML = filtros
    .map((f) => `<button class="filtro" data-cat="${f.clave}" aria-pressed="${f.clave === catInicial}">${f.etiqueta}</button>`).join("");

  // Índice de búsqueda: se arma una vez, sin acentos ni mayúsculas, para que
  // "coyoacan" encuentre "Coyoacán" y "ahuehuete" encuentre "Taxodium".
  const indice = new Map(orden.map((e) => [e, norm([
    e.nombreAsignado, e.especie, e.nombreComun, e.alcaldia,
    e.ubicacion && e.ubicacion.colonia, e.ubicacion && e.ubicacion.calle,
    ...(e.categorias || []),
  ].filter(Boolean).join(" "))]));

  const caja = document.getElementById("buscaPadron");
  const borrar = document.getElementById("buscaBorrar");
  const conteo = document.getElementById("padronConteo");
  /* El estado del listado viaja en la dirección. Sin esto, quien filtraba,
     entraba a una ficha y volvía con el botón «atrás» encontraba el listado
     completo otra vez: había perdido su búsqueda sin haber hecho nada. */
  const params = new URLSearchParams(location.search);
  const estado = { categoria: params.get("cat") || "", busqueda: params.get("q") || "" };

  const guardarEstado = () => {
    const p = new URLSearchParams(location.search);
    estado.categoria ? p.set("cat", estado.categoria) : p.delete("cat");
    estado.busqueda ? p.set("q", estado.busqueda) : p.delete("q");
    const cad = p.toString();
    history.replaceState(null, "", location.pathname + (cad ? "?" + cad : "") + location.hash);
  };

  const render = () => {
    let lista = estado.categoria ? orden.filter((e) => e.categorias.includes(estado.categoria)) : orden;
    const q = norm(estado.busqueda);
    if (q) lista = lista.filter((e) => indice.get(e).includes(q));

    cont.innerHTML = lista.length
      ? lista.map((e) => tarjetaFicha(e)).join("")
      : `<p class="padron-vacio">Ningún ejemplar coincide con lo que buscas. Prueba con el nombre del árbol, su especie o su alcaldía.</p>`;
    // Las miniaturas llegan después: la tarjeta ya se ve sin esperar a la red.
    cont.querySelectorAll("img[data-ejemplar]").forEach((img) => {
      montarPrimeraFoto(img, (ok) => {
        const caja = img.closest(".ficha__retrato");
        if (ok) { img.classList.add("ficha__foto--cargada"); caja.classList.add("ficha__retrato--foto"); }
        else { img.remove(); }
      });
    });

    if (conteo) {
      const filtrando = estado.categoria || q;
      conteo.textContent = filtrando
        ? `${lista.length} ${lista.length === 1 ? "ejemplar" : "ejemplares"} de ${orden.length}`
        : "";
    }
    if (borrar) borrar.hidden = !estado.busqueda;
    guardarEstado();
  };
  // Restaura lo que traiga la dirección antes del primer pintado.
  if (caja && estado.busqueda) caja.value = estado.busqueda;
  render();

  const cajaFiltros = document.getElementById("filtros");
  if (cajaFiltros.dataset.escuchando !== "si") {
  cajaFiltros.dataset.escuchando = "si";
  cajaFiltros.addEventListener("click", (ev) => {
    const b = ev.target.closest(".filtro");
    if (!b) return;
    document.querySelectorAll(".filtro").forEach((x) => x.setAttribute("aria-pressed", x === b));
    estado.categoria = b.dataset.cat;
    render();
  });
  }

  if (caja && caja.dataset.escuchando !== "si") {
    caja.dataset.escuchando = "si";
    caja.addEventListener("input", () => { estado.busqueda = caja.value; render(); });
    caja.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && caja.value) { caja.value = ""; estado.busqueda = ""; render(); }
    });
  }
  if (borrar && borrar.dataset.escuchando !== "si") {
    borrar.dataset.escuchando = "si";
    borrar.addEventListener("click", () => { caja.value = ""; estado.busqueda = ""; render(); caja.focus(); });
  }
}

// Leaflet administra su propio árbol y revienta si se le pide construir dos
// veces sobre el mismo contenedor. Repintar la portada —tras un reintento de
// red, por ejemplo— abortaba el resto del render a la mitad.
let mapaCreado = false;

function pintarMapa(ejemplares) {
  const lienzo = document.getElementById("mapaLienzo");
  const lista = document.getElementById("mapaLista");
  const filtros = document.getElementById("mapaFiltros");
  if (!lienzo || !lista || mapaCreado) return;
  mapaCreado = true;
  const conCoords = ejemplares.filter((e) => e.coords).length;
  // Cuando todos tienen coordenadas no hay nada que advertir: el mapa se
  // explica solo. La guía únicamente aparece si falta alguno.
  const guia = document.getElementById("guiaMapa");
  guia.textContent = conCoords === ejemplares.length ? ""
    : `${conCoords} de los ${ejemplares.length} ejemplares tienen coordenadas capturadas. Los demás aparecen en el listado con su domicilio.`;
  guia.hidden = !guia.textContent;
  const panel = document.getElementById("mapaPanel");
  const api = crearMapa({ contenedor: lienzo, lista, filtros, panel, ejemplares });
  const limpiar = panel && panel.querySelector("[data-panel-limpiar]");
  if (limpiar && limpiar.dataset.escuchando !== "si") {
    limpiar.dataset.escuchando = "si";
    limpiar.addEventListener("click", () => api.limpiarSeleccion());
  }
}


function pintarServicios(stats) {
  const cobertura = (s) => s.completo
    ? `Dato completo en los ${s.conDato} ejemplares`
    : `Calculado sobre ${s.conDato} de ${s.conDato + s.sinDato} ejemplares`;
  const datos = [
    [stats.sumatoriaPrecipitacion, "L", "Lluvia que interceptan sus copas al año", 0],
    [stats.sumatoriaCO2, "kg", "CO₂ equivalente que absorben al año", 0],
    [stats.sumatoriaCarbono, "kg", "Carbono que retiran del aire cada año", 0],
  ];
  document.getElementById("listaServicios").innerHTML = datos.map(([s, u, t, d]) =>
    `<article class="servicio">
      <strong>${nf(s.valor, d)}<u>${u}</u></strong>
      <p>${t}</p>
      ${s.completo ? "" : `<span>${cobertura(s)}</span>`}
    </article>`).join("");

  const incompletos = datos.filter(([s]) => !s.completo).length;
  document.getElementById("coberturaServicios").textContent = incompletos === 0
    ? `Las cuatro cifras están calculadas con el dato de los ${stats.totalEjemplares} ejemplares del registro.`
    : `Algunas cifras se calculan con menos ejemplares de los que integran el registro; cada tarjeta lo indica.`;
}

/* El pie es un parcial compartido por las tres páginas. Solo la portada llena
   las notas metodológicas y la procedencia, así que el bloque nace oculto y se
   muestra al llenarlo. Buscar los elementos sin comprobar que existen tiraba
   la portada entera al extraer el pie a un parcial. */
function pintarPie(meta) {
  const cajaNotas = document.getElementById("notas");
  const cajaProc = document.getElementById("procedencia");
  if (!cajaNotas || !cajaProc) return;
  const notas = (meta.notasAlPie || []).map((n) => `<li>${esc(n.replace(/^[\s·]+/, ""))}</li>`).join("");
  cajaNotas.innerHTML = notas || "<li>El registro no incluye notas metodológicas.</li>";
  const origen = { csv: "Datos leídos en vivo del registro oficial.", cache: "Datos del registro oficial, guardados en tu navegador durante la última hora.", "cache-stale": "El registro oficial no respondió. Se muestran los últimos datos disponibles." }[meta.origen] || "";
  cajaProc.textContent =
    `${meta.totalEjemplares} ejemplares. ${origen} Las cifras de beneficios ambientales se estiman con i-Tree a partir de las medidas de campo de cada árbol.`;
  const fino = document.getElementById("pieFino");
  if (fino) fino.hidden = false;
}

// La redacción no depende del tamaño del listado: el registro crece con cada
// declaratoria y el sitio no debe reescribirse —ni desmentirse— por eso.
function pintarRedaccion() {
  document.getElementById("entradaPortada").textContent =
    "Los árboles patrimoniales de la Ciudad de México están declarados patrimonio vivo. Llevan aquí más tiempo que las calles que los rodean.";
  document.getElementById("ctaPadron").textContent = "Conoce el listado";
  document.getElementById("tituloPadron").textContent = "Los árboles patrimoniales";
  // El enlace lleva a la explicación completa de i-Tree, que vive en Recursos:
  // aquí basta con nombrar la herramienta y ofrecer el camino.
  document.getElementById("entradaServicios").innerHTML =
    `Cada año, los árboles patrimoniales retienen carbono, interceptan lluvia, evitan que el agua corra por el asfalto y limpian el aire. Las cifras se calculan con <b>i-Tree</b>, la herramienta del Servicio Forestal de Estados Unidos, a partir de las medidas tomadas en campo de cada ejemplar. <a href="__RECURSOS__#metodologia">Qué es i-Tree y cómo se calculan estas cifras<span aria-hidden="true"> →</span></a>`;
}


/* La descarga de datos abiertos ya no se fabrica en el navegador.
   Los archivos se generan al construir el sitio —ver construir/armar-datos.js—
   y viven en datos/arboles-patrimoniales-cdmx.csv y .json, con dirección
   propia y citables. La página de Recursos enlaza a ellos. */

export function pintarPortada({ ejemplares, meta, stats }) {
  pintarRedaccion();
  pintarBosque(ejemplares);
  pintarCifras(stats, ejemplares);
  pintarCategorias(stats);
  pintarPadron(ejemplares, stats);
  pintarMapa(ejemplares);
  pintarServicios(stats);
  pintarPie(meta);
}
