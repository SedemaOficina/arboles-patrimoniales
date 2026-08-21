/**
 * LECTOR DEL PADRÓN v2
 * ---------------------------------------------------------------------------
 * Convierte el CSV publicado de la hoja «Salida_Publica» en la misma estructura
 * {ejemplares, meta, stats} que hoy consume el sitio, para que el cambio de
 * fuente sea un reemplazo y no una reescritura.
 *
 * NO SE CONECTA A NADA. No pide la red, no toca el DOM, no lee localStorage.
 * Recibe texto y devuelve datos. Esa es toda su superficie, y es a propósito:
 * la fase que lo conecta es otra, y hasta entonces este archivo se puede
 * romper sin tirar el sitio.
 *
 * Las reglas no viven aquí: viven en datos/contrato-v2.json, que es el
 * documento que el área de datos revisa. Este archivo las aplica.
 */

/* ── 1 · El analizador de CSV ──────────────────────────────────────────────
   Escrito a mano, treinta líneas, sin dependencia de CDN. El CSV del padrón
   trae comas dentro de las comillas («Ten., 1853»), comillas dobladas dentro
   de los textos («Colectivo ""Los Guardianes"", A.C.») y saltos de línea
   dentro de las observaciones. Las tres cosas son RFC 4180 y las tres se
   prueban en las aserciones. */
export function analizarCSV(texto) {
  const s = String(texto || "").replace(/^\uFEFF/, "");
  const filas = [];
  let fila = [], campo = "", entreComillas = false, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (entreComillas) {
      if (c === '"') {
        if (s[i + 1] === '"') { campo += '"'; i += 2; continue; }
        entreComillas = false; i++; continue;
      }
      campo += c; i++; continue;
    }
    if (c === '"') { entreComillas = true; i++; continue; }
    if (c === ",") { fila.push(campo); campo = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; i++; continue; }
    campo += c; i++;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  // Una última fila de un solo campo vacío es el salto final del archivo.
  return filas.filter((f) => !(f.length === 1 && f[0].trim() === ""));
}

/* ── 2 · Limpieza de valores ───────────────────────────────────────────── */

/** Vacío, espacios en blanco y los marcadores de nulo del padrón dan null. */
export function limpiar(v) {
  const t = String(v == null ? "" : v).trim();
  if (!t) return null;
  if (/^(n\/?a|s\/?d|sin dato|sin determinar|-{1,2}|\.)$/i.test(t)) return null;
  return t;
}

/**
 * Número tolerante. Hoy la hoja entrega «1240.50» en crudo, pero el CSV se
 * exporta con el valor MOSTRADO: basta que alguien reformatee una columna en
 * Sheets para que vuelva «1,240.50», y Number() de eso es NaN. La limpieza se
 * queda como defensa permanente, no como parche de un defecto ya corregido.
 */
export function aNumero(v) {
  const t = limpiar(v);
  if (t === null) return null;
  const n = Number(t.replace(/\s/g, "").replace(/,(?=\d{3}\b)/g, "").replace(/[^\d.eE+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

/**
 * Fecha tolerante a las tres formas que la hoja sabe entregar:
 *   aaaa-mm-dd  · la de hoy, ISO
 *   dd/mm/aaaa  · la que salía antes de corregir el formato
 *   46249       · número de serie de la hoja de cálculo
 * Devuelve la misma forma de objeto que usa el registro v1.
 */
export function aFecha(v) {
  const t = limpiar(v);
  if (t === null) return null;
  let a, m, d;
  let mm;
  if ((mm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) {
    [, a, m, d] = mm;
  } else if ((mm = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t))) {
    [, d, m, a] = mm;
  } else if (/^\d{5}(\.0+)?$/.test(t)) {
    // Serie de la hoja: día 1 = 31/dic/1899, y la hoja hereda de Lotus el
    // 29 de febrero de 1900 que nunca existió; por eso el ajuste de dos días.
    const ms = (Number(t) - 25569) * 86400000;
    const f = new Date(ms);
    a = f.getUTCFullYear(); m = f.getUTCMonth() + 1; d = f.getUTCDate();
  } else {
    return { texto: t, iso: null, legible: t, anio: null, sospechosa: true };
  }
  a = Number(a); m = Number(m); d = Number(d);
  if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) {
    return { texto: t, iso: null, legible: t, anio: null, sospechosa: true };
  }
  const p = (n) => String(n).padStart(2, "0");
  return {
    texto: t,
    iso: `${a}-${p(m)}-${p(d)}`,
    legible: `${d} de ${MESES[m - 1]} de ${a}`,
    anio: a,
  };
}

/** SÍ/NO del padrón a booleano. Cualquier otra cosa es null, no false. */
export function aSiNo(v) {
  const t = limpiar(v);
  if (t === null) return null;
  if (/^s[ií]$/i.test(t)) return true;
  if (/^no$/i.test(t)) return false;
  return null;
}

export function aSlug(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036F]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** El código postal de la Ciudad lleva cinco dígitos y conserva el cero. */
export function aCP(v) {
  const t = limpiar(v);
  if (t === null) return null;
  const d = t.replace(/\D/g, "");
  return d ? d.padStart(5, "0").slice(0, 5) : null;
}

/**
 * Street View. Llega listo para src, pero nunca se confía: se valida el
 * prefijo aquí y quien lo pinte debe crear el <iframe> por código, jamás por
 * innerHTML. Una dirección que no sea de Google Maps no se devuelve.
 */
export function aVistaCalle(v) {
  const t = limpiar(v);
  if (t === null) return null;
  const url = /<iframe/i.test(t) ? (/\bsrc\s*=\s*"([^"]+)"/i.exec(t) || [])[1] : t;
  if (!url || !/^https:\/\/www\.google\.com\/maps\/embed\?/.test(url)) return null;
  return { tipo: "panorama", url };
}

/** Del vínculo de Drive se extrae el id que va entre /d/ y la diagonal. */
export function idDeDrive(v) {
  const t = limpiar(v);
  if (t === null) return null;
  const m = /\/d\/([A-Za-z0-9_-]+)/.exec(t);
  return m ? m[1] : null;
}

/* ── 3 · De una fila del CSV a un ejemplar ─────────────────────────────── */

/**
 * El rango se cobra sobre el DATO, no sobre la FILA. Un ejemplar con la altura
 * mal capturada sigue siendo un ejemplar: se publica sin altura y el aviso
 * queda escrito con nombre y apellido para que alguien lo corrija en la hoja.
 */
function enRango(clave, n, rangos, avisos, id) {
  if (n === null) return null;
  const r = rangos && rangos[clave];
  if (!r) return n;
  if (n < r.min || n > r.max) {
    avisos.push(`${id || "sin id"} · ${clave} = ${n} queda fuera del rango ${r.min}–${r.max} (${r.de}). No se publica ese dato.`);
    return null;
  }
  return n;
}

const CATEGORIAS = [
  ["centenario", "CENTENARIO"], ["historico", "HISTORICO"],
  ["notable", "NOTABLE"], ["singular", "SINGULAR"],
];

export function construirEjemplar(f, contrato, avisos) {
  const rangos = (contrato && contrato.rangos) || {};
  const id = limpiar(f.id);
  const num = (k) => enRango(k, aNumero(f[k]), rangos, avisos, id);

  // Las banderas mandan sobre la columna concatenada: son cuatro valores de
  // catálogo, y «categorias» es su resumen. Si discrepan, gana el catálogo.
  const categorias = CATEGORIAS.filter(([k]) => aSiNo(f[k]) === true).map(([, v]) => v);
  const resumen = (limpiar(f.categorias) || "").split(/\s*,\s*/).filter(Boolean)
    .map((s) => aSlug(s).toUpperCase());
  if (resumen.length && resumen.join("|") !== categorias.join("|")) {
    avisos.push(`${id} · la columna «categorias» dice «${resumen.join(", ")}» y las banderas dicen «${categorias.join(", ") || "ninguna"}». Se publican las banderas.`);
  }

  const lat = enRango("latitud", aNumero(f.latitud), rangos, avisos, id);
  const lng = enRango("longitud", aNumero(f.longitud), rangos, avisos, id);

  // pueblo_barrio nunca llega vacío: son tres estados, y solo uno se publica.
  const pb = limpiar(f.pueblo_barrio);
  const puebloBarrio = pb && !/^(no aplica|por confirmar)$/i.test(pb) ? pb : null;

  const e = {
    id,
    consecutivo: id ? id.slice(-4) : null,          // el folio ya no viaja aparte
    codAlcaldia: id ? (id.split("-")[1] || null) : null,
    nombreAsignado: limpiar(f.nombre_asignado),
    slug: aSlug(f.nombre_asignado),
    nombreComun: limpiar(f.nombre_comun),
    especie: limpiar(f.nombre_cientifico),
    nominadoPor: limpiar(f.nomino),
    fechaNominacion: null,                          // retirado en el v2
    categorias,
    categoriaDominante: categorias[0] || null,
    situacionCategoria: categorias.length ? "asignada" : "pendiente",
    fechaDecreto: aFecha(f.fecha_decreto),
    linkDecreto: limpiar(f.drive_decreto),
    idDecretoDrive: idDeDrive(f.drive_decreto),
    alcaldia: limpiar(f.alcaldia),
    ubicacion: {
      calle: limpiar(f.calle),
      numero: limpiar(f.num_ext),
      colonia: limpiar(f.colonia),
      cp: aCP(f.cp),
      entreCalles: [limpiar(f.entre_1), limpiar(f.entre_2)].filter(Boolean),
      referencias: limpiar(f.referencias),
      tipo: limpiar(f.tipo_ubicacion),
      sueloConservacion: aSiNo(f.suelo_conservacion),
      puebloBarrio,
      puebloBarrioEstado: pb,
    },
    coords: lat !== null && lng !== null ? { lat, lng } : null,
    coordsValidas: lat !== null && lng !== null,
    utm: aNumero(f.utm_x) !== null && aNumero(f.utm_y) !== null
      ? `${limpiar(f.utm_x)}; ${limpiar(f.utm_y)}` : null,
    taxonomia: {
      reino: limpiar(f.reino), phylum: limpiar(f.phylum), clase: limpiar(f.clase),
      orden: limpiar(f.orden), familia: limpiar(f.familia), genero: limpiar(f.genero),
      autor: limpiar(f.autor), infraespecie: null,
      formaCrecimiento: limpiar(f.forma_crecimiento), ambiente: limpiar(f.ambiente),
    },
    conservacion: {
      iucn: limpiar(f.iucn), nom059: limpiar(f.nom059), cites: limpiar(f.cites),
      prioritaria: limpiar(f.prioritaria), prioridad: limpiar(f.nivel_prioridad),
      endemismo: limpiar(f.endemismo), origen: null,
      exoticaInvasora: limpiar(f.exotica_invasora),
      esExotica: /exótica|exotica/i.test(limpiar(f.exotica_invasora) || ""),
    },
    urlSNIB: limpiar(f.url_snib),
    urlOrigen: limpiar(f.url_observacion),
    morfologia: {
      altura_m: num("altura_m"),
      diametro_cm: num("dap_cm"),
      circunferencia_cm: num("circunferencia_cm"),
      anchoCopa_m: num("ancho_copa_m"),
      largoCopa_m: num("largo_copa_m"),
      extensionCopa_m: num("extension_copa_m"),
    },
    condicion: limpiar(f.condicion_general),
    estructura: limpiar(f.estructura_general),
    edadEstimada: num("edad_estimada"),
    expectativaVida: limpiar(f.expectativa_vida),
    observaciones: limpiar(f.obs_publicas),
    vistaCalle: aVistaCalle(f.street_view),
    fotos: [],                                      // viven en el repositorio
    _compuertaITree: limpiar(f.validacion_itree),
  };

  /* El bloque ambiental es todo o nada. La compuerta viaja precisamente para
     que el sitio sepa DECIR por qué no hay cifras, en lugar de callar. */
  const validado = e._compuertaITree === "Validado";
  const moneda = limpiar(f.moneda_itree);
  const cifra = (k) => (validado ? aNumero(f[k]) : null);
  e.serviciosAmbientales = {
    // Sin moneda no se publica el importe: un número sin unidad no dice nada.
    beneficioEconomico_moneda: validado && moneda ? aNumero(f.beneficio_economico) : null,
    moneda: validado ? moneda : null,
    carbonoSecuestrado_kg: null,   // retirado: se publica el CO₂ equivalente
    co2Absorbido_kg: cifra("co2_eq_kg"),
    escorrentiaReducida_L: cifra("escorrentia_l"),
    precipitacionInterceptada_L: cifra("precip_interceptada_l"),
    coEliminado_g: cifra("elim_co_g"),
    ozonoEliminado_g: cifra("elim_o3_g"),
    no2Eliminado_g: cifra("elim_no2_g"),
    so2Eliminado_g: cifra("elim_so2_g"),
    pm25Eliminado_g: cifra("elim_pm25_g"),
    ahorroElectricidad_kWh: cifra("ahorro_kwh"),
    emisionesEvitadasCO2_kg: cifra("evit_co2_kg"),
    emisionesEvitadasCO_g: cifra("evit_co_g"),
    emisionesEvitadasNO2_g: cifra("evit_no2_g"),
    emisionesEvitadasSO2_g: cifra("evit_so2_g"),
    emisionesEvitadasPM25_g: cifra("evit_pm25_g"),
  };
  e.linkITree = validado && /^https?:\/\/\S+$/i.test(limpiar(f.url_itree) || "")
    ? limpiar(f.url_itree) : null;
  e.tieneCifrasAmbientales = Object.entries(e.serviciosAmbientales)
    .some(([k, v]) => k !== "moneda" && typeof v === "number");

  if (validado && e.tieneCifrasAmbientales && !e.linkITree) {
    avisos.push(`${id} · el bloque de i-Tree está validado y trae cifras, pero sin la liga de la corrida. La cifra no se puede rastrear.`);
  }
  if (validado && aNumero(f.beneficio_economico) !== null && !moneda) {
    avisos.push(`${id} · hay beneficio económico sin moneda. No se publica el importe.`);
  }
  return e;
}

/* ── 4 · Del texto completo al registro ────────────────────────────────── */

/**
 * Única puerta de entrada. Recibe el texto del CSV y el contrato ya leído, y
 * devuelve {ejemplares, meta, stats} con la forma que el sitio ya consume.
 *
 * La compuerta del ejemplar («estado» = Publicado) la aplica la hoja, no este
 * archivo: al CSV público no llegan los no publicados. Aquí solo se descarta
 * la fila sin id, que es el filtro que el contrato declara suficiente.
 */
export function construirRegistro(texto, contrato) {
  const filas = analizarCSV(texto);
  const avisos = [];
  const descartadas = [];
  if (!filas.length) {
    return { ejemplares: [], meta: metaVacia("El CSV llegó vacío."), stats: calcularStats([]) };
  }

  const encabezado = filas[0].map((h) => String(h).trim());
  const esperado = (contrato && contrato.campos || []).map((c) => c.clave);
  const faltantes = esperado.filter((k) => !encabezado.includes(k));
  const sobrantes = encabezado.filter((k) => k && !esperado.includes(k));

  const ejemplares = [];
  for (let i = 1; i < filas.length; i++) {
    const f = {};
    encabezado.forEach((h, j) => { f[h] = filas[i][j]; });
    if (!limpiar(f.id)) {
      descartadas.push({ fila: i + 1, motivo: "sin id", nombre: limpiar(f.nombre_asignado) });
      continue;
    }
    ejemplares.push(construirEjemplar(f, contrato, avisos));
  }

  const vistos = new Map();
  ejemplares.forEach((e) => {
    if (vistos.has(e.id)) avisos.push(`El id ${e.id} viene repetido. El id es la llave: dos ejemplares no pueden compartirlo.`);
    vistos.set(e.id, true);
  });
  const slugs = new Map();
  ejemplares.forEach((e) => {
    if (e.slug && slugs.has(e.slug)) avisos.push(`Dos ejemplares comparten la dirección «${e.slug}»: ${slugs.get(e.slug)} y ${e.id}. La ficha de uno taparía la del otro.`);
    else if (e.slug) slugs.set(e.slug, e.id);
  });
  if (faltantes.length) avisos.push(`La hoja no trae ${faltantes.length} columna(s) del contrato: ${faltantes.join(", ")}.`);
  if (sobrantes.length) avisos.push(`La hoja trae ${sobrantes.length} columna(s) que el contrato no conoce: ${sobrantes.join(", ")}. No se leen.`);

  const meta = {
    schemaVersion: 7,
    origen: "csv-padron-v2",
    filasLeidas: filas.length - 1,
    totalEjemplares: ejemplares.length,
    filasDescartadas: descartadas,
    columnasFaltantes: faltantes,
    columnasNoReconocidas: sobrantes,
    advertencias: avisos,
    sinCifrasAmbientales: ejemplares.filter((e) => !e.tieneCifrasAmbientales)
      .map((e) => ({ id: e.id, compuerta: e._compuertaITree })),
    sinCoordenadas: ejemplares.filter((e) => !e.coordsValidas).map((e) => e.id),
    sinFoto: ejemplares.filter((e) => !e.fotos.length).map((e) => e.id),
  };
  return { ejemplares, meta, stats: calcularStats(ejemplares) };
}

function metaVacia(motivo) {
  return { schemaVersion: 7, origen: "csv-padron-v2", filasLeidas: 0, totalEjemplares: 0,
    filasDescartadas: [], columnasFaltantes: [], columnasNoReconocidas: [],
    advertencias: [motivo], sinCifrasAmbientales: [], sinCoordenadas: [], sinFoto: [] };
}

/**
 * Las sumas dicen sobre cuántos ejemplares se calcularon. Una suma que calla
 * cuántos datos le faltaron es una suma que miente por omisión: con el bloque
 * de i-Tree bajo compuerta, la mitad del padrón puede no tener cifras.
 */
function sumar(lista, f) {
  let valor = 0, conDato = 0, sinDato = 0;
  lista.forEach((e) => {
    const n = f(e);
    if (typeof n === "number" && Number.isFinite(n)) { valor += n; conDato++; }
    else sinDato++;
  });
  return { valor: Math.round(valor * 100) / 100, conDato, sinDato, completo: sinDato === 0 };
}

export function calcularStats(ejemplares) {
  const S = (e) => e.serviciosAmbientales || {};
  const alcaldias = [...new Set(ejemplares.map((e) => e.alcaldia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const especies = [...new Set(ejemplares.map((e) => e.especie).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const conteoPorAlcaldia = {};
  ejemplares.forEach((e) => { if (e.alcaldia) conteoPorAlcaldia[e.alcaldia] = (conteoPorAlcaldia[e.alcaldia] || 0) + 1; });
  const top = Object.entries(conteoPorAlcaldia).sort((a, b) => b[1] - a[1])[0];
  const edades = ejemplares.map((e) => e.edadEstimada).filter((n) => typeof n === "number");
  const alturas = ejemplares.map((e) => e.morfologia.altura_m).filter((n) => typeof n === "number");
  const cuenta = (cat) => ejemplares.filter((e) => e.categorias.includes(cat)).length;

  return {
    totalEjemplares: ejemplares.length,
    totalAlcaldias: alcaldias.length,
    totalEspecies: especies.length,
    listaAlcaldias: alcaldias,
    listaEspecies: especies,
    totalPorCategoria: {
      centenarios: cuenta("CENTENARIO"), historicos: cuenta("HISTORICO"),
      notables: cuenta("NOTABLE"), singulares: cuenta("SINGULAR"),
      otras: ejemplares.filter((e) => !e.categorias.length).length,
    },
    conteoPorAlcaldia,
    alcaldiaTop: top ? { nombre: top[0], cuenta: top[1] } : null,
    edadMaxima: edades.length ? Math.max(...edades) : null,
    edadPromedio: edades.length ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length) : null,
    alturaMaxima: alturas.length ? Math.max(...alturas) : null,
    sumatoriaAltura: sumar(ejemplares, (e) => e.morfologia.altura_m),
    // Ya no hay sumatoria de carbono: la unidad que se publica es el CO₂
    // equivalente, que es la de la convención internacional. Quien quiera el
    // carbono elemental lo obtiene dividiendo entre 3.667.
    sumatoriaCO2: sumar(ejemplares, (e) => S(e).co2Absorbido_kg),
    sumatoriaPrecipitacion: sumar(ejemplares, (e) => S(e).precipitacionInterceptada_L),
    sumatoriaEscorrentia: sumar(ejemplares, (e) => S(e).escorrentiaReducida_L),
    sumatoriaBeneficio: sumar(ejemplares, (e) => S(e).beneficioEconomico_moneda),
  };
}

/* ── 5 · Búsquedas, iguales a las del registro v1 ──────────────────────── */
const lista = (d) => (Array.isArray(d) ? d : (d && d.ejemplares) || []);
export const buscarPorSlug = (d, s) => lista(d).find((e) => e.slug === s) || null;
export const buscarPorId = (d, id) => lista(d).find((e) => e.id === id) || null;
export const porCategoria = (d, c) => lista(d).filter((e) => e.categorias.includes(String(c).toUpperCase()));
export const porAlcaldia = (d, a) => lista(d).filter((e) => e.alcaldia === a);
export const porEspecie = (d, esp) => lista(d).filter((e) => e.especie === esp);
