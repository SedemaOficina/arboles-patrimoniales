/**
 * indicadores.js · Árboles patrimoniales
 * Los nueve indicadores del panel del mapa.
 *
 * El mismo indicador se lee de dos maneras: como sumatoria del registro cuando
 * no hay nada seleccionado, y como dato del ejemplar cuando se elige uno.
 * Cada valor declara sobre cuántos ejemplares está calculado: publicar una
 * suma sin decir que proviene de 5 de 13 registros sería engañoso.
 */

const S = (e) => e.serviciosAmbientales || {};
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);

function sumar(lista, f) {
  let total = 0, con = 0;
  lista.forEach((e) => { const v = num(f(e)); if (v !== null) { total += v; con += 1; } });
  return { valor: con ? total : null, con, de: lista.length, completo: con === lista.length && con > 0 };
}

/** El año en curso, leído del reloj: escrito a mano se desfasa cada 1.º de enero. */
const ANIO_ACTUAL = new Date().getFullYear();

const fmt = (n, dec = 0) =>
  n === null || n === undefined ? "—" : Number(n).toLocaleString("es-MX", { maximumFractionDigits: dec });

/** La unidad se calla cuando no hay cifra: «— años» se lee como una falla. */
const uni = (n, texto) => (n === null || n === undefined ? "" : texto);

/** Altura acumulada: metros hasta el kilómetro, kilómetros a partir de ahí. */
export function alturaApilada(metros) {
  if (metros === null) return { cifra: "—", unidad: "" };
  return metros >= 1000
    ? { cifra: fmt(metros / 1000, 2), unidad: "km" }
    : { cifra: fmt(metros, 0), unidad: "m" };
}

/** Nota de cobertura, solo cuando el dato no cubre a todos. */
function cobertura(r) {
  if (r.valor === null) return "Sin datos capturados para este indicador.";
  return r.completo ? "" : `Calculado sobre ${r.con} de ${r.de} ejemplares con dato registrado.`;
}

/* ---------------- modo agregado ---------------- */

export function indicadoresPadron(lista, totalPadron) {
  const n = lista.length;
  const especies = new Set(lista.map((e) => e.especie).filter(Boolean));
  const altura = sumar(lista, (e) => e.morfologia && e.morfologia.altura_m);
  const edad = sumar(lista, (e) => e.edadEstimada);
  const lluvia = sumar(lista, (e) => S(e).precipitacionInterceptada_L);
  const escurr = sumar(lista, (e) => S(e).escorrentiaReducida_L);
  const carbono = sumar(lista, (e) => S(e).carbonoSecuestrado_kg);
  const co2 = sumar(lista, (e) => S(e).co2Absorbido_kg);

  const porAlcaldia = {};
  lista.forEach((e) => { if (e.alcaldia) porAlcaldia[e.alcaldia] = (porAlcaldia[e.alcaldia] || 0) + 1; });
  const top = Object.entries(porAlcaldia).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const apilada = alturaApilada(altura.valor);

  return [
    { clave: "arboles", titulo: "Árboles patrimoniales", cifra: String(n), unidad: n === 1 ? "ejemplar" : "ejemplares",
      texto: n === totalPadron
        ? "Protegidos y registrados en la Ciudad de México."
        : `De los ${totalPadron} que integran el registro, según los filtros elegidos.`, nota: "" },

    { clave: "especies", titulo: "Especies distintas", cifra: String(especies.size),
      unidad: especies.size === 1 ? "especie" : "especies",
      texto: "Reflejan la diversidad del arbolado patrimonial de la ciudad.",
      nota: especies.size ? [...especies].join(" · ") : "" },

    { clave: "altura", titulo: "Altura total apilada", cifra: apilada.cifra, unidad: apilada.unidad,
      texto: altura.valor === null ? "Aún no hay alturas registradas."
        : `Si los apiláramos uno sobre otro alcanzaríamos ${apilada.cifra} ${apilada.unidad} de altura.`,
      nota: cobertura(altura) },

    { clave: "alcaldia", titulo: "Alcaldía con más ejemplares", cifra: top ? top[0] : "—",
      unidad: top ? `${top[1]} ${top[1] === 1 ? "ejemplar" : "ejemplares"}` : "",
      texto: "Concentra el mayor número de árboles declarados patrimoniales.", nota: "", largo: true },

    { clave: "edad", titulo: "Edad total sumada", cifra: fmt(edad.valor), unidad: uni(edad.valor, "años"),
      texto: edad.valor === null ? "Ningún ejemplar del grupo tiene edad dictaminada."
        : `Sumando la edad de los ejemplares dictaminados, el registro reúne ${fmt(edad.valor)} años de historia viva en la ciudad.`,
      nota: cobertura(edad) },

    { clave: "lluvia", titulo: "Lluvia interceptada", cifra: fmt(lluvia.valor), unidad: uni(lluvia.valor, "litros al año"),
      texto: "Capturada por las copas antes de tocar el suelo, lo que retrasa y reparte el escurrimiento.",
      nota: cobertura(lluvia) },

    { clave: "escurrimiento", titulo: "Reducción de escurrimientos", cifra: fmt(escurr.valor), unidad: uni(escurr.valor, "litros al año"),
      texto: "Menos agua corriendo por las calles, y con ello menos encharcamientos.",
      nota: cobertura(escurr) },

    { clave: "carbono", titulo: "Carbono secuestrado", cifra: fmt(carbono.valor, 1), unidad: uni(carbono.valor, "kg al año"),
      texto: "Retirado de la atmósfera y almacenado en el tronco, las ramas y las raíces.",
      nota: cobertura(carbono) },

    { clave: "co2", titulo: "Absorción de CO₂ equivalente", cifra: fmt(co2.valor, 1), unidad: uni(co2.valor, "kg al año"),
      texto: "Gases de efecto invernadero que dejan de estar en el aire de la ciudad.",
      nota: cobertura(co2) },
  ];
}

/* ---------------- modo ejemplar ---------------- */

export function indicadoresEjemplar(e, totalPadron) {
  const s = S(e);
  const alt = num(e.morfologia && e.morfologia.altura_m);
  const anio = e.edadEstimada != null ? ANIO_ACTUAL - Math.round(e.edadEstimada) : null;
  const sinDato = "Este ejemplar no tiene el dato registrado.";
  // Los servicios ambientales no son un dato que se capture: son un cálculo.
  // Cuando falta, falta el cálculo, y decirlo así evita que se lea como un
  // hueco administrativo.
  const sinCalculo = "No se pudo estimar este servicio para el ejemplar con la información disponible.";
  const v = (x, dec = 0) => (num(x) === null ? "—" : fmt(x, dec));
  const t = (x, texto) => (num(x) === null ? sinDato : texto);
  const ts = (x, texto) => (num(x) === null ? sinCalculo : texto);
  const u = (x, texto) => (num(x) === null ? "" : texto);

  return [
    { clave: "arboles", titulo: "Ejemplar seleccionado", cifra: e.nombreAsignado || "Sin nombre asignado",
      unidad: e.nombreComun || "", texto: e.especie || "Especie por determinar",
      nota: "", largo: true, italica: true },

    { clave: "especies", titulo: "Especie", cifra: e.especie || "Por determinar", unidad: "",
      texto: e.conservacion && e.conservacion.iucn ? `Categoría UICN: ${e.conservacion.iucn}.` : "Clasificación validada contra el SNIB.",
      nota: e.conservacion && e.conservacion.esExotica ? "Especie no originaria de la Cuenca de México" : "", largo: true, italica: true },

    { clave: "altura", titulo: "Altura", cifra: v(alt, 1), unidad: u(alt, "metros"),
      texto: t(alt, `Medida en campo durante el dictamen técnico. Equivale a ${Math.round((alt || 0) / 1.7)} personas de 1.70 m una sobre otra.`),
      nota: "" },

    { clave: "alcaldia", titulo: "Dónde está", cifra: e.alcaldia || "Por determinar",
      unidad: (e.ubicacion && e.ubicacion.colonia) || "",
      texto: (e.ubicacion && e.ubicacion.tipo) ? `Se ubica en ${e.ubicacion.tipo.toLowerCase()}.` : "Ubicación registrada en el listado.",
      nota: "", largo: true },

    { clave: "edad", titulo: "Edad estimada", cifra: v(e.edadEstimada), unidad: u(e.edadEstimada, "años"),
      texto: e.edadEstimada == null
        ? "No fue posible determinar su edad con los elementos técnicos disponibles."
        : `Germinó alrededor del año ${anio}, unas ${Math.round(e.edadEstimada / 25)} generaciones humanas atrás.`,
      nota: "" },

    { clave: "lluvia", titulo: "Lluvia interceptada", cifra: v(s.precipitacionInterceptada_L), unidad: u(s.precipitacionInterceptada_L, "litros al año"),
      texto: ts(s.precipitacionInterceptada_L, "Capturada por su copa antes de tocar el suelo."), nota: "" },

    { clave: "escurrimiento", titulo: "Reducción de escurrimientos", cifra: v(s.escorrentiaReducida_L), unidad: u(s.escorrentiaReducida_L, "litros al año"),
      texto: ts(s.escorrentiaReducida_L, "Agua que este ejemplar evita que corra por la calle."), nota: "" },

    { clave: "carbono", titulo: "Carbono secuestrado", cifra: v(s.carbonoSecuestrado_kg, 2), unidad: u(s.carbonoSecuestrado_kg, "kg al año"),
      texto: ts(s.carbonoSecuestrado_kg, "Almacenado en su tronco, sus ramas y sus raíces."), nota: "" },

    { clave: "co2", titulo: "Absorción de CO₂ equivalente", cifra: v(s.co2Absorbido_kg, 2), unidad: u(s.co2Absorbido_kg, "kg al año"),
      texto: ts(s.co2Absorbido_kg, "Gases de efecto invernadero que retira del aire cada año."), nota: "" },
  ];
}

export function indicadores({ lista, seleccionado, totalPadron }) {
  return seleccionado
    ? indicadoresEjemplar(seleccionado, totalPadron)
    : indicadoresPadron(lista, totalPadron);
}
