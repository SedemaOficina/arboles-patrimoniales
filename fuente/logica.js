/* Árboles patrimoniales · lógica de la portada.
   Consume la estructura que emite patrimoniales-loader.js v2. */

import { svgSilueta, ilustracionDe, perfilDe, PROPORCION_ILUSTRACION, srcsetIlustracion } from "./especies.js";
import { crearMapa } from "./mapa.js";
import { cuandoSeAcerque } from "./leaflet-diferido.js";
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
    // srcset: la de tamaño medio basta para los 170-375 px a los que se
    // dibuja; la grande solo la piden las pantallas de doble densidad.
    return `<img class="ilustracion-arbol" src="${ilu}" srcset="${srcsetIlustracion(e.especie)}" alt="" loading="lazy" width="${ancho.toFixed(0)}" height="${alto.toFixed(0)}" style="width:${ancho.toFixed(1)}px;height:${alto.toFixed(1)}px">`;
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


/* Iconos del cintillo. Trazo, no relleno: a 22 px un icono macizo se vuelve
   una mancha. Heredan el color, así que el dorado se fija una sola vez en el
   CSS. El de los años son anillos de crecimiento, que es como se lee la edad
   de un árbol de verdad. */
const ICONO = {
  ejemplares: '<circle cx="12" cy="9" r="6.2"/><path d="M12 21v-5.8"/><path d="m9.4 11.8 2.6 3.4 2.6-3.4"/>',
  alcaldias: '<path d="M12 21s6.5-5.4 6.5-10a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21Z"/><circle cx="12" cy="10.6" r="2.4"/>',
  especies: '<path d="M4 20c0-7 5-12 15-12 0 8-5 12-11 12H4Z"/><path d="M4 20c3.5-3.5 6.5-5.6 11-7"/>',
  concentra: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.4" r="1.25"/><circle cx="14.6" cy="9" r="1.25"/><circle cx="12" cy="14.6" r="1.25"/>',
  alto: '<path d="M12 3v18"/><path d="m8.5 6.5 3.5-3.5 3.5 3.5"/><path d="m8.5 17.5 3.5 3.5 3.5-3.5"/>',
  suma: '<path d="M4 20h16"/><path d="M6.5 20V9.5h3.5V20"/><path d="M14 20V4.5h3.5V20"/>',
  antiguo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2.4"/>',
  acumulados: '<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3v3.2c0 2 4.5 3.9 4.5 5.8s-4.5 3.8-4.5 5.8V21"/><path d="M16.5 3v3.2c0 2-4.5 3.9-4.5 5.8s4.5 3.8 4.5 5.8V21"/>',
};
const icono = (clave) => `<svg class="cifra__icono" viewBox="0 0 24 24" aria-hidden="true"
  fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONO[clave] || ""}</svg>`;

/**
 * El cintillo de cifras, debajo de la hilera de los trece.
 *
 * Recoge lo que antes vivía en el panel del mapa en su modo agregado —cuántos
 * son, cuántas especies, cuánto suman de alto, cuál alcaldía concentra más y
 * cuántos años acumulan—. Ese panel repetía debajo del mapa un resumen que la
 * persona ya había leído arriba, y obligaba a bajar hasta el mapa para
 * enterarse del tamaño del registro. Aquí queda junto al dibujo de los trece,
 * que es donde la pregunta «¿cuántos son y qué tan grandes?» se hace sola.
 *
 * Las sumas NO se recalculan aquí: se piden a indicadoresPadron, que es la
 * función que ya sabía hacerlas y que declara sobre cuántos ejemplares está
 * calculado cada valor. Duplicar esa aritmética habría abierto la puerta a que
 * el cintillo y el resto del sitio dijeran cifras distintas.
 */
function pintarCifras(stats, ejemplares) {
  const decano = ejemplares.filter((e) => e.edadEstimada != null).sort((a, b) => b.edadEstimada - a.edadEstimada)[0];
  const agregado = indicadoresPadron(ejemplares, ejemplares.length);
  const de = (clave) => agregado.find((d) => d.clave === clave) || {};
  const arboles = de("arboles"), especies = de("especies"), apilada = de("altura"),
        alcaldia = de("alcaldia"), edad = de("edad");

  // Primer renglón: de qué se compone el registro. Segundo: sus medidas.
  const datos = [
    ["ejemplares", arboles.cifra, "Ejemplares"],
    ["alcaldias", stats.totalAlcaldias, "Alcaldías"],
    ["especies", especies.cifra, "Especies"],
    ["concentra", alcaldia.unidad ? alcaldia.unidad.replace(/\s*ejemplares?$/, "") : "—",
     alcaldia.cifra && alcaldia.cifra !== "—" ? `En ${alcaldia.cifra}` : "Alcaldía con más"],
    ["alto", stats.alturaMaxima ? nf(stats.alturaMaxima, 1) + " m" : "—", "El más alto"],
    ["suma", apilada.cifra === "—" ? "—" : `${apilada.cifra} ${apilada.unidad}`, "Sumando sus alturas"],
    ["antiguo", decano ? nf(decano.edadEstimada) : "—", "Años del más antiguo"],
    ["acumulados", edad.cifra, "Años sumados"],
  ];
  document.getElementById("cifras").innerHTML = datos
    .map(([k, v, l]) => `<div class="cifra">${icono(k)}<strong>${esc(String(v))}</strong><span>${esc(l)}</span></div>`).join("");

  // Al pie: los nombres de las especies y la cobertura de la suma de edades.
  // La segunda es obligatoria: sumar 1,200 años sin decir que salen de dos
  // ejemplares de trece daría a entender que los trece están dictaminados.
  const pie = document.getElementById("cifrasPie");
  if (pie) {
    const renglones = [
      especies.nota ? `Las especies del registro: ${especies.nota}.` : "",
      alcaldia.cifra && alcaldia.cifra !== "—"
        ? `${alcaldia.cifra} es la alcaldía que más reúne.` : "",
      // Sumar 1,200 años sin decir de cuántos ejemplares salen daría a
      // entender que los trece están dictaminados. Solo dos lo están.
      edad.nota ? `Los años sumados salen de ${(edad.nota.match(/(\d+ de \d+)/) || [, "pocos"])[1]} ejemplares con edad dictaminada.` : "",
    ].filter(Boolean);
    pie.innerHTML = renglones.map((r) => `<span>${esc(r)}</span>`).join("");
    pie.hidden = renglones.length === 0;
  }
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
  /* El mapa no se construye al cargar la página: se construye cuando la
     persona se acerca a él, que es también cuando termina de descargarse
     Leaflet. Si la descarga falla, crearMapa recibe el mundo sin L y pinta su
     propio aviso —el listado de al lado sigue siendo la vía completa al mismo
     contenido—. */
  const montar = () => crearMapa({ contenedor: lienzo, lista, filtros, ejemplares });
  cuandoSeAcerque(lienzo, montar, montar);
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
    ? `Las tres cifras están calculadas con el dato de los ${stats.totalEjemplares} ejemplares del registro.`
    : `Algunas cifras se calculan con menos ejemplares de los que integran el registro; cada tarjeta lo indica.`;
}

/* El pie ya no publica las notas metodológicas ni la procedencia. Volcaba
   catorce renglones tal como venían de la hoja de cálculo —encabezados,
   marcas de asterisco y abreviaturas sueltas— en todas las páginas del sitio.
   Ese contenido, redactado y sin repeticiones, vive ahora en la sección de
   metodología de Recursos. */

// La redacción no depende del tamaño del listado: el registro crece con cada
// declaratoria y el sitio no debe reescribirse —ni desmentirse— por eso.
function pintarRedaccion() {
  // La entrada no se apoya en la edad: solo dos de los trece ejemplares tienen
  // edad dictaminada, así que «llevan aquí más tiempo que las calles» era una
  // afirmación que el propio registro no sostiene. Lo que sí sostiene, para
  // todos, es qué significa la declaratoria.
  document.getElementById("entradaPortada").textContent =
    "Algunos árboles de la Ciudad de México están declarados patrimonio por decreto. No es un título honorífico: obliga a que cualquier intervención sobre ellos pase por dictamen técnico.";
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

/* ---------- mensajes institucionales ---------- */

/**
 * El bloque de mensajes de la Jefatura de Gobierno y de la Secretaría.
 *
 * ATENCIÓN: los dos textos de abajo son BORRADORES SIN AUTORIZAR. Son palabras
 * que se atribuyen a personas con nombre y cargo, así que no deben publicarse
 * tal cual: hay que sustituirlas por lo que apruebe cada oficina. Se dejan
 * escritas, y no vacías, porque así se ve el bloque terminado y se edita sobre
 * algo. Si se vacían, la sección entera deja de mostrarse —no queda hueco ni
 * relleno— y vuelve sola en cuanto haya texto.
 *
 * El retrato se descubre por archivo, igual que las fotografías de los
 * ejemplares. Si no está, queda un medallón con las iniciales.
 */
const MENSAJES = [
  {
    archivo: "jefa-de-gobierno",
    nombre: "Clara Brugada Molina",
    cargo: "Jefa de Gobierno de la Ciudad de México",
    iniciales: "CB",
    // BORRADOR sin autorizar. Sustituir por el texto que apruebe la oficina.
    mensaje: "Los árboles patrimoniales son memoria viva de la Ciudad. Protegerlos es una decisión de gobierno: donde antes se resolvía con un derribo, hoy hay un dictamen, un plan de manejo y un expediente público.",
  },
  {
    archivo: "secretaria-medio-ambiente",
    nombre: "Julia Álvarez Icaza",
    cargo: "Secretaria del Medio Ambiente",
    iniciales: "JA",
    // BORRADOR sin autorizar. Sustituir por el texto que apruebe la oficina.
    mensaje: "Este registro no existía. Levantarlo en campo, validarlo y publicarlo con sus datos abiertos es la forma de que la protección deje de depender de la buena voluntad y quede escrita.",
  },
];

const CARPETA_RETRATOS = "assets/img/personas";
const EXT_RETRATO = ["jpg", "webp", "png", "jpeg", "JPG"];

function pintarMensajes() {
  const seccion = document.getElementById("mensaje");
  const caja = document.getElementById("mensajes");
  if (!seccion || !caja) return;
  const conTexto = MENSAJES.filter((m) => m.mensaje && m.mensaje.trim());
  if (!conTexto.length) { seccion.hidden = true; return; }
  seccion.hidden = false;

  caja.innerHTML = conTexto.map((m) => `
    <figure class="mensaje">
      <div class="mensaje__retrato" data-retrato="${esc(m.archivo)}">
        <span class="mensaje__iniciales" aria-hidden="true">${esc(m.iniciales)}</span>
      </div>
      <blockquote class="mensaje__texto"><p>${esc(m.mensaje)}</p></blockquote>
      <figcaption class="mensaje__firma">
        <b>${esc(m.nombre)}</b>
        <span>${esc(m.cargo)}</span>
      </figcaption>
    </figure>`).join("");

  // El retrato se prueba extensión por extensión y solo se coloca si carga.
  caja.querySelectorAll("[data-retrato]").forEach((caja2) => {
    const base = caja2.getAttribute("data-retrato");
    let i = 0;
    const probar = () => {
      if (i >= EXT_RETRATO.length) return;      // se queda el medallón
      const url = `${CARPETA_RETRATOS}/${base}.${EXT_RETRATO[i++]}`;
      const img = new Image();
      img.onload = () => {
        caja2.style.backgroundImage = `url('${url}')`;
        caja2.classList.add("mensaje__retrato--foto");
      };
      img.onerror = probar;
      img.src = url;
    };
    probar();
  });
}

export function pintarPortada({ ejemplares, meta, stats }) {
  pintarRedaccion();
  pintarBosque(ejemplares);
  pintarCifras(stats, ejemplares);
  pintarCategorias(stats);
  pintarPadron(ejemplares, stats);
  pintarMapa(ejemplares);
  pintarServicios(stats);
  pintarMensajes();
}
