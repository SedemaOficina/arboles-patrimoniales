# Árboles Patrimoniales · 3 · diseño y auditorías

Actualizado el 23 de agosto de 2026.

Documentos navegables: `documentos/auditorias/Auditoria_360_v2.html` y `Auditoria_valores_sueltos.html`. Las superadas están en `documentos/auditorias/historico/`, con un LEEME que declara qué documento sustituye a cada una.

## Auditoría 360 · veredicto

El sitio está sano. **Los tres hallazgos serios no están en el código**: están en los datos, en el peso de tres imágenes y en una decisión de privacidad que nadie ha tomado.

| Dimensión | Veredicto |
|---|---|
| Accesibilidad | Sana — 0 violaciones de axe en 6 mediciones |
| Datos | **Grave** — las cifras de carbono son físicamente imposibles |
| Rendimiento | Mejorable — 230 KB evitables sin tocar calidad |
| Privacidad | **Decisión pendiente** — se publica el nombre de una persona física |
| Buscadores · Impresión | Completos |
| Diseño · Código | Cerrados, con suite propia |
| Publicación | Frágil por diseño |
| Contenido | Restos de captura en dos textos |

Los tres hallazgos serios están detallados en el documento 2 (carbono, nombre de quien nomina). El tercero —servir PNG teniendo el WebP entregado— **ya está resuelto**: reencuadró el hallazgo anterior de «archivos sin uso», que no estaban sin uso por error sino sin conectar.

**Resueltos desde entonces:** foco visible en `.filtro` y `.boton`; 46 enlaces que abrían pestaña sin avisarlo; `<noscript>`; `sitemap.xml`; objetivo táctil del `911`.

**Sigue abierto:** auditoría con lector de pantalla real (axe encuentra el 30–40 % de los problemas; cero violaciones ≠ probado con NVDA o VoiceOver); auditoría integral de interfaz; validación de la ficha impresa en papel; datos estructurados schema.org; enganche de Git que exija `docs/` al commitear `fuente/`.

### Dos correcciones a la propia auditoría

**Falso hallazgo 1 · «`.boton` y `.filtro` sin foco visible».** El script medía con `.focus()` programático, que **no dispara `:focus-visible`**. Con Tab real, `.boton` estaba bien; `.filtro` sí tenía el anillo, pero `transition:all` lo animaba durante 200 ms. Se nombraron las tres propiedades que sí deben moverse.

**Falso hallazgo 2 · «imágenes sin `width`/`height` hacen saltar el contenido».** Medido con un `PerformanceObserver` de `layout-shift`: CLS 0.0034 / 0.0435 / 0.0000, muy por debajo de 0.1. Descartado.

**Hipótesis que resultó falsa:** que las fotografías estaban a calidad excesiva. Recomprimidas a q70–q90: a q70 solo se ahorra 4 %, y a q80 salen **más grandes** que el original. Ya están optimizadas. Queda escrito para que nadie pierda tiempo ahí.

### Un susto: las suites nunca habían corrido en la máquina del usuario

Todas hacían `process.chdir(new URL('..').pathname)`. `.pathname` viene percent-codificado y la carpeta se llama «Páginas web» —espacio y acento—, así que Node recibía `P%C3%A1ginas%20web` y fallaba con ENOENT antes de la primera comprobación. Arreglado con `fileURLToPath` y probado en una ruta con espacios y acentos. **El tablero existía pero era inalcanzable para su dueño.**

### Lo que NO se midió

El sitio en línea (todo se midió sobre archivos en disco); el mapa con cartografía real; lectores de pantalla y otros navegadores; y lo jurídico — no se verificó que las citas normativas correspondan al texto vigente.

## Valores sueltos: la limpieza que se volvió sistema

Salió de una pregunta del usuario: «¿el texto que no ocupa todo el ancho es equivocación o intencional?». Era intencional —la medida de lectura— pero estaba puesta de nueve formas distintas. La auditoría buscó el resto de casos del mismo tipo: **una misma decisión resuelta muchas veces, cada una con un número distinto y ninguno derivado de los otros.**

| Decisión | Antes | Después |
|---|---|---|
| z-index sueltos | 14 | **0** (11 capas con nombre) |
| Familias de corte | 15 | **9** |
| Tamaños de letra literales | 25 | **1** |
| Espaciados distintos | 39 (9 impares) | **31** (un solo impar, el filete de 1 px) |
| rgba() a mano | 92 | **26**, todos blanco o negro puro |
| Radios de esquina | 10 | **2** tokens + 4 formas |
| Duraciones | 6 | **2** |
| Medidas de lectura | 9 | **2** |

Tokens en `:root`: 34 → **69**.

**Lo que lo sostiene es `verifica-sistema.mjs`**, que rechaza el valor suelto: ni un z-index numérico fuera de `:root`, ni un radio suelto, ni una duración a mano, ni un espaciado impar salvo 1 px, ni un color de la paleta escrito a mano, exactamente nueve familias de corte, un solo tamaño literal. Limpiar una vez no sirve; lo que convierte la limpieza en decisión permanente es la comprobación.

**Matices que conviene no perder:**

- **Las capas del mapa no son libres.** `--capa-mapa-aviso:600`, `--capa-mapa-pin:850`, `--capa-mapa-pin-activo:900`, `--capa-mapa-globo:1010` tienen que ganarle a Leaflet, que reparte sus paneles entre 400 y 700 y pone sus controles en 800. «Ordenarlas» a números pequeños rompe el apilado.
- **Los cortes de pantalla no pueden ser tokens:** `@media (max-width: var(--x))` no funciona. La escala se sostiene solo con la comprobación.
- **`ch` no es un carácter real:** 62ch se leen como unos 68 caracteres.
- **Excepciones declaradas**, cada una con su marca en el CSS: `EXENTA DE LA MEDIDA`, `EXENTO: no es un párrafo`, `EXENTO: mensaje de estado`, `EXENTO: vive dentro de una caja`, `EXENTO: es el pie de un gráfico`.
- **Pendiente único:** 860 y 900 siguen a cuarenta píxeles uno de otro. Juntarlos mueve siete reglas: es decisión de diseño, no limpieza.

**Cómo se verificó:** nueve capturas de página completa (3 páginas × 3 anchos) comparadas píxel a píxel antes y después de cada tanda. Capas: 0 píxeles de diferencia. Radios: 319 píxeles, todos en el redondeo de 3 a 2 px. Espaciado: ningún elemento se movió más de 1 px por sí mismo. Cortes: barrido en 19 anchos × 2 páginas sin desbordes.

**Lo que la auditoría no dice:** que el sitio se viera mal. Se veía bien. Decía que **se veía bien por acumulación de aciertos individuales**, que es más caro de mantener y más fácil de romper que verse bien por sistema.

## La ficha como lámina de campo · 23 de agosto

Maqueta validada: <https://claude.ai/code/artifact/44bc4a5a-fc42-47be-bbe1-7b7396d6f8f5>

La ficha era correcta y aburrida: campo morado macizo idéntico en los trece, y debajo una sucesión de tablas de etiqueta y valor. Además **«Cómo llegar» aparecía dos veces** y el segundo enlace era idéntico al que ya vive bajo el mapa.

**1 · El encabezado pasó a papel.** Fuera el campo `--tinta-jacaranda`, el resplandor radial y la banda de degradado de 72 px. Sobre papel el nombre pesa por su tamaño, no por el contraste contra un fondo. El morado queda donde significa algo.

**2 · Las cotas, sobre el dibujo.** Altura acotada contra la regla; diámetro con guía punteada que muere en el tronco a 1.30 m, que es donde el DAP se mide; y extensión de copa trazada **a escala** como barra en el suelo, centrada en el tronco. Cuando la barra es más ancha que el dibujo, se **ve** por qué la ilustración es el porte típico de la especie y no la copa del ejemplar.

Detalles que costaron una iteración cada uno:

- **El tronco no cae en el centro de la caja.** En la silueta SVG sí; en las ilustraciones está al ~47 % del ancho. La fracción es una aproximación declarada, y por eso la guía se detiene **antes** de llegar: quedarse corto se lee como señalar, pasarse se lee como error.
- Las cotas se posicionan **midiendo el dibujo ya montado**, no calculando dónde debería estar.
- Si la barra de copa no cabe, **no se dibuja**: una barra recortada mide menos de lo que dice.
- Bajo 700 px las tres se apagan y las medidas se leen en la tabla.

**3 · «Cómo llegar», una sola vez.** «Llévatelo» cierra la banda del mapa. El enlace duplicado se retiró del bloque de imprimir; se quedó el de bajo el mapa, cuya posición estaba argumentada.

**4 · La taxonomía baja en cascada.** Los siete atributos que **no** son escalera taxonómica salieron a su propia tabla. Los nombres llanos van en `NOMBRE_LLANO`, **deliberadamente casi vacío**: solo `Plantae → Plantas` y `Tracheophyta → Plantas vasculares`, cuyo nombre llano ES la traducción literal. Traducir `Magnoliopsida` es una afirmación botánica que exige fuente. Un peldaño sin dato se salta, no se rellena con «Sin determinar».

**5 · Cinco documentos** —decreto, SNIB, observación de referencia, corrida de i-Tree, programa de manejo— en lugar de la sección «De dónde sale cada dato», que explicaba en prosa lo que ahora dice cada renglón. **Criterio invertido:** el documento que falta ya no se omite, se dibuja apagado y dice por qué. Omitirlo hace creer que no se consultó, afirmación más fuerte y falsa que decir que el registro no lo trae.

**6 · La flecha «↗» va DENTRO del título.** Como pseudoelemento del `<a>` caía en renglón propio, porque el renglón es una columna flex. Mismo error que había puesto flechas bajo los logotipos de redes del pie.

### Lo que NO se implementó de la maqueta

- **El sello circular de categoría.** La maqueta usaba un ejemplar de una sola categoría; nueve de los trece tienen **tres** a la vez. Un sello único tendría que elegir una y eso afirmaría algo falso.
- **Retirar el cintillo de cuatro cifras.** Se conservó restilado: la lámina queda más abajo y el cintillo es lo que se ve sin desplazar. Decisión abierta.

### Aserciones que hubo que reescribir

Siete **codificaban el criterio viejo** —«las tarjetas sin dirección se filtran, no se dibujan apagadas», «nada lee ya urlSNIB ni urlOrigen»—. No se borraron: se reescribieron afirmando el criterio nuevo, con el motivo del cambio escrito encima. Una prueba que estorba a un cambio deliberado se actualiza declarando por qué; borrarla en silencio pierde la memoria de la decisión.

## Categorías: los textos oficiales, con dos problemas

Las cuatro tarjetas de la portada llevan ahora la frase ciudadana arriba y el criterio formal plegado bajo «El criterio completo», más un **hueco reservado** para el distintivo gráfico (recuadro punteado con la inicial: un sitio marcado como pendiente, no un icono provisional).

- **HISTÓRICO se quedó sin definición.** La que llegó era, palabra por palabra, la de CENTENARIO —edad igual o superior a 80 años—, que es el criterio de la otra categoría y no distingue nada. `definicion: null` a propósito.
- **El umbral de CENTENARIO contradecía al sitio:** decía «rebasó los cien años», la definición formal dice **ochenta**. Se corrigió el texto ciudadano, no la definición. **Falta confirmar cuál es el criterio real.**
- El cierre de SINGULAR describe el criterio de NOTABLE. Puede ser deliberado; se lee como arrastre de copiar y pegar.

## Estado del tablero

**12 suites, 966 aserciones, todo en verde.**
