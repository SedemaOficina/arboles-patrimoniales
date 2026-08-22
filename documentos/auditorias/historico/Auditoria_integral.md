# Auditoría integral del micrositio de árboles patrimoniales
**Secretaría del Medio Ambiente de la Ciudad de México · 19 de agosto de 2026**

Barrido automatizado de las tres páginas —portada, ficha y recursos— en once anchuras de pantalla, de 320 a 1920 píxeles. Se revisó paleta y contraste, tipografía y pesos, distribución, navegación, interactividad, botones, consistencia, persistencia de estado, accesibilidad y errores de ejecución.

Todos los hallazgos de severidad alta y media quedaron corregidos y fijados en la suite de verificación. Lo que sigue es el registro de lo encontrado y lo que se hizo con cada cosa.

---

## 1. Bugs de comportamiento

**Los marcadores excluidos por el filtro seguían siendo tocables.**
Al filtrar el mapa por alcaldía o especie, los puntos que quedaban fuera se atenuaban al 28 % pero conservaban su clic y su lugar en el recorrido de teclado. Se podía abrir el globo de un ejemplar que el filtro acababa de excluir, lo que contradice al propio filtro. Ahora se atenúan al 22 %, pierden los eventos de puntero y salen del recorrido con `tabindex="-1"` y `aria-hidden`. Siguen visibles como contexto: saber dónde están los demás es útil.

**Al quitar la selección o borrar los filtros, el mapa no volvía a encuadrar.**
El listado se restauraba pero la vista seguía acercada sobre el último ejemplar elegido, con la mitad de los puntos fuera de cuadro. Parecía que el botón no había hecho nada. Se agregó `reencuadrar()`, que ajusta la vista a los ejemplares visibles al cambiar un filtro, al borrarlos y al quitar la selección.

**El enlace «Saltar al contenido» era inalcanzable.**
Estaba posicionado con `absolute`, así que al recibir el foco aparecía en el tope del *documento*. Si la persona ya había desplazado la página, el enlace se enfocaba fuera de pantalla y nunca se veía. Corregido a `fixed`.

**El logotipo de la barra apuntaba a un ancla inexistente.**
`href="#inicio"` sin ningún elemento con ese identificador: el navegador cambiaba la dirección y se quedaba donde estaba. Se agregó `id="inicio"` a la sección de portada.

---

## 2. Contraste

Se midió cada nodo de texto de las tres páginas componiendo el fondo capa por capa. Esto importa: una capa `rgba(199,159,202,.05)` sobre un bloque casi negro no es lila claro, es casi negro, y leerla como opaca producía decenas de falsos positivos.

| Elemento | Antes | Ahora |
|---|---|---|
| Nota del panel de indicadores | 2.98:1 | 6.4:1 |
| Etiqueta «Histórico» / «Singular» | 4.32:1 | 5.4:1 |
| Crédito fotográfico de la galería | 3.28:1 | 4.9:1 |
| Renglones «Sin dato» de servicios | 3.44:1 | 6.1:1 |

Ningún texto queda por debajo del mínimo AA en ninguna de las tres páginas.

---

## 3. Tipografía

**Leaflet imponía sus propias familias.** El lienzo del mapa heredaba Helvetica Neue y los botones de zoom Lucida Console: el sitio usaba cinco familias donde debía usar tres. Se sobrescriben con la tipografía del sitio.

**Jerarquía de encabezados.** Los datos del panel del mapa eran `h4` colgando directamente de un `h2`, sin `h3` intermedio. Corregido a `h3`.

**Tamaños.** Quedan rótulos de 11 píxeles en versalitas con interletrado amplio y contraste alto: es una convención editorial legible y se conserva. El único texto de 8.5 píxeles es la bajada del logotipo institucional de Gobierno, que es parte de la marca oficial y no se altera.

---

## 4. Distribución y comportamiento adaptable

**El titular de la portada se cortaba en teléfonos.** El mínimo del `clamp` era de 52 píxeles, mayor que el ancho disponible: entre 320 y 414 píxeles la palabra PATRIMONIALES se salía de su caja unos 40 píxeles. Nuevo mínimo de 34 píxeles y sin interletrado adicional.

**La marca se recortaba en dos puntos.** A 1024 píxeles, con el menú completo de siete opciones, la barra iba justa y cortaba el nombre del sitio; a 320 píxeles el logotipo y el nombre no cabían juntos. Se aprieta primero la navegación y se agregó un punto de quiebre a 345 píxeles.

Resultado: **once anchuras limpias** en las tres páginas, sin desbordamiento horizontal ni texto cortado.

---

## 5. Objetivos táctiles

Los enlaces de texto sueltos medían lo que su renglón —15 píxeles de alto— y eran difíciles de tocar en un teléfono. Ahora alcanzan 24 píxeles, y 32 en dispositivos de puntero grueso.

Los marcadores del mapa se veían de 16 píxeles y esa era también su área de toque. El icono creció a 26 píxeles con relleno transparente y el punto se dibuja centrado dentro: se toca mejor sin engordar el mapa.

---

## 6. Persistencia de estado

Era el hallazgo de mayor impacto en el uso real. Quien filtraba el listado, entraba a una ficha y volvía con el botón «atrás» encontraba el listado completo otra vez: había perdido su búsqueda sin haber hecho nada.

Ahora el estado viaja en la dirección: el filtro de categoría y la búsqueda del listado (`cat`, `q`), y los tres filtros del mapa más el ejemplar seleccionado (`mcat`, `malc`, `mesp`, `sel`). Sobrevive a la recarga y al botón «atrás», y permite compartir una dirección con el filtro ya puesto.

---

## 7. Accesibilidad

- Enlace «Saltar al contenido» en las tres páginas, primero en el recorrido de teclado.
- `<main id="contenido">` como destino, con las marcas semánticas completas.
- Todas las imágenes con texto alternativo; ningún enlace ni botón sin nombre accesible.
- Un solo `h1` por página y jerarquía sin saltos.
- El menú móvil se abre y cierra con teclado, anuncia su estado con `aria-expanded` y responde a la tecla de escape.

**Lo que no se puede verificar de forma automatizada** y sigue pendiente: el recorrido completo con un lector de pantalla real —NVDA o VoiceOver— y con una persona usuaria.

---

## 8. Cobertura de verificación

| Suite | Aserciones |
|---|---|
| Doce suites de contenido, datos e identidad | 665 |
| Interacción con navegador real | 53 |
| Persistencia de estado | 10 |
| Adaptabilidad, 3 páginas × 11 anchuras | 33 |
| **Total** | **761** |

Sin fallas. Sin errores de consola en ninguna de las tres páginas.

---

## 9. Lo que sigue abierto, y depende de ti

1. **Fotografías de 12 ejemplares.** Solo Viejo del Agua tiene. Es el pendiente que más pesa: el listado del mapa ya está preparado para mostrar la miniatura y hoy solo aparece en un renglón.
2. **Lluvia interceptada contra escurrimientos.** 911,487 L contra 1,258 L en los mismos cinco ejemplares que sí traen cifra. Tres órdenes de magnitud. Si el cálculo es correcto conviene explicarlo; si no, uno de los dos campos está mal capturado.
3. **El título del video contradice al registro.** Habla del «ahuehuete de Santa Catarina, en Azcapotzalco»; en el registro Santa Catarina es un *Fraxinus uhdei* en Coyoacán, y el ahuehuete de Azcapotzalco es Viejo del Agua.
4. **Decreto del Sabino de San Juan**, pendiente de publicación en la Gaceta.
5. **Recorrido con lector de pantalla.**
6. **Alcance del artículo 139 del Reglamento de impacto ambiental.** La tarjeta lo presenta como negativa absoluta; en realidad está acotada a la vía de impacto ambiental y no al derribo por riesgo. Conviene distinguir las dos vías antes de publicar.
