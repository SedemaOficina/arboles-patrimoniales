/**
 * convocatoria.js · Si la convocatoria está abierta, en un solo lugar.
 *
 * El menú anunciaba «Postula» los doce meses del año. Con la convocatoria
 * cerrada eso es una invitación a una puerta que no abre: la persona recorre
 * el sitio, llega al bloque y ahí se entera de que no se puede. El enlace
 * aparece solo cuando hay a dónde llegar.
 *
 * SE CAMBIA AQUÍ, una sola vez, el día que se publique la convocatoria. El
 * bloque de la portada declara su propio estado en `data-estado`, y una
 * aserción comprueba que los dos digan lo mismo: son dos caras del mismo
 * hecho y no pueden separarse en silencio.
 */
const ABIERTA = false;

/* El enlace del menú va envuelto en marcas de comentario dentro del
   encabezado. Las marcas son comentarios HTML: si algún armador se olvidara
   de pasar por aquí, la página seguiría siendo válida y el enlace se vería,
   que es el fallo menos dañino de los dos posibles. */
const MARCAS = /<!--#\/?si-convocatoria-->/g;
const BLOQUE = /<!--#si-convocatoria-->[\s\S]*?<!--#\/si-convocatoria-->/g;

const resolverMenu = (html) =>
  ABIERTA ? html.replace(MARCAS, '') : html.replace(BLOQUE, '');

module.exports = { ABIERTA, resolverMenu };
