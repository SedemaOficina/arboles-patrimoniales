/**
 * citar.js · Un botón para copiar cada cita.
 *
 * Las tres citas son plantillas: se copian y se rellenan en el gestor
 * bibliográfico o en el documento. Seleccionarlas a mano en un párrafo
 * justificado, sin arrastrar de más ni de menos, es justo la fricción que
 * hace que nadie cite.
 *
 * EL BOTÓN NO SE DIBUJA SI NO SE PUEDE COPIAR. La API del portapapeles solo
 * existe en contexto seguro —https o localhost—: abriendo el archivo con
 * doble clic no está. Un botón que no hace nada es peor que ninguno, así que
 * se monta solo cuando hay con qué.
 */
export function montarCopiaCitas() {
  if (!navigator.clipboard || !navigator.clipboard.writeText) return;
  document.querySelectorAll(".cita").forEach((cita) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "cita__copiar";
    // aria-live: quien no ve el cambio de color necesita oír que se copió.
    boton.innerHTML = '<span class="cita__copiar-aviso" aria-live="polite">Copiar cita</span>';
    const aviso = boton.firstChild;
    let reloj = null;
    boton.addEventListener("click", () => {
      // Un solo espacio entre palabras: el párrafo trae saltos de línea del
      // marcado que en el documento de destino se verían como cortes.
      const texto = cita.textContent.replace(/\s+/g, " ").trim();
      navigator.clipboard.writeText(texto).then(() => {
        boton.classList.add("cita__copiar--hecho");
        aviso.textContent = "Cita copiada";
      }).catch(() => {
        // El permiso puede negarse. Se dice, en vez de fingir que se copió.
        aviso.textContent = "No se pudo copiar";
      }).then(() => {
        clearTimeout(reloj);
        reloj = setTimeout(() => {
          boton.classList.remove("cita__copiar--hecho");
          aviso.textContent = "Copiar cita";
        }, 2400);
      });
    });
    cita.insertAdjacentElement("afterend", boton);
  });
}
