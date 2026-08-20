/**
 * sitio.js · La dirección pública del sitio, en un solo lugar.
 *
 * El «canonical», el «og:url» y el «og:image» tienen que ser absolutos: una
 * imagen para compartir con ruta relativa no la resuelve ningún servicio, y
 * un canonical que apunte a un dominio que todavía no existe le dice a los
 * buscadores que ignoren la versión que sí está publicada.
 *
 * Se cambia AQUÍ, una vez, el día que el sitio se mude al servidor definitivo.
 * Se puede sobrescribir sin tocar el archivo:
 *
 *   BASE_SITIO=https://sedema.cdmx.gob.mx/arboles-patrimoniales/ ./construir.sh produccion
 */
const PORDEFECTO = "https://sedemaoficina.github.io/arboles-patrimoniales/";

// Se garantiza la diagonal final: sin ella, unir rutas produce direcciones rotas.
const crudo = process.env.BASE_SITIO || PORDEFECTO;
const BASE = crudo.endsWith("/") ? crudo : crudo + "/";

module.exports = { BASE, url: (ruta = "") => BASE + String(ruta).replace(/^\//, "") };
