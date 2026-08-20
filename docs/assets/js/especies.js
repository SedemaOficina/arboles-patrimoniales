/**
 * especies.js · Árboles patrimoniales
 * Siluetas vectoriales de las especies presentes en el registro patrimonial.
 *
 * Cada silueta se dibuja dentro de un lienzo normalizado de 100 × 100 con la
 * base del tronco en y = 100, de modo que basta escalar el SVG a la altura real
 * medida en campo para que la comparación entre ejemplares sea verdadera.
 *
 * Los perfiles describen el porte característico de la especie —proporción de
 * fuste, amplitud y densidad de copa, ramificación— no a un ejemplar concreto.
 */

export const PERFIL_GENERICO = {
  clave: "generico",
  nombre: "Árbol",
  anchoCopa: 0.86,      // ancho de copa como fracción de la altura total
  fusteAlto: 0.34,      // altura del fuste limpio como fracción de la altura
  fusteAncho: 0.055,
  lobulos: [[50,44,30,26],[33,52,22,20],[67,52,22,20],[50,30,24,18]],
  ramas: [],
  raices: [],
  contrafuerte: 0,
};

export const PERFILES = {
  /* Taxodium mucronatum · ahuehuete o sabino.
     Fuste muy grueso y corto con base ensanchada; copa amplia, irregular y
     algo aplanada, más ancha que alta en ejemplares viejos. */
  "taxodium mucronatum": {
    clave: "taxodium",
    nombre: "Ahuehuete",
    anchoCopa: 1.12,
    fusteAlto: 0.26,
    fusteAncho: 0.17,
    contrafuerte: 0.42,
    lobulos: [
      [50,46,34,25],[26,55,23,19],[74,55,23,19],[38,33,25,19],[63,34,24,18],
      [50,24,20,14],[16,66,16,13],[84,66,16,13],[50,62,30,20],
    ],
    ramas: [[50,74,28,52],[50,74,72,52],[50,70,50,40]],
    raices: [],
  },

  /* Fraxinus uhdei · fresno mexicano.
     Fuste recto y esbelto, copa oval erguida, más alta que ancha. */
  "fraxinus uhdei": {
    clave: "fraxinus",
    nombre: "Fresno mexicano",
    anchoCopa: 0.72,
    fusteAlto: 0.36,
    fusteAncho: 0.075,
    contrafuerte: 0.12,
    lobulos: [
      [50,40,26,30],[36,50,19,20],[64,50,19,20],[50,20,20,15],
      [41,29,18,16],[59,29,18,16],[50,58,24,18],
    ],
    ramas: [[50,66,36,44],[50,66,64,44],[50,64,50,30]],
    raices: [],
  },

  /* Ficus microcarpa · laurel de la India.
     Ramificación baja, copa en domo muy ancho y denso, raíces aéreas. */
  "ficus microcarpa": {
    clave: "ficus",
    nombre: "Laurel de la India",
    anchoCopa: 1.32,
    fusteAlto: 0.2,
    fusteAncho: 0.13,
    contrafuerte: 0.3,
    lobulos: [
      [50,48,38,26],[22,58,24,20],[78,58,24,20],[36,34,26,19],[64,34,26,19],
      [50,26,24,16],[10,68,15,12],[90,68,15,12],[50,64,34,20],
    ],
    ramas: [[50,80,22,58],[50,80,78,58],[50,78,50,44]],
    raices: [[28,64,80],[38,68,84],[62,68,84],[72,64,80]],
  },
};

/**
 * Ilustración de referencia por especie. Ruta de la imagen recortada sobre
 * fondo transparente, o null mientras no se cuente con una licenciada.
 *
 * Requisitos para incorporar una: derechos de la Secretaría o licencia expresa
 * para uso público, ejemplar de la especie correcta, fondo transparente (PNG o
 * WebP), y el árbol completo con el fuste tocando el borde inferior, para que
 * la escala por altura siga siendo verdadera.
 */
export const ILUSTRACIONES = {
  taxodium: "assets/img/especies/taxodium-grande.webp",   // Taxodium mucronatum · ahuehuete
  fraxinus: "assets/img/especies/fraxinus-grande.webp",   // Fraxinus uhdei · fresno mexicano
  ficus:    "assets/img/especies/ficus-grande.webp",      // Ficus microcarpa · laurel de la India
  generico: null,
};

/* Proporción ancho/alto de cada ilustración, medida sobre el archivo ya
   recortado a su contorno. Permite reservar el ancho correcto sin esperar a
   que la imagen cargue, y mantiene verdadera la comparación de alturas. */
export const PROPORCION_ILUSTRACION = {
  taxodium: 0.95,
  fraxinus: 1.39,
  ficus: 1.70,
};

/**
 * Silueta humana de referencia. El lienzo normalizado equivale a 1.70 m de
 * estatura, de modo que basta escalarlo igual que a los árboles para que la
 * comparación sea real.
 */
export const PERSONA = {
  // Silueta de una persona de pie. Se dibuja con masa —hombros, torso,
  // brazos junto al cuerpo, dos piernas— porque a 15 px, que es lo que
  // mide 1.70 m junto a un ahuehuete de 30 m, una figura de líneas
  // desaparece y una figura sólida se lee.
  viewBox: "-12 0 34 100",
  proporcion: 0.34,
  d: "M12 0c2.9 0 5.2 2.4 5.2 5.3 0 2-1.1 3.8-2.8 4.7l4.1 1.6c2.3.9 3.8 3 4 5.5l1 14c.1 1.6-1.1 3-2.7 3.1-1.6.1-2.9-1.1-3-2.7l-.6-8.6-.5 14 3.2 19.6c.3 1.6-1 3.1-2.6 3.1h-.4l-.6 33.6c0 2.4-2 4.3-4.4 4.2-2.2-.1-4-1.8-4.1-4l-.9-27.4h-.4l-.9 27.4c-.1 2.2-1.9 3.9-4.1 4-2.4.1-4.4-1.8-4.4-4.2L-.9 60h-.4c-1.6 0-2.9-1.5-2.6-3.1l3.2-19.6-.5-14-.6 8.6c-.1 1.6-1.4 2.8-3 2.7-1.6-.1-2.8-1.5-2.7-3.1l1-14c.2-2.5 1.7-4.6 4-5.5l4.1-1.6C-.1 9.1-1.2 7.3-1.2 5.3-1.2 2.4 1.1 0 4 0z",
};

/** Silueta humana como SVG, escalada a la altura en píxeles que se le indique. */
export function svgPersona(alturaPx, opciones = {}) {
  const ancho = alturaPx * PERSONA.proporcion;
  const relleno = opciones.relleno ? ` fill="${opciones.relleno}"` : "";
  return `<svg class="persona" width="${ancho.toFixed(1)}" height="${alturaPx.toFixed(1)}" viewBox="${PERSONA.viewBox}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="persona__cuerpo" d="${PERSONA.d}"${relleno}/></svg>`;
}

/** Ruta de la ilustración de la especie, si está disponible. */
export function ilustracionDe(especie) {
  return ILUSTRACIONES[perfilDe(especie).clave] || null;
}

/** Devuelve el perfil de la especie; si no está catalogada, uno genérico. */
export function perfilDe(especie) {
  const k = String(especie || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return PERFILES[k] || PERFIL_GENERICO;
}

/**
 * Construye la silueta de un ejemplar.
 * @param {string} especie   binomio del registro
 * @param {number} alturaPx  altura total en píxeles a la que debe dibujarse
 * @param {number} copaReal  extensión de copa en metros, si el registro la tiene
 * @param {number} alturaReal altura total en metros
 */
export function silueta(especie, alturaPx, copaReal, alturaReal, anchoMax) {
  const p = perfilDe(especie);
  // Si el registro trae extensión de copa medida, manda sobre el porte típico.
  const razon = (copaReal && alturaReal) ? (copaReal / alturaReal) : p.anchoCopa;
  let anchoPx = alturaPx * Math.min(Math.max(razon, 0.45), 1.6);
  // En hileras comparativas el ancho se acota al carril disponible: lo que la
  // pieza afirma es la altura, y las copas traslapadas la vuelven ilegible.
  if (anchoMax && anchoPx > anchoMax) anchoPx = anchoMax;
  return {
    clave: p.clave,
    nombre: p.nombre,
    ancho: anchoPx,
    alto: alturaPx,
    // El viewBox normalizado permite escalar sin recalcular geometría.
    viewBox: "0 0 100 100",
    lobulos: p.lobulos.map(([cx, cy, rx, ry]) => ({ cx, cy, rx, ry })),
    ramas: p.ramas.map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2 })),
    raices: p.raices.map(([x, y1, y2]) => ({ x, y1, y2 })),
    fuste: {
      x: 50 - (p.fusteAncho * 100) / 2,
      ancho: p.fusteAncho * 100,
      y: 100 - p.fusteAlto * 100,
      alto: p.fusteAlto * 100,
    },
    contrafuerte: p.contrafuerte,
  };
}

/**
 * Geometría de la silueta lista para plantillas declarativas: los trazos
 * múltiples se entregan como una sola cadena de path, de modo que la plantilla
 * no necesite iterar dentro del SVG.
 */
export function siluetaPlana(especie, alturaPx, copaReal, alturaReal, anchoMax) {
  const s = silueta(especie, alturaPx, copaReal, alturaReal, anchoMax);
  const f = s.fuste;
  const base = s.contrafuerte
    ? `M ${(f.x - f.ancho * s.contrafuerte).toFixed(2)} 100 Q ${f.x.toFixed(2)} ${(100 - f.alto * 0.45).toFixed(2)} ${f.x.toFixed(2)} ${(100 - f.alto * 0.6).toFixed(2)} L ${(f.x + f.ancho).toFixed(2)} ${(100 - f.alto * 0.6).toFixed(2)} Q ${(f.x + f.ancho).toFixed(2)} ${(100 - f.alto * 0.45).toFixed(2)} ${(f.x + f.ancho * (1 + s.contrafuerte)).toFixed(2)} 100 Z`
    : "";
  return {
    clave: s.clave, nombre: s.nombre,
    ancho: s.ancho.toFixed(1), alto: s.alto.toFixed(1),
    ilustracion: ILUSTRACIONES[s.clave] || null,
    hayIlustracion: Boolean(ILUSTRACIONES[s.clave]),
    contorno: CONTORNOS[s.clave] || CONTORNOS.generico,
    fusteX: f.x.toFixed(2), fusteY: f.y.toFixed(2),
    fusteAncho: f.ancho.toFixed(2), fusteAlto: f.alto.toFixed(2),
    base,
    ramas: s.ramas.map((r) => `M ${r.x1} ${r.y1} L ${r.x2} ${r.y2}`).join(" "),
    raices: s.raices.map((r) => `M ${r.x} ${r.y1} L ${r.x} ${r.y2}`).join(" "),
    tieneBase: Boolean(base),
    tieneRaices: s.raices.length > 0,
  };
}

/** Silueta como cadena SVG lista para insertar. */
/* Contornos de copa dibujados como trazo único, con el perfil característico
   de cada especie. Coordenadas en el lienzo normalizado 0–100. */
export const CONTORNOS = {
  taxodium:
    "M50 8 C60 8 68 11 72 16 C79 15 85 19 87 25 C94 27 97 33 95 39 C99 43 99 50 94 54 " +
    "C96 60 92 66 85 66 C82 71 75 73 68 71 C64 75 56 76 50 74 C44 76 36 75 32 71 " +
    "C25 73 18 71 15 66 C8 66 4 60 6 54 C1 50 1 43 5 39 C3 33 6 27 13 25 C15 19 21 15 28 16 " +
    "C32 11 40 8 50 8 Z",
  fraxinus:
    "M50 4 C58 4 65 8 69 15 C76 19 79 27 77 35 C81 42 79 51 73 56 C71 63 64 68 56 68 " +
    "C53 71 47 71 44 68 C36 68 29 63 27 56 C21 51 19 42 23 35 C21 27 24 19 31 15 C35 8 42 4 50 4 Z",
  ficus:
    "M50 14 C62 14 72 18 78 25 C88 25 96 31 97 39 C102 44 101 52 95 56 C96 63 90 69 82 68 " +
    "C77 73 68 75 60 73 C56 76 44 76 40 73 C32 75 23 73 18 68 C10 69 4 63 5 56 " +
    "C-1 52 -2 44 3 39 C4 31 12 25 22 25 C28 18 38 14 50 14 Z",
  generico:
    "M50 8 C60 8 69 13 73 21 C81 25 84 34 81 42 C84 50 80 59 72 62 C68 69 59 72 50 70 " +
    "C41 72 32 69 28 62 C20 59 16 50 19 42 C16 34 19 25 27 21 C31 13 40 8 50 8 Z",
};

/**
 * Silueta como cadena SVG lista para insertar.
 * El color se resuelve por CSS (.silueta__copa y .silueta__tronco), no por
 * referencias a gradientes: así la pieza funciona en cualquier página sin
 * depender de definiciones externas.
 */
export function svgSilueta(especie, alturaPx, copaReal, alturaReal, opciones = {}) {
  const s = silueta(especie, alturaPx, copaReal, alturaReal, opciones.anchoMax);
  const copa = opciones.copa || null;
  const tronco = opciones.tronco || null;
  const fCopa = copa ? ` fill="${copa}"` : "";
  const fTronco = tronco ? ` fill="${tronco}"` : "";
  const sTronco = tronco ? ` stroke="${tronco}"` : "";
  const base = s.contrafuerte
    ? `<path class="silueta__tronco"${fTronco} d="M ${s.fuste.x - s.fuste.ancho * s.contrafuerte} 100 Q ${s.fuste.x} ${100 - s.fuste.alto * 0.45} ${s.fuste.x} ${100 - s.fuste.alto * 0.6} L ${s.fuste.x + s.fuste.ancho} ${100 - s.fuste.alto * 0.6} Q ${s.fuste.x + s.fuste.ancho} ${100 - s.fuste.alto * 0.45} ${s.fuste.x + s.fuste.ancho * (1 + s.contrafuerte)} 100 Z"/>`
    : "";
  return `<svg class="silueta silueta--${s.clave}" width="${s.ancho.toFixed(1)}" height="${s.alto.toFixed(1)}" viewBox="${s.viewBox}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    ${s.ramas.map((r) => `<line class="silueta__rama" x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}"${sTronco} stroke-width="2.4" stroke-linecap="round"/>`).join("")}
    <rect class="silueta__tronco" x="${s.fuste.x.toFixed(2)}" y="${s.fuste.y.toFixed(2)}" width="${s.fuste.ancho.toFixed(2)}" height="${s.fuste.alto.toFixed(2)}"${fTronco}/>
    ${base}
    ${s.raices.map((r) => `<line class="silueta__rama" x1="${r.x}" y1="${r.y1}" x2="${r.x}" y2="${r.y2}"${sTronco} stroke-width="1.5" opacity="0.75" stroke-linecap="round"/>`).join("")}
    <path class="silueta__copa" d="${CONTORNOS[s.clave] || CONTORNOS.generico}"${fCopa}/>
  </svg>`;
}
