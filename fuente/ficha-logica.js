import { svgSilueta, svgPersona, perfilDe, ilustracionDe, PROPORCION_ILUSTRACION, PERSONA, srcsetIlustracion } from "./especies.js";
import { cuandoSeAcerque } from "./leaflet-diferido.js";
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

/* La mitad derecha del encabezado. Quien tiene fotografía la enseña; quien no,
   enseña la ilustración de su especie y, si tampoco la hay, su silueta. El
   respaldo dice de qué especie es —que es lo que sí se sabe— y lo declara en el
   pie: nunca se presenta un dibujo como si fuera una fotografía. */
function pintarRetrato(e) {
  const caja = document.getElementById("fRetrato");
  if (!caja) return;
  const f = (e.fotos && e.fotos[0]) || null;
  if (f) {
    caja.className = "retrato__foto";
    caja.innerHTML = `<img src="${esc(f.url)}" alt="${esc(f.alt)}">`
      + (f.credito ? `<figcaption class="retrato__credito nota-pie">Fotografía: ${esc(f.credito)}</figcaption>` : "");
    return;
  }
  const p = perfilDe(e.especie);
  const ilu = ilustracionDe(e.especie);
  const razon = PROPORCION_ILUSTRACION[p.clave] || 1;
  caja.className = "retrato__foto retrato__foto--silueta";
  caja.innerHTML = (ilu
      ? `<img src="${ilu}" srcset="${srcsetIlustracion(e.especie)}" alt="Ilustración de referencia de ${esc(p.nombre)}" style="aspect-ratio:${razon.toFixed(3)}">`
      : svgSilueta(e.especie, 300, e.morfologia.extensionCopa_m, e.morfologia.altura_m))
    + `<figcaption class="retrato__credito nota-pie nota-pie--alcance">Este ejemplar aún no tiene fotografía. El dibujo es de referencia de la especie: ${esc(p.nombre)}.</figcaption>`;
}

function pintarGaleria(e) {
  const cont = document.getElementById("fGaleria");
  const pie = document.getElementById("fPieFoto");
  const guia = document.getElementById("fGuiaGaleria");
  const aviso = document.getElementById("fGaleriaAviso");
  const fotos = e.fotos || [];

  if (!fotos.length) {
    const p = perfilDe(e.especie);
    guia.textContent = "Este ejemplar aún no tiene fotografías en el registro. La silueta representa el porte característico de la especie, dibujado a la altura medida en campo.";
    const iluF = ilustracionDe(e.especie);
    const razonF = PROPORCION_ILUSTRACION[perfilDe(e.especie).clave] || 1;
    cont.innerHTML = `<div class="sin-foto">
      ${iluF ? `<img class="ilustracion-arbol" src="${iluF}" srcset="${srcsetIlustracion(e.especie)}" alt="Ilustración de referencia de ${esc(p.nombre)}" style="height:250px;width:${(250 * razonF).toFixed(0)}px">`
             : svgSilueta(e.especie, 230, e.morfologia.extensionCopa_m, e.morfologia.altura_m)}
      <p>Silueta de referencia · ${esc(p.nombre)}<br><em>${esc(e.especie || "")}</em></p>
    </div>`;
    pie.textContent = "";
    return;
  }

  guia.textContent = "";

  /* Mosaico: la elegida ocupa la celda grande y las demás la rodean en el
     orden en que están en la carpeta, saltándose la que ya está en grande.
     Al hacer clic en cualquiera, esa pasa al frente y el resto se recorre. */
  let enGrande = 0;
  const pinta = (i, porGesto) => {
    const anterior = enGrande;
    enGrande = i;
    const orden = [i].concat(fotos.map((_, j) => j).filter((j) => j !== i));
    cont.className = `galeria galeria--${Math.min(fotos.length, 5)}`;
    cont.innerHTML = orden.map((k, pos) => {
      const x = fotos[k];
      if (pos === 0) {
        return `<div class="galeria__principal" style="--foto:url('${esc(x.url)}')">
          <img src="${esc(x.url)}" alt="${esc(x.alt)}" loading="lazy">
          ${fotos.length > 1 ? `<span class="galeria__contador">${k + 1} / ${fotos.length}</span>` : ""}
        </div>`;
      }
      return `<button class="galeria__pieza" data-i="${k}" aria-label="Ver en grande la fotografía ${k + 1} de ${fotos.length}">
        <img src="${esc(x.miniatura || x.url)}" alt="" loading="lazy">
        <span class="galeria__pieza__ord" aria-hidden="true">${k + 1}</span></button>`;
    }).join("");
    const f = fotos[i];
    pie.innerHTML = `${esc(f.pie || "")}${f.credito ? `<b>Fotografía: ${esc(f.credito)}</b>` : ""}`;
    cont.querySelectorAll(".galeria__pieza").forEach((b) =>
      b.addEventListener("click", () => pinta(Number(b.dataset.i), true)));

    /* EL FOCO NO SE TIRA AL SUELO.
       Repintar el mosaico destruye el botón que se acaba de pulsar, así que el
       foco caía en el <body>: quien navega por teclado perdía su lugar y tenía
       que volver a tabular desde el principio de la página. Se devuelve al
       azulejo que ocupa ahora la posición de la fotografía desplazada, que es
       justamente la que intercambió lugar con la elegida.
       Y se anuncia el cambio: el contador pasaba de «1 / 3» a «2 / 3» sin que
       ningún lector de pantalla lo dijera. */
    if (porGesto) {
      const vuelve = cont.querySelector(`.galeria__pieza[data-i="${anterior}"]`);
      if (vuelve) vuelve.focus();
      if (aviso) aviso.textContent = `Fotografía ${i + 1} de ${fotos.length}.${f.pie ? " " + f.pie : ""}`;
    }
  };
  pinta(0, false);
}

function pintarVistaCalle(e) {
  const caja = document.getElementById("fVistaCalle");
  const pie = document.getElementById("fVistaCallePie");
  const url = urlVistaCalle(e.coords, e.vistaCalle);
  if (!url) {
    caja.innerHTML = `<div class="vista-calle__aviso">Sin coordenadas capturadas, no es posible mostrar la vista desde la calle de este ejemplar.</div>`;
    pie.textContent = "";
    return;
  }
  caja.innerHTML = `<iframe src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
     title="Vista desde la calle del ejemplar ${esc(e.nombreAsignado || "")}" allowfullscreen></iframe>`;
  // El aviso de la fecha era un recuadro sobre la imagen y se pintaba incluso
  // cuando no había panorama que advertir. Va aquí, en el pie, junto con el
  // origen del panorama: es la misma nota sobre la misma imagen, y así
  // desaparece con ella. Es además lo que modelo-ficha.js ya devolvía en
  // `pieVistaCalle`, que hasta ahora decía una cosa y la página otra.
  const propio = e.vistaCalle && e.vistaCalle.tipo === "panorama";
  // Dos notas, no una: de dónde salió la imagen (*) y qué no dice (**). Iban
  // en la misma frase y se leían como un solo aviso.
  pie.innerHTML = `<span class="nota-pie">${propio
      ? "Panorama de Google Street View encuadrado sobre el ejemplar."
      : "Panorama de Google Street View sobre las coordenadas registradas."}</span>`
    + '<span class="nota-pie nota-pie--alcance">La imagen <b>puede corresponder a una fecha anterior al dictamen</b> y no sustituye la verificación en campo.</span>';
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
      arbol = `<img class="ilustracion-arbol" src="${ilu}" srcset="${srcsetIlustracion(e.especie)}" alt="Ilustración de referencia de ${esc(perfilDe(e.especie).nombre)}" loading="lazy" style="width:${(h * razon).toFixed(1)}px;height:${h.toFixed(1)}px">`;
    } else {
      arbol = svgSilueta(e.especie, h, copa, alt);
    }
    lienzo.innerHTML = `<div class="escala__regla">${reglas.join("")}</div>
      <div class="escala__dibujo">${arbol}</div>
      <div class="escala__persona" style="--alto-persona:${px(ALTURA_PERSONA).toFixed(1)}px">
        <span class="escala__guia" aria-hidden="true"><i>1.70 m</i></span>
        ${svgPersona(px(ALTURA_PERSONA))}<b class="vo">Figura humana de referencia: 1.70 metros</b></div>`;

    /* LAS COTAS, SOBRE EL DIBUJO.
       Las medidas vivían solo en la tabla de al lado. Puestas sobre el dibujo
       dejan de ser cifras que hay que creer y se vuelven cosas que se ven: la
       altura acotada contra la regla, el diámetro señalado en el tronco a la
       altura a la que se mide, y la extensión de copa trazada A ESCALA en el
       suelo. Esa barra es además la respuesta gráfica a la advertencia que
       antes solo vivía en letra chica: si el ancho del dibujo no coincide con
       la barra, se ve por qué el dibujo es el porte típico de la especie y no
       la copa de este ejemplar.
       Se posicionan midiendo el dibujo ya montado, no calculando dónde debería
       estar: la caja del árbol depende del reparto flexible y de la razón de
       cada ilustración. */
    anotarCotas(lienzo, { alt, copa, dap: e.morfologia.diametro_cm, px, conIlustracion: !!ilu });
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
  /* Leaflet se descarga cuando el recuadro se acerca a la pantalla: en la
     ficha está por debajo de la galería y de la tabla de medidas, así que la
     mayoría de las visitas llegan a él con la biblioteca ya lista. */
  cuandoSeAcerque(lienzo, () => dibujarMapaEjemplar(e, lienzo, centro),
    () => dibujarMapaEjemplar(e, lienzo, centro));
}

function dibujarMapaEjemplar(e, lienzo, centro) {
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
    /* Una sola línea de clima. El carbono elemental y el CO₂ equivalente son
       la misma captura en dos unidades —CO₂e = carbono × 3.667—, y puestos en
       renglones consecutivos se leen como dos servicios distintos. Se publica
       el CO₂ equivalente, que es la unidad de los compromisos climáticos. */
    ["Clima y carbono", [
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
    /* Los decimales se eligen por la MAGNITUD del valor, no por la columna.
       Con cero decimales fijos, nueve de las trece fichas publicaban «1 kg/año»
       de carbono: 0.79, 0.87, 0.94, 1.03, 1.13, 1.23 y 1.27 se redondeaban
       todos a 1, borrando una diferencia real de 1.6 veces entre el mayor y el
       menor. Y el CSV de datos abiertos sí trae los decimales, así que la ficha
       contradecía al dato publicado. Por debajo de diez se muestran dos
       decimales; entre diez y cien, uno; de cien en adelante, ninguno: ahí el
       decimal ya no informa y el separador de miles hace el trabajo. */
    const decimales = (v) => (Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0);
    const html = filas.map(([t, v, u]) => {
      const hay = typeof v === "number" && isFinite(v);
      if (!hay) haySin = true;
      const neg = hay && v < 0; if (neg) hayNeg = true;
      if (enGrande) {
        return `<div class="cifra-serv${hay ? (neg ? " cifra-serv--neg" : "") : " cifra-serv--sin"}">`
          + `<b>${hay ? `${nf(v, decimales(v))}<u>${u}</u>` : '<span class="sin-dato">Sin dato</span>'}</b>`
          + `<span>${t}</span></div>`;
      }
      return `<div class="grupo__fila${hay ? (neg ? " grupo__fila--neg" : "") : " grupo__fila--sin"}"><span>${t}</span>`
        + `<b>${hay ? `${nf(v, decimales(v))}<u>${u}</u>` : '<span class="sin-dato">Sin dato</span>'}</b></div>`;
    }).join("");
    const notas = [];
    if (haySin) notas.push('Los renglones marcados como "Sin dato" no se pudieron estimar para este ejemplar con la información disponible.');
    if (i === 3 && hayNeg) notas.push("Los valores negativos indican mayor consumo o emisión, no un ahorro: así lo reporta i-Tree cuando la sombra del árbol incrementa la demanda de calefacción.");
    const nota = notas.map((x) => `<p class="grupo__nota nota-pie nota-pie--alcance">${x}</p>`).join("");
    // El primer grupo es el gancho: carbono y CO₂ son la cifra que la gente
    // repite. Se marca para que no pese lo mismo que los otros tres.
    const clases = ["grupo", enGrande ? "grupo--cifras" : "", i === 0 ? "grupo--destacada" : ""].filter(Boolean).join(" ");
    const cuerpo = enGrande ? `<div class="grupo__cifras">${html}</div>` : html;
    return `<article class="${clases}"><h3>${titulo}</h3>${cuerpo}${nota}</article>`;
  }).join("");

}

/*
 * Nombres llanos de los peldaños taxonómicos.
 *
 * DELIBERADAMENTE CASI VACÍO. Traducir «Magnoliopsida» a «magnolias, margaritas
 * y parientes» es una afirmación botánica, no una traducción: exige una fuente.
 * Aquí solo están los dos peldaños cuyo nombre llano ES la traducción literal
 * del término, sin criterio de por medio. Los demás se agregan cuando alguien
 * con competencia botánica los valide, y mientras tanto la cascada muestra el
 * rango y el nombre científico, que siempre son ciertos.
 *
 * La clave es el nombre científico en minúsculas y sin acentos.
 */
const NOMBRE_LLANO = {
  plantae: "Plantas",
  tracheophyta: "Plantas vasculares",
};

const llanoDe = (v) => NOMBRE_LLANO[String(v || "").toLowerCase().trim()] || null;

/**
 * Dibuja las cotas encima del lienzo de escala, midiendo el dibujo ya montado.
 *
 * @param {HTMLElement} lienzo  el contenedor con la regla, el árbol y la figura
 * @param {{alt:number, copa:number|null, dap:number|null, px:(m:number)=>number,
 *           conIlustracion:boolean}} d
 */
function anotarCotas(lienzo, d) {
  const dibujo = lienzo.querySelector(".escala__dibujo");
  const regla = lienzo.querySelector(".escala__regla");
  if (!dibujo || !regla) return;

  const cajaL = lienzo.getBoundingClientRect();
  const cajaA = dibujo.getBoundingClientRect();
  if (!cajaA.width) return;
  const izq = cajaA.left - cajaL.left;
  /* El tronco no cae en el centro de la caja. En la silueta dibujada sí, porque
     se construye simétrica; en las ilustraciones fotográficas está algo a la
     izquierda —en el fresno, al 47 % del ancho—. Una cota anclada al centro de
     la caja señalaba copa en vez de tronco. La fracción es una aproximación
     declarada: por eso la guía del diámetro se detiene ANTES de llegar, que se
     lee como señalar, mientras que pasarse se lee como error. */
  const centro = izq + cajaA.width * (d.conIlustracion ? 0.47 : 0.5);
  const alto = d.px(d.alt);

  const partes = [];

  // Altura: cota vertical a la izquierda del dibujo, con sus dos remates.
  partes.push(`<div class="cota cota--alto" style="left:${Math.max(2, izq - 30).toFixed(1)}px;height:${alto.toFixed(1)}px">
    <b>${nf(d.alt, 1)}</b><i>metros</i></div>`);

  // Diámetro: guía punteada que termina en el tronco, a 1.30 m, que es la
  // altura a la que el DAP se mide en campo.
  if (d.dap) {
    partes.push(`<div class="cota cota--dap" style="right:${(cajaL.width - centro + 20).toFixed(1)}px;bottom:${d.px(1.3).toFixed(1)}px">
      <span></span><b>${nf(d.dap, 1)} cm de diámetro</b></div>`);
  }

  /* Copa: barra en el suelo, centrada en el tronco. Si la barra no cabe en el
     lienzo no se dibuja: una barra recortada mide menos de lo que dice, y una
     cota que miente es peor que ninguna. */
  if (d.copa) {
    const ancho = d.px(d.copa);
    const desde = centro - ancho / 2;
    if (desde >= 0 && desde + ancho <= cajaL.width) {
      partes.push(`<div class="cota cota--copa" style="left:${desde.toFixed(1)}px;width:${ancho.toFixed(1)}px">
        <b>${nf(d.copa, 1)} m de extensión de copa</b></div>`);
    }
  }

  regla.insertAdjacentHTML("beforeend", partes.join(""));
}

function pintarTaxonomia(e) {
  const t = e.taxonomia;

  /* La escalera, de lo general a este árbol. Un peldaño sin dato no se dibuja
     como «Sin determinar»: se salta. Una cascada con huecos rotos deja de
     leerse como un descenso. Lo que falte se ve en su ausencia, no en un
     relleno. */
  const peldanos = [
    ["reino", t.reino], ["filo", t.phylum], ["clase", t.clase],
    ["orden", t.orden], ["familia", t.familia], ["género", t.genero],
  ].filter(([, v]) => v);

  const escalones = peldanos.map(([rango, valor], i) => {
    const llano = llanoDe(valor);
    const cursiva = rango === "género";
    const nombre = cursiva ? `<i>${esc(valor)}</i>` : esc(valor);
    return `<li style="--peldano:${i}">${llano
      ? `<em>${esc(llano)}</em><small>${rango} ${nombre}</small>`
      : `<em>${nombre}</em><small>${rango}</small>`}</li>`;
  });

  // El último peldaño es el ejemplar: nombre común al frente, binomio y
  // autoridad como su respaldo. Es el único que se destaca.
  const autoridad = t.autor ? ` · ${esc(t.autor)}` : "";
  escalones.push(`<li class="cascada__hoja" style="--peldano:${peldanos.length}">
    <em>${esc(e.nombreComun ? e.nombreComun.toLowerCase() : e.especie)}</em>
    <small><i>${esc(e.especie)}</i>${autoridad}</small></li>`);

  document.getElementById("fTaxonomia").innerHTML = escalones.join("");

  /* Lo que NO es escalera taxonómica: atributos de la especie. Vivían mezclados
     con el reino y el filo, y no son lo mismo —uno clasifica, el otro describe
     el estatus—. Van aparte, en tabla, que es lo que son. */
  const atributos = [
    ["Nivel de prioridad", e.conservacion.prioridad],
    ["Forma de crecimiento", t.formaCrecimiento],
    // El rótulo decía «Origen en la Ciudad» y el dato responde otra pregunta:
    // la columna del padrón es «Exótica / invasora», fórmula heredada de la
    // especie desde la hoja Taxonomia_SNIB. Doce de trece ejemplares la traen
    // vacía, así que doce fichas decían «Origen en la Ciudad · Sin determinar»
    // —que se lee como «no sabemos de dónde es»— cuando lo que ocurre es que
    // el SNIB no clasificó a la especie como exótica. Con el rótulo del padrón,
    // la ausencia se lee como lo que es: un dato que no está.
    ["Exótica / invasora", e.conservacion.exoticaInvasora],
    ["Endemismo", e.conservacion.endemismo],
    ["NOM-059-SEMARNAT", e.conservacion.nom059],
    ["CITES", e.conservacion.cites],
    ["Especie prioritaria", e.conservacion.prioritaria],
  ];
  const cajaAtr = document.getElementById("fAtributos");
  if (cajaAtr) {
    cajaAtr.innerHTML = atributos
      .map(([k, v]) => `<div class="dato-linea"><dt>${k}</dt><dd>${esc(v || "Sin determinar")}</dd></div>`).join("");
  }

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
 * ¿Esto es una dirección de verdad?
 *
 * La hoja guardaba el texto «MyTree» en la columna del cálculo de i-Tree —el
 * nombre de la herramienta, no la corrida— y ese texto llegó a publicarse como
 * si fuera un enlace. Una tarjeta de fuente solo tiene sentido si lleva a algún
 * lado: si el campo no empieza por http:// o https://, no se dibuja.
 */
function esDireccion(valor) {
  return /^https?:\/\/\S+$/i.test(String(valor || "").trim());
}

/**
 * Las fuentes del ejemplar, al final de la ficha.
 *
 * Cada tarjeta aparece SOLO si su campo trae una dirección propia de ESE árbol.
 * Se retiraron en su momento «Fuente del registro», «Cálculo i-Tree» y
 * «Ejemplar en el SNIB» porque las tres guardaban el mismo valor en los trece
 * ejemplares —la misma observación de iNaturalist, el texto «MyTree» y el mismo
 * identificador del SNIB—, de modo que ninguna llevaba a información de ese
 * ejemplar, que es lo único que justifica un enlace en su ficha.
 *
 * La de i-Tree vuelve porque el registro ya guarda la corrida de cada árbol.
 * La condición no cambia y por eso se escribe como regla, no como excepción:
 * el día que el campo vuelva a traer «MyTree» —o se quede vacío— la tarjeta
 * desaparece sola en lugar de publicar un enlace que no lleva a nada.
 */
function pintarFuentes(e) {
  const caja = document.getElementById("fFuentes");
  if (!caja) return;

  /* Los cinco documentos que puede tener un ejemplar. Cada renglón se nombra
     por lo que ABRE y declara de quién es el sistema al que lleva: quien va a
     salir del sitio debe saberlo antes de hacer clic, no después.

     Un documento que el registro no trae NO desaparece: se dibuja apagado y
     dice por qué. Desaparecer deja al lector creyendo que no se consultó; el
     renglón apagado dice que sí y que no lo hay. Esa fue la razón de retirar la
     sección «De dónde sale cada dato», que explicaba en prosa lo que ahora dice
     cada renglón por sí mismo. */
  const documentos = [
    {
      titulo: "Decreto de declaratoria",
      url: rutaDecreto(e.linkDecreto),
      pie: "El acuerdo publicado que lo declara patrimonial",
      falta: "Todavía no está publicado en este sitio",
      propio: true,
    },
    {
      titulo: "Ficha de la especie en el SNIB",
      url: esDireccion(e.urlSNIB) ? String(e.urlSNIB).trim() : null,
      pie: "CONABIO · sistema externo",
      falta: "El registro no guarda la dirección de este ejemplar",
    },
    {
      titulo: "Observación de referencia de la especie",
      url: esDireccion(e.urlOrigen) ? String(e.urlOrigen).trim() : null,
      pie: "El avistamiento con el que se respalda la identificación",
      falta: "El registro no guarda la observación de referencia",
    },
    {
      titulo: "Corrida de i-Tree de este ejemplar",
      url: esDireccion(e.linkITree) ? String(e.linkITree).trim() : null,
      pie: "El cálculo con el que se estimaron sus servicios ambientales",
      falta: "El registro guarda el nombre de la herramienta, no la corrida",
    },
    {
      titulo: "Programa de manejo",
      // El campo existe en el padrón v2 (`url_programa`) pero el lector todavía
      // no lo recoge, así que aquí siempre llega vacío. Decir «no tiene uno
      // registrado» sería afirmar algo que nadie comprobó.
      url: esDireccion(e.urlPrograma) ? String(e.urlPrograma).trim() : null,
      pie: "Las medidas de conservación acordadas para el ejemplar",
      falta: "El registro todavía no captura este campo",
    },
  ];

  caja.innerHTML = documentos.map((d) => d.url
    ? `<li><a href="${esc(d.url)}"${d.propio
         ? ' class="docs--propio"'
         : ' target="_blank" rel="noopener" class="sin-marca-externa"'}>
         <b>${esc(d.titulo)}${d.propio ? "" : '<span class="docs__fuera" aria-hidden="true">\u2197</span>'
           + '<span class="vo">, abre un sitio externo</span>'}</b>
         <span>${esc(d.pie)}</span></a></li>`
    : `<li class="docs--sin"><span><b>${esc(d.titulo)}</b><span>${esc(d.falta)}</span></span></li>`
  ).join("");

  // Un enlace que promete un documento y devuelve un 404 es peor que no
  // ofrecerlo: la persona cree que el decreto no existe. Se comprueba que el
  // archivo esté publicado y, si no está, el renglón pasa a apagado con un
  // texto que dice la verdad. Es una sola petición de cabecera, sin descargar
  // el PDF, y solo con el decreto servido desde este sitio: una petición a un
  // dominio ajeno la bloquea el navegador por CORS y no significaría nada.
  const enlaceDecreto = caja.querySelector(".docs--propio");
  if (enlaceDecreto && typeof fetch === "function") {
    const url = enlaceDecreto.getAttribute("href");
    if (!/^https?:\/\//i.test(url)) {
      fetch(url, { method: "HEAD" })
        .then((r) => { if (!r.ok) apagarDecreto(caja); })
        .catch(() => { /* sin red o con file://: se deja el enlace como está */ });
    }
  }
}

function apagarDecreto(caja) {
  const a = caja.querySelector(".docs--propio");
  if (!a) return;
  const fila = a.closest("li");
  if (!fila) return;
  fila.className = "docs--sin";
  fila.innerHTML = "<span><b>Decreto de declaratoria</b>"
    + "<span>Todavía no está publicado en este sitio</span></span>";
}

function pintarProcedencia(e) {
  /* «Fecha de nominación» NO se publica. El padrón v2 la retiró —el lector la
     deja en null a propósito— porque el registro no la levanta: la única fecha
     que existe como acto es la del decreto. Publicar una fecha de nominación
     obligaba a inventarla o a repetir la del decreto disfrazada de otra cosa,
     y las dos salidas mienten sobre el expediente. */
  const filas = [
    ["Nominado por", e.nominadoPor],
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
  pintarRetrato(e);
  pintarGaleria(e);
  cargarFotos(e).then((hay) => {
    if (!hay) return;
    pintarRetrato(e);
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
}
