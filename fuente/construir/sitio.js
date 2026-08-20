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

/**
 * VERSION_TARJETA · el número que obliga a WhatsApp a volver a mirar.
 *
 * WhatsApp, Facebook y Telegram guardan la vista previa de un enlace la
 * primera vez que alguien lo comparte y la reutilizan durante semanas. La
 * guardan por DIRECCIÓN, no por contenido: si el archivo cambia pero la
 * dirección no, el reenvío sigue mostrando la imagen vieja. Por eso la
 * portada anunciaba «GUARDIANES DEL TIEMPO» mucho después de que el sitio
 * dejara de llamarse así.
 *
 * Al subir este número la dirección deja de ser la misma y el servicio
 * descarga la imagen otra vez. SE SUBE CADA VEZ QUE SE REDIBUJE compartir.jpg.
 */
const VERSION_TARJETA = 2;

const url = (ruta = "") => BASE + String(ruta).replace(/^\//, "");

module.exports = {
  BASE,
  VERSION_TARJETA,
  url,
  // La imagen para compartir se pide siempre por aquí, nunca con url() a secas.
  urlTarjeta: () => url("assets/img/portada/compartir.jpg") + "?v=" + VERSION_TARJETA,
};
