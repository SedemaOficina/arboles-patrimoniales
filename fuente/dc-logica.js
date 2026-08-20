class Component extends DCLogic {
  state = {
    estado: "cargando",   // cargando | error | listo
    ejemplares: [],
    meta: null,
    stats: null,
    filtro: "",
    busqueda: "",
    mensajeError: "",
  };

  // El año en curso, leído del reloj: escrito a mano se desfasa cada 1.º de enero.
  /* Testigo que el ensamblador sustituye por el archivo de ficha publicado.
     Sin él, el enlace solo cambiaba el hash y no navegaba a ningún lado. */
  RUTA_FICHA = "__FICHA__";

  ANIO = new Date().getFullYear();
  LIENZO_BOSQUE = 240;
  ANCHO_CARRIL = 92;  // ancho máximo de copa en la hilera de la portada

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

  CATEGORIA = {
    CENTENARIO: { titulo: "Centenario", plural: "Centenarios", llave: "centenarios", dorada: false,
      texto: "Rebasó los cien años de vida. Germinó cuando la ciudad todavía cabía dentro de sus canales." },
    HISTORICO: { titulo: "Histórico", plural: "Históricos", llave: "historicos", dorada: true,
      texto: "Está ligado a un hecho, una persona o un lugar que la ciudad recuerda. Su valor no está solo en el árbol." },
    NOTABLE: { titulo: "Notable", plural: "Notables", llave: "notables", dorada: false,
      texto: "Destaca por su tamaño, su porte o su especie frente a cualquier otro ejemplar de la ciudad." },
    SINGULAR: { titulo: "Singular", plural: "Singulares", llave: "singulares", dorada: true,
      texto: "No hay otro igual: una forma, una rareza o una condición que no se repite en el arbolado urbano." },
  };

  componentDidMount() { this.cargar(false); }

  componentDidUpdate() { this.montarMapa(); }

  /* El mapa se monta sobre el DOM ya pintado y una sola vez: Leaflet administra
     su propio árbol y no debe reconstruirse en cada render. */
  montarMapa() {
    if (this._mapaListo || this.state.estado !== "listo" || !this._MAPA) return;
    const lienzo = document.getElementById("mapaLienzo");
    const lista = document.getElementById("mapaLista");
    const filtros = document.getElementById("mapaFiltros");
    if (!lienzo || !lista || !filtros) return;
    this._mapaListo = true;
    const panel = document.getElementById("mapaPanel");
    this._api = this._MAPA.crearMapa({ contenedor: lienzo, lista, filtros, panel, ejemplares: this.state.ejemplares });
    const limpiar = panel && panel.querySelector("[data-panel-limpiar]");
    if (limpiar) limpiar.addEventListener("click", () => this._api.limpiarSeleccion());
  }

  async cargar(forzar) {
    this.setState({ estado: "cargando" });
    try {
      const M = await import("./assets/js/patrimoniales-loader.js");
      this._M = M;
      try { this._S = await import("./assets/js/especies.js"); } catch (e) { this._S = null; }
      try { (await import("./assets/js/menu.js")).activarMenu(); } catch (e) { /* el menú es mejora, no requisito */ }
      try { this._MAPA = await import("./assets/js/mapa.js"); } catch (e) { this._MAPA = null; }
      const { ejemplares, meta } = await M.loadPatrimoniales({ forceRefresh: forzar });
      this.setState({ estado: "listo", ejemplares, meta, stats: M.getStats(ejemplares) });
    } catch (err) {
      this.setState({
        estado: "error",
        mensajeError: (err && err.message) ||
          "No fue posible leer el registro de árboles patrimoniales. Inténtalo de nuevo en unos minutos.",
      });
    }
  }

  // ---------- utilidades ----------
  nf(n, dec) {
    if (n === null || n === undefined || !isFinite(n)) return "—";
    return Number(n).toLocaleString("es-MX", { maximumFractionDigits: dec == null ? 0 : dec });
  }
  capitular(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /** Minúsculas sin acentos: la base de cualquier comparación de texto. */
  norm(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

  /* La descarga de datos abiertos salió del navegador: los archivos se
     generan al construir el sitio —construir/armar-datos.js— y se enlazan
     desde la página de Recursos, con dirección propia y citable. */
  germinacion(e) { return e.edadEstimada == null ? null : this.ANIO - Math.round(e.edadEstimada); }

  escala(ejemplares) {
    const anios = ejemplares.map((e) => this.germinacion(e)).filter((a) => a !== null);
    if (!anios.length) return null;
    const inicio = Math.floor(Math.min(...anios) / 50) * 50;
    const fin = this.ANIO;
    return { inicio, fin, pos: (a) => (((a - inicio) / (fin - inicio)) * 100).toFixed(2) + "%" };
  }

  // ---------- render ----------
  renderVals() {
    const { estado, ejemplares, meta, stats, filtro, busqueda, mensajeError } = this.state;
    const base = {
      estaCargando: estado === "cargando",
      hayError: estado === "error",
      estaListo: estado === "listo",
      mensajeError,
      alReintentar: () => this.cargar(true),
    };
    if (estado !== "listo" || !stats) {
      return { ...base, entradaPortada: "", ctaPadron: "", tituloPadron: "", entradaServicios: "",
        cifras: [], categorias: [], filtros: [], fichas: [], servicios: [],
        busqueda: "", hayBusqueda: false, conteoListado: "", listadoVacio: false,
        coberturaServicios: "", notas: [], procedencia: "", hayAvisoDato: false, avisoDato: "", hayGuiaMapa: false };
    }

    const d = ejemplares;
    const n = stats.totalEjemplares;
    const esc = this.escala(d);

    // --- el bosque a escala: la altura es el único dato completo en el registro ---
    const conAltura = d.filter((x) => x.morfologia.altura_m != null)
      .sort((a, b) => b.morfologia.altura_m - a.morfologia.altura_m);
    const topeAlt = conAltura.length ? conAltura[0].morfologia.altura_m : 0;
    const pxAlt = (m) => (m / topeAlt) * this.LIENZO_BOSQUE;
    const bosque = conAltura.map((x) => {
      const h = pxAlt(x.morfologia.altura_m);
      const sil = this._S ? this._S.siluetaPlana(x.especie, h, x.morfologia.extensionCopa_m, x.morfologia.altura_m) : null;
      const ilu = sil && sil.ilustracion ? sil.ilustracion : null;
      const razonIlu = ilu && this._S ? (this._S.PROPORCION_ILUSTRACION[sil.clave] || 1) : 1;
      return {
        enlace: `${this.RUTA_FICHA}#ficha-${x.slug}`,
        nombre: x.nombreAsignado || "Sin nombre",
        detalle: x.nombreComun || x.especie || "",
        accesible: `${x.nombreAsignado || "Ejemplar"}, ${this.nf(x.morfologia.altura_m, 1)} metros`,
        alto: this.nf(x.morfologia.altura_m, 1) + " m",
        silueta: sil || {},
        ilustracion: ilu || "",
        hayIlustracion: Boolean(ilu),
        haySilueta: Boolean(sil) && !ilu,
        anchoIlu: (h * razonIlu).toFixed(1) + "px",
        altoIlu: h.toFixed(1) + "px",
        // La ranura se mide del dibujo, no de un ancho fijo: la ilustracion
        // crece con la altura real y a 30 m se metia encima de los vecinos.
        anchoRanura: Math.max(132, Math.ceil(ilu ? h * razonIlu : (sil && sil.ancho) || 0)) + "px",
        alcaldia: x.alcaldia || "",
        siluetaBase: Boolean(sil && sil.tieneBase),
        siluetaRaices: Boolean(sil && sil.tieneRaices),
      };
    });
    const edadesConocidas = d.map((x) => x.edadEstimada).filter((x) => x != null).sort((a, b) => b - a);
    const sinAltura = d.length - conAltura.length;

    // El eje del tiempo de la portada se retiró; `esc` sobrevive porque las
    // fichas del listado colocan cada ejemplar sobre esa misma escala.
    // --- cifras ---
    const cifras = [
      { valor: String(stats.totalAlcaldias), etiqueta: "Alcaldías" },
      { valor: String(stats.totalEspecies), etiqueta: "Especies" },
      { valor: stats.edadMaxima == null ? "—" : this.nf(stats.edadMaxima), etiqueta: "Años del más antiguo" },
      { valor: stats.alturaMaxima == null ? "—" : this.nf(stats.alturaMaxima, 1) + " m", etiqueta: "El más alto" },
    ];

    // --- categorías ---
    const categorias = Object.keys(this.CATEGORIA).map((clave) => {
      const c = this.CATEGORIA[clave];
      const cuenta = stats.totalPorCategoria[c.llave] || 0;
      return {
        clase: "categoria" + (c.dorada ? " categoria--dorada" : ""),
        titulo: c.titulo, texto: c.texto,
        cuenta: `${cuenta} ${cuenta === 1 ? "ejemplar" : "ejemplares"}`,
      };
    });

    // --- listado ---
    const orden = [...d].sort((a, b) => (b.morfologia.altura_m ?? -1) - (a.morfologia.altura_m ?? -1));
    const presentes = Object.keys(this.CATEGORIA).filter((c) => d.some((e) => e.categorias.includes(c)));
    const filtros = [{ clave: "", etiqueta: "Todos" }]
      .concat(presentes.map((c) => ({ clave: c, etiqueta: this.CATEGORIA[c].plural })))
      .map((f) => ({ ...f, activo: filtro === f.clave, alElegir: () => this.setState({ filtro: f.clave }) }));

    // Búsqueda sin acentos ni mayúsculas: "coyoacan" encuentra "Coyoacán".
    const q = this.norm(busqueda || "");
    const porCategoria = filtro ? orden.filter((e) => e.categorias.includes(filtro)) : orden;
    const lista = q
      ? porCategoria.filter((e) => this.norm([e.nombreAsignado, e.especie, e.nombreComun, e.alcaldia,
          e.ubicacion && e.ubicacion.colonia, e.ubicacion && e.ubicacion.calle,
          ...(e.categorias || [])].filter(Boolean).join(" ")).indexOf(q) >= 0)
      : porCategoria;
    const fichas = lista.map((e) => {
      const a = this.germinacion(e);
      const foto = (e.fotos && e.fotos.length) ? e.fotos[0] : null;
      return {
        enlace: `${this.RUTA_FICHA}#ficha-${e.slug}`,
        hayFoto: Boolean(foto),
        urlFoto: foto ? foto.url : "",
        claseRetrato: "ficha__retrato" + (foto ? " ficha__retrato--foto" : ""),
        edad: e.morfologia.altura_m == null ? "—" : this.nf(e.morfologia.altura_m, 1) + " m",
        pieEdad: e.edadEstimada != null ? `${this.nf(e.edadEstimada)} años estimados` : (e.nombreComun || "Altura total"),
        nombre: e.nombreAsignado || "Sin nombre asignado",
        especie: e.especie || "Especie por determinar",
        meta: (e.alcaldia || "Ubicación por determinar") + (e.ubicacion.tipo ? ` · ${e.ubicacion.tipo}` : ""),
        etiquetas: e.categorias.length
          ? e.categorias.map((c) => {
              const def = this.CATEGORIA[c];
              return { clase: "etiqueta" + (def && def.dorada ? " etiqueta--dorada" : ""), texto: def ? def.titulo : c };
            })
          : [(() => {
              const dd = this.SITUACION_CATEGORIA[e.situacionCategoria] || this.SITUACION_CATEGORIA.pendiente;
              return { clase: dd.clase, texto: dd.etiqueta, titulo: dd.explicacion };
            })()],
      };
    });

    // --- alcaldías ---
    // --- servicios ambientales ---
    const defs = [
      [stats.sumatoriaPrecipitacion, "L", "Lluvia que interceptan sus copas al año", 0],
      [stats.sumatoriaCO2, "kg", "CO₂ equivalente que absorben al año", 0],
      [stats.sumatoriaCarbono, "kg", "Carbono que retiran del aire cada año", 0],
    ];
    const servicios = defs.map(([s, unidad, texto, dec]) => ({
      valor: this.nf(s.valor, dec), unidad, texto,
      incompleto: !s.completo,
      cobertura: `Calculado sobre ${s.conDato} de ${s.conDato + s.sinDato} ejemplares`,
    }));
    const incompletos = servicios.filter((s) => s.incompleto).length;

    // --- pie ---
    const origen = {
      csv: "Datos leídos en vivo del registro oficial.",
      cache: "Datos del registro oficial, guardados en tu navegador durante la última hora.",
      "cache-stale": "El registro oficial no respondió. Se muestran los últimos datos disponibles.",
    }[meta.origen] || "";

    return {
      ...base,
      // La redacción no depende del tamaño del listado: el registro crece con cada
      // declaratoria y el sitio no debe reescribirse —ni desmentirse— por eso.
      entradaPortada: "Los árboles patrimoniales de la Ciudad de México están declarados patrimonio vivo. Llevan aquí más tiempo que las calles que los rodean.",
      ctaPadron: "Conoce el listado",
      tituloPadron: "Los árboles patrimoniales",
      entradaServicios: "Cada año, los árboles patrimoniales retienen carbono, interceptan lluvia, evitan que el agua corra por el asfalto y limpian el aire. Las cifras se calculan con i-Tree, la herramienta del Servicio Forestal de Estados Unidos, a partir de las medidas tomadas en campo de cada ejemplar.",
      enlaceMetodologia: "__RECURSOS__#metodologia",
      hayGuiaMapa: d.filter((x) => x.coords).length !== n,
      guiaMapa: (() => {
        const cc = d.filter((x) => x.coords).length;
        // Sin faltantes no hay nada que advertir: el mapa se explica solo.
        return cc === n ? ""
          : `${cc} ejemplares tienen coordenadas capturadas. Los demás aparecen en el listado con su domicilio.`;
      })(),
      hayBosque: conAltura.length > 0,
      bosque,
      bosqueRango: conAltura.length
        ? `${this.nf(conAltura[conAltura.length - 1].morfologia.altura_m, 1)} — ${this.nf(topeAlt, 1)} m` : "",
      bosqueNota: `Cada silueta está dibujada con la altura real medida en campo${sinAltura ? `; ${sinAltura} sin medir` : ""}.`,
      cifras, categorias, filtros, fichas, servicios,
      busqueda: busqueda || "",
      hayBusqueda: Boolean(busqueda),
      conteoListado: (filtro || q) ? `${lista.length} ${lista.length === 1 ? "ejemplar" : "ejemplares"} de ${orden.length}` : "",
      listadoVacio: lista.length === 0,
      alBuscar: (ev) => this.setState({ busqueda: ev && ev.target ? ev.target.value : "" }),
      alBorrarBusqueda: () => this.setState({ busqueda: "" }),
      coberturaServicios: incompletos === 0
        ? `Las cuatro cifras están calculadas con el dato de los ${n} ejemplares del registro.`
        : "Algunas cifras se calculan con menos ejemplares de los que integran el registro; cada tarjeta lo indica.",
      hayAvisoDato: !!meta.degradado,
      avisoDato: (meta.alertas || []).filter((a) => a.indexOf("No fue posible actualizar") === 0)[0] || "",
    };
  }
}
