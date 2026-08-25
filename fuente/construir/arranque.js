/**
 * arranque.js · La guardia que evita la página en blanco.
 *
 * Todo el guion de cada página viaja en un solo bloque que termina llamando a
 * la función de pintado, y los contenedores se publican vacíos: los llena el
 * guion al cargar. Si esa llamada lanza —un campo inesperado, un navegador sin
 * una API, un dato a medio migrar—, el visitante se queda frente a una página
 * que parece completa y no tiene nada dentro. Ni un mensaje.
 *
 * Esto pinta el mismo cintillo que ya existe para quien llega sin JavaScript
 * —misma clase, misma hoja de estilo, ninguna regla nueva— y manda al mismo
 * sitio: los datos abiertos, que se leen sin depender de esta página.
 *
 * Se arma con el DOM y no con innerHTML a propósito: aquí no entra texto de
 * nadie, y así sigue siendo cierto que ningún dato del padrón se escribe sin
 * escapar.
 *
 * Lo usan los tres armadores. Se edita AQUÍ, una vez.
 */

/** El cuerpo de la función, para incrustar en el guion de la página. */
const GUARDIA = `
function pintarFalloDeArranque(e){
  try{
    if(window.console&&console.error)console.error('Árboles patrimoniales · no se pudo pintar la página:',e);
    if(document.querySelector('[data-fallo-arranque]'))return;
    var d=document.createElement('div');
    d.className='sin-guion';
    d.setAttribute('data-fallo-arranque','1');
    d.setAttribute('role','alert');
    var p=document.createElement('p');
    p.className='envoltura';
    var b=document.createElement('b');
    b.textContent='No pudimos mostrar el registro en esta página.';
    var t=document.createTextNode(' Vuelve a cargarla. Si sigue igual, el registro completo se descarga aparte y no depende de esta página. ');
    var a=document.createElement('a');
    a.href='__RECURSOS__#datos';
    a.textContent='Descargar los datos del registro';
    p.appendChild(b);p.appendChild(t);p.appendChild(a);
    d.appendChild(p);
    document.body.insertBefore(d,document.body.firstChild);
  }catch(_){}
}`;

/**
 * Envuelve una llamada de arranque.
 *   proteger("pintarPortada(DATOS);")
 */
const proteger = (llamada) => `try{${llamada}}catch(e){pintarFalloDeArranque(e);}`;

module.exports = { GUARDIA, proteger };
