import { svgSilueta, svgPersona, perfilDe, ilustracionDe, PROPORCION_ILUSTRACION, PERSONA } from "./especies.js";
import { GEO_CDMX } from "./geo-cdmx.js";
import { descubrirFotos } from "./fotos.js";

/* Árboles patrimoniales · ficha de ejemplar.
   Consume la misma estructura que emite patrimoniales-loader.js v2. */

/** El año en curso, leído del reloj: escrito a mano se desfasa cada 1.º de enero. */
const ALTURA_PERSONA = 1.70;

/* Clave del API de Google Maps Embed. Con clave se usa el servicio oficial;
   sin ella, el sitio recurre al incrustado público de Street View. */
const CLAVE_MAPS = "";

/** Dirección del panorama de vista de calle para unas coordenadas. */
function urlVistaCalle(coords, encuadre) {
  // Un panorama elegido a mano manda sobre cualquier encuadre automático.
  if (encuadre && encuadre.tipo === "panorama") return encuadre.url;
  if (!coords) return null;
  const { lat, lng } = coords;
  const rumbo = encuadre && encuadre.tipo === "rumbo" ? encuadre.rumbo : null;
  if (CLAVE_MAPS) {
    const p = new URLSearchParams({ key: CLAVE_MAPS, location: `${lat},${lng}`, fov: "90", pitch: "10" });
    if (rumbo !== null) p.set("heading", String(rumbo));
    return `https://www.google.com/maps/embed/v1/streetview?${p.toString()}`;
  }
  return `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,${rumbo ?? 0},0,0,0&output=svembed`;
}

const CATEGORIA = {
  CENTENARIO: { titulo: "Centenario", dorada: false },
  HISTORICO:  { titulo: "Histórico",  dorada: true },
  NOTABLE:    { titulo: "Notable",    dorada: false },
  SINGULAR:   { titulo: "Singular",   dorada: true },
};

/* Escalas cualitativas declaradas por la norma y el manual técnico:
   se usan solo para colorear, nunca para reinterpretar el dato capturado. */

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
  n === null || n === undefined || !isFinite(n) ? null : Number(n).toLocaleString("es-MX", { maximumFractionDigits: dec });

/** Escapa también la comilla simple: hay atributos que la usan como
 *  delimitador y un valor del registro podría cerrarlos. */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- bloques de la ficha ---------- */

function pintarEncabezado(e) {
  document.getElementById("fNombre").textContent = e.nombreAsignado || "Ejemplar sin nombre asignado";
  document.getElementById("fBinomio").textContent = e.especie || "Especie por determinar";
  // «Conocido como ahuehuete» se leía como una frase; el registro tiene un
  // campo llamado nombre común y así se nombra.
  document.getElementById("fComun").innerHTML = e.nombreComun
    ? `<span>Nombre común</span> ${esc(e.nombreComun.toLowerCase())}` : "";
  const cajaEt = document.getElementById("fEtiquetas");
  if (e.categorias.length) {
    cajaEt.className = "etiquetas";
    cajaEt.innerHTML = e.categorias.map((c) => {
      const d = CATEGORIA[c];
      return `<span class="etiqueta${d && d.dorada ? " etiqueta--dorada" : ""}">${d ? d.titulo : esc(c)}</span>`;
    }).join("");
  } else {
    const d = SITUACION_CATEGORIA[e.situacionCategoria] || SITUACION_CATEGORIA.pendiente;
    cajaEt.className = "etiquetas etiquetas--situacion";
    cajaEt.innerHTML = `<span class="${d.clase}">${d.etiqueta}</span><p class="nota-categoria">${esc(d.explicacion)}</p>`;
  }

  // Solo entran datos que el registro tiene completos para los trece
  // ejemplares. La edad estimada y todo lo que se deriva de ella —el año de
  // germinación y las generaciones humanas— salieron de aquí: en once de trece
  // ejemplares eran tres guiones seguidos, y una franja de guiones se lee como
  // una ficha rota, no como un dato que no se pudo determinar.
  const m = e.morfologia;
  const resumen = [
    [nf(m.altura_m, 1) ? nf(m.altura_m, 1) + " m" : "—", "Altura total"],
    [nf(m.diametro_cm) ? nf(m.diametro_cm) + " cm" : "—", "Diámetro del tronco"],
    [nf(m.extensionCopa_m, 1) ? nf(m.extensionCopa_m, 1) + " m" : "—", "Extensión de copa"],
    [e.alcaldia || "—", "Alcaldía"],
  ];
  document.getElementById("fResumen").innerHTML = resumen
    .map(([v, l]) => `<div><strong${String(v).length > 9 ? ' class="largo"' : ""}>${esc(v)}</strong><span>${l}</span></div>`).join("");
}

/* Las fotos no vienen en los datos: se descubren en el disco al abrir la ficha.
   La galería se pinta dos veces —primero con lo que haya en los datos, que
   normalmente es nada, y otra vez cuando el descubrimiento termina— para que la
   página no se quede esperando a la red antes de mostrar el resto. */
const fotosPorId = new Map();
async function cargarFotos(e) {
  if (fotosPorId.has(e.id)) { e.fotos = fotosPorId.get(e.id); return false; }
  const credito = (e.fotos && e.fotos[0] && e.fotos[0].credito) || e.creditoFoto || null;
  const halladas = await descubrirFotos(e.id, { credito });
  fotosPorId.set(e.id, halladas);
  // La carpeta del ejemplar manda. Antes mandaba lo capturado en la hoja, y
  // ahí sobrevivían rutas de un esquema anterior —viejo-del-agua-01-grande.jpg—
  // que ya no existen: el único ejemplar que traía fotos en la hoja acabó
  // siendo el único con la galería rota. La hoja sirve de respaldo para una
  // fotografía alojada fuera del sitio, no para pisar la carpeta.
  if (halladas.length) e.fotos = halladas;
  else if (!e.fotos || !e.fotos.length) e.fotos = halladas;
  return (e.fotos || []).length > 0;
}

function pintarGaleria(e) {
  const cont = document.getElementById("fGaleria");
  const pie = document.getElementById("fPieFoto");
  const guia = document.getElementById("fGuiaGaleria");
  const fotos = e.fotos || [];

  if (!fotos.length) {
    const p = perfilDe(e.especie);
    guia.textContent = "Este ejemplar aún no tiene fotografías en el registro. La silueta representa el porte característico de la especie, dibujado a la altura medida en campo.";
    const iluF = ilustracionDe(e.especie);
    const razonF = PROPORCION_ILUSTRACION[perfilDe(e.especie).clave] || 1;
    cont.innerHTML = `<div class="sin-foto">
      ${iluF ? `<img class="ilustracion-arbol" src="${iluF}" alt="Ilustración de referencia de ${esc(p.nombre)}" style="height:250px;width:${(250 * razonF).toFixed(0)}px">`
             : svgSilueta(e.especie, 230, e.morfologia.extensionCopa_m, e.morfologia.altura_m)}
      <p>Silueta de referencia · ${esc(p.nombre)}<br><em>${esc(e.especie || "")}</em></p>
    </div>`;
    pie.textContent = "";
    return;
  }

  guia.textContent = "";

  const pinta = (i) => {
    const f = fotos[i];
    cont.innerHTML = `
      <div>
        <div class="galeria__principal" style="--foto:url('${esc(f.url)}')">
          <img src="${esc(f.url)}" alt="${esc(f.alt)}" loading="lazy">
          ${fotos.length > 1 ? `<span class="galeria__contador">${i + 1} / ${fotos.length}</span>` : ""}
        </div>
      </div>
      ${fotos.length > 1 ? `<div class="galeria__tiras">${fotos.map((x, j) =>
        `<button class="miniatura" data-i="${j}" aria-current="${j === i}" aria-label="Ver fotografía ${j + 1}">
          <img src="${esc(x.miniatura || x.url)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}`;
    pie.innerHTML = `${esc(f.pie || "")}${f.credito ? `<b>Fotografía: ${esc(f.credito)}</b>` : ""}`;
    cont.querySelectorAll(".miniatura").forEach((b) =>
      b.addEventListener("click", () => pinta(Number(b.dataset.i))));
  };
  pinta(0);
}

function pintarVistaCalle(e) {
  const caja = document.getElementById("fVistaCalle");
  const alerta = document.getElementById("fVistaCalleAviso");
  if (alerta) {
    alerta.innerHTML = '<span class="aviso-fecha__marca" aria-hidden="true">!</span>'
      + '<span>La imagen <b>puede ser anterior al dictamen</b>: el árbol pudo cambiar desde entonces. '
      + 'No sustituye la verificación en campo.</span>';
  }
  const pie = document.getElementById("fVistaCallePie");
  const url = urlVistaCalle(e.coords, e.vistaCalle);
  if (!url) {
    caja.innerHTML = `<div class="vista-calle__aviso">Sin coordenadas capturadas, no es posible mostrar la vista desde la calle de este ejemplar.</div>`;
    pie.textContent = "";
    return;
  }
  caja.innerHTML = `<iframe src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
     title="Vista desde la calle del ejemplar ${esc(e.nombreAsignado || "")}" allowfullscreen></iframe>`;
  const propio = e.vistaCalle && e.vistaCalle.tipo === "panorama";
  pie.textContent = propio
    ? "Panorama de Google Street View encuadrado sobre el ejemplar."
    : "Panorama de Google Street View sobre las coordenadas registradas.";
}

/** Espacio que hay que dejar libre a la derecha para las etiquetas del eje. */
const ANCHO_ETIQUETAS = 46;
/** Ancho de la figura humana respecto a su altura. */
const PERSONA_RAZON = PERSONA.proporcion;
/** Separación entre el árbol y la figura humana, igual que el gap del lienzo. */
const HUECO_FIGURA = 40;

function pintarEscala(e) {
  const alt = e.morfologia.altura_m;
  const copa = e.morfologia.extensionCopa_m || e.morfologia.anchoCopa_m;
  const lienzo = document.getElementById("fEscala");
  const tope = Math.max(Math.ceil((alt || 10) / 5) * 5, 10);

  // La escala del dibujo se calcula contra el espacio que HAY, no contra un
  // número fijo. Antes eran 360 px de alto siempre: en el teléfono el lienzo
  // mide 330, así que el árbol se salía por arriba y las marcas del eje
  // quedaban fuera de la caja. Y como el ancho tampoco cabía, la tira se
  // desplazaba en horizontal y la figura humana —que es la referencia de toda
  // la comparación— se quedaba fuera de la pantalla.
  //
  // Ahora el diagrama entra completo: se toma la menor de las dos escalas que
  // permiten el alto y el ancho disponibles, y el eje usa esa misma. Árbol,
  // persona y marcas siguen compartiendo factor, que es lo que hace que la
  // comparación sea cierta.
  const razonArbol = ilustracionDe(e.especie)
    ? (PROPORCION_ILUSTRACION[perfilDe(e.especie).clave] || 1)
    : 1;
  // Las medidas se leen del CSS, no se repiten aquí: el relleno, la separación
  // y el ancho mínimo de la figura cambian con el tamaño de pantalla y el
  // cálculo tiene que enterarse.
  const est = getComputedStyle(lienzo);
  const num = (v) => parseFloat(v) || 0;
  const cajaAncho = lienzo.clientWidth || 700;
  const anchoFigura = 56;
  const util = Math.max(110,
    cajaAncho - num(est.paddingLeft) - num(est.paddingRight) - num(est.columnGap || est.gap) - anchoFigura);
  const anchoPorUnidad = razonArbol + (ALTURA_PERSONA / tope) * PERSONA_RAZON;
  const porAncho = anchoPorUnidad > 0 ? util / anchoPorUnidad : Infinity;
  // El alto declarado en el CSS es un techo, no una obligación.
  const porAlto = (num(est.height) || 400) * 0.9;
  const LIENZO = Math.max(110, Math.min(porAlto, porAncho));
  const px = (m) => (m / tope) * LIENZO;
  // Si mandó el ancho, el lienzo se encoge para no dejar una franja vacía
  // arriba del árbol; si mandó el alto, se queda como lo puso el CSS.
  lienzo.style.height = Math.round(LIENZO / 0.9) + "px";

  const reglas = [];
  for (let m = 5; m <= tope; m += 5) reglas.push(`<div class="escala__marca" style="bottom:${px(m)}px"><span>${m} m</span></div>`);


  if (alt == null) {
    lienzo.innerHTML = `<div class="escala__regla">${reglas.join("")}</div>
      <p style="margin:auto;color:var(--gris);font-size:15px">Este ejemplar aún no tiene altura medida en campo.</p>`;
  } else {
    const h = px(alt);
    const ilu = ilustracionDe(e.especie);
    let arbol;
    if (ilu) {
      const razon = PROPORCION_ILUSTRACION[perfilDe(e.especie).clave] || 1;
      arbol = `<img class="ilustracion-arbol" src="${ilu}" alt="Ilustración de referencia de ${esc(perfilDe(e.especie).nombre)}" loading="lazy" style="width:${(h * razon).toFixed(1)}px;height:${h.toFixed(1)}px">`;
    } else {
      arbol = svgSilueta(e.especie, h, copa, alt);
    }
    lienzo.innerHTML = `<div class="escala__regla">${reglas.join("")}</div>
      ${arbol}
      <div class="escala__persona" style="--alto-persona:${px(ALTURA_PERSONA).toFixed(1)}px">
        <span class="escala__guia" aria-hidden="true"><i>1.70 m</i></span>
        ${svgPersona(px(ALTURA_PERSONA))}<b class="vo">Figura humana de referencia: 1.70 metros</b></div>`;
  }

  const medidas = [
    ["Altura total", e.morfologia.altura_m, "m", 1],
    ["Diámetro del tronco (DAP)", e.morfologia.diametro_cm, "cm", 1],
    ["Circunferencia del tronco", e.morfologia.circunferencia_cm, "cm", 1],
    ["Ancho de copa, eje mayor", e.morfologia.anchoCopa_m, "m", 1],
    ["Largo de copa, eje menor", e.morfologia.largoCopa_m, "m", 1],
    ["Extensión promedio de copa", e.morfologia.extensionCopa_m, "m", 1],
  ];
  // Expectativa de vida y categoría UICN son texto, no medida: cierran la tabla
  // como dos filas de permanencia, con separación visual respecto a las métricas.
  // Estas dos no describen al ejemplar sino a la especie. Iban en la misma
  // tabla y con otro color, sin decir por qué: parecía inconsistencia. Ahora
  // van bajo su propio encabezado, que es lo que el color solo no explicaba.
  const permanencia = [
    ["Expectativa de vida", e.expectativaVida, "Años adicionales que se estima que el ejemplar puede vivir bajo manejo adecuado."],
    ["Categoría de riesgo UICN", e.conservacion.iucn, "Situación de la especie en la Lista Roja de la Unión Internacional para la Conservación de la Naturaleza."],
  ];
  const filaMedida = ([t, v, u, d]) => {
    const val = nf(v, d);
    return `<div class="medida${val ? "" : " medida--vacia"}"><span>${t}</span><strong>${val ? val + `<u>${u}</u>` : "Sin medir"}</strong></div>`;
  };
  document.getElementById("fMedidas").innerHTML =
    `<p class="medidas__titulo">Medido en este ejemplar</p>`
    + medidas.map(filaMedida).join("")
    + `<p class="medidas__titulo medidas__titulo--especie">De la especie, no de este árbol</p>`
    + permanencia.map(([t, v, ayuda]) =>
        `<div class="medida medida--texto${v ? "" : " medida--vacia"}" title="${esc(ayuda)}"><span>${t}</span><strong>${esc(v || "Sin determinar")}</strong></div>`).join("")
    // La aclaración de la sigla vivía al fondo de la sección: había que bajar
    // la vista para saber qué es UICN. Va aquí, pegada al renglón que la usa.
    + `<p class="medidas__aclara"><b>UICN</b>: Unión Internacional para la Conservación de la Naturaleza.
        Su <b>Lista Roja</b> califica el riesgo de extinción de la especie, no de este ejemplar.
        <a href="https://www.iucnredlist.org/es" target="_blank" rel="noopener">Consultar la Lista Roja<span aria-hidden="true"> \u2197</span></a></p>`;

  // La sigla no se explica sola, pero la explicación no es un dato de la tabla:
  // cierra la sección en letra chica, con la fuente para comprobarla.
  document.getElementById("fEscalaPie").textContent = alt == null
    ? "La ilustración se dibuja a partir de la altura registrada en campo."
    // El pie dice la altura, que es lo que la ilustración sí representa, y
    // advierte que la anchura no lo es. Las medidas de copa se leen en la
    // tabla de al lado, que es donde viven las cifras del dictamen.
    : `Ilustración de ${esc(perfilDe(e.especie).nombre)} dibujada a la altura de ${nf(alt, 1)} m registrada en campo. La figura humana mide 1.70 m y da la referencia de escala. La anchura corresponde al porte típico de la especie, no a la copa de este ejemplar, cuyas medidas están en la tabla.`;
}


function pintarUbicacion(e) {
  const u = e.ubicacion;
  const calle = [u.calle, u.numero].filter(Boolean).join(" ");
  const linea2 = [u.colonia ? `colonia ${u.colonia}` : null, u.cp ? `C.P. ${u.cp}` : null, e.alcaldia].filter(Boolean).join(", ");
  document.getElementById("fDomicilio").textContent = [calle, linea2].filter(Boolean).join(", ") || "Domicilio por capturar";

  // La ficha solo trae lo que sirve para llegar. Las coordenadas UTM son dato
  // de catastro: quien visita el árbol no navega en UTM, y el par de latitud y
  // longitud ya está resuelto por el mapa y por el botón «Abrir en Google
  // Maps», que lleva a la ruta sin pedirle a nadie que copie doce decimales.
  // Quien necesite la cifra exacta la obtiene del registro, no de la ficha.
  const filas = [
    ["Entre calles", u.entreCalles.length ? u.entreCalles.join(" y ") : null],
    ["Referencias", u.referencias],
    ["Tipo de ubicación", u.tipo],
  ];
  document.getElementById("fUbicacion").innerHTML = filas
    .map(([t, v]) => `<div class="dato-linea"><dt>${t}</dt><dd>${esc(v || "Sin determinar")}</dd></div>`).join("");

  // El botón vive debajo del mapa: quien ya vio dónde está el árbol es quien
  // quiere trazar la ruta. Al pie de la tabla quedaba lejos de esa intención.
  const accion = document.getElementById("fAccionMapa");
  if (accion) {
    accion.innerHTML = e.coords
      ? `<a class="enlace enlace--mapa" target="_blank" rel="noopener"
            href="https://www.google.com/maps/search/?api=1&query=${e.coords.lat},${e.coords.lng}">Abrir en Google Maps</a>`
      : "";
  }

  pintarMapaEjemplar(e);
}

/** El recuadro de la derecha ya no explica dónde está el árbol: lo muestra.
 *  Un solo ejemplar, sin filtros ni listado. La rueda del ratón no hace zoom
 *  aquí: es un recuadro pequeño dentro de una página larga y capturar el
 *  desplazamiento de la página sería una trampa. */
/** Mismos límites que el mapa general: el encuadre no se sale de la Ciudad. */
const LIMITES_CDMX = [[18.98, -99.43], [19.66, -98.87]];
let mapaFicha = null;
function pintarMapaEjemplar(e) {
  const lienzo = document.getElementById("fMapa");
  const pie = document.getElementById("fMapaPie");
  if (!lienzo) return;

  if (!e.coords) {
    lienzo.innerHTML = `<p class="mapa-caja__vacio">Este ejemplar aún no tiene coordenadas capturadas en el registro. Ubícalo con el domicilio y las referencias.</p>`;
    if (pie) pie.textContent = "";
    return;
  }
  if (pie) pie.textContent = "Cartografía base © colaboradores de OpenStreetMap · teselas de CARTO.";

  const centro = [e.coords.lat, e.coords.lng];
  if (typeof L === "undefined") {
    // Sin Leaflet el recuadro no puede dibujar nada: se dice, no se deja en gris.
    lienzo.innerHTML = `<p class="mapa-caja__vacio">El mapa no pudo cargarse. Usa el botón de Google Maps para ubicar el ejemplar.</p>`;
    return;
  }
  // Leaflet revienta si se le pide construir dos veces sobre el mismo nodo.
  if (mapaFicha) { mapaFicha.remove(); mapaFicha = null; }
  lienzo.innerHTML = "";
  // Vista de contexto, no herramienta de navegación: sin controles de
  // acercamiento ni arrastre. El zoom 17 recortaba el encuadre a media cuadra y
  // partía los nombres de calle; 16 deja una o dos calles más de contexto.
  // Quien quiere trazar la ruta usa el botón de Google Maps, que ahora es la
  // acción principal del bloque.
  mapaFicha = L.map(lienzo, {
    center: centro, zoom: 16, scrollWheelZoom: false, zoomControl: false, attributionControl: false,
    dragging: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false,
    maxBounds: L.latLngBounds(LIMITES_CDMX), maxBoundsViscosity: 0.85, minZoom: 10,
  });
  // Misma base limpia que el mapa general: calles y nombres, sin la
  // simbología de puntos de interés que compite con el pin del ejemplar.
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19, subdomains: "abcd" }).addTo(mapaFicha);
  // Mismo recorte que el mapa general: al alejarse, la Ciudad se distingue del
  // resto de la zona metropolitana en vez de perderse entre municipios.
  L.geoJSON(GEO_CDMX, {
    interactive: false,
    style: (f) => f.properties && f.properties.clase === "contorno"
      ? { color: "#8D4992", weight: 1.5, opacity: 0.75, fill: false }
      : { color: "transparent", weight: 0, fillColor: "#FEF7E4", fillOpacity: 0.82 },
  }).addTo(mapaFicha);
  L.marker(centro, {
    // Gota con la silueta de un árbol dentro. El punto plano se confundía con
    // los marcadores comerciales del mapa base —bancos, farmacias— justo en un
    // bloque cuyo propósito es señalar dónde está ESTE árbol.
    icon: L.divIcon({ className: "", iconSize: [34, 44], iconAnchor: [17, 42], html:
      '<span class="pin-arbol">'
      + '<svg viewBox="0 0 34 44" width="34" height="44" aria-hidden="true">'
      + '<path class="pin-arbol__gota" d="M17 43C17 43 32 26.4 32 17A15 15 0 1 0 2 17c0 9.4 15 26 15 26Z"/>'
      + '<path class="pin-arbol__copa" d="M17 7.5c3.6 0 6.2 2.6 6.6 5.6 1.9.5 3.2 2.1 3.2 4 0 2.4-2 4.3-4.5 4.3h-4v3.9h-2.6v-3.9h-4c-2.5 0-4.5-1.9-4.5-4.3 0-1.9 1.3-3.5 3.2-4 .4-3 3-5.6 6.6-5.6Z"/>'
      + '</svg></span>' }),
    title: e.nombreAsignado || "Ejemplar patrimonial",
    alt: `Ubicación de ${e.nombreAsignado || "el ejemplar"}`,
  }).addTo(mapaFicha);
  // El contenedor nace con ancho cero si la sección todavía no se ha medido.
  setTimeout(() => mapaFicha && mapaFicha.invalidateSize(), 60);
}

function pintarServicios(e) {
  const s = e.serviciosAmbientales;
  const grupos = [
    ["Clima y carbono", [
      ["Carbono que retira del aire", s.carbonoSecuestrado_kg, "kg/año"],
      ["CO₂ equivalente absorbido", s.co2Absorbido_kg, "kg/año"],
    ]],
    ["Agua de lluvia", [
      ["Precipitación interceptada por la copa", s.precipitacionInterceptada_L, "L/año"],
      ["Escorrentía que evita sobre el asfalto", s.escorrentiaReducida_L, "L/año"],
    ]],
    ["Calidad del aire", [
      ["Ozono retirado", s.ozonoEliminado_g, "g/año"],
      ["Partículas PM 2.5 retiradas", s.pm25Eliminado_g, "g/año"],
      ["Dióxido de nitrógeno retirado", s.no2Eliminado_g, "g/año"],
      ["Dióxido de azufre retirado", s.so2Eliminado_g, "g/año"],
      ["Monóxido de carbono retirado", s.coEliminado_g, "g/año"],
    ]],
    ["Efecto sobre el consumo de energía", [
      ["Electricidad que ahorra por sombra", s.ahorroElectricidad_kWh, "kWh/año"],
      ["Dióxido de carbono", s.emisionesEvitadasCO2_kg, "kg/año"],
      ["Partículas PM 2.5", s.emisionesEvitadasPM25_g, "g/año"],
      ["Dióxido de nitrógeno", s.emisionesEvitadasNO2_g, "g/año"],
      ["Dióxido de azufre", s.emisionesEvitadasSO2_g, "g/año"],
      ["Monóxido de carbono", s.emisionesEvitadasCO_g, "g/año"],
    ]],
  ];
  // Dos grupos traen dos cifras y dos traen cinco y seis. Con el mismo formato
  // de tabla, los cortos quedaban medio vacíos junto a los largos. Los de dos
  // cifras se dibujan en grande —que es además lo que la gente recuerda— y los
  // largos conservan la tabla. Así las dos filas de la rejilla emparejan solas.
  document.getElementById("fServicios").innerHTML = grupos.map(([titulo, filas], i) => {
    let hayNeg = false, haySin = false;
    const enGrande = filas.length <= 2;
    const html = filas.map(([t, v, u]) => {
      const hay = typeof v === "number" && isFinite(v);
      if (!hay) haySin = true;
      const neg = hay && v < 0; if (neg) hayNeg = true;
      if (enGrande) {
        return `<div class="cifra-serv${hay ? (neg ? " cifra-serv--neg" : "") : " cifra-serv--sin"}">`
          + `<b>${hay ? `${nf(v, 0)}<u>${u}</u>` : '<span class="sin-dato">Sin dato</span>'}</b>`
          + `<span>${t}</span></div>`;
      }
      return `<div class="grupo__fila${hay ? (neg ? " grupo__fila--neg" : "") : " grupo__fila--sin"}"><span>${t}</span>`
        + `<b>${hay ? `${nf(v, 0)}<u>${u}</u>` : '<span class="sin-dato">Sin dato</span>'}</b></div>`;
    }).join("");
    const notas = [];
    if (haySin) notas.push('Los renglones marcados como "Sin dato" no se pudieron estimar para este ejemplar con la información disponible.');
    if (i === 3 && hayNeg) notas.push("Los valores negativos indican mayor consumo o emisión, no un ahorro: así lo reporta i-Tree cuando la sombra del árbol incrementa la demanda de calefacción.");
    const nota = notas.map((x) => `<p class="grupo__nota">${x}</p>`).join("");
    // El primer grupo es el gancho: carbono y CO₂ son la cifra que la gente
    // repite. Se marca para que no pese lo mismo que los otros tres.
    const clases = ["grupo", enGrande ? "grupo--cifras" : "", i === 0 ? "grupo--destacada" : ""].filter(Boolean).join(" ");
    const cuerpo = enGrande ? `<div class="grupo__cifras">${html}</div>` : html;
    return `<article class="${clases}"><h3>${titulo}</h3>${cuerpo}${nota}</article>`;
  }).join("");

}

function pintarTaxonomia(e) {
  const t = e.taxonomia;
  const filas = [
    ["Reino", t.reino], ["División o filo", t.phylum], ["Clase", t.clase],
    ["Orden", t.orden], ["Familia", t.familia], ["Género", t.genero],
    ["Especie", e.especie], ["Autoridad taxonómica", t.autor],
    ["Nivel de prioridad", e.conservacion.prioridad],
    ["Forma de crecimiento", t.formaCrecimiento],
    ["Origen en la Ciudad", e.conservacion.exoticaInvasora || e.conservacion.origen],
    ["Endemismo", e.conservacion.endemismo],
    ["NOM-059-SEMARNAT", e.conservacion.nom059],
    ["CITES", e.conservacion.cites],
    ["Especie prioritaria", e.conservacion.prioritaria],
  ];
  document.getElementById("fTaxonomia").innerHTML = filas
    .map(([k, v]) => `<div class="dato-linea"><dt>${k}</dt><dd>${esc(v || "Sin determinar")}</dd></div>`).join("");

  const cajaEx = document.getElementById("fExotica");
  if (cajaEx) {
    if (e.conservacion.esExotica) {
      cajaEx.style.display = "";
      cajaEx.textContent = "Esta especie no es originaria de la Cuenca de México. Su declaratoria patrimonial responde al valor del ejemplar concreto —su porte, su historia o su papel en el barrio— y no modifica el criterio de la Ciudad, que privilegia especies nativas en las nuevas plantaciones.";
    } else { cajaEx.style.display = "none"; }
  }

}

/** Carpeta del sitio donde viven los PDF de los decretos. */
const CARPETA_DECRETOS = "decretos";

/**
 * Convierte lo que el registro guarda en `linkDecreto` en una dirección que el
 * navegador pueda abrir.
 *
 * La hoja de cálculo no guarda una URL: guarda el NOMBRE del archivo, del
 * estilo «DECRETO JUARISTA.pdf» o «GOCDMX_26-06-01_TACUBA.pdf». Publicado tal
 * cual, el navegador lo resolvía contra la raíz del sitio y devolvía 404,
 * porque ahí no hay ningún PDF. Ahora:
 *
 *   · si el campo ya trae una dirección completa, se respeta;
 *   · si trae un nombre de archivo, se busca dentro de decretos/;
 *   · el nombre se limpia de espacios sobrantes —varios registros traen
 *     «DECRETO_ JARDIN…», con un espacio después del guion bajo— y se codifica,
 *     porque los espacios y los acentos no viajan crudos en una URL.
 */
function rutaDecreto(valor) {
  const bruto = String(valor || "").trim();
  if (!bruto) return null;
  if (/^https?:\/\//i.test(bruto)) return bruto;
  const archivo = bruto.replace(/^[\\/]+/, "").replace(/\s+/g, " ").trim();
  if (!archivo) return null;
  return `${CARPETA_DECRETOS}/${encodeURIComponent(archivo)}`;
}

/**
 * Las fuentes del ejemplar, al final de la ficha.
 *
 * Quedan dos. Se retiraron «Fuente del registro» y «Cálculo i-Tree»: la
 * primera apuntaba a la misma observación de iNaturalist en los trece
 * ejemplares, y la segunda no guardaba una dirección sino el texto «MyTree»,
 * el nombre de la herramienta. Ninguna de las dos llevaba a información de
 * ESE árbol, que es lo único que justifica un enlace en su ficha.
 *
 * Se distingue lo propio de la Secretaría de lo que abre un sistema ajeno:
 * antes los botones se veían iguales y no anticipaban a dónde llevan.
 */
function pintarFuentes(e) {
  const caja = document.getElementById("fFuentes");
  if (!caja) return;
  const fuentes = [
    ["Consultar el decreto", rutaDecreto(e.linkDecreto), "propia", "El acuerdo publicado que lo declara patrimonial"],
    ["Ejemplar en el SNIB", e.urlSNIB, "externa", "Sistema Nacional de Información sobre Biodiversidad"],
  ];
  caja.innerHTML = fuentes.map(([t2, url, tipo, pie]) => url
    ? `<a class="enlace enlace--fuente enlace--${tipo}" href="${esc(url)}" target="_blank" rel="noopener">
         <b>${t2}${tipo === "externa" ? '<span class="enlace__fuera" aria-hidden="true">↗</span><span class="vo">, abre un sitio externo</span>' : ""}</b>
         <span>${pie}</span></a>`
    : `<span class="enlace enlace--fuente enlace--apagado"><b>${t2}</b><span>No disponible en el registro</span></span>`).join("");

  // Un enlace que promete un documento y devuelve un 404 es peor que no
  // ofrecerlo: la persona cree que el decreto no existe. Se comprueba que el
  // archivo esté publicado y, si no está, la tarjeta se apaga con un texto que
  // dice la verdad. La comprobación es una sola petición de cabecera, sin
  // descargar el PDF.
  const enlaceDecreto = caja.querySelector(".enlace--propia");
  if (enlaceDecreto && typeof fetch === "function") {
    const url = enlaceDecreto.getAttribute("href");
    fetch(url, { method: "HEAD" })
      .then((r) => { if (!r.ok) apagarDecreto(caja); })
      .catch(() => { /* sin red o con file://: se deja el enlace como está */ });
  }
}

function apagarDecreto(caja) {
  const a = caja.querySelector(".enlace--propia");
  if (!a) return;
  const reemplazo = document.createElement("span");
  reemplazo.className = "enlace enlace--fuente enlace--propia enlace--apagado";
  reemplazo.innerHTML = "<b>Consultar el decreto</b><span>El documento aún no está publicado en este sitio</span>";
  a.replaceWith(reemplazo);
}

function pintarProcedencia(e) {
  const filas = [
    ["Nominado por", e.nominadoPor],
    ["Fecha de nominación", e.fechaNominacion && e.fechaNominacion.legible],
    ["Fecha del decreto", e.fechaDecreto && e.fechaDecreto.legible],
    // El identificador se partia por cualquiera de sus guiones y quedaba a
    // media palabra. Va en una sola linea, mas chico, con su propia clase.
    ["Identificador en el registro", e.id, "identificador"],
  ];
  document.getElementById("fProcedencia").innerHTML = filas
    .map(([k, v, cls]) => `<div class="dato-linea"><dt>${k}</dt><dd>${cls
      ? `<code class="${cls}">${esc(v || "Sin determinar")}</code>`
      : esc(v || "Sin determinar")}</dd></div>`).join("");

  const obs = document.getElementById("fObservaciones");
  const bloque = obs.closest(".bloque");
  obs.textContent = e.observaciones || "";
  bloque.style.display = e.observaciones ? "" : "none";
}


/* ---------- entrada ---------- */

/** Ficha imprimible: el árbol se visita en la calle, y ahí no hay señal. */
function armarVisita(e) {
  const boton = document.getElementById("fImprimir");
  if (boton && boton.dataset.escuchando !== "si") {
    boton.dataset.escuchando = "si";
    boton.addEventListener("click", () => window.print());
  }
  const ir = document.getElementById("fComoLlegar");
  if (ir) {
    if (e.coords) {
      ir.href = `https://www.google.com/maps/search/?api=1&query=${e.coords.lat},${e.coords.lng}`;
      ir.hidden = false;
    } else {
      ir.hidden = true;
    }
  }
}

export function pintarFicha(datos, slug) {
  const todos = datos.ejemplares;
  const e = todos.find((x) => x.slug === slug) || todos[0];
  if (!e) return;
  document.title = `${e.nombreAsignado} · Árboles patrimoniales de la Ciudad de México`;
  // La tarjeta de compartir sigue al ejemplar abierto. Ojo: los rastreadores
  // que no ejecutan JavaScript solo verán la tarjeta general del sitio; para
  // una tarjeta por ejemplar hace falta una URL propia servida desde el
  // servidor, no un fragmento (#ficha-slug).
  const resumen = [e.nombreComun || e.especie, e.alcaldia,
    e.morfologia.altura_m != null ? `${nf(e.morfologia.altura_m, 1)} m de altura` : null]
    .filter(Boolean).join(" · ");
  const meta = (sel, valor) => {
    const n = document.head.querySelector(sel);
    if (n && valor) n.setAttribute(n.hasAttribute("property") ? "content" : "content", valor);
  };
  meta('meta[property="og:title"]', `${e.nombreAsignado} · Árboles patrimoniales de la Ciudad de México`);
  meta('meta[name="twitter:title"]', `${e.nombreAsignado} · Árboles patrimoniales de la Ciudad de México`);
  if (resumen) {
    const d = `${e.nombreAsignado}: ${resumen}. Árbol declarado patrimonio natural de la Ciudad de México.`;
    meta('meta[property="og:description"]', d);
    meta('meta[name="twitter:description"]', d);
    meta('meta[name="description"]', d);
  }
  const foto = (e.fotos && e.fotos.length && e.fotos[0].url) || null;
  if (foto) { meta('meta[property="og:image"]', foto); meta('meta[name="twitter:image"]', foto); }
  pintarEncabezado(e);
  pintarGaleria(e);
  cargarFotos(e).then((hay) => {
    if (!hay) return;
    pintarGaleria(e);
    // La imagen para compartir solo se conoce después del descubrimiento.
    const f = e.fotos && e.fotos[0] && e.fotos[0].url;
    if (f) {
      const abs = new URL(f, location.href).href;
      meta('meta[property="og:image"]', abs);
      meta('meta[name="twitter:image"]', abs);
    }
  });
  pintarEscala(e);
  pintarUbicacion(e);
  pintarVistaCalle(e);
  pintarServicios(e);
  pintarTaxonomia(e);
  pintarProcedencia(e);
  pintarFuentes(e);
  armarVisita(e);
}
