# Árboles Patrimoniales de la Ciudad de México

Micrositio del registro público de árboles patrimoniales.
Secretaría del Medio Ambiente · Sistema de Información Ambiental de la Ciudad de México.

Sitio estático: HTML, CSS y JavaScript sin dependencias de servidor.
No necesita PHP, ni base de datos, ni proceso de compilación en el servidor.

---

## La regla que hay que recordar

```
editar fuente/  →  construir producción  →  commit
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
| `documentos/` | Auditorías, manuales y documentos de trabajo. | No |
| `prueba/` | Vista previa local. Se regenera sola. | No (está en `.gitignore`) |

**Nunca edites `docs/` a mano.** El armado la borra y la vuelve a escribir.

---

## Los dos comandos

Requiere Node.js. Desde la raíz del repositorio:

```sh
fuente/construir/construir.sh              # vista previa → prueba/
fuente/construir/construir.sh produccion   # sitio publicado → docs/
fuente/verificar/verificar.sh              # las catorce suites de comprobación
```

Para elegir qué ejemplar abre la ficha de la vista previa:

```sh
fuente/construir/construir.sh prueba tacuba
```

En Windows, con Git Bash —viene con GitHub Desktop— o con el Subsistema de
Windows para Linux.

Las suites corren sobre el sitio ya armado y fallan con código distinto de cero
si algo se rompió. Conviene correrlas antes de cada publicación.

---

## Qué hay dentro de `fuente/`

| Archivo o carpeta | Qué es |
|---|---|
| `estilos.css` | **La hoja de estilos completa.** Una sola, para las tres páginas. Colores, tipografías y medidas se declaran como variables al principio |
| `parciales/` | Encabezado y pie, un archivo cada uno. Se insertan en todas las páginas al ensamblar |
| `cuerpo.html` · `ficha-cuerpo.html` · `recursos-cuerpo.html` | El contenido de cada página |
| `logica.js` · `ficha-logica.js` | El guion de cada página |
| `modelo-portada.js` · `modelo-ficha.js` · `modelo-recursos.js` | **El modelo de cada página**: calcula lo que se muestra sin tocar el DOM. No se publica; es el arnés con el que las suites prueban los valores sin navegador |
| `mapa.js` | El mapa: marcadores, filtros, recorte a la Ciudad, ubicación |
| `leaflet-diferido.js` | Carga Leaflet solo cuando el mapa entra en pantalla |
| `indicadores.js` | Las cifras del panel y de la franja |
| `especies.js` | Las siluetas e ilustraciones por especie |
| `fotos.js` | Descubrimiento de las fotografías en sus carpetas |
| `menu.js` | Navegación y barras de desplazamiento propias |
| `geo-cdmx.js` | Perímetro oficial de la Ciudad, del INEGI |
| `patrimoniales-loader.js` | Lectura del registro **v1**. Es el que usa el sitio hoy |
| `padron/lector-v2.js` | Lectura del padrón **v2**. Escrito y probado, **todavía sin conectar** |
| `datos/registro.json` | Los datos congelados con los que se arma el sitio |
| `datos/contrato-v2.json` | El contrato del padrón v2: los 83 campos, las dos compuertas, los catálogos y los rangos |
| `guia-alta.html` · `pendientes.html` | Documentación interna. Solo viajan a la vista previa, nunca al servidor |
| `assets/` | Imágenes, tipografías, geografía |
| `construir/` | Los ensambladores |
| `verificar/` | Las doce suites |

---

## La vista previa

El armado sin argumentos produce `prueba/*-vista-previa.html`: un archivo por página, con todo
incrustado y los datos congelados. Se abre con doble clic, sin servidor y sin conexión. Sirve para
revisar y enseñar antes de publicar.

No es lo que se publica: lo publicado es `docs/`.

**Retirado.** Existió una segunda salida, `*.dc.html`, para servirla desde Claude Design y leer el
CSV en vivo. Se retiró: eran once archivos, 2 122 líneas y tres suites propias para una vía que ya
no se usa. Lo único que se conservó fueron sus tres módulos de lógica, renombrados a `modelo-*.js`,
porque son el único punto donde se puede probar qué muestra cada página sin abrir un navegador.

---

## Los documentos

| Documento | Qué es |
|---|---|
| `documentos/Manual_identidad_digital.md` | Paleta, tipografía, componentes y reglas del sistema de diseño |
| `documentos/PASOS-GITHUB.md` | Cómo publicar, paso a paso |
| `documentos/Ficha_impresa_Viejo_del_Agua.pdf` | Ejemplo de la ficha en papel, tres hojas |
| `documentos/padron/Guia_captura_padron_v2.html` | Las 95 columnas del `Listado` y cómo portar los registros |
| `documentos/padron/Plan_migracion_padron.html` | Las ocho fases del cambio de fuente de datos |
| `documentos/auditorias/` | Las cinco auditorías: integral, UX/UI, 360, la de la base de datos y la de valores sueltos de la hoja de estilos |

La versión navegable del manual de identidad es `prueba/guia-identidad.html`: se
pinta con la misma hoja de estilos que el sitio, así que no puede quedar
desfasada.

---

## Las fotografías

No se capturan en la hoja de cálculo: viven en el disco, **una carpeta por
ejemplar** nombrada con su identificador del registro.

```
fuente/assets/img/ejemplares/25-AZC-TAX-19405GIMNO-0006/01.jpg
                                                       /01-chica.jpg
                                                       /02.jpg
                                                       /02-chica.jpg
```

- `NN.jpg` — 1 400 px de lado largo, para el visor de la galería.
- `NN-chica.jpg` — 480 px, para las miniaturas del listado, del mapa y del tirador.

La numeración es correlativa desde `01`, **sin huecos**: el sitio deja de buscar
en el primer número que falta. Las reglas completas y los identificadores en uso
están en `fuente/assets/img/ejemplares/LEEME.txt` y en `pendientes.html`.

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

Para mudarlo al servidor definitivo basta copiar el contenido de `docs/` a la
raíz del sitio. No hace falta nada más.
