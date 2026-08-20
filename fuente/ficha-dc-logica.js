class Component extends DCLogic {
  state = { estado: "cargando", ejemplares: [], meta: null, slug: "", mensajeError: "", foto: 0 };

  // El año en curso, leído del reloj: escrito a mano se desfasa cada 1.º de enero.
  LIMITES_CDMX = [[18.98, -99.43], [19.66, -98.87]];

  ALTURA_PERSONA = 1.70;

  /* Clave del API de Google Maps Embed. Con clave se usa el servicio oficial;
     sin ella, el sitio recurre al incrustado público de Street View. */
  CLAVE_MAPS = "";

  CATEGORIA = {
    CENTENARIO: { titulo: "Centenario", dorada: false },
    HISTORICO:  { titulo: "Histórico",  dorada: true },
    NOTABLE:    { titulo: "Notable",    dorada: false },
    SINGULAR:   { titulo: "Singular",   dorada: true },
  };
  SITUACION_CATEGORIA = {
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

  BUENA = ["buena", "muy buena", "excelente", "sana"];
  MEDIA = ["regular", "media", "susceptible de mejora"];

  componentDidMount() {
    this.cargar(false);
    this._alCambiarHash = () => { this.setState({ slug: this.slugDeURL(), foto: 0 }); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", this._alCambiarHash);
  }
  componentWillUnmount() {
    window.removeEventListener("hashchange", this._alCambiarHash);
    if (this._mapa) { this._mapa.remove(); this._mapa = null; }
  }
  componentDidUpdate() { this.montarMapa(); }

  /** Mapa del recuadro «Cómo llegar»: un solo punto, el del ejemplar.
   *  Se vuelve a montar en cada ficha porque cambia el centro; Leaflet revienta
   *  si se le pide construir dos veces sobre el mismo nodo, de ahí el remove().
   *  La rueda del ratón no hace zoom: es un recuadro chico en una página larga. */
  montarMapa() {
    if (this.state.estado !== "listo" || typeof L === "undefined") return;
    const e = this.ejemplarActual();
    const lienzo = document.getElementById("fichaMapa");
    if (!lienzo) return;
    const clave = e && e.coords ? `${e.slug}:${e.coords.lat},${e.coords.lng}` : "";
    if (!clave) { if (this._mapa) { this._mapa.remove(); this._mapa = null; this._mapaClave = ""; } return; }
    if (this._mapaClave === clave) return;
    if (this._mapa) { this._mapa.remove(); this._mapa = null; }
    lienzo.innerHTML = "";
    this._mapaClave = clave;
    const centro = [e.coords.lat, e.coords.lng];
    this._mapa = L.map(lienzo, { center: centro, zoom: 17, scrollWheelZoom: false,
      zoomControl: true, attributionControl: false,
      maxBounds: L.latLngBounds(this.LIMITES_CDMX), maxBoundsViscosity: 0.85, minZoom: 10 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(this._mapa);
    // Mismo recorte que el mapa general de la portada.
    if (this._GEO) {
      L.geoJSON(this._GEO, { interactive: false,
        style: (f) => f.properties && f.properties.clase === "contorno"
          ? { color: "#8D4992", weight: 1.5, opacity: 0.75, fill: false }
          : { color: "transparent", weight: 0, fillColor: "#FEF7E4", fillOpacity: 0.82 },
      }).addTo(this._mapa);
    }
    L.marker(centro, { icon: L.divIcon({ className: "", iconSize: [26, 26], iconAnchor: [13, 13],
      html: '<div class="pin pin--ficha"></div>' }),
      title: e.nombreAsignado || "Ejemplar patrimonial",
      alt: `Ubicación de ${e.nombreAsignado || "el ejemplar"}` }).addTo(this._mapa);
    setTimeout(() => this._mapa && this._mapa.invalidateSize(), 60);
  }

  slugDeURL() {
    const h = (typeof location !== "undefined" && location.hash) || "";
    return h.indexOf("#ficha-") === 0 ? h.slice(7) : "";
  }

  async cargar(forzar) {
    this.setState({ estado: "cargando" });
    try {
      const M = await import("./assets/js/patrimoniales-loader.js");
      this._M = M;
      try { this._S = await import("./assets/js/especies.js"); } catch (e) { this._S = null; }
      try { this._GEO = (await import("./assets/js/geo-cdmx.js")).GEO_CDMX; } catch (e) { this._GEO = null; }
      try { (await import("./assets/js/menu.js")).activarMenu(); } catch (e) { /* el menú es mejora, no requisito */ }
      const { ejemplares, meta } = await M.loadPatrimoniales({ forceRefresh: forzar });
      this.setState({ estado: "listo", ejemplares, meta, slug: this.slugDeURL(), foto: 0 });
    } catch (err) {
      this.setState({ estado: "error", mensajeError: (err && err.message) ||
        "No fue posible leer el registro de árboles patrimoniales." });
    }
  }

  // ---------- utilidades ----------
  nf(n, dec) {
    if (n === null || n === undefined || !isFinite(n)) return null;
    return Number(n).toLocaleString("es-MX", { maximumFractionDigits: dec == null ? 0 : dec });
  }
  norm(s) { return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  fila(k, v) { return { clave: k, valor: v || "Sin determinar" }; }

  /** El ejemplar que se está viendo. Misma regla que renderVals: el del hash,
   *  y si no existe, el primero del registro. */
  ejemplarActual() {
    const { estado, ejemplares, slug } = this.state;
    if (estado !== "listo" || !ejemplares || !ejemplares.length) return null;
    return ejemplares.filter((x) => x.slug === slug)[0] || ejemplares[0];
  }

  /** Dirección del panorama de vista de calle para unas coordenadas. */
  urlVistaCalle(coords, encuadre) {
    // Un panorama elegido a mano manda sobre cualquier encuadre automático.
    if (encuadre && encuadre.tipo === "panorama") return encuadre.url;
    if (!coords) return null;
    const rumbo = encuadre && encuadre.tipo === "rumbo" ? encuadre.rumbo : 0;
    if (this.CLAVE_MAPS) {
      const p = new URLSearchParams({ key: this.CLAVE_MAPS, location: `${coords.lat},${coords.lng}`,
        fov: "90", pitch: "10", heading: String(rumbo) });
      return `https://www.google.com/maps/embed/v1/streetview?${p.toString()}`;
    }
    return `https://maps.google.com/maps?q=&layer=c&cbll=${coords.lat},${coords.lng}&cbp=11,${rumbo},0,0,0&output=svembed`;
  }

  renderVals() {
    const { estado, ejemplares, meta, slug, mensajeError, foto } = this.state;
    const base = {
      estaCargando: estado === "cargando", hayError: estado === "error", estaListo: estado === "listo",
      mensajeError, alReintentar: () => this.cargar(true),
    };
    const vacio = {
      nombre: "", binomio: "", comun: "", hayComun: false, etiquetas: [], resumen: [],
      notaCategoria: "", hayNotaCategoria: false,
      hayAltura: false, sinAltura: false, sinAlturaTexto: "", reglas: [], arbol: {}, persona: {}, escalaPie: "",
      medidas: [], permanencia: [], domicilio: "", ubicacion: [], hayCoords: false, sinCoords: false,
      coordNota: "", enlaceMapa: "", mapaPie: "", grupos: [], taxonomia: [], enlaces: [],
      procedencia: [], esExotica: false, notaExotica: "", hayDecreto: false, sinDecreto: false, enlaceDecreto: "", hayObservaciones: false, observaciones: "",
      avisoDato: "", hayAvisoDato: false,
      hayFotos: false, sinFotos: false, fotos: [], fotoActual: {}, variasFotos: false,
      guiaGaleria: "", pieFoto: "", creditoFoto: "", contadorFoto: "",
      silueta: {}, haySilueta: false, hayIlustracionEspecie: false, siluetaBase: false, siluetaRaices: false, especieSilueta: "",
      hayVistaCalle: false, urlVistaCalle: "", avisoVistaCalle: "", pieVistaCalle: "",
    };
    if (estado !== "listo" || !ejemplares.length) return { ...base, ...vacio };

    const todos = ejemplares;
    const e = todos.filter((x) => x.slug === slug)[0] || todos[0];

    // --- encabezado ---
    const etiquetas = e.categorias.length
      ? e.categorias.map((c) => {
          const d = this.CATEGORIA[c];
          return { clase: "etiqueta" + (d && d.dorada ? " etiqueta--dorada" : ""), texto: d ? d.titulo : c };
        })
      : [(() => {
          const dd = this.SITUACION_CATEGORIA[e.situacionCategoria] || this.SITUACION_CATEGORIA.pendiente;
          return { clase: dd.clase, texto: dd.etiqueta };
        })()];
    const notaCategoria = e.categorias.length
      ? ""
      : (this.SITUACION_CATEGORIA[e.situacionCategoria] || this.SITUACION_CATEGORIA.pendiente).explicacion;
    // Solo entran datos completos para los trece ejemplares. La edad estimada
    // y lo que se deriva de ella salieron: en once de trece eran guiones.
    const m = e.morfologia;
    const resumen = [
      [this.nf(m.altura_m, 1) ? this.nf(m.altura_m, 1) + " m" : "—", "Altura total"],
      [this.nf(m.diametro_cm) ? this.nf(m.diametro_cm) + " cm" : "—", "Diámetro del tronco"],
      [this.nf(m.extensionCopa_m, 1) ? this.nf(m.extensionCopa_m, 1) + " m" : "—", "Extensión de copa"],
      [e.alcaldia || "—", "Alcaldía"],
    ].map(([valor, etiqueta]) => ({ valor, etiqueta, clase: String(valor).length > 9 ? "largo" : "" }));


    // --- escala de altura ---
    const alt = e.morfologia.altura_m;
    const copa = e.morfologia.extensionCopa_m || e.morfologia.anchoCopa_m;
    const tope = Math.max(Math.ceil((alt || 10) / 5) * 5, 10);
    const px = (m) => (m / tope) * 360;
    const reglas = [];
    for (let m = 5; m <= tope; m += 5) reglas.push({ abajo: px(m).toFixed(1) + "px", etiqueta: `${m} m` });
    const altoCopa = alt == null ? 0 : px(alt) * 0.62;
    const arbol = alt == null ? {} : {
      ancho: (copa ? Math.min(Math.max((copa / tope) * 360, 54), 190) : 118).toFixed(0) + "px",
      altoCopa: altoCopa.toFixed(1) + "px",
      altoTronco: (px(alt) - altoCopa).toFixed(1) + "px",
    };

    // --- medidas ---
    const medidas = [
      ["Altura total", e.morfologia.altura_m, "m"],
      ["Diámetro del tronco (DAP)", e.morfologia.diametro_cm, "cm"],
      ["Circunferencia del tronco", e.morfologia.circunferencia_cm, "cm"],
      ["Ancho de copa, eje mayor", e.morfologia.anchoCopa_m, "m"],
      ["Largo de copa, eje menor", e.morfologia.largoCopa_m, "m"],
      ["Extensión promedio de copa", e.morfologia.extensionCopa_m, "m"],
    ].map(([texto, v, unidad]) => {
      const val = this.nf(v, 1);
      return { texto, valor: val || "Sin medir", unidad: val ? unidad : "", clase: "medida" + (val ? "" : " medida--vacia") };
    });

    // Expectativa de vida y categoría UICN cierran la tabla de medidas:
    // son texto, no métrica, y por eso llevan su propia clase.
    const permanencia = [
      ["Expectativa de vida", e.expectativaVida],
      ["Categoría de riesgo UICN *", e.conservacion.iucn],
    ].map(([rotulo, valor]) => ({ rotulo, valor: valor || "Sin determinar",
      clase: "medida medida--texto" + (valor ? "" : " medida--vacia") }));

    // --- ubicación ---
    const u = e.ubicacion;
    const domicilio = [[u.calle, u.numero].filter(Boolean).join(" "),
      [u.colonia ? `colonia ${u.colonia}` : null, u.cp ? `C.P. ${u.cp}` : null, e.alcaldia].filter(Boolean).join(", ")]
      .filter(Boolean).join(", ") || "Domicilio por capturar";
    const ubicacion = [
      this.fila("Entre calles", u.entreCalles.length ? u.entreCalles.join(" y ") : null),
      this.fila("Referencias", u.referencias),
      this.fila("Tipo de ubicación", u.tipo),
      this.fila("Coordenadas UTM WGS 84", e.utm),
    ];

    // --- galería fotográfica ---
    const fotos = e.fotos || [];
    const iFoto = Math.min(Math.max(foto || 0, 0), Math.max(fotos.length - 1, 0));
    const actual = fotos[iFoto] || {};
    const listaFotos = fotos.map((f, i) => ({
      url: f.url, alt: f.alt || "", indice: i, activa: i === iFoto,
      etiqueta: `Ver fotografía ${i + 1} de ${fotos.length}`,
      alElegir: () => this.setState({ foto: i }),
    }));

    // --- silueta de respaldo, cuando no hay fotografía ---
    let sil = {}, haySil = false;
    if (!fotos.length && this._S) {
      sil = this._S.siluetaPlana(e.especie, 230, e.morfologia.extensionCopa_m, e.morfologia.altura_m);
      haySil = true;
    }

    // --- vista de calle ---
    const urlVC = this.urlVistaCalle(e.coords, e.vistaCalle);
    const panoramaPropio = Boolean(e.vistaCalle && e.vistaCalle.tipo === "panorama");

    // --- servicios i-Tree ---
    const s = e.serviciosAmbientales;
    const grupos = [
      ["Clima y carbono", [
        ["Carbono que retira del aire", s.carbonoSecuestrado_kg, "kg/año"],
        ["CO₂ equivalente absorbido", s.co2Absorbido_kg, "kg/año"]]],
      ["Agua de lluvia", [
        ["Precipitación interceptada por la copa", s.precipitacionInterceptada_L, "L/año"],
        ["Escorrentía que evita sobre el asfalto", s.escorrentiaReducida_L, "L/año"]]],
      ["Calidad del aire", [
        ["Ozono retirado", s.ozonoEliminado_g, "g/año"],
        ["Partículas PM 2.5 retiradas", s.pm25Eliminado_g, "g/año"],
        ["Dióxido de nitrógeno retirado", s.no2Eliminado_g, "g/año"],
        ["Dióxido de azufre retirado", s.so2Eliminado_g, "g/año"],
        ["Monóxido de carbono retirado", s.coEliminado_g, "g/año"]]],
      ["Efecto sobre el consumo de energía", [
        ["Electricidad que ahorra por sombra", s.ahorroElectricidad_kWh, "kWh/año"],
        ["Dióxido de carbono", s.emisionesEvitadasCO2_kg, "kg/año"],
        ["Partículas PM 2.5", s.emisionesEvitadasPM25_g, "g/año"],
        ["Dióxido de nitrógeno", s.emisionesEvitadasNO2_g, "g/año"],
        ["Dióxido de azufre", s.emisionesEvitadasSO2_g, "g/año"],
        ["Monóxido de carbono", s.emisionesEvitadasCO_g, "g/año"]]],
    ].map(([titulo, filas], iGrupo) => {
      const mapeadas = filas.map(([texto, v, unidad]) => {
        const hay = typeof v === "number" && isFinite(v);
        const neg = hay && v < 0;
        return {
          texto, unidad: hay ? unidad : "",
          valor: hay ? this.nf(v, 0) : "Sin dato",
          negativo: neg,
          clase: "grupo__fila" + (hay ? (neg ? " grupo__fila--neg" : "") : " grupo__fila--sin"),
        };
      });
      // La nota 3 del registro: en energía, un valor negativo significa mayor consumo o emisión.
      const hayNeg = mapeadas.some((f) => f.negativo);
      const haySin = mapeadas.some((f) => f.valor === "Sin dato");
      const notas = [];
      if (haySin) notas.push('Los renglones marcados como "Sin dato" no se pudieron estimar para este ejemplar con la información disponible.');
      if (iGrupo === 3 && hayNeg) notas.push("Los valores negativos indican mayor consumo o emisión, no un ahorro: así lo reporta i-Tree cuando la sombra del árbol incrementa la demanda de calefacción.");
      return { titulo, filas: mapeadas, hayNota: notas.length > 0, notas,
        nota: notas[0] || "" };
    });

    // --- taxonomía y trazabilidad ---
    const t = e.taxonomia;
    const taxonomia = [
      this.fila("Reino", t.reino), this.fila("División o filo", t.phylum), this.fila("Clase", t.clase),
      this.fila("Orden", t.orden), this.fila("Familia", t.familia), this.fila("Género", t.genero),
      this.fila("Especie", e.especie), this.fila("Autoridad taxonómica", t.autor),
      this.fila("Nivel de prioridad", e.conservacion.prioridad),
      this.fila("Forma de crecimiento", t.formaCrecimiento),
      this.fila("Origen en la Ciudad", e.conservacion.exoticaInvasora || e.conservacion.origen),
      this.fila("Endemismo", e.conservacion.endemismo),
      this.fila("NOM-059-SEMARNAT", e.conservacion.nom059),
      this.fila("CITES", e.conservacion.cites),
      this.fila("Especie prioritaria", e.conservacion.prioritaria),
    ];
    const enlaces = [["Ejemplar en el SNIB", e.urlSNIB], ["Fuente del registro", e.urlOrigen], ["Cálculo i-Tree", e.linkITree]]
      .map(([texto, url]) => ({ texto: url ? texto : `${texto} no disponible`, url: url || "#", hay: !!url,
        clase: url ? "enlace" : "enlace enlace--apagado" }));
    const procedencia = [
      this.fila("Nominado por", e.nominadoPor), this.fila("Fecha de nominación", e.fechaNominacion && e.fechaNominacion.legible),
      this.fila("Fecha del decreto", e.fechaDecreto && e.fechaDecreto.legible), this.fila("Identificador en el registro", e.id),
    ];

    return {
      ...base,
      nombre: e.nombreAsignado || "Ejemplar sin nombre asignado",
      binomio: e.especie || "Especie por determinar",
      hayComun: !!e.nombreComun,
      comun: e.nombreComun ? e.nombreComun.toLowerCase() : "",
      alImprimir: () => window.print(),
      etiquetas, resumen,
      notaCategoria, hayNotaCategoria: Boolean(notaCategoria),
      hayAltura: alt != null,
      sinAltura: alt == null,
      sinAlturaTexto: "Este ejemplar aún no tiene altura medida en campo.",
      reglas, arbol, persona: { alto: px(this.ALTURA_PERSONA).toFixed(1) + "px" },
      escalaPie: alt == null
        ? "La ilustración se dibuja a partir de la altura registrada en campo."
        : `Ilustración dibujada a la altura de ${this.nf(alt, 1)} m registrada en campo. La figura humana mide 1.70 m y da la referencia de escala. La anchura corresponde al porte típico de la especie, no a la copa de este ejemplar, cuyas medidas están en la tabla.`,
      medidas, permanencia, domicilio, ubicacion,
      hayCoords: !!e.coords,
      sinCoords: !e.coords,
      // Solo se usa cuando no hay coordenadas: con ellas, el recuadro dibuja
      // el mapa y no hace falta explicar nada.
      coordNota: e.coords ? ""
        : "Este ejemplar aún no tiene coordenadas capturadas en el registro. Ubícalo con el domicilio y las referencias.",
      enlaceMapa: e.coords
        ? `https://www.google.com/maps/search/?api=1&query=${e.coords.lat},${e.coords.lng}` : "#",
      mapaPie: e.coords
        ? "Toca el mapa para acercarte. Cartografía base © colaboradores de OpenStreetMap." : "",
      grupos,
      taxonomia, enlaces, procedencia,
      esExotica: Boolean(e.conservacion.esExotica),
      notaExotica: "Esta especie no es originaria de la Cuenca de México. Su declaratoria patrimonial responde al valor del ejemplar concreto —su porte, su historia o su papel en el barrio— y no modifica el criterio de la Ciudad, que privilegia especies nativas en las nuevas plantaciones.",
      hayDecreto: !!e.linkDecreto, sinDecreto: !e.linkDecreto, enlaceDecreto: e.linkDecreto || "#",
      hayObservaciones: !!e.observaciones, observaciones: e.observaciones || "",
      hayFotos: fotos.length > 0,
      sinFotos: fotos.length === 0,
      variasFotos: fotos.length > 1,
      fotos: listaFotos,
      fotoActual: { url: actual.url || "", alt: actual.alt || "", fondo: actual.url ? `url('${actual.url}')` : "none" },
      contadorFoto: fotos.length > 1 ? `${iFoto + 1} / ${fotos.length}` : "",
      pieFoto: actual.pie || "",
      creditoFoto: actual.credito ? `Fotografía: ${actual.credito}` : "",
      // Cuando hay fotos, hablan solas: la guía solo sirve para explicar su ausencia.
      guiaGaleria: fotos.length === 0
        ? "Este ejemplar aún no tiene fotografías en el registro. La ilustración corresponde a su especie y está dibujada a la altura medida en campo."
        : "",
      silueta: sil, haySilueta: haySil && !sil.hayIlustracion,
      hayIlustracionEspecie: Boolean(haySil && sil.hayIlustracion),
      siluetaBase: Boolean(sil.tieneBase), siluetaRaices: Boolean(sil.tieneRaices),
      especieSilueta: haySil ? `${sil.nombre}` : "",
      hayVistaCalle: Boolean(urlVC),
      urlVistaCalle: urlVC || "",
      avisoVistaCalle: "Sin coordenadas capturadas, no es posible mostrar la vista desde la calle de este ejemplar.",
      pieVistaCalle: panoramaPropio
        ? "Panorama de Google Street View encuadrado sobre el ejemplar. La imagen puede corresponder a una fecha anterior al dictamen y no sustituye la verificación en campo."
        : "Panorama de Google Street View sobre las coordenadas registradas. La imagen puede corresponder a una fecha anterior al dictamen y no sustituye la verificación en campo.",
      hayAvisoDato: !!(meta && meta.degradado),
      avisoDato: meta && meta.degradado
        ? ((meta.alertas || []).filter((a) => a.indexOf("No fue posible actualizar") === 0)[0] || "") : "",
    };
  }
}
