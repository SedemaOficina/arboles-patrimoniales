# Auditoría 360 · Árboles Patrimoniales de la Ciudad de México

Secretaría del Medio Ambiente · Oficina de la Secretaría
20 de agosto de 2026

---

## Resumen ejecutivo

Se auditaron cinco dimensiones —código muerto, corrección y flujo de datos, conexiones rotas, accesibilidad y rendimiento— sobre las 83 piezas del repositorio y sobre el sitio ya construido, con mediciones en navegador.

**Se corrigieron 15 defectos en esta misma sesión.** Doce quedan abiertos: siete requieren una decisión tuya y cinco son deuda técnica de bajo riesgo.

El hallazgo más grave era de **publicación de datos falsos**: la ficha de un ejemplar anunciaba *12,052,025 kg de CO₂ evitados al año* —doce mil toneladas por un solo árbol— porque una celda con la fecha `12/05/2025` se convertía en un entero de siete dígitos. Estaba ya publicado en el sitio y en el archivo de datos abiertos.

El segundo, de peso: la ficha descargaba **4.4 MB en la primera pantalla**, de los cuales **2.5 MB no se mostraban nunca**.

| | Antes | Después | |
|---|---|---|---|
| Primera carga · portada | 2 737 KB | 858 KB | **−69 %** |
| Primera carga · ficha | 4 403 KB | 1 449 KB | **−67 %** |
| Aserciones automatizadas | 748 | **929** | +181 |

---

## 1 · Datos falsos publicados · CORREGIDO

**Qué pasaba.** `toNumber()` limpiaba las celdas borrando «todo lo que no sea dígito». Una celda con una fecha no se rechazaba: se concatenaba.

```
"12/05/2025"  ->  12052025
"10/12/2025"  ->  10122025
"2 de 3"      ->  23
```

Seis celdas del registro estaban así, y las seis se publicaron con separador de miles —que es justo lo que las hacía parecer verdaderas—:

| Ejemplar | Campo | Publicado | Origen probable |
|---|---|---|---|
| Glorieta de Ahuehuetes | CO₂ evitado | 12,052,025 kg/año | 12/05/2025 |
| Glorieta de Ahuehuetes | NO₂ evitado | 3,022,025 g/año | 03/02/2025 |
| Glorieta de Ahuehuetes | PM2.5 evitado | 11,022,025 g/año | 11/02/2025 |
| Tacuba | PM2.5 evitado | 10,122,025 g/año | 10/12/2025 |
| Santa Catarina | NO₂ evitado | 8,062,025 g/año | 08/06/2025 |
| Laureano | NO₂ evitado | 2,092,025 g/año | 02/09/2025 |

**Qué se hizo.** `toNumber` rechaza ahora las celdas con forma de fecha y las que tienen dos grupos de dígitos separados por letras. Los seis valores se retiraron del registro congelado y quedan como **no determinados**: vale más un hueco declarado que una cifra falsa. No se «corrigieron» adivinando la medición: eso sería inventar un dato.

**Lo que te toca.** Revisar esas seis celdas en la hoja. Si son un desplazamiento de columna, hay más columnas afectadas de las que se ven.

---

## 2 · Peso de la primera carga · CORREGIDO

### La galería descargaba diez fotografías a tamaño completo para contarlas

`descubrirFotos()` averiguaba cuántas fotos hay pidiendo el archivo **original** con `new Image()`, que lo descarga entero. Una ficha de diez fotografías bajaba **2 927 KB** solo para el censo, y de esas diez la galería enseña una. Los sondeos, además, iban encadenados con `await`: once viajes de ida y vuelta en fila.

Ahora el censo va contra la miniatura —**412 KB**— y en paralelo. El visor pide el original solo de la foto que se está viendo. **Ahorro: 2 521 KB.**

### Las ilustraciones se servían al cuádruple de su tamaño

| Archivo | Se descargaba | Se dibuja a | Sobredimensión |
|---|---|---|---|
| `portada/ficus-grande.webp` | 751 KB · 1400 px | 349 px | 4.0× |
| `especies/taxodium-grande.webp` | 451 KB · 1042 px | 171-238 px | 6.1× |
| `especies/fraxinus-grande.webp` | 406 KB · 1395 px | 329-373 px | 4.2× |

Los archivos de tamaño medio **ya existían y ninguna página los usaba**. Ahora son el archivo base, con el grande en `srcset` y en `image-set()` para las pantallas de doble densidad que sí lo aprovechan. **Ahorro: ~1 000 KB.**

### Leaflet se descargaba siempre, aunque nadie llegara al mapa

158 KB que no sirven hasta tres pantallas más abajo. Ahora se descargan cuando el contenedor del mapa se acerca a la pantalla, con 400 px de anticipación. Sin `IntersectionObserver` se carga de inmediato; si la descarga falla, se pinta el aviso que ya existía.

---

## 3 · Enlaces y metadatos rotos · CORREGIDO

**La ficha heredaba los metadatos de la portada.** El `canonical` apuntaba al inicio, lo que le dice al buscador que *esa página no debe indexarse por sí misma*: las trece fichas se consolidaban en la portada y ninguna aparecía en resultados. Al compartir cualquier ficha salía el título y la foto del inicio. Ahora cada ficha compone su título, su descripción, su canonical y su `og:url` con los datos del ejemplar.

**Recursos no tenía canonical ni `og:url`**, y las etiquetas de Twitter estaban a medias: solo quedaba `twitter:card`, que sin imagen no dibuja tarjeta. Completado.

**33 anclas rotas en la versión Claude Design.** La expresión `/dc-cuerpo/` no estaba anclada, y los tres cuerpos contienen esa subcadena: el ensamblador trataba la ficha y Recursos como si fueran la portada, convirtiendo sus enlaces en anclas locales que no existen. Corregido a `/^dc-cuerpo\.html$/`. El pie de esa variante, además, escribía `href="#inicio"` en duro; ahora usa los mismos testigos que el pie del sitio, y se le añadió el enlace a créditos que solo tenía el sitio.

---

## 4 · Cifras que se contradecían · CORREGIDO

**Nueve fichas decían todas «1 kg/año» de carbono.** Con cero decimales fijos, 0.79, 0.87, 0.94, 1.03, 1.13, 1.23 y 1.27 se redondeaban todos a 1, borrando una diferencia real de 1.6 veces. Y el CSV de datos abiertos sí traía los decimales: la ficha contradecía al dato publicado. Ahora los decimales los decide la magnitud —dos por debajo de diez, uno hasta cien, ninguno de ahí en adelante— en las dos variantes.

**«Las cuatro cifras» debajo de tres tarjetas.** Error de copia, publicado. Corregido.

---

## 5 · Accesibilidad · CORREGIDO

**El anillo de foco no cumplía en el 80 % de la página.** El dorado de marca `#B28E5C` da entre **2.57 y 2.98:1** sobre las cinco superficies claras del sitio; WCAG 2.1 exige **3.0:1** a un indicador de foco. Solo cumplía sobre los bloques oscuros. Se le dio color propio, `#8F6E3E`, que conserva el registro dorado y mide **3.98 a 4.62:1** sobre las cuatro superficies medidas.

**Desborde de 22 px a 360 px de ancho.** El identificador del registro —26 caracteres sin espacios— fijaba el ancho mínimo del renglón y estiraba el documento. 360 px es el iPhone SE y buena parte del parque Android de gama baja. Ahora el rótulo y el dato se apilan por debajo de 520 px. **Sin desbordes en los seis anchos probados.**

**HTML no conforme.** Un `</div>` sobrante y un bloque huérfano del panel retirado en la portada, y el mismo resto en la versión Design. Retirados; los cuatro cuerpos quedan balanceados.

**Áreas de toque.** Dos enlaces por debajo de 24 px se añadieron a la regla que ya daba altura de toque a los enlaces sueltos.

---

## 6 · Lo que queda abierto y depende de ti

| | Qué | Por qué importa |
|---|---|---|
| 1 | **Los seis valores de emisiones** que quedaron en blanco | Hay que ver la hoja: si es un desplazamiento de columna, afecta a más campos |
| 2 | **`urlSNIB`, `urlOrigen` y `linkITree`** traen el mismo valor en los trece | Ninguna llevaba a información de ESE árbol. Las tarjetas ya se retiraron |
| 3 | **Los PDF de los decretos** | Doce fichas dicen «aún no publicado». Van en `fuente/decretos/` |
| 4 | **`condicion` y `estructura`** se capturan y no se publican en ninguna parte | Son el dictamen sanitario y estructural: el dato más pertinente para un vecino preocupado |
| 5 | **El video de Santa Catarina** contradice al registro | Habla de un ahuehuete en Azcapotzalco; el registro dice fresno en Coyoacán |
| 6 | **Carbono, lluvia y copa de Río Magdalena** | Tres anomalías que solo la fuente puede resolver |
| 7 | **Los textos de la Jefa y la Secretaria, y sus retratos** | Hoy hay borradores sin autorizar |

---

## 7 · Deuda técnica, sin riesgo inmediato

- **~800 KB de recursos publicados que nada referencia**: los tres archivos del perímetro de la Ciudad (huérfanos desde que Recursos publica la capa del inventario), dos retratos PNG de la figura humana —hoy es SVG en línea— y el logotipo institucional en WebP.
- **272 KB por destino** que `construir.sh` copia a `assets/js/` y `assets/css/` y que **ninguna página de producción enlaza**: todo va incrustado. Entre ellos sube al servidor `patrimoniales-loader.js` con la URL del CSV en vivo de Google Sheets, que solo hace falta en la variante interna.
- **51 KB de GeoJSON de alcaldías** incrustados en la portada de Claude Design que ningún guion lee.
- **`coordsValidas` se calcula y nadie lo lee**: una coordenada con un dígito de menos se publicaría igual en el mapa y en la capa SIG.
- **El parámetro `sel` de la barra de direcciones se escribe pero no se restituye**: copiar la dirección con un ejemplar elegido y abrirla en otra pestaña no lo vuelve a seleccionar.
- **Diez peticiones 404 por carga** mientras no estén los dos retratos: es el sondeo de extensiones y el respaldo funciona, pero conviene un interruptor en los datos.
- **Sin datos estructurados** (`Dataset`, `Place`, `GovernmentOrganization`). Un registro público georreferenciado de datos abiertos es el caso de uso literal de Google Dataset Search.
- **Símbolos y ramas muertas** en `dc-logica.js`, `ficha-dc-logica.js` y `patrimoniales-loader.js`: diez funciones exportadas sin consumidor, y la rama `CLAVE_MAPS` de Street View con API oficial, inalcanzable porque la clave está vacía.

---

## 8 · Lo que se midió y salió bien

Conviene decirlo con número, porque son cosas que suelen fallar:

- **CLS = 0.000** en las tres páginas; 0.012 como máximo forzando 700 ms de retraso en todas las imágenes. El umbral es 0.1. No hay salto de maquetación que corregir.
- **Un solo `h1` por página**, sin saltos de nivel, con `main`, `nav`, `header` y `footer` completos y enlace de salto operativo.
- **Ningún `id` duplicado**, ningún atributo inválido, ningún interactivo anidado, ningún `tabindex` positivo.
- **Todos los `target="_blank"` con `rel="noopener"`**; todos los controles con etiqueta real; los dos `iframe` con `title` descriptivo.
- **El mapa es accesible por teclado**: trece marcadores tabulables con `role="button"` y el nombre del árbol.
- **Contraste del cuerpo de texto**: barrido de todos los nodos visibles en las tres páginas. Cero fallos salvo el nombre de especie sobre cinco de las trece fotografías (4.07-4.42:1 contra 4.5), que queda anotado.
- **El `stats` congelado coincide exactamente** con el recalculado desde el registro: el cintillo de cifras no miente.
- **Ningún `||` que se trague un cero legítimo**, ninguna división por cero alcanzable.

---

## 9 · Una lección de método

Tres veces en este proyecto ha fallado lo mismo: los ensambladores publican en `window` una lista de nombres **escrita a mano**, y al importar un símbolo nuevo sin añadirlo a esa lista la página se rompe en el navegador con la mitad en blanco. No falla al construir: falla al abrir.

Se añadió una prueba que **cruza lo que cada módulo importa con lo que su ensamblador expone** y falla antes de llegar al navegador. Es la clase de defecto que no se arregla con cuidado, sino con una comprobación.

También se descubrió que seis suites de verificación leían módulos y datos desde una **copia congelada** del 19 de agosto: llevaban días probando código viejo, y `verificar.sh` no podía correr fuera del entorno de trabajo. Al apuntarlas al código real saltaron dos pruebas que llevaban tiempo mintiendo. Un tablero que miente es peor que no tener tablero.
