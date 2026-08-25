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
/* LA DIRECCIÓN DE CADA EJEMPLAR.
   Antes se enlazaba «ficha.html#ficha-slug». El fragmento no lo indexa ningún
   buscador: las trece fichas se consolidaban en una sola dirección y doce
   ejemplares no podían encontrarse por su nombre. Desde el armado del 25 de
   agosto de 2026 cada uno tiene su archivo propio, y se llama igual en la
   vista previa y en producción, así que aquí no hace falta testigo. */
const urlFicha = (slug) => `arbol-${slug}.html`;

const LIENZO_BOSQUE = 268;  // altura del ejemplar más alto en la hilera

/* Cada categoría lleva DOS textos y un hueco para su distintivo gráfico.
   «texto» es la frase en lenguaje ciudadano: es lo que se lee primero y lo
   que la mayoría necesita. «definicion» es la redacción formal que asigna la
   Secretaría: va debajo, en letra menor, para quien necesita el criterio
   exacto. Separarlos evita la tentación de escribir un solo párrafo que ni
   explica con claridad ni sirve como definición.
   OJO con «Rebasó los cien años»: decía cien y la definición formal fija el
   umbral en OCHENTA. Se corrigió el texto ciudadano, no la definición. */
const DEF_CATEGORIA = {
  CENTENARIO: {
    titulo: "Centenario", plural: "Centenarios", dorada: false, icono: null,
    texto: "Tiene ochenta años o más. Germinó cuando la ciudad todavía cabía dentro de sus canales.",
    definicion: "Categoría asignada por SEDEMA según las características del ejemplar. La categoría CENTENARIO se refiere a ejemplares arbóreos o arboledas cuya edad estimada es igual o superior a 80 años, determinada mediante métodos directos o indirectos, que constituyen un testigo biológico e histórico del entorno. Su valor patrimonial radica en su longevidad excepcional, representando la memoria viva del paisaje, su evolución ecológica y la identidad histórica de la Ciudad de México.",
  },
  HISTORICO: {
    titulo: "Histórico", plural: "Históricos", dorada: true, icono: null,
    texto: "Está ligado a un hecho, una persona o un lugar que la ciudad recuerda. Su valor no está solo en el árbol.",
    /* PENDIENTE. La definición formal que llegó para HISTÓRICO era, palabra por
       palabra, la de CENTENARIO: hablaba de edad igual o superior a 80 años,
       que es el criterio de la otra categoría y no distingue nada. Publicarla
       diría algo falso sobre el criterio de la Secretaría, así que la tarjeta
       se queda con su frase ciudadana hasta que llegue la redacción correcta.
       El sitio no deja hueco visible: simplemente no muestra el bloque. */
    definicion: null,
  },
  NOTABLE: {
    titulo: "Notable", plural: "Notables", dorada: false, icono: null,
    texto: "Destaca por su tamaño, su porte o su especie frente a cualquier otro ejemplar de la ciudad.",
    definicion: "Categoría asignada por SEDEMA según las características del ejemplar. La categoría NOTABLE se refiere a ejemplares arbóreos o arboledas que presentan características extraordinarias o dimensiones excepcionalmente superiores con relación a su especie y contexto, incluyendo porte sobresaliente, rareza taxonómica o valor científico, paisajístico o estético. Su valor patrimonial se manifiesta en su singularidad, monumentalidad y en la contribución significativa que ofrece al paisaje, la biodiversidad y el patrimonio natural urbano.",
  },
  SINGULAR: {
    titulo: "Singular", plural: "Singulares", dorada: true, icono: null,
    texto: "No hay otro igual: una forma, una rareza o una condición que no se repite en el arbolado urbano.",
    definicion: "Categoría asignada por SEDEMA según las características del ejemplar. La categoría SINGULAR se refiere a ejemplares arbóreos o arboledas de morfología inusual, especie exótica, rara o poco común en la Ciudad de México, que destacan por su importancia paisajística o cultural local. Su valor patrimonial radica en la contribución que realiza a la calidad del paisaje y la identidad urbana mediante su biomasa, longevidad, beneficios ambientales y características de porte sobresalientes, como la altura, el diámetro del tronco o la amplitud de la copa.",
  },
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
    return `<a class="bosque__arbol" href="${urlFicha(esc(e.slug))}" aria-label="${esc(rotulo)}">
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
  pintarReglaBosque(tope, px);

  document.getElementById("bosqueRango").textContent =
    `${nf(Math.min(...conAltura.map((e) => e.morfologia.altura_m)), 1)} — ${nf(tope, 1)} m`;

  document.getElementById("bosqueNota").textContent =
    `Cada silueta está dibujada con la altura real medida en campo y la regla marca los metros${sinAltura ? `; ${sinAltura} sin medir` : ""}.`;
}


/**
 * La regla de alturas de la hilera.
 *
 * «A escala real» era, hasta ahora, una afirmación que quien mira no podía
 * comprobar: trece siluetas de distinto tamaño y nada contra qué medirlas. Las
 * marcas de cinco en cinco convierten la comparación entre ejemplares —que sí
 * se veía— en una lectura de la altura de cada uno.
 *
 * Se dibuja con la MISMA función que dimensiona los árboles, no con una
 * aproximación equivalente: si un día cambia la escala, cambian las dos a la
 * vez. Una regla calculada aparte es una regla que acaba mintiendo.
 *
 * El suelo no se mide: la ranura de cada árbol reserva --lienzo-bosque para el
 * dibujo, así que la línea de tierra cae siempre en el borde inferior de la
 * regla. Por eso esta función no toca posiciones ni escucha cambios de tamaño.
 */
function pintarReglaBosque(tope, px) {
  const regla = document.getElementById("bosqueRegla");
  if (!regla) return;
  const PASO = 5;
  const marcas = [];
  // El suelo primero, para que quede por debajo de las marcas en el orden de
  // pintado y su línea continua no corte a las punteadas.
  marcas.push('<i class="bosque__marca bosque__marca--suelo" style="bottom:0"><span>0</span></i>');
  for (let m = PASO; m <= tope; m += PASO) {
    marcas.push(`<i class="bosque__marca" style="bottom:${px(m).toFixed(1)}px"><span>${m} m</span></i>`);
  }
  regla.innerHTML = marcas.join("");
}


/* LOS ICONOS DEL CINTILLO SE RETIRARON.
   Eran ocho pictogramas de trazo dorado sobre el morado profundo. A 24 px
   apenas se veían; al probarlos al doble de peso quedó claro que el problema
   no era el tamaño sino el significado: la diana de «años del más antiguo»
   —anillos de crecimiento -- se lee como un objetivo, la gráfica de barras de
   «sumando sus alturas» como estadística genérica y el recuadro de «en
   Cuauhtémoc» no se lee como nada. Agrandarlos solo hacía más grande un
   pictograma que no comunicaba.

   Además competían por el color: icono y cifra iban los dos en dorado, y el
   dorado tiene que ser de la cifra. Sin ellos la banda pierde 168 px de alto
   y la jerarquía queda en dos escalones sin ruido: cifra y luego rótulo.

   Si algún día vuelven, que sea con pictogramas que se entiendan sin leyenda
   y en un color que no le dispute el dorado al número. */

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
    /* «Años sumados» salió del cintillo. Sumar la edad de dos ejemplares de
       trece y presentar el total junto a las demás cifras —que sí se calculan
       sobre los trece— invita a leerlo como la edad del registro entero. La
       salvedad al pie lo advertía, pero una cifra grande se lee antes que su
       nota. Queda «Años del más antiguo», que es un dato de un solo ejemplar y
       no finge ser un agregado. */
  ];
  document.getElementById("cifras").innerHTML = datos
    .map(([, v, l]) => `<div class="cifra"><strong>${esc(String(v))}</strong><span>${esc(l)}</span></div>`).join("");

  /* Al pie, las salvedades. Van en un solo renglón, en cuerpo pequeño y con
     asterisco: son notas al margen de las cifras, no cifras. En tres renglones
     sueltos pesaban tanto como el cintillo y competían con él.
     La cobertura de la edad se declara aunque «Años sumados» ya no aparezca:
     «Años del más antiguo» también sale del mismo dato escaso, y sin la nota
     los 700 años parecerían representativos de los trece. */
  const pie = document.getElementById("cifrasPie");
  if (pie) {
    const partes = [
      especies.nota ? `Las especies del registro: ${especies.nota}` : "",
      alcaldia.cifra && alcaldia.cifra !== "—"
        ? `${alcaldia.cifra} es la alcaldía que más reúne` : "",
      edad.nota ? `Solo ${(edad.nota.match(/(\d+ de \d+)/) || [, "pocos"])[1]} ejemplares tienen edad dictaminada` : "",
    ].filter(Boolean);
    pie.innerHTML = partes.length
      ? `<b class="cifras__pie__ast" aria-hidden="true">*</b>`
        + partes.map((r) => `<span>${esc(r)}</span>`).join("")
      : "";
    pie.hidden = partes.length === 0;
  }
}

function pintarCategorias(stats) {
  const mapa = { CENTENARIO: "centenarios", HISTORICO: "historicos", NOTABLE: "notables", SINGULAR: "singulares" };
  document.getElementById("categorias").innerHTML = Object.entries(DEF_CATEGORIA).map(([clave, d]) => {
    const n = stats.totalPorCategoria[mapa[clave]] || 0;
    /* El hueco del distintivo se dibuja SIEMPRE, con o sin archivo. Vacío es
       un recuadro punteado que dice qué falta ahí: así el diseño ya está
       resuelto cuando lleguen los cuatro iconos y nadie tiene que rehacer la
       tarjeta. Cuando `icono` traiga una ruta, se pinta la imagen y el
       recuadro punteado desaparece solo. */
    const distintivo = d.icono
      ? `<img class="categoria__icono" src="${d.icono}" width="56" height="56" alt="">`
      : `<span class="categoria__icono categoria__icono--vacio" aria-hidden="true">${d.titulo.charAt(0)}</span>`;
    return `<article class="categoria${d.dorada ? " categoria--dorada" : ""}">
      <div class="categoria__cabeza">${distintivo}<h3>${d.titulo}</h3></div>
      <p>${d.texto}</p>
      ${d.definicion ? `<details class="categoria__criterio">
        <summary>El criterio completo</summary>
        <p>${d.definicion}</p>
      </details>` : ""}
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
  return `<a class="ficha" href="${urlFicha(esc(e.slug))}" data-cats="${esc(e.categorias.join(" "))}" data-alcaldia="${esc(e.alcaldia || "")}">
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

/* ─── EL REGISTRO VIGENTE Y LA CAPA EN VIVO ────────────────────────────────
   La página nace con el registro congelado incrustado en el propio archivo:
   se ve completa sin esperar a nadie, y se ve igual si Google no responde.
   Encima de eso, y SOLO si la hoja publicada demuestra que trae algo, se
   sustituye por lo que el equipo tenga capturado hoy.

   El orden es deliberado: primero lo que ya está, después lo que llega, nunca
   al revés. Una hoja vacía, una red caída o una publicación retirada dejan la
   página exactamente como estaba. Hoy la hoja está vacía de verdad, así que
   este es el camino normal, no el excepcional.

   Las piezas viven fuera —padron/lector-v2.js convierte el CSV en datos y
   padron/fuente-viva.js va por él—. El ensamblador las incrusta antes que
   este archivo y las deja en el ámbito global. Si no están —al abrir esta
   lógica como módulo suelto, o en las maquetas— la capa no arranca y el
   congelado se queda: es una degradación, no un error. */
let DATOS_VIGENTES = null;
let vivaIniciada = false;

/* ═══ INTERRUPTOR DE LA FUENTE VIVA ═══ APAGADO el 24 de agosto de 2026.

   POR QUÉ. La hoja publicada perdió sesenta de sus ochenta y tres columnas:
   llegan la identidad y la taxonomía, y vienen en blanco las categorías, el
   decreto, la ubicación entera, las coordenadas y todas las medidas. El
   guardián de fuente-viva.js solo rechaza un registro VACÍO, y ese no lo
   estaba —los doce ejemplares conservaban su nombre—, así que pasó el filtro y
   sustituyó a los trece congelados que sí traen coordenadas. El sitio quedó
   sin mapa, sin alturas y sin servicios ambientales.

   MIENTRAS TANTO. El usuario pidió trabajar contra el registro congelado
   —`datos/registro.json`, el que el armado incrusta en la página— para poder
   ver cómo se verá el sitio con los datos ya capturados. Esto NO arregla la
   hoja: la desconecta.

   CÓMO SE VUELVE A ENCENDER. Se pone en `true`. No hace falta nada más: se
   olvida la caché al apagar, así que al encender se pide la hoja de nuevo.
   Está anotado en pendientes.html; no lo dejes apagado sin que alguien lo
   sepa, porque un sitio congelado para siempre deja de ser un registro. */
const FUENTE_VIVA_ACTIVA = false;

function iniciarFuenteViva() {
  if (vivaIniciada) return;
  vivaIniciada = true;
  const g = typeof globalThis !== "undefined" ? globalThis : {};

  if (!FUENTE_VIVA_ACTIVA) {
    /* Se olvida lo guardado. La caché no se lee si no se llama a cargarEnVivo,
       pero un registro degradado guardado ayer volvería a entrar el día que
       alguien encienda el interruptor, antes de pedir la hoja: la caché manda
       sobre la red mientras esté vigente. Se borra ahora, no después. */
    try { if (g.localStorage && g.CLAVE_CACHE) g.localStorage.removeItem(g.CLAVE_CACHE); } catch (_) {}
    console.info("[registro] Fuente viva apagada a propósito: se muestra el registro congelado que viaja con el sitio.");
    return;
  }

  if (typeof g.cargarEnVivo !== "function" || !g.CONTRATO_PADRON) return;

  /* Se pide DESPUÉS del primer pintado, nunca antes: la portada no espera a
     la red para existir. El motivo de lo que pase se escribe en la consola,
     porque quien opera el sitio necesita distinguir «la hoja está vacía» de
     «la hoja no responde», y esas dos cosas se ven igual desde fuera. */
  setTimeout(() => {
    g.cargarEnVivo({ contrato: g.CONTRATO_PADRON }).then((r) => {
      if (r && r.motivo) console.info("[registro] " + r.motivo);
      if (!r || !r.registro) return;
      if (typeof g.hayCambio === "function" && !g.hayCambio(DATOS_VIGENTES, r.registro)) return;
      pintarPortada(r.registro);
      remontarMapa();
    }).catch((err) => {
      console.info("[registro] No se pudo actualizar desde la hoja: " + (err && err.message));
    });
  }, 0);
}

// Leaflet administra su propio árbol y revienta si se le pide construir dos
// veces sobre el mismo contenedor. Repintar la portada —tras un reintento de
// red, por ejemplo— abortaba el resto del render a la mitad.
let mapaCreado = false;   // el montaje ya está programado
let mapaVivo = null;      // el mapa ya montado, si lo está

function pintarMapa(ejemplares) {
  const lienzo = document.getElementById("mapaLienzo");
  const lista = document.getElementById("mapaLista");
  const filtros = document.getElementById("mapaFiltros");
  if (!lienzo || !lista) return;
  const conCoords = ejemplares.filter((e) => e.coords).length;
  // Cuando todos tienen coordenadas no hay nada que advertir: el mapa se
  // explica solo. La guía únicamente aparece si falta alguno. Se recalcula en
  // cada pintado —es texto, no un mapa— para que una actualización en vivo no
  // deje el aviso hablando del registro anterior.
  const guia = document.getElementById("guiaMapa");
  guia.textContent = conCoords === ejemplares.length ? ""
    : `${conCoords} de los ${ejemplares.length} ejemplares tienen coordenadas capturadas. Los demás aparecen en el listado con su domicilio.`;
  guia.hidden = !guia.textContent;
  if (mapaCreado) return;
  mapaCreado = true;
  /* El mapa no se construye al cargar la página: se construye cuando la
     persona se acerca a él, que es también cuando termina de descargarse
     Leaflet. Si la descarga falla, crearMapa recibe el mundo sin L y pinta su
     propio aviso —el listado de al lado sigue siendo la vía completa al mismo
     contenido—.
     El montaje lee DATOS_VIGENTES y no la lista que recibió esta función: si
     la hoja llega mientras el mapa sigue esperando a que alguien baje hasta
     él, se monta ya con lo nuevo y no hay nada que rehacer. */
  const montar = () => {
    const vigentes = (DATOS_VIGENTES && DATOS_VIGENTES.ejemplares) || ejemplares;
    mapaVivo = crearMapa({ contenedor: lienzo, lista, filtros, ejemplares: vigentes });
  };
  cuandoSeAcerque(lienzo, montar, montar);
}

/* Rehacer el mapa cuando el registro cambió debajo de él.
   Repintar el resto de la portada es cambiar innerHTML; el mapa no: Leaflet
   deja marcado el contenedor y se niega a construir dos veces sobre él. Hay
   que devolverlo a cero —quitar la instancia, vaciar el lienzo, borrar la
   marca y retirar el aviso que el mapa inyecta en su marco— y volver a
   montar. Si todavía no se había montado no hay nada que hacer: su montaje
   pendiente ya leerá el registro nuevo. */
function remontarMapa() {
  const lienzo = document.getElementById("mapaLienzo");
  if (!lienzo || !mapaVivo) return;
  try { if (mapaVivo.mapa) mapaVivo.mapa.remove(); } catch (e) {}
  mapaVivo = null;
  mapaCreado = false;
  lienzo.innerHTML = "";
  delete lienzo._leaflet_id;
  const marco = lienzo.closest(".mapa-marco") || lienzo.parentNode;
  const aviso = marco && marco.querySelector("[data-aviso]");
  if (aviso) aviso.remove();
  pintarMapa((DATOS_VIGENTES && DATOS_VIGENTES.ejemplares) || []);
}


function pintarServicios(stats) {
  const cobertura = (s) => s.completo
    ? `Dato completo en los ${s.conDato} ejemplares`
    : `Calculado sobre ${s.conDato} de ${s.conDato + s.sinDato} ejemplares`;
  /* DOS CIFRAS, NO TRES.
     Antes había una tercera baldosa, «Carbono que retiran del aire». No es
     una medición distinta de la de al lado: el CO₂ equivalente ES ese mismo
     carbono multiplicado por 3.667, la conversión de la convención
     internacional. Publicadas una junto a otra, un lector razonable suma las
     dos y cuenta dos veces la misma captura. El contrato del padrón v2 lo
     resuelve en la fuente —el carbono elemental ya no viaja al CSV— y aquí se
     refleja: se publica el CO₂ equivalente, que es la unidad en la que se
     reportan los compromisos climáticos. */
  const datos = [
    [stats.sumatoriaPrecipitacion, "L", "Lluvia que interceptan sus copas al año", 0],
    [stats.sumatoriaCO2, "kg", "CO₂ equivalente que absorben al año", 0],
  ];
  document.getElementById("listaServicios").innerHTML = datos.map(([s, u, t, d]) =>
    `<article class="servicio">
      <strong>${nf(s.valor, d)}<u>${u}</u></strong>
      <p>${t}</p>
      ${s.completo ? "" : `<span>${cobertura(s)}</span>`}
    </article>`).join("");

  const incompletos = datos.filter(([s]) => !s.completo).length;
  document.getElementById("coberturaServicios").textContent = incompletos === 0
    ? `Las dos cifras están calculadas con el dato de los ${stats.totalEjemplares} ejemplares del registro.`
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

export function pintarPortada(datos) {
  const { ejemplares, stats } = datos;
  // Lo que se está viendo ahora mismo. El mapa y la capa en vivo lo consultan
  // en lugar de quedarse con la lista que recibieron al arrancar.
  DATOS_VIGENTES = datos;
  pintarRedaccion();
  pintarBosque(ejemplares);
  pintarCifras(stats, ejemplares);
  pintarCategorias(stats);
  pintarPadron(ejemplares, stats);
  pintarMapa(ejemplares);
  pintarServicios(stats);
  pintarMensajes();
  iniciarFuenteViva();
}
