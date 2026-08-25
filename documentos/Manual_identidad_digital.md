# Manual de identidad digital
## Micrositio de árboles patrimoniales de la Ciudad de México
**Secretaría del Medio Ambiente · Versión de agosto de 2026**

Este documento describe el sistema de diseño del micrositio: paleta, tipografía, componentes y las reglas que los gobiernan. Sirve para dos cosas: mantener la coherencia si alguien más toca el sitio, y reutilizar el sistema en otros productos digitales de la Secretaría.

Todo lo que aquí se describe vive en un solo archivo, `estilos.css`, declarado como variables en `:root`. No hay colores ni tamaños sueltos en el código: cambiar el valor de una variable lo cambia en todo el sitio.

---

# 1. Paleta

## 1.1 El razonamiento

La paleta parte del **logotipo de Árboles Patrimoniales**: un morado jacaranda sobre crema, con follaje verde y tronco dorado. El morado no es decorativo — es el color de la jacaranda, el árbol que la ciudad reconoce como suyo, y por eso convive con el verde institucional de la Secretaría sin competir con él.

## 1.2 Morados · identidad

| Nombre | Valor | Uso |
|---|---|---|
| Tinta jacaranda | `#2A1630` | Superficie profunda: portada de ficha, franjas de cifras, bloques de servicios |
| Jacaranda | `#8D4992` | Primario institucional. Títulos, botones sólidos, filetes |
| Jacaranda hondo | `#7A3E7F` | Texto pequeño sobre papel, donde el primario no alcanza contraste |
| Jacaranda luz | `#C79FCA` | Acento sobre fondo profundo: rótulos, nombres científicos |
| Jacaranda bruma | `#967DA5` | Jacarandas del fondo en la ilustración de portada |
| Niebla | `#F4E9F3` | Fondo suave institucional: bloques destacados |

## 1.3 Verdes · lo vivo y la cartografía

| Nombre | Valor | Uso |
|---|---|---|
| Verde bosque | `#1E4D2B` | Verde institucional SEDEMA. Cabeceras de datos, marcadores del mapa |
| Verde vivo | `#2D7A3E` | Acento sobre fondo claro: filetes de estado, tirador de desplazamiento |
| Verde hoja | `#4E8F45` | Copas dibujadas sobre fondo claro |
| Verde luz | `#8FC77F` | Copas de las ilustraciones. **Nunca texto ni interfaz** |
| Verde niebla | `#E7F0E1` | Fondo suave vegetal: secciones alternas |

> **Regla del verde.** El verde solo va sobre fondo claro —papel, blanco, niebla—. Sobre el jacaranda profundo no entra ningún verde: ahí el acento es el dorado. Mezclar verde lima con morado oscuro fue el desajuste que produjo el cambio de paleta y que la auditoría corrigió.

## 1.4 Superficies y cálidos

| Nombre | Valor | Uso |
|---|---|---|
| Papel | `#FEF7E4` | Superficie clara principal: la crema del logotipo |
| Papel hondo | `#F7EDD6` | Alterna para franjas y portadas de sección |
| Blanco | `#FFFDF7` | Tarjetas sobre papel. No es blanco puro: rompería la calidez |
| Dorado | `#B28E5C` | Patrimonio y decretos, sobre fondo claro. **No sirve para texto pequeño ni para líneas: sobre las superficies claras da entre 2.57 y 2.98:1** |
| Foco | `#8F6E3E` | El anillo de foco, y solo eso. Nace de que el dorado de marca no llega al 3:1 que WCAG pide a un indicador de interfaz. 4.40:1 sobre papel |
| Dorado luz | `#D9BC91` | El acento del fondo profundo. Cifras y títulos sobre tinta jacaranda |
| Corteza | `#6B5136` | Notas de cobertura, madera, y **las cotas de la regla de alturas**: 6.29:1 sobre el verde niebla, donde el dorado de marca daba 2.60 |
| Corteza luz | `#8B6F47` | Acento secundario |
| Mariposa | `#BE4728` | Acento cálido de la ilustración |
| Jacarandá noche | `#1D0F23` | Extremo oscuro del degradado de las superficies profundas |
| Jacarandá brasa | `#4A2A50` | Extremo claro del mismo degradado |
| Guinda del Gobierno | `#9D2148` | Identidad del Gobierno de la Ciudad. **No pertenece a este sistema: se hospeda y no se altera** |

## 1.5 Texto y alerta

| Nombre | Valor | Uso |
|---|---|---|
| Tinta | `#1A1A1A` | Texto principal |
| Tinta suave | `#413647` | **El color en el que está escrito cerca del 80 % del sitio.** 10.65:1 sobre papel |
| Gris | `#5E5563` | Texto secundario, notas al pie |
| Alerta | `#C0392B` | Emergencias y sanciones. Se usa con parquedad |

## 1.6 Contrastes verificados

Todas las combinaciones en uso cumplen el nivel AA de las Pautas de Accesibilidad para el Contenido Web. Medidas sobre los pares reales del sitio:

| Combinación | Colores | Contraste |
|---|---|---|
| Jacaranda sobre papel | `#8D4992` sobre `#FEF7E4` | 5.61:1 |
| Jacaranda hondo sobre papel | `#7A3E7F` sobre `#FEF7E4` | 6.96:1 |
| Tinta sobre papel | `#1A1A1A` sobre `#FEF7E4` | 16.28:1 |
| Gris sobre papel | `#5E5563` sobre `#FEF7E4` | 6.64:1 |
| Verde bosque sobre papel | `#1E4D2B` sobre `#FEF7E4` | 9.13:1 |
| Corteza sobre blanco | `#6B5136` sobre `#FFFDF7` | 7.23:1 |
| Jacaranda luz sobre tinta jacaranda | `#C79FCA` sobre `#2A1630` | 7.36:1 |
| Dorado luz sobre tinta jacaranda | `#D9BC91` sobre `#2A1630` | 9.20:1 |
| Blanco sobre tinta jacaranda | `#FFFFFF` sobre `#2A1630` | 16.72:1 |
| Blanco sobre jacaranda | `#FFFFFF` sobre `#8D4992` | 6.00:1 |
| Etiqueta dorada | `#7A5E33` sobre `#F6EFE3` | 5.29:1 |
| Alerta sobre papel | `#C0392B` sobre `#FEF7E4` | 5.09:1 |

El mínimo exigido es 4.5:1 para texto normal y 3:1 para texto grande. **Ninguna combinación del sitio queda por debajo.**

---

# 2. Tipografía

## 2.1 Las tres familias

El sitio usa tres familias para todo lo que se lee, y una cuarta reservada a un solo dato. No se intercambian.

| Variable | Familia | Función |
|---|---|---|
| `--display` | **Anton** | Títulos y cifras. Condensada, de una sola grosor, en versalitas altas. Es la voz que anuncia |
| `--editorial` | **Fraunces** | Nombres científicos, domicilios, entradas de sección. Serif con carácter: da el registro de documento |
| `--texto` | **Source Sans 3** | Todo el cuerpo, la interfaz y los rótulos. Neutra y legible en pantalla |

**La cuarta.** El identificador del ejemplar —`25-AZC-TAX-19405GIMNO-0006`— se escribe en la monoespaciada del sistema (`ui-monospace`). Es una cadena de código, no prosa: en monoespaciada se lee dígito a dígito y no se parte por sus guiones. Es la única excepción y no se extiende a nada más.

Cada una declara respaldos del sistema por si las fuentes web no cargan: `Arial Narrow`, `Impact` y `DejaVu Sans Condensed` para Anton; `Georgia` y `DejaVu Serif` para Fraunces; `system-ui` y `DejaVu Sans` para Source Sans.

> **Nota técnica.** Leaflet, la biblioteca del mapa, impone sus propias familias —Helvetica Neue en el lienzo y Lucida Console en los botones de zoom—. El sitio las sobrescribe para no acabar usando cinco familias donde debe usar tres.

## 2.2 Escala y pesos

| Elemento | Tamaño | Peso | Familia |
|---|---|---|---|
| Titular de portada | 34 a 124 px, fluido | 400 | Anton |
| Título de sección (`h2`) | 26 a 44 px, fluido | 400 | Anton |
| Título de tarjeta (`h3`) | 17 a 19 px | 400 a 700 | Anton o Source Sans según el bloque |
| Cuerpo | 16 px | 400 | Source Sans 3 |
| Entrada de sección | 17 a 21 px | 400 | Fraunces |
| Rótulo de sección | 11 px, interletra 0.18em, versalitas | 700 | Source Sans 3 |
| Etiqueta de categoría | 11 px, interletra 0.08em, versalitas | 700 | Source Sans 3 |
| Nota al pie | 12.5 px | 400 | Fraunces cursiva o Source Sans |
| Texto de apoyo | 14 px | 400 | Source Sans 3 |

Los tamaños fluidos usan `clamp()`: crecen con la pantalla entre un mínimo y un máximo, sin saltos bruscos.

**Interlínea:** 1.6 en el cuerpo, 1.1 a 1.2 en títulos. **Ancho de lectura:** 62 `ch`, que en la tipografía del sitio da unos 68 caracteres por renglón.

---

# 3. Retícula y espacio

- **Ancho máximo de contenido:** 1180 px, centrado.
- **Separación entre secciones:** 88 px verticales; 56 px en pantallas menores a 900 px.
- **Rejillas:** `auto-fit` con mínimo por tarjeta, de modo que el número de columnas se ajusta solo. No hay anchos de columna fijos.
- **Borde estándar:** `1px solid rgba(42,22,48,.14)` — el morado de la tinta al 14 %, nunca gris neutro.
- **Radio de esquina:** 2 px. El sistema es de esquinas casi rectas; nada redondeado salvo los marcadores del mapa, que son círculos.

## Puntos de quiebre

| Ancho | Qué cambia |
|---|---|
| 1240 px | Se aprieta la navegación antes que la marca |
| 1100 px | El logotipo cede |
| 1000 px | El menú pasa a botón desplegable |
| 900 px | La ilustración de portada baja a banda inferior |
| 860 px | Las rejillas de dos columnas pasan a una |
| 700 px | Ajustes de la regla de alturas y de las hileras |
| 560 px | El logotipo institucional baja a 210 px |
| 430 px | El logotipo institucional baja a 186 px |
| 345 px | Ajuste final para teléfonos angostos |

**Son nueve familias de corte y la lista está cerrada:** 345, 430, 560, 700, 860, 900, 1000, 1100, 1240. `verifica-sistema` rechaza cualquier `@media` con un ancho nuevo. Los valores a dos píxeles o menos de distancia cuentan como una sola familia.

**Radio:** 2 px en todo el sistema —nada redondeado— con una excepción declarada: las pastillas de filtro y los marcadores del mapa usan `--radio-pastilla`, que es completo.

Verificado sin desbordamiento horizontal en once anchuras, de 320 a 1920 px.

---

# 4. Componentes

## 4.0 Encabezado

Una sola tira, fija al desplazarse: logotipo institucional, nombre del sitio y navegación.

El logotipo entregado por la Secretaría —Gobierno de la Ciudad de México, Secretaría del Medio Ambiente y Sistema de Información Ambiental de la Ciudad de México— mide 4 847 × 355 px, es decir **13.65 de ancho por 1 de alto**. Compartir renglón con siete opciones de menú le deja 372 px, que son 27 px de alto. A esa altura los tres bloques de marca se leen y la línea «Capital de la Transformación» queda al límite: es el precio de tenerlo todo en un renglón, y es una decisión tomada a conciencia.

El nombre del sitio va en dos renglones. En uno solo se comía 210 px del ancho que el logotipo necesita.

Orden de cesión cuando falta espacio: primero se aprieta la navegación, después el logotipo, y sólo al final el nombre del sitio. La tira completa pide 1 153 px y la envoltura no los tiene hasta los 1 236 px de ventana; por debajo de ese ancho manda el tramo apretado. Por debajo de 1 000 px la navegación se pliega en panel.

El logotipo se sirve en dos tamaños —1 147 y 1 638 px de ancho— en WebP con respaldo PNG, de modo que la pantalla de alta densidad reciba el doble de píxeles. Si el archivo no carga, la institución sigue nombrada en texto.

En impresión el encabezado no aparece: el membrete de la ficha lleva el mismo logotipo en su propio renglón, a todo el ancho útil de la hoja, donde alcanza 13.5 mm y se imprime legible.

## 4.1 Botones

| Variante | Aspecto | Uso |
|---|---|---|
| **Sólido** | Fondo jacaranda, texto blanco, 12×26 px de relleno | Acción principal de una sección |
| **Enlace** | Borde de 1 px jacaranda, texto jacaranda, fondo transparente | Acción secundaria. Al pasar el cursor se invierte |
| **Filtro** | Píldora con borde, estado marcado con `aria-pressed` | Filtros del listado |
| **Apagado** | Borde y texto grises, sin puntero | Convocatoria cerrada y otros estados no disponibles |

Sobre fondo profundo, la variante de enlace usa jacaranda luz en lugar de jacaranda pleno.

**Reglas de toque.** Todo objeto pulsable mide al menos 24 px de alto, y 32 px en dispositivos de puntero grueso —teléfonos y tabletas—. Los marcadores del mapa se ven de 16 px pero su área de toque es de 26 px.

**Foco visible.** Contorno dorado de 3 px con 3 px de separación, en todo elemento enfocable. Nunca se suprime.

## 4.2 Tarjetas

- **Tarjeta de ejemplar:** cabecera con degradado jacaranda que aloja la fotografía cuando existe, cuerpo con nombre, especie en cursiva, ubicación y etiquetas de categoría.
- **Tarjeta de norma:** filete izquierdo dorado de 3 px, rótulo del instrumento, texto y enlace al texto vigente.
- **Tarjeta de dato:** rótulo en versalitas, cifra en Anton, texto explicativo y nota de cobertura.

## 4.3 Etiquetas de categoría

| Categoría | Fondo | Texto |
|---|---|---|
| Centenario, Notable, Singular | `#F4E9F3` | `#8D4992` |
| Histórico | `#F6EFE3` | `#7A5E33` |
| Sin categoría asignada | `#F3EDE2` o gris | Según el caso |

## 4.4 Secuencia de pasos

Los procedimientos se presentan como una línea vertical con hilo conductor: un disco numerado en jacaranda, una etiqueta de actor —*Lo haces tú* o *Lo hace la autoridad*— y el contenido en una tarjeta con filete izquierdo. Lo que no es un paso no lleva número.

## 4.5 Mapa

- Marcadores circulares verde bosque de 16 px, todos del mismo tamaño y sin cifra dentro.
- Marcador seleccionado: dorado, ampliado 1.6 veces.
- Marcadores fuera del filtro: 22 % de opacidad, sin puntero y fuera del recorrido de teclado.
- Recorte al perímetro oficial de la Ciudad, con lo demás cubierto en crema al 82 %.

## 4.5b Fotografías

Las fotos no viven en la hoja de cálculo: viven en el disco, **una carpeta por ejemplar** nombrada con su identificador del registro. La hoja solo aporta el crédito.

Cada fotografía se publica en dos tamaños:

| Archivo | Lado largo | Dónde se usa |
|---|---|---|
| `NN.jpg` | 1 400 px | Visor de la galería de la ficha |
| `NN-chica.jpg` | 480 px | Tarjeta del listado, renglón del mapa y tirador de miniaturas |

Sin esa separación, abrir una ficha de once fotografías descargaba las once completas —unos 3 MB— nada más para dibujar el tirador de abajo. Si la miniatura no existe, el sitio usa la grande: pesa más, pero funciona.

La numeración es correlativa desde `01`, **sin huecos**: un sitio estático no puede preguntar qué archivos hay en una carpeta, solo pedir uno y ver si existe, así que el descubrimiento se detiene en el primer número que falta.

Al preparar las imágenes se hornea la orientación EXIF en los píxeles —una foto girada 90° por metadato sale acostada si no se aplica— y se retiran todos los metadatos de cámara, incluidas las coordenadas GPS.

En el visor grande la imagen va con `contain` y el sobrante se llena con la propia fotografía desenfocada: recortar se llevaría la copa, que es justo lo que la fotografía debe mostrar. En la miniatura va con `cover`: en un recuadro de 118 px el ajuste sin recorte solo deja franjas de color.

Solo deben publicarse imágenes cuyos derechos tenga la Secretaría o estén expresamente licenciadas para uso público.

## 4.6 Hileras desplazables

Dos patrones, según lo que el usuario necesite saber.

**Con barra de arrastre** —la de la ficha—. Flecha, riel siempre visible con tirador de 14 px y flecha. Se usa cuando importa cuánto falta por ver. El navegador dibuja barras superpuestas de dos píxeles que no se pueden agarrar con el ratón: por eso hay una propia.

**Con guía** —la hilera de ejemplares de la portada—. El riel se sustituye por dos instrucciones en fichas con borde, **colocadas encima de la hilera**: cómo se recorre y que cada árbol abre su ficha. Una indicación que se descubre después de haber intentado usar la pieza llega tarde. Los iconos van dibujados en trazo, no en caracteres Unicode, que cambian de forma según la fuente instalada.

Los controles del deslizador —flechas y tirador— van en **jacaranda**, como el resto de lo pulsable del sitio. En verde quedaban como la única pieza verde junto a una guía morada y se leían como descuido, no como jerarquía: el verde está reservado para los estados. Ninguna de las dos cosas es adivinable, y la barra competía visualmente con las ilustraciones. La hilera se recorre de cuatro maneras: arrastrándola con el ratón, con las flechas de los extremos, acercando el cursor a los bordes sensibles o con el gesto táctil. Las flechas se apagan al 32 % cuando ya no queda camino de ese lado: sin riel son la única señal de tope.

Regla de las dos: **el arrastre nunca activa el enlace que hay debajo.** Pasados 6 px de recorrido se cancela el clic que cierra el gesto.

**Dónde vive el globo de cada ejemplar.** Se posa **sobre la copa, dentro de la hilera**, no por encima de ella. Antes sobresalía hacia arriba y la hilera se subía 162 px con margen negativo para darle sitio; ese hueco es exactamente donde ahora vive la guía, y se encimaban cada vez que el cursor tocaba un árbol. Como efecto secundario, ahora el globo sigue a cada ejemplar en lugar de aparecer siempre a la misma altura.

**Los bordes sensibles.** El disco que avisa que la hilera avanza es morado al 82 % con filete blanco y la flecha dentro. En blanco sobre crema casi no se veía justo cuando debía avisar, y sin flecha decía que ahí pasaba algo pero no hacia dónde. Contraste medido: 4.26:1 sobre el crema hondo y 6.29:1 sobre el follaje.

**Separación de la pieza.** La hilera tiene superficie propia —crema hondo `#F7EDD6`— con filete jacaranda de 2 px arriba y aire por los cuatro lados. Compartiendo fondo y margen con el bloque de bienvenida se leía como continuación suya.

## 4.7 Ilustraciones a escala

Las siluetas de la hilera se dibujan con la altura real medida en campo, sobre un lienzo cuyo tope es el ejemplar más alto del registro. El ancho de cada ranura lo fija el dibujo, no una medida uniforme: las especies tienen porte distinto —0.95 el ahuehuete, 1.39 el fresno, 1.70 el laurel— y con ranura fija el ejemplar de 30 m se metía cien píxeles encima de cada vecino. La separación entre ejemplares es de 18 px y el piso de la ranura, 132 px, que es lo que pide el nombre de abajo.

La anchura de la ilustración corresponde al porte típico de la especie, no a la copa medida del ejemplar. Las cifras de copa se leen en la tabla de la ficha, nunca en el dibujo.

La hilera de la portada no lleva figura humana de referencia: cada ejemplar dice su altura en metros debajo del dibujo, que es el dato que la gente lee. La figura de 1.70 m se conserva en la ficha, donde hay un solo árbol y la comparación sí necesita un anclaje visible.

---

# 5. Voz y escritura

- **Segunda persona.** «Puedes visitarlo», no «se puede visitar».
- **Frases cortas y voz activa.** Sin pasivas burocráticas.
- **Cada afirmación jurídica cita artículo y norma.** Nunca «conforme a la normativa aplicable».
- **Toda cifra en valor concreto**, no en fórmula.
- **Un término técnico se explica en el momento**, no se remite a un glosario.
- **Cuando falta un dato se dice por qué falta.** Un guion sin explicación se lee como descuido; el sitio distingue entre «no se pudo estimar» y «no está capturado».

---

# 6. Accesibilidad

Requisitos que el sistema garantiza y que deben conservarse:

1. Contraste AA en todo el texto.
2. Enlace «Saltar al contenido» como primer elemento del recorrido de teclado.
3. Un solo `h1` por página y jerarquía de encabezados sin saltos.
4. Toda imagen con texto alternativo; todo botón y enlace con nombre accesible.
5. Marcas semánticas completas: `header`, `nav`, `main`, `footer`.
6. El menú responde a teclado y anuncia su estado con `aria-expanded`.
7. Objetivos táctiles de 24 px como mínimo.
8. El foco nunca se oculta.

---

# 7. Cómo se organizan las fotografías

Las fotografías **no viven en la base de datos**. Cada ejemplar tiene una carpeta nombrada con su identificador del registro, y dentro las imágenes numeradas de forma correlativa:

```
assets/img/ejemplares/25-AZC-TAX-19405GIMNO-0006/01.jpg
                                                /02.jpg
                                                /03.jpg
```

- **La numeración no puede tener huecos.** El sitio busca 01, luego 02, y se detiene en el primer número que falta.
- **Extensiones admitidas:** `.jpg`, `.webp`, `.png`, `.jpeg`. La primera foto fija la extensión del resto de la carpeta.
- **Máximo 12 fotografías** por ejemplar.
- **El crédito fotográfico** se toma de la columna correspondiente en la hoja de cálculo, y aplica a todas las fotos de ese ejemplar.
- Un ejemplar sin carpeta muestra la ilustración de su especie. No hay que capturar nada para indicarlo.
