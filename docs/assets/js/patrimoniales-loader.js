/**
 * patrimoniales-loader.js  ·  v6.0
 * Guardianes del tiempo · Árboles Patrimoniales CDMX — SEDEMA
 *
 * Carga en vivo del CSV publicado desde Google Sheets, normaliza cada
 * ejemplar y expone utilidades de consulta.
 *
 * Cambios v2 respecto de v1 (auditoría Sesión 1):
 *  - Encabezados con coincidencia tolerante (acentos, mayúsculas, espacios, notas al pie "1","2","3").
 *  - Clasificación de filas por validación positiva + `continue`; ya no trunca con `break`.
 *  - Detección explícita de notas al pie (alcanzable, no código muerto).
 *  - toNumber respeta separadores de miles y moneda.
 *  - parseCoords admite varios formatos, valida caja CDMX y detecta lat/lng invertidas.
 *  - Categorías normalizadas a catálogo canónico.
 *  - Cache versionada, con guardia de vacío y respaldo stale ante fallo de red.
 *  - fetch con timeout (AbortController) y reintentos con backoff.
 *  - Errores de PapaParse expuestos, no silenciados.
 *  - Diagnóstico de carga en `datos.meta` para verificación institucional.
 *
 * Requiere PapaParse global (window.Papa) o inyectado vía setParser().
 */

export const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjOp7SP2caxdrXQcEZQSpM2oVSmvOKiDIn9n5v32o6g_qB1viXN04--mFi5duxgmjX_yrJ7CXnFCCR/pub?gid=1610407754&single=true&output=csv";

const SCHEMA_VERSION = 6;                 // subir al cambiar normalizeRow()
const CACHE_KEY = "guardianes_patrimoniales_cache_v6";
const CACHE_TTL_MS = 60 * 60 * 1000;      // 1 hora
const STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000; // respaldo de emergencia: 7 días
const FETCH_TIMEOUT_MS = 12000;
const FETCH_RETRIES = 2;

// Caja envolvente de la Ciudad de México (validación de coordenadas).
const CDMX_BBOX = { latMin: 19.0, latMax: 19.65, lngMin: -99.40, lngMax: -98.90 };

/* ------------------------------------------------------------------ *
 * Mapa de columnas. La clave es el nombre lógico; el valor es el
 * encabezado esperado en el CSV. La coincidencia es TOLERANTE: se
 * normalizan acentos, mayúsculas, espacios y los sufijos numéricos de
 * nota al pie ("Carbono secuestrado (kg/año)1").
 * ------------------------------------------------------------------ */
const COL = {
  id: "ID",
  consecutivo: "Consecutivo",
  nombreComun: "nombrecomun",
  especie: "especievalida",
  nombreAsignado: "Nombre asignado",
  nominadoPor: "Nombre de la persona, organización o institución que nominó",
  fechaNominacion: "Fecha de nominación",
  categorias: "Categorías",
  catCentenario: "Categoría / CENTENARIO",
  catHistorico: "Categoría / HISTÓRICO",
  catNotable: "Categoría / NOTABLE",
  catSingular: "Categoría / SINGULAR",
  fechaDecreto: "Fecha de decreto",
  linkDecreto: "Link al decreto",
  alcaldia: "Alcaldía",
  codAlcaldia: "Codigo alcaldía",
  calle: "Calle",
  numero: "Número exterior",
  colonia: "Colonia",
  cp: "CP",
  entreCalle1: "Entre calle 1",
  entreCalle2: "Entre calle 2",
  referencias: "Referencias",
  tipoUbicacion: "Tipo de ubicación",
  coordsGeo: "Coordenadas geográficas",
  utm: "Coordenadas UTM WGS 84",
  reino: "reinovalido",
  phylum: "phylumdivisionvalido",
  clase: "clasevalida",
  orden: "ordenvalido",
  familia: "familiavalida",
  genero: "generovalido",
  autor: "autorvalido",
  infraespecie: "categoriainfraespecievalida",
  infraespecie2: "categoriainfraespecie2valida",
  idNombreCat: "idnombrecatvalido",
  origen: "Origen",
  endemismo: "endemismo",
  cites: "cites",
  iucn: "iucn",
  nom059: "nom059",
  prioritaria: "prioritaria",
  prioridad: "nivelprioridad",
  exoticaInvasora: "exoticainvasora",
  ambiente: "ambiente",
  formaCrecimiento: "formacrecimiento",
  urlSNIB: "urlejemplar",
  urlOrigen: "urlorigen",
  altura: "Altura total (m)",
  diametro: "Diámetro del tronco (DAP) (cm)",
  circunferencia: "Circunferencia del tronco (cm)",
  anchoCopa: "Ancho de copa (eje mayor) (m)",
  largoCopa: "Largo de copa (eje menor) (m)",
  extensionCopa: "Extensión de copa (Promedio en m.)",
  condicion: "Condición general",
  estructura: "Estructura general del árbol",
  edadEstimada: "Edad estimada (años)",
  expectativaVida: "Expectativa de vida (años)",
  beneficioEconomico: "Beneficio economico estimado ($/año)",
  carbonoSecuestrado: "Carbono secuestrado (kg/año)",
  co2Absorbido: "Absorción de CO2 equivalente (kg/año)",
  escorrentiaReducida: "Disminución de escorrentía (litros/año)",
  precipitacionInterceptada: "Precipitación interceptada (litros/año)",
  coEliminado: "Eliminación de Monoxido de carbono del aire (gramos/año)",
  ozonoEliminado: "Eliminación de ozono del aire (gramos/año)",
  no2Eliminado: "Eliminación de Dióxido de nitrogeno del aire (gramos/año)",
  so2Eliminado: "Eliminación de Dióxido de azufre del aire (gramos/año)",
  pm25Eliminado: "Eliminación de PM 2.5 (gramos/año)",
  ahorroElectricidad: "Ahorro de electricidad (kWh/año)",
  emisionesEvitadasCO2: "Emisiones evitadas de Dióxido de carbono (kg/año)",
  emisionesEvitadasCO: "Emisiones evitadas de Monóxido de carbono (gramos/año",
  emisionesEvitadasNO2: "Emisiones evitadas de Dióxido de nitrogeno (gramos/año)",
  emisionesEvitadasSO2: "Emisiones evitadas de Dióxido de azufre (gramos/año)",
  emisionesEvitadasPM25: "Emisiones evitadas PM2.5 (gramos/año)",
  linkITree: "Link i-Tree Cálculo de beneficios ambientales",
  observaciones: "Observaciones",
  // Material gráfico. Columnas opcionales: si la hoja no las incluye,
  // el sitio usa la silueta por especie y omite la galería.
  fotografias: "Fotografías",
  creditoFoto: "Crédito fotográfico",
  vistaCalle: "Street View",
};

// Columnas cuya ausencia NO debe reportarse como falta: son opcionales.
const COL_OPCIONALES = ["fotografias", "creditoFoto", "vistaCalle"];

// Campos numéricos de servicios ambientales (i-Tree). Se validan como números.
export const CAMPOS_ITREE = [
  "beneficioEconomico", "carbonoSecuestrado", "co2Absorbido",
  "escorrentiaReducida", "precipitacionInterceptada", "coEliminado",
  "ozonoEliminado", "no2Eliminado", "so2Eliminado", "pm25Eliminado",
  "ahorroElectricidad", "emisionesEvitadasCO2", "emisionesEvitadasCO",
  "emisionesEvitadasNO2", "emisionesEvitadasSO2", "emisionesEvitadasPM25",
];

// Catálogo canónico de categorías patrimoniales.
export const CATEGORIAS_CANONICAS = ["CENTENARIO", "HISTORICO", "NOTABLE", "SINGULAR"];

const CATEGORIA_LLAVE = {
  CENTENARIO: "centenarios",
  HISTORICO: "historicos",
  NOTABLE: "notables",
  SINGULAR: "singulares",
};

// Marcadores de fila de nota al pie / leyenda al final del rango publicado.
export const ALCALDIAS_CDMX = [
  "Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa de Morelos",
  "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "La Magdalena Contreras",
  "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco",
];

/** Devuelve el nombre oficial de la alcaldía a partir de una captura libre. */
export function normalizarAlcaldia(v) {
  const c = clean(v);
  if (!c) return null;
  const n = norm(c);
  const oficial = ALCALDIAS_CDMX.find((a) => norm(a) === n);
  if (oficial) return oficial;
  const parcial = ALCALDIAS_CDMX.find((a) => norm(a).includes(n) || n.includes(norm(a)));
  return parcial || c;
}

const MARCADORES_NOTA = [
  "nota", "notas al pie", "fuente", "servicios ambientales",
  "elaborado", "actualizado", "i-tree", "leyenda", "s/d",
];

/* ------------------------- utilidades base ------------------------- */

/** Normaliza texto para comparaciones: sin acentos, minúsculas, sin puntuación ni espacios extra. */
function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Igual que norm() pero además elimina dígitos sueltos finales (sufijos de nota al pie). */
function normHeader(s) {
  return norm(s).replace(/\s+\d+$/, "").replace(/\s+/g, " ").trim();
}

export function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/ /g, " ").trim();
  if (s === "") return null;
  const n = norm(s);
  if (n === "s d" || n === "sd" || n === "na" || n === "n a" || n === "sin dato" || n === "-") return null;
  return s;
}

/**
 * Restituye la acentuación de palabras que la captura suele perder.
 * No corrige el dato: solo su ortografía, y únicamente sobre una lista cerrada
 * de palabras funcionales. Cualquier otro contenido pasa intacto.
 */
const ACENTOS = [
  [/\bMas de\b/g, "Más de"], [/\bmas de\b/g, "más de"],
  [/\bMas o menos\b/g, "Más o menos"],
  [/\bMenos de\b/g, "Menos de"],
  [/\bAnos\b/g, "Años"], [/\banos\b/g, "años"],
];
export function acentuar(v) {
  const s = clean(v);
  if (!s) return null;
  return ACENTOS.reduce((t, [re, a]) => t.replace(re, a), s);
}

/**
 * Convierte a número respetando separadores de miles y moneda.
 * "12,345.67" -> 12345.67   |   "1.234,56" -> 1234.56   |   "$1,890.50" -> 1890.5
 * "154.00; 161.00" -> 154 (toma el primer valor de una lista con ';')
 */
/**
 * ¿La celda tiene forma de fecha?
 *
 * Cubre las tres formas que aparecen en una hoja de cálculo en español:
 *   12/05/2025   12-05-2025   2025-05-12
 * y sus variantes de uno o dos dígitos y de año de dos cifras. No pretende
 * validar la fecha —de eso se encarga parseFecha—, solo distinguirla de una
 * medición para que no acabe convertida en un entero de siete dígitos.
 */
export function esFecha(texto) {
  const t = String(texto == null ? "" : texto).trim();
  return /^\d{1,4}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(t);
}

export function toNumber(v) {
  const s0 = clean(v);
  if (s0 === null) return null;

  /* Una FECHA no es un número.
     Al limpiar «todo lo que no sea dígito» una celda con «12/05/2025» se
     convertía en 12052025, y ese entero entraba al registro como si fuera una
     medición: la ficha de la Glorieta de los Ahuehuetes llegó a publicar
     «12,052,025 kg de CO2 al año» —doce mil toneladas evitadas por un árbol—.
     Seis celdas del registro estaban así. El separador de listas tampoco
     ayudaba: solo reconocía « / » con espacios, de modo que la barra de la
     fecha sobrevivía a la división y se borraba después.
     Una celda con forma de fecha se rechaza: vale más un hueco declarado que
     una cifra falsa con separador de miles, que es justo lo que la hace
     parecer verdadera. */
  if (esFecha(s0)) return null;

  // Listas separadas por ';' o por ' / ': se toma el primer elemento.
  let s = s0.split(/[;|]|\s\/\s/)[0].trim();

  /* Sobre el elemento ya aislado: dos grupos de dígitos separados por algo que
     NO es separador decimal tampoco son un número. «2 de 3» se convertía en 23
     por el mismo camino que la fecha, y «20 - 30» en 2030. Un sufijo de unidad
     —«128 g»— no cae aquí, porque después de las letras ya no vienen dígitos;
     un negativo —«-99.18»— tampoco, porque el signo va delante y no entre dos
     cifras. */
  if (/\d[^\d.,]+\d/.test(s)) return null;

  // Quita todo salvo dígitos, signo, punto y coma.
  s = s.replace(/[^\d,.\-]/g, "");
  if (s === "" || s === "-" || s === "." || s === ",") return null;

  const negativo = s.startsWith("-");
  s = s.replace(/-/g, "");

  const ultimaComa = s.lastIndexOf(",");
  const ultimoPunto = s.lastIndexOf(".");

  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    // El separador decimal es el que aparece más a la derecha.
    if (ultimaComa > ultimoPunto) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (ultimaComa !== -1) {
    const decimales = s.length - ultimaComa - 1;
    // "1,234" y "12,345" -> miles; "1,5" y "1,23" -> decimal.
    if (decimales === 3 && /^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  } else if (ultimoPunto !== -1) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // "1.234.567" -> miles
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/** Extrae todos los números de una celda con varios valores ("154.00; 161.00"). */
export function toNumberList(v) {
  const s0 = clean(v);
  if (s0 === null) return [];
  return s0.split(/[;|]|\s\/\s/).map((t) => toNumber(t)).filter((n) => n !== null);
}

export function toDisplay(v, fallback = "Sin determinar") {
  const c = clean(v);
  return c === null ? fallback : c;
}

/**
 * Convierte coordenadas a {lat, lng} numéricos.
 * Admite decimal ("19.43, -99.13"), separador ';', espacio, y grados-minutos-segundos.
 * Valida la caja CDMX y corrige el orden invertido si aplica.
 */
export function parseCoords(v) {
  const s = clean(v);
  if (s === null) return null;

  let nums = null;

  // Grados minutos segundos: 19°25'57.4"N 99°07'59.6"W
  const gms = s.match(/(\d+)\s*[°º]\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?\s*([NSEWO])/gi);
  if (gms && gms.length >= 2) {
    const conv = (t) => {
      const m = t.match(/(\d+)\s*[°º]\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?\s*([NSEWO])/i);
      if (!m) return NaN;
      let d = parseInt(m[1], 10) + parseInt(m[2], 10) / 60 + parseFloat(m[3]) / 3600;
      const h = m[4].toUpperCase();
      if (h === "S" || h === "W" || h === "O") d = -d;
      return d;
    };
    nums = [conv(gms[0]), conv(gms[1])];
  } else {
    // Decimal: separadores ',', ';' o espacio.
    nums = s.split(/[;,]|\s+/).map((p) => parseFloat(String(p).trim().replace(/[^\d.\-]/g, "")))
            .filter((n) => Number.isFinite(n));
  }

  if (!nums || nums.length < 2) return null;
  let [lat, lng] = nums;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const dentro = (la, ln) =>
    la >= CDMX_BBOX.latMin && la <= CDMX_BBOX.latMax &&
    ln >= CDMX_BBOX.lngMin && ln <= CDMX_BBOX.lngMax;

  if (dentro(lat, lng)) return { lat, lng, valida: true, invertida: false };
  if (dentro(lng, lat)) return { lat: lng, lng: lat, valida: true, invertida: true }; // orden corregido
  return { lat, lng, valida: false, invertida: false }; // se conserva, pero marcada
}

/** Divide y normaliza las categorías a partir del string del CSV. */
export function parseCategorias(v) {
  const s = clean(v);
  if (s === null) return [];
  const crudas = s.split(/[,;/|]|\sy\s/).map((c) => c.trim()).filter(Boolean);
  const salida = [];
  for (const cruda of crudas) {
    const n = norm(cruda);
    const canon = CATEGORIAS_CANONICAS.find((c) => n.includes(norm(c)));
    const valor = canon || cruda.toUpperCase();
    if (!salida.includes(valor)) salida.push(valor);
  }
  return salida;
}

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre"];

/** Interpreta las fechas del registro (d/MM/yyyy o yyyy-mm-dd) y las deja legibles. */
export function parseFecha(v) {
  const s = clean(v);
  if (s === null) return null;
  let d = null, m = null, a = null;
  let x = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (x) { d = +x[1]; m = +x[2]; a = +x[3]; }
  else {
    x = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (x) { a = +x[1]; m = +x[2]; d = +x[3]; }
  }
  if (!a || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return { texto: s, iso: null, legible: s };
  const iso = `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { texto: s, iso, legible: `${d} de ${MESES[m - 1]} de ${a}`, anio: a };
}

/**
 * Interpreta la celda de fotografías. Admite varias imágenes separadas por
 * punto y coma o salto de línea, y un pie opcional tras una barra vertical:
 *   https://…/tacuba-01.jpg | Vista desde la calzada, 2025 ; https://…/tacuba-02.jpg
 */
export function parseFotos(v, credito) {
  const s = clean(v);
  if (s === null) return [];
  const cred = clean(credito);
  return s
    .split(/[;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => {
      const [url, pie] = t.split("|").map((x) => (x || "").trim());
      if (!url) return null;
      return {
        url,
        pie: pie || null,
        credito: cred,
        alt: pie || `Fotografía ${i + 1} del ejemplar`,
      };
    })
    .filter(Boolean);
}

/** Los códigos postales de la Ciudad de México llevan cinco dígitos con cero inicial. */
export function normalizarCP(v) {
  const c = clean(v);
  if (!c) return null;
  const d = c.replace(/\D/g, "");
  if (!d) return c;
  return d.length < 5 ? d.padStart(5, "0") : d;
}

/**
 * Interpreta la celda de vista de calle y devuelve siempre la misma forma:
 * { tipo: "panorama" | "rumbo", url?, rumbo? }, o null si no hay nada.
 */
export function parseVistaCalle(v) {
  const s = clean(v);
  if (s === null) return null;
  // Iframe completo pegado desde Google: se extrae el src.
  const m = s.match(/src\s*=\s*["']([^"']+)["']/i);
  const candidato = m ? m[1] : s;
  if (/^https?:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(candidato)) {
    return { tipo: "panorama", url: candidato };
  }
  if (/^-?\d+(\.\d+)?$/.test(candidato.trim())) {
    return { tipo: "rumbo", rumbo: Number(candidato.trim()) };
  }
  return null;
}

export function slugify(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* --------------------- resolución de encabezados -------------------- */

/**
 * Construye el mapa nombreLógico -> encabezado real presente en el CSV,
 * tolerando acentos, mayúsculas, espacios y sufijos de nota al pie.
 */
export function resolverEncabezados(headers) {
  const indice = new Map();
  for (const h of headers || []) {
    if (h === undefined || h === null) continue;
    const k = normHeader(h);
    if (k && !indice.has(k)) indice.set(k, h);
  }
  const mapa = {};
  const faltantes = [];
  for (const [logico, esperado] of Object.entries(COL)) {
    const k = normHeader(esperado);
    let real = indice.get(k);
    if (!real) {
      // Coincidencia parcial: el encabezado real contiene al esperado o viceversa.
      for (const [kk, hh] of indice) {
        if (kk.startsWith(k) || k.startsWith(kk)) { real = hh; break; }
      }
    }
    if (real) mapa[logico] = real;
    else if (!COL_OPCIONALES.includes(logico)) faltantes.push({ logico, esperado });
  }
  return { mapa, faltantes };
}

/* --------------------- clasificación de filas ---------------------- */

/**
 * ¿La fila corresponde a un ejemplar real? Validación POSITIVA.
 * El ID del registro es alfanumérico compuesto ("25-MIH-TAX-19405GIMNO-0001"),
 * no un consecutivo numérico: se valida por contenido, no por formato.
 */
export function esEjemplar(row, mapa) {
  const id = clean(row[mapa.id]);
  if (!id) return false;
  if (id.length > 80) return false;                    // las notas al pie caen en la columna ID
  const especie = clean(row[mapa.especie]);
  const nombre = clean(row[mapa.nombreAsignado]);
  const comun = clean(row[mapa.nombreComun]);
  if (!especie && !nombre && !comun) return false;     // sin identificación botánica no es ejemplar
  return Boolean(clean(row[mapa.consecutivo]) || especie);
}

/** ¿La fila es nota al pie / leyenda? Alcanzable y verificable. */
export function esNotaAlPie(row, mapa) {
  if (esEjemplar(row, mapa)) return false;
  const valores = Object.values(row).map((v) => clean(v)).filter(Boolean);
  if (valores.length === 0) return false;             // fila separadora vacía
  // En el registro real las notas ocupan una sola celda de la primera columna.
  if (valores.length <= 3) return true;
  const texto = norm(valores.join(" "));
  return MARCADORES_NOTA.some((m) => texto.includes(norm(m)));
}

/* -------------------------- normalización -------------------------- */

export function normalizeRow(row, mapa) {
  const g = (key) => row[mapa[key]];

  // La hoja trae la columna concatenada y cuatro banderas por categoría.
  // Se usa la concatenada y, si viene vacía, se reconstruye desde las banderas.
  let categorias = parseCategorias(g("categorias"));
  if (!categorias.length) {
    categorias = [["catCentenario", "CENTENARIO"], ["catHistorico", "HISTORICO"],
                  ["catNotable", "NOTABLE"], ["catSingular", "SINGULAR"]]
      .filter(([k]) => clean(g(k))).map(([, v]) => v);
  }
  const nombreAsignado = clean(g("nombreAsignado"));
  const id = clean(g("id"));

  const servicios = {};
  const unidad = {
    beneficioEconomico: "_moneda", carbonoSecuestrado: "_kg", co2Absorbido: "_kg",
    escorrentiaReducida: "_L", precipitacionInterceptada: "_L", coEliminado: "_g",
    ozonoEliminado: "_g", no2Eliminado: "_g", so2Eliminado: "_g", pm25Eliminado: "_g",
    ahorroElectricidad: "_kWh", emisionesEvitadasCO2: "_kg", emisionesEvitadasCO: "_g",
    emisionesEvitadasNO2: "_g", emisionesEvitadasSO2: "_g", emisionesEvitadasPM25: "_g",
  };
  for (const campo of CAMPOS_ITREE) servicios[campo + unidad[campo]] = toNumber(g(campo));

  const coords = parseCoords(g("coordsGeo"));

  return {
    id,
    consecutivo: clean(g("consecutivo")),
    nombreComun: clean(g("nombreComun")),
    especie: clean(g("especie")),
    nombreAsignado,
    slug: slugify(nombreAsignado) || (id ? `ejemplar-${id}` : ""),
    nominadoPor: clean(g("nominadoPor")),
    fechaNominacion: parseFecha(g("fechaNominacion")),
    categorias,
    categoriaDominante: categorias.length ? categorias[0] : null,
    fechaDecreto: parseFecha(g("fechaDecreto")),
    linkDecreto: clean(g("linkDecreto")),
    alcaldia: normalizarAlcaldia(g("alcaldia")),
    alcaldiaCapturada: clean(g("alcaldia")),
    codAlcaldia: clean(g("codAlcaldia")),
    ubicacion: {
      calle: clean(g("calle")),
      numero: clean(g("numero")),
      colonia: clean(g("colonia")),
      cp: normalizarCP(g("cp")),
      // La fuente a veces repite la misma calle en ambos campos.
      entreCalles: [...new Set([clean(g("entreCalle1")), clean(g("entreCalle2"))].filter(Boolean))],
      referencias: clean(g("referencias")),
      tipo: clean(g("tipoUbicacion")),
    },
    coords: coords ? { lat: coords.lat, lng: coords.lng } : null,
    coordsValidas: coords ? coords.valida : false,
    coordsInvertidasCorregidas: coords ? coords.invertida : false,
    utm: clean(g("utm")),
    taxonomia: {
      reino: clean(g("reino")), phylum: clean(g("phylum")), clase: clean(g("clase")),
      orden: clean(g("orden")), familia: clean(g("familia")), genero: clean(g("genero")),
      autor: clean(g("autor")), infraespecie: clean(g("infraespecie")),
      formaCrecimiento: clean(g("formaCrecimiento")), ambiente: clean(g("ambiente")),
    },
    conservacion: {
      iucn: clean(g("iucn")),
      nom059: clean(g("nom059")),
      cites: clean(g("cites")),
      prioritaria: clean(g("prioritaria")),
      prioridad: clean(g("prioridad")),
      origen: clean(g("origen")),
      endemismo: clean(g("endemismo")),
      exoticaInvasora: clean(g("exoticaInvasora")),
      // norm() quita el acento: "Exótica" no contiene la cadena "exotic".
      esExotica: norm(clean(g("exoticaInvasora")) || "").includes("exotic"),
    },
    urlSNIB: clean(g("urlSNIB")),
    urlOrigen: clean(g("urlOrigen")),
    morfologia: {
      altura_m: toNumber(g("altura")),
      diametro_cm: toNumber(g("diametro")),
      diametros_cm: toNumberList(g("diametro")),
      circunferencia_cm: toNumber(g("circunferencia")),
      circunferencias_cm: toNumberList(g("circunferencia")),
      fustes: Math.max(toNumberList(g("diametro")).length, toNumberList(g("circunferencia")).length, 1),
      anchoCopa_m: toNumber(g("anchoCopa")),
      largoCopa_m: toNumber(g("largoCopa")),
      extensionCopa_m: toNumber(g("extensionCopa")),
    },
    condicion: clean(g("condicion")),
    estructura: clean(g("estructura")),
    edadEstimada: toNumber(g("edadEstimada")),
    // Se conserva como texto: la fuente captura rangos ("Mas de 40"), no cifras exactas.
    expectativaVida: acentuar(g("expectativaVida")),
    serviciosAmbientales: servicios,
    linkITree: clean(g("linkITree")),
    observaciones: clean(g("observaciones")),
    // Se resuelve al construir el padrón, cuando se conoce el conjunto completo.
    situacionCategoria: null,
    fotos: parseFotos(g("fotografias"), g("creditoFoto")),
    /* Vista de calle. La celda admite tres formas, de mayor a menor precisión:
       1. El iframe completo que Google entrega al compartir un panorama.
       2. La dirección del panorama (https://www.google.com/maps/embed?pb=…).
       3. Un rumbo en grados, para encuadrar el panorama automático.
       Si viene vacía, el sitio deriva la vista de las coordenadas. */
    vistaCalle: parseVistaCalle(g("vistaCalle")),
  };
}

/* ------------------------- parseo del CSV -------------------------- */

let _parser = null;
/** Permite inyectar PapaParse (útil en Node / pruebas). */
export function setParser(papa) { _parser = papa; }
function getParser() {
  if (_parser) return _parser;
  if (typeof globalThis !== "undefined" && globalThis.Papa) return globalThis.Papa;
  return null;
}

/** Espera a que PapaParse esté disponible (evita la carrera con el <script> del CDN). */
async function esperarParser(timeoutMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const p = getParser();
    if (p) return p;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("PapaParse no está disponible: no se puede leer el registro.");
}

/** Convierte texto CSV en filas + diagnóstico. Exportado para pruebas. */
export function parseCSVText(text, papa) {
  const P = papa || getParser();
  if (!P) throw new Error("PapaParse no está disponible: no se puede leer el registro.");
  const res = P.parse(String(text).replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => String(h ?? "").replace(/ /g, " ").trim(),
  });
  const erroresGraves = (res.errors || []).filter((e) => e.type === "Quotes" || e.code === "MissingQuotes");
  if (erroresGraves.length) {
    throw new Error(
      `El CSV publicado tiene comillas mal formadas (fila ${erroresGraves[0].row}). Revisa el rango publicado en Google Sheets.`
    );
  }
  return {
    filas: res.data || [],
    headers: (res.meta && res.meta.fields) || [],
    advertenciasParseo: (res.errors || []).map((e) => `${e.type || "aviso"}: ${e.message} (fila ${e.row})`),
  };
}

/**
 * Construye el conjunto normalizado a partir del texto CSV.
 * Devuelve { ejemplares, meta } — meta es el diagnóstico de verificación.
 */
export function construirDesdeCSV(text, papa) {
  const { filas, headers, advertenciasParseo } = parseCSVText(text, papa);
  const { mapa, faltantes } = resolverEncabezados(headers);

  if (!mapa.id) {
    throw new Error("El CSV no contiene la columna 'ID'. Verifica que la hoja publicada sea la correcta.");
  }

  const ejemplares = [];
  const notasAlPie = [];
  const descartadas = [];

  for (const fila of filas) {
    if (esEjemplar(fila, mapa)) { ejemplares.push(normalizeRow(fila, mapa)); continue; }
    if (esNotaAlPie(fila, mapa)) {
      const txt = Object.values(fila).map((v) => clean(v)).filter(Boolean).join(" · ");
      notasAlPie.push(txt);
      continue;
    }
    const vals = Object.values(fila).map((v) => clean(v)).filter(Boolean);
    if (vals.length) descartadas.push(vals.join(" · "));
  }

  /* Un ejemplar sin categoría no es necesariamente un dato faltante: las
     categorías patrimoniales se incorporaron después de las primeras
     declaratorias. El umbral no se fija a mano: se deduce del propio padrón,
     tomando el decreto más antiguo que sí trae categoría. */
  const conCategoriaYFecha = ejemplares
    .filter((e) => e.categorias.length && e.fechaDecreto && e.fechaDecreto.iso)
    .map((e) => e.fechaDecreto.iso)
    .sort();
  const primerDecretoConCategoria = conCategoriaYFecha[0] || null;

  for (const e of ejemplares) {
    if (e.categorias.length) { e.situacionCategoria = "asignada"; continue; }
    if (!e.fechaDecreto || !e.fechaDecreto.iso) {
      e.situacionCategoria = "declaratoria-en-tramite";
    } else if (primerDecretoConCategoria && e.fechaDecreto.iso < primerDecretoConCategoria) {
      e.situacionCategoria = "anterior-a-las-categorias";
    } else {
      e.situacionCategoria = "pendiente";
    }
  }

  // Alertas de calidad de datos, para el tablero de verificación.
  const alertas = [];
  if (faltantes.length) alertas.push(`Columnas no encontradas en el CSV: ${faltantes.map((f) => f.esperado).join("; ")}`);
  const sinCoords = ejemplares.filter((e) => !e.coords).map((e) => e.id);
  if (sinCoords.length) alertas.push(`Ejemplares sin coordenadas: ${sinCoords.join(", ")}`);
  const coordsFuera = ejemplares.filter((e) => e.coords && !e.coordsValidas).map((e) => e.id);
  if (coordsFuera.length) alertas.push(`Coordenadas fuera de la caja CDMX: ${coordsFuera.join(", ")}`);
  const invertidas = ejemplares.filter((e) => e.coordsInvertidasCorregidas).map((e) => e.id);
  if (invertidas.length) alertas.push(`Coordenadas con orden invertido (corregidas automáticamente): ${invertidas.join(", ")}`);
  const catPendiente = ejemplares.filter((e) => e.situacionCategoria === "pendiente").map((e) => e.consecutivo || e.id);
  if (catPendiente.length) alertas.push(`Ejemplares sin categoría por capturar: ${catPendiente.join(", ")}`);
  const catPrevia = ejemplares.filter((e) => e.situacionCategoria === "anterior-a-las-categorias").length;
  const catTramite = ejemplares.filter((e) => e.situacionCategoria === "declaratoria-en-tramite").length;
  const sinFoto = ejemplares.filter((e) => !e.fotos.length).map((e) => e.consecutivo || e.id);
  if (sinFoto.length === ejemplares.length) {
    alertas.push("Ningún ejemplar tiene fotografías cargadas: el sitio usa la silueta por especie.");
  } else if (sinFoto.length) {
    alertas.push(`Ejemplares sin fotografía: ${sinFoto.join(", ")}`);
  }
  const slugs = ejemplares.map((e) => e.slug);
  const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dup.length) alertas.push(`Slugs duplicados: ${[...new Set(dup)].join(", ")}`);

  const meta = {
    schemaVersion: SCHEMA_VERSION,
    // Referencia para explicar por qué algunos ejemplares no tienen categoría.
    primerDecretoConCategoria,
    sinCategoriaPorDeclaratoriaPrevia: catPrevia,
    sinCategoriaPorTramite: catTramite,
    filasLeidas: filas.length,
    totalEjemplares: ejemplares.length,
    totalNotasAlPie: notasAlPie.length,
    notasAlPie,
    filasDescartadas: descartadas,
    columnasFaltantes: faltantes,
    advertenciasParseo,
    alertas,
    origen: "csv",
  };

  return { ejemplares, meta };
}

/* --------------------------- red y cache --------------------------- */

async function fetchTexto(url, { timeoutMs = FETCH_TIMEOUT_MS, retries = FETCH_RETRIES } = {}) {
  let ultimoError;
  for (let intento = 0; intento <= retries; intento++) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined, redirect: "follow" });
      if (t) clearTimeout(t);
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "El registro publicado no está disponible (404). Verifica que la hoja siga publicada en la web."
            : `No se pudo cargar el registro de árboles patrimoniales (HTTP ${res.status}).`
        );
      }
      const texto = await res.text();
      if (/^\s*<(!doctype|html)/i.test(texto)) {
        throw new Error("Google Sheets devolvió una página HTML en lugar del CSV. Revisa la publicación de la hoja.");
      }
      return texto;
    } catch (err) {
      if (t) clearTimeout(t);
      ultimoError = err && err.name === "AbortError"
        ? new Error("La carga del registro excedió el tiempo de espera.")
        : err;
      if (intento < retries) await new Promise((r) => setTimeout(r, 400 * Math.pow(2, intento)));
    }
  }
  throw ultimoError || new Error("Error desconocido al cargar el registro.");
}

function almacen() {
  try {
    if (typeof localStorage === "undefined") return null;
    const p = "__gt_probe__";
    localStorage.setItem(p, "1"); localStorage.removeItem(p);
    return localStorage;
  } catch (e) { return null; }
}

export function leerCache({ permitirStale = false } = {}) {
  const st = almacen();
  if (!st) return null;
  try {
    const raw = st.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || p.schemaVersion !== SCHEMA_VERSION) return null;       // esquema viejo -> se ignora
    if (!Array.isArray(p.ejemplares) || p.ejemplares.length === 0) return null; // guardia de vacío
    if (typeof p.timestamp !== "number") return null;
    const edad = Date.now() - p.timestamp;
    if (edad < 0) return null;
    const vigente = edad <= CACHE_TTL_MS;
    if (!vigente && !(permitirStale && edad <= STALE_MAX_MS)) return null;
    return {
      ejemplares: p.ejemplares,
      meta: { ...(p.meta || {}), origen: vigente ? "cache" : "cache-stale", edadMs: edad },
    };
  } catch (e) { return null; }
}

export function escribirCache(ejemplares, meta) {
  const st = almacen();
  if (!st) return false;
  if (!Array.isArray(ejemplares) || ejemplares.length === 0) return false; // nunca cachear vacío
  try {
    st.setItem(CACHE_KEY, JSON.stringify({
      schemaVersion: SCHEMA_VERSION, timestamp: Date.now(), ejemplares, meta,
    }));
    return true;
  } catch (e) {
    try { st.removeItem(CACHE_KEY); } catch (_) {}
    return false; // cuota llena: se opera sin cache
  }
}

export function limpiarCache() {
  const st = almacen();
  if (st) { try { st.removeItem(CACHE_KEY); } catch (e) {} }
}

/* ---------------------------- API pública --------------------------- */

/**
 * Carga y normaliza los ejemplares patrimoniales.
 * @param {Object} opts
 * @param {boolean} opts.forceRefresh  ignora la cache vigente
 * @param {string}  opts.url           URL alterna del CSV (pruebas)
 * @returns {Promise<{ejemplares: Array, meta: Object}>}
 */
export async function loadPatrimoniales(opts = {}) {
  // Compatibilidad con la firma v1: loadPatrimoniales(true)
  if (typeof opts === "boolean") opts = { forceRefresh: opts };
  const { forceRefresh = false, url = CSV_URL } = opts;

  if (!forceRefresh) {
    const c = leerCache();
    if (c) return c;
  }

  await esperarParser().catch(() => null);

  try {
    const texto = await fetchTexto(url);
    const { ejemplares, meta } = construirDesdeCSV(texto);
    if (ejemplares.length === 0) {
      throw new Error("El registro se descargó pero no contiene ejemplares válidos. Verifica el rango publicado.");
    }
    escribirCache(ejemplares, meta);
    return { ejemplares, meta };
  } catch (err) {
    // Respaldo: cache expirada (hasta 7 días) antes que dejar el micrositio sin contenido.
    const stale = leerCache({ permitirStale: true });
    if (stale) {
      stale.meta.alertas = [
        ...(stale.meta.alertas || []),
        `No fue posible actualizar el registro (${err.message}). Se muestran datos guardados del ${new Date(Date.now() - stale.meta.edadMs).toLocaleString("es-MX")}.`,
      ];
      stale.meta.degradado = true;
      return stale;
    }
    throw err;
  }
}

/** Acepta el arreglo de ejemplares o el objeto {ejemplares, meta}. */
function asArray(datos) {
  if (Array.isArray(datos)) return datos;
  if (datos && Array.isArray(datos.ejemplares)) return datos.ejemplares;
  return [];
}

export function getStats(datos) {
  const lista = asArray(datos);
  const alcaldias = new Set(lista.map((d) => d.alcaldia).filter(Boolean));
  const especies = new Set(lista.map((d) => d.especie).filter(Boolean));

  const totalPorCategoria = { centenarios: 0, historicos: 0, notables: 0, singulares: 0, otras: 0 };
  lista.forEach((d) => {
    (d.categorias || []).forEach((c) => {
      const llave = CATEGORIA_LLAVE[norm(c).toUpperCase().replace(/\s/g, "")] ||
                    CATEGORIA_LLAVE[CATEGORIAS_CANONICAS.find((k) => norm(c).includes(norm(k)))];
      if (llave) totalPorCategoria[llave] += 1;
      else totalPorCategoria.otras += 1;
    });
  });

  // Suma que distingue "cero" de "sin dato".
  const sumar = (fn) => {
    let total = 0, con = 0, sin = 0;
    lista.forEach((d) => {
      const v = fn(d);
      if (typeof v === "number" && Number.isFinite(v)) { total += v; con += 1; } else sin += 1;
    });
    return { valor: total, conDato: con, sinDato: sin, completo: sin === 0 };
  };

  const conteoAlcaldia = {};
  lista.forEach((d) => { if (d.alcaldia) conteoAlcaldia[d.alcaldia] = (conteoAlcaldia[d.alcaldia] || 0) + 1; });
  let alcaldiaTop = { nombre: null, cuenta: 0 };
  Object.entries(conteoAlcaldia).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([nombre, cuenta], i) => { if (i === 0) alcaldiaTop = { nombre, cuenta }; });

  const edades = lista.map((d) => d.edadEstimada).filter((n) => typeof n === "number" && Number.isFinite(n));
  const alturas = lista.map((d) => d.morfologia && d.morfologia.altura_m).filter((n) => typeof n === "number" && Number.isFinite(n));

  return {
    totalEjemplares: lista.length,
    totalAlcaldias: alcaldias.size,
    totalEspecies: especies.size,
    listaAlcaldias: [...alcaldias].sort(),
    listaEspecies: [...especies].sort(),
    totalPorCategoria,
    conteoPorAlcaldia: conteoAlcaldia,
    alcaldiaTop,
    edadMaxima: edades.length ? Math.max(...edades) : null,
    edadPromedio: edades.length ? edades.reduce((a, b) => a + b, 0) / edades.length : null,
    alturaMaxima: alturas.length ? Math.max(...alturas) : null,
    sumatoriaAltura: sumar((d) => d.morfologia && d.morfologia.altura_m),
    sumatoriaCarbono: sumar((d) => d.serviciosAmbientales && d.serviciosAmbientales.carbonoSecuestrado_kg),
    sumatoriaCO2: sumar((d) => d.serviciosAmbientales && d.serviciosAmbientales.co2Absorbido_kg),
    sumatoriaPrecipitacion: sumar((d) => d.serviciosAmbientales && d.serviciosAmbientales.precipitacionInterceptada_L),
    sumatoriaEscorrentia: sumar((d) => d.serviciosAmbientales && d.serviciosAmbientales.escorrentiaReducida_L),
    sumatoriaBeneficio: sumar((d) => d.serviciosAmbientales && d.serviciosAmbientales.beneficioEconomico_moneda),
  };
}

export function findBySlug(datos, slug) {
  const lista = asArray(datos);
  const objetivo = slugify(slug);
  if (!objetivo) return null;
  return lista.find((d) => d.slug === objetivo) ||
         lista.find((d) => slugify(d.nombreAsignado) === objetivo) ||
         null;
}

export function findById(datos, id) {
  const lista = asArray(datos);
  const t = String(id ?? "").trim();
  return lista.find((d) => String(d.id) === t) || null;
}

export function filterByCategoria(datos, cat) {
  const lista = asArray(datos);
  const n = norm(cat);
  if (!n) return [];
  return lista.filter((d) => (d.categorias || []).some((c) => norm(c) === n || norm(c).includes(n)));
}

export function filterByEspecie(datos, esp) {
  const lista = asArray(datos);
  const n = norm(esp);
  if (!n) return [];
  return lista.filter((d) => norm(d.especie) === n);
}

export function filterByAlcaldia(datos, alc) {
  const lista = asArray(datos);
  const n = norm(alc);
  if (!n) return [];
  return lista.filter((d) => norm(d.alcaldia) === n);
}

export function ordenarPor(datos, campo = "consecutivo", asc = true) {
  const lista = [...asArray(datos)];
  const val = (d) => {
    if (campo === "edad") return d.edadEstimada ?? -Infinity;
    if (campo === "altura") return (d.morfologia && d.morfologia.altura_m) ?? -Infinity;
    if (campo === "nombre") return norm(d.nombreAsignado);
    return Number(d.consecutivo) || 0;
  };
  lista.sort((a, b) => { const A = val(a), B = val(b); return A < B ? (asc ? -1 : 1) : A > B ? (asc ? 1 : -1) : 0; });
  return lista;
}

export const _internals = { COL, norm, normHeader, CDMX_BBOX, SCHEMA_VERSION, CACHE_KEY, CACHE_TTL_MS };
