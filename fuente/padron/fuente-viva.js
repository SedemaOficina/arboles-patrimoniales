/**
 * LA FUENTE VIVA DEL PADRÓN
 * ---------------------------------------------------------------------------
 * Aquí se conecta lo que lector-v2.js deja hecho. Este archivo baja el CSV
 * publicado de la hoja «Salida_Publica», se lo pasa al lector y devuelve el
 * registro. No pinta nada, no decide qué se ve y no toca el DOM: de eso se
 * encarga la portada.
 *
 * LA REGLA QUE GOBIERNA ESTE ARCHIVO
 * El congelado manda hasta que la hoja demuestre que tiene algo. Un registro
 * vivo que llega vacío no sustituye a nada: se descarta con su motivo escrito
 * y el sitio sigue mostrando lo que ya tenía. Una hoja en blanco no puede
 * vaciar el micrositio —ni por error de captura, ni porque Google devuelva
 * una página de mantenimiento, ni porque alguien despublique la hoja—.
 *
 * Por eso todo lo de aquí devuelve `{registro, origen, motivo}` y nunca lanza
 * hacia afuera: quien llama decide, y su decisión por defecto es no cambiar
 * nada.
 */

import { construirRegistro } from "./lector-v2.js";

/* La dirección de la hoja publicada. Vive también en datos/contrato-v2.json,
   que es el documento que revisa el área de datos; la suite comprueba que las
   dos digan lo mismo, para que nadie mueva una sin la otra. */
export const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTb8DIn-UxYrBo-k91vleNcsfQoMVlQjtWp4YurZHgeh-_p0pSWLt-yeWS86wKybtQfj1D4wveAEtyw/pub?gid=283285465&single=true&output=csv";

export const ESQUEMA = 7;                       // sube al cambiar la forma del ejemplar
export const CLAVE_CACHE = "arboles_patrimoniales_registro_v7";

/* DIEZ MINUTOS, no una hora.
   El registro cambia poco, pero cuando cambia suele ser porque alguien
   corrigió un dato equivocado, y una fe de erratas que tarda una hora en verse
   se siente rota. Google además sirve el CSV publicado desde su propia caché
   de unos cinco minutos, así que bajar de diez no compra nada. */
export const VIGENCIA_MS = 10 * 60 * 1000;

/* Respaldo de emergencia: si la red falla, vale más un registro de hace días
   que ninguno. Nunca sustituye al congelado sin decirlo: viaja marcado. */
export const RESPALDO_MAX_MS = 7 * 24 * 60 * 60 * 1000;

export const ESPERA_MS = 12000;
export const REINTENTOS = 2;

/* ── 1 · El almacén ───────────────────────────────────────────────────────
   localStorage no siempre está: en modo privado, dentro de un iframe con
   sandbox o con las cookies bloqueadas, el simple hecho de tocarlo lanza. Se
   prueba escribiendo, que es la única forma honesta de saberlo. */
export function almacen(global) {
  const g = global || (typeof globalThis !== "undefined" ? globalThis : {});
  try {
    const st = g.localStorage;
    if (!st) return null;
    const p = "__prueba_arboles__";
    st.setItem(p, "1");
    st.removeItem(p);
    return st;
  } catch (e) {
    return null;
  }
}

/* ── 2 · La caché ─────────────────────────────────────────────────────────
   Nunca se guarda un registro vacío y nunca se devuelve uno vacío. Es la
   misma regla de arriba, aplicada al disco: si lo guardado no tiene
   ejemplares, es como si no hubiera nada guardado. */
export function leerCache({ permitirRespaldo = false, st = almacen(), ahora = Date.now() } = {}) {
  if (!st) return null;
  try {
    const crudo = st.getItem(CLAVE_CACHE);
    if (!crudo) return null;
    const p = JSON.parse(crudo);
    if (!p || p.esquema !== ESQUEMA) return null;
    if (!p.registro || !Array.isArray(p.registro.ejemplares) || !p.registro.ejemplares.length) return null;
    if (typeof p.guardadoEn !== "number") return null;
    const edad = ahora - p.guardadoEn;
    if (edad < 0) return null;                    // reloj movido: no se confía
    const vigente = edad <= VIGENCIA_MS;
    if (!vigente && !(permitirRespaldo && edad <= RESPALDO_MAX_MS)) return null;
    return { registro: p.registro, edadMs: edad, vigente };
  } catch (e) {
    return null;
  }
}

export function escribirCache(registro, { st = almacen(), ahora = Date.now() } = {}) {
  if (!st) return false;
  if (!registro || !Array.isArray(registro.ejemplares) || !registro.ejemplares.length) return false;
  try {
    st.setItem(CLAVE_CACHE, JSON.stringify({ esquema: ESQUEMA, guardadoEn: ahora, registro }));
    return true;
  } catch (e) {
    // Cuota llena. Se borra lo que hubiera y se sigue sin caché: la caché es
    // una comodidad, no un requisito.
    try { st.removeItem(CLAVE_CACHE); } catch (_) {}
    return false;
  }
}

export function limpiarCache({ st = almacen() } = {}) {
  if (!st) return;
  try { st.removeItem(CLAVE_CACHE); } catch (e) {}
}

/* ── 3 · La descarga ──────────────────────────────────────────────────────
   Tres cosas que pasan de verdad y que un fetch pelado no distingue:
   la hoja despublicada devuelve 404; Google contesta a veces con una página
   HTML de sesión o de mantenimiento en lugar del CSV; y la red se queda
   colgada sin cerrar nunca. Las tres se convierten en un error con nombre. */
export async function bajarTexto(url, opciones = {}) {
  const {
    espera = ESPERA_MS,
    reintentos = REINTENTOS,
    traer = (typeof fetch !== "undefined" ? fetch : null),
    dormir = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opciones;

  if (!traer) throw new Error("Este entorno no puede hacer peticiones de red.");

  let ultimo = null;
  for (let intento = 0; intento <= reintentos; intento++) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const reloj = ctrl ? setTimeout(() => ctrl.abort(), espera) : null;
    try {
      const res = await traer(url, {
        cache: "no-store",
        redirect: "follow",
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (reloj) clearTimeout(reloj);
      if (!res.ok) {
        throw new Error(res.status === 404
          ? "La hoja publicada no responde (404). Puede haberse despublicado o cambiado de dirección."
          : `La hoja publicada respondió HTTP ${res.status}.`);
      }
      const texto = await res.text();
      if (/^\s*<(!doctype|html)/i.test(texto)) {
        throw new Error("Google devolvió una página HTML en lugar del CSV. Revisa que la hoja siga publicada en la web.");
      }
      return texto;
    } catch (err) {
      if (reloj) clearTimeout(reloj);
      ultimo = err && err.name === "AbortError"
        ? new Error("La descarga del registro excedió el tiempo de espera.")
        : err;
      if (intento < reintentos) await dormir(400 * Math.pow(2, intento));
    }
  }
  throw ultimo || new Error("No fue posible descargar el registro.");
}

/* ── 4 · La huella ────────────────────────────────────────────────────────
   Sirve para no repintar cuando no cambió nada. Repintar de balde no es
   gratis: tira el mapa y lo vuelve a montar delante de quien lo está usando.
   La huella toma lo que se ve, no el objeto entero, para que un cambio de
   diagnóstico interno no cuente como cambio de contenido. */
export function huella(registro) {
  const lista = (registro && registro.ejemplares) || [];
  return JSON.stringify(lista.map((e) => [
    e.id, e.nombreAsignado, e.especie, e.alcaldia,
    (e.categorias || []).join("|"),
    e.fechaDecreto && e.fechaDecreto.iso,
    e.coords && e.coords.lat, e.coords && e.coords.lng,
    e.morfologia && e.morfologia.altura_m,
    e.edadEstimada, e.condicion, e.tieneCifrasAmbientales,
  ]).sort());
}

export function hayCambio(anterior, nuevo) {
  return huella(anterior) !== huella(nuevo);
}

/* ── 5 · La puerta ────────────────────────────────────────────────────────
 * Única función que llama la portada. Devuelve SIEMPRE la misma forma:
 *
 *   { registro, origen, motivo, edadMs }
 *
 * `registro` es null cuando no hay nada que sustituya al congelado, y
 * entonces `motivo` dice por qué, en una frase que se puede leer en la
 * consola sin conocer el código. `origen` distingue de dónde salió lo que se
 * devuelve: "red", "cache", "respaldo".
 *
 * No lanza nunca. Un fallo de red no debe tumbar la portada.
 */
export async function cargarEnVivo(opciones = {}) {
  const {
    contrato,
    url = CSV_URL,
    forzar = false,
    st = almacen(),
    ahora = Date.now(),
    construir = construirRegistro,
    bajar = bajarTexto,
    espera = ESPERA_MS,
    reintentos = REINTENTOS,
    traer,
  } = opciones;

  if (!contrato || !Array.isArray(contrato.campos)) {
    return { registro: null, origen: null, motivo: "No se recibió el contrato del registro: sin él no se puede leer la hoja." };
  }

  if (!forzar) {
    const c = leerCache({ st, ahora });
    if (c) return { registro: c.registro, origen: "cache", motivo: null, edadMs: c.edadMs };
  }

  try {
    const texto = await bajar(url, { espera, reintentos, traer });
    const registro = construir(texto, contrato);

    /* LA GUARDIA. Aquí es donde el congelado gana.
       Hoy la hoja está vacía a propósito —el equipo todavía no captura—, así
       que este camino es el normal, no la excepción. */
    if (!registro || !registro.ejemplares.length) {
      const leidas = (registro && registro.meta && registro.meta.filasLeidas) || 0;
      return {
        registro: null,
        origen: "red",
        motivo: leidas
          ? `La hoja respondió con ${leidas} fila(s), ninguna con id: no hay ejemplares publicados. Se conserva el registro anterior.`
          : "La hoja respondió sin ninguna fila. Se conserva el registro anterior.",
      };
    }

    escribirCache(registro, { st, ahora });
    return { registro, origen: "red", motivo: null, edadMs: 0 };
  } catch (err) {
    /* Respaldo: antes que dejar el sitio sin actualizar, se acepta lo guardado
       hasta hace siete días, pero marcado como viejo para que quien lo lea lo
       sepa. Y si tampoco hay respaldo, no pasa nada: el congelado sigue ahí. */
    const r = leerCache({ permitirRespaldo: true, st, ahora });
    if (r) {
      return {
        registro: r.registro,
        origen: "respaldo",
        edadMs: r.edadMs,
        motivo: `No se pudo actualizar el registro (${err.message}). Se muestra lo guardado.`,
      };
    }
    return { registro: null, origen: null, motivo: `No se pudo actualizar el registro (${err.message}). Se conserva el registro publicado con el sitio.` };
  }
}
