# Árboles Patrimoniales de la Ciudad de México

Micrositio del registro público de árboles patrimoniales.
Secretaría del Medio Ambiente · Sistema de Información Ambiental de la Ciudad de México.

Sitio estático: HTML, CSS y JavaScript sin dependencias de servidor.
No necesita PHP, ni base de datos, ni proceso de compilación en el servidor.

---

## La regla que hay que recordar

```
editar fuente/  →  construir producción  →  verificar  →  commit
```

**Un commit sin construir no cambia el sitio.** `fuente/` es el código;
`docs/` es lo que GitHub Pages sirve. Si se salta el paso de en medio, el
commit sube el código y la página se queda exactamente igual.

---

## Las carpetas

| Carpeta | Qué es | ¿Se publica? |
|---|---|---|
| `fuente/` | **El código. Lo único que se edita.** | No |
| `docs/` | **El sitio armado.** Lo que sirve GitHub Pages. | Sí, esto y nada más |
| `documentos/` | Auditorías, manuales, el juego de marca y documentos de trabajo. | No |
| `prueba/` | Vista previa local. Se regenera sola. | No (está en `.gitignore`) |
| `_a_borrar/` | Lo apartado para eliminar a mano. | No (está en `.gitignore`) |

**Nunca edites `docs/` a mano.** El armado la borra y la vuelve a escribir.

---

## Los tres comandos

Requiere Node.js. Desde la raíz del repositorio:

```sh
fuente/construir/construir.sh              # vista previa → prueba/
fuente/construir/construir.sh produccion   # sitio publicado → docs/
fuente/verificar/verificar.sh              # las 16 suites de comprobación
```

Para elegir qué ejemplar abre la ficha de la vista previa:

```sh
fuente/construir/construir.sh prueba tacuba
```

En Windows, con Git Bash —viene con GitHub Desktop— o con el Subsistema de
Windows para Linux.

Las suites corren sobre el sitio ya armado y fallan con código distinto de cero
si algo se rompió. **Se corren siempre antes de publicar.**

> **Las dos salidas se construyen siempre juntas.** Doce de las dieciséis suites
> leen `prueba/`: con una vista previa vieja fallan sin motivo real. Y cada
> comando en su propia llamada: encadenarlos suele exceder el tiempo de espera.

---

## De dónde salen los datos

El sitio lee **la hoja de cálculo publicada del padrón** (`padron/fuente-viva.js`)
y, si no la alcanza, cae al **registro congelado** que lleva incrustado
(`fuente/datos/registro.json`).

- La hoja se consulta al abrir la página, con **caché de diez minutos** y
  respaldo de siete días.
- Si la hoja responde vacía o mutilada, **una guardia la rechaza** y se queda el
  congelado: el sitio nunca se despuebla solo. Los umbrales están en
  `padron/fuente-viva.js`.
- La regla del padrón es **sin decreto no se publica**. Un ejemplar sin decreto
  no llega a la hoja pública y no aparece en el sitio, aunque esté medido y
  fotografiado.
- Un ejemplar montado que la hoja todavía no publica se declara en
  `fuente/datos/en-espera.json`, para que sus archivos no se lean como sobras.

Comprobado el 8 de septiembre de 2026: con la hoja inalcanzable, sin red y con
el almacenamiento del navegador bloqueado, el sitio muestra los doce ejemplares
sin un solo error de JavaScript.

---

## Cómo dar de alta un árbol nuevo

**La mayor parte del trabajo no es del sitio: es de captura.** Lo único que el
sitio necesita de este lado son las fotografías y, si la especie es nueva, su
ilustración.

### 1 · Antes de empezar, tres preguntas

1. **¿Está capturado en la hoja y con decreto?** Sin decreto no pasa a la hoja
   pública y no hay nada que hacer aquí todavía.
2. **¿Hay al menos una fotografía?** La primera es la que se ve en la tarjeta
   del listado y en el globo del mapa.
3. **¿La especie ya está en el sitio?** Hoy conoce *Taxodium mucronatum*,
   *Fraxinus uhdei* y *Ficus microcarpa*. Si es otra, **hace falta trabajo de
   código antes de publicar**: su perfil de dibujo y sus dos ilustraciones. Sin
   eso se dibuja con una silueta genérica que no corresponde a su porte.

### 2 · Colocar las fotografías

Una carpeta por ejemplar, **nombrada con su identificador del registro**:

```
fuente/assets/img/ejemplares/25-AZC-TAX-19405GIMNO-0006/01.jpg
                                                       /01-chica.jpg
                                                       /02.jpg
                                                       /02-chica.jpg
```

| | Medida | Para qué |
|---|---|---|
| `NN.jpg` | **1 400 px** de lado largo | El visor de la galería |
| `NN-chica.jpg` | **480 px** de lado largo | Miniatura de la tarjeta, del mapa y del tirador |

Reglas que no son opcionales:

- **Numeración correlativa desde `01`, sin huecos.** El sitio deja de buscar en
  el primer número que falta: si hay `01` y `03`, la `03` no aparece. Y si se
  borra la `01` sin renumerar, el ejemplar se queda **sin ninguna** fotografía,
  no con una menos.
- **Cada fotografía lleva su miniatura.** El sitio cuenta las fotos pidiendo las
  miniaturas; sin ellas cada ficha descarga megabytes solo para contarlas.
- **Una sola extensión por carpeta.** Todas las del registro son `.jpg`.
- El crédito fotográfico va en la hoja, no en el nombre del archivo.
- Se aplica la orientación EXIF y se retiran los metadatos de cámara,
  **incluidas las coordenadas GPS**.

### 3 · Regenerar el registro congelado

```sh
node fuente/construir/armar-registro.js --desde <csv>              # informa, no escribe
node fuente/construir/armar-registro.js --desde <csv> --escribir   # escribe
```

**Córrelo primero sin `--escribir`** y lee el informe: dice altas, bajas y
modificados. Una **baja inesperada se confirma antes de escribir**.

### 4 · Construir, verificar y publicar

```sh
fuente/construir/construir.sh
fuente/construir/construir.sh produccion
fuente/verificar/verificar.sh
```

No se publica sin esto:

- **Las dieciséis suites en verde.** Si una falla, se arregla o se actualiza la
  aserción **declarando por qué cambió el criterio**; nunca se borra en silencio.
- El armado dice «N de N ejemplares con coordenada» y N incluye al nuevo.
- El conteo de fotografías montadas de `verifica-galeria.mjs` sube: **se
  actualiza a mano**, para que un borrado accidental se vea.
- Abrir la ficha nueva y confirmar que se ven las fotografías y el mapa.

Después, commit y push. El sitio publicado no cambia hasta entonces.

---

## Qué hay dentro de `fuente/`

| Archivo o carpeta | Qué es |
|---|---|
| `estilos.css` | **La hoja de estilos completa.** Una sola, para las tres páginas. Colores, tipografías y medidas se declaran como variables al principio |
| `parciales/` | Encabezado y pie, un archivo cada uno. Se insertan en todas las páginas al ensamblar |
| `cuerpo.html` · `ficha-cuerpo.html` · `recursos-cuerpo.html` | El contenido de cada página |
| `logica.js` · `ficha-logica.js` | El guion de cada página |
| `modelo-portada.js` · `modelo-ficha.js` | **El modelo de cada página**: calcula lo que se muestra sin tocar el DOM. No se publica; es el arnés con el que las suites prueban los valores sin navegador |
| `mapa.js` | El mapa: marcadores, filtros, recorte a la Ciudad, ubicación. Aquí vive la llave de las teselas |
| `leaflet-diferido.js` | Carga Leaflet solo cuando el mapa entra en pantalla |
| `indicadores.js` | Las cifras del panel y de la franja |
| `especies.js` | Las siluetas e ilustraciones por especie |
| `fotos.js` | Descubrimiento de las fotografías en sus carpetas |
| `menu.js` | Navegación, resaltado de la sección en pantalla, botón de volver arriba y barras de desplazamiento propias |
| `citar.js` | El botón que copia cada cita. Solo en Recursos |
| `geo-cdmx.js` | Perímetro oficial de la Ciudad, del INEGI |
| `padron/fuente-viva.js` | **Lectura de la hoja publicada**: caché, respaldo y la guardia que rechaza un registro mutilado |
| `padron/lector-v2.js` | Traduce el CSV del padrón v2 a la estructura que consumen las páginas |
| `patrimoniales-loader.js` | Lector de la versión anterior del registro. **Ya no lo usa el sitio**; solo lo leen las maquetas y una suite |
| `datos/registro.json` | Los datos congelados: el respaldo con el que se arma el sitio |
| `datos/contrato-v2.json` | El contrato del padrón v2: los 83 campos, las dos compuertas, los catálogos y los rangos |
| `datos/en-espera.json` | Ejemplares montados que la hoja todavía no publica, con su motivo |
| `construir/sitio.js` | **La dirección pública, en un solo lugar.** Se cambia aquí el día de la mudanza |
| `construir/convocatoria.js` | **Si la convocatoria está abierta, en un solo lugar.** Decide si «Postula» aparece en el menú |
| `guia-alta.html` · `pendientes.html` | Documentación interna. Solo viajan a la vista previa, nunca al servidor |
| `assets/` | Imágenes, tipografías, geografía |
| `construir/` | Los ensambladores |
| `verificar/` | Las dieciséis suites |

> **Lo que vive en `fuente/assets/` se publica.** Por eso el juego completo del
> emblema institucional —quince archivos de los que el sitio usa dos— vive en
> `documentos/marca/emblema/` y no ahí.

---

## Los documentos

| Documento | Qué es |
|---|---|
| `documentos/Manual_identidad_digital.md` | Paleta, tipografía, componentes y reglas del sistema de diseño |
| `documentos/PASOS-GITHUB.md` | Cómo publicar, paso a paso |
| `documentos/marca/emblema/` | El juego completo del emblema: tres versiones por tres tamaños |
| `documentos/padron/` | Las columnas del `Listado` y el plan de migración del padrón |
| `documentos/auditorias/` | Las auditorías vigentes; las versiones superadas están en `historico/` |

La versión navegable del manual de identidad es `prueba/guia-identidad.html`: se
pinta con la misma hoja de estilos que el sitio, así que no puede quedar
desfasada.

---

## Publicación

El repositorio está configurado para GitHub Pages desde la rama principal,
carpeta `/docs`. Cada vez que se publica un cambio, el sitio se actualiza solo
en unos minutos.

Si las páginas van a colgar de nombres distintos, se indican al ensamblar y los
enlaces se resuelven solos:

```sh
RUTA_PORTADA=inicio.html RUTA_FICHA=arbol.html fuente/construir/construir.sh produccion
```

### El día de la mudanza al dominio definitivo

1. Cambiar `PORDEFECTO` en **`fuente/construir/sitio.js`**. Es una sola línea, y
   de ahí salen el `canonical`, el `og:url`, la imagen para compartir y el
   `sitemap` de las cuatro páginas.
2. **Subir `VERSION_TARJETA`** en ese mismo archivo, para que WhatsApp y
   Facebook vuelvan a leer la imagen para compartir en vez de servir la que
   tienen guardada por semanas.
3. Construir producción, correr las suites —la aserción del `canonical` avisa si
   algo quedó desalineado— y copiar el contenido de `docs/` a la raíz del sitio.

Hasta entonces el `canonical` apunta a la dirección de publicación actual **a
propósito**: apuntarlo a un dominio que todavía no responde le diría a los
buscadores que ignoren la versión que sí está en línea.

---

## Lo que falta

`prueba/pendientes.html` es la lista viva: se arma con el sitio y solo contiene
lo que sigue abierto. Lo que se cierra se borra de ahí y queda escrito en las
auditorías de `documentos/auditorias/`.
