# Micrositio de árboles patrimoniales de la Ciudad de México
Secretaría del Medio Ambiente · Estructura del proyecto

---

## Las tres carpetas, y qué hace cada una

```
fuente/        ← lo ÚNICO que se edita
prueba/        ← vista previa. Se borra cuando el sitio esté listo
produccion/    ← lo que se sube al servidor
```

**`fuente/` es la verdad.** Todo lo demás se genera a partir de ahí. Si editas
un archivo de `prueba/` o de `produccion/`, el siguiente ensamblado lo pisa y
pierdes el cambio.

**`prueba/` es la vista previa.** Archivos de una sola pieza —el CSS, el guion
y los datos van dentro del mismo HTML— que se abren con doble clic sin
servidor. Traen los datos **congelados** en el momento de ensamblar. Sirven
para revisar y para enseñar el avance. Incluyen dos páginas internas que nunca
van al servidor: `pendientes.html` y `guia-identidad.html`.

**`produccion/` es lo que se publica.** Mismos contenidos, con los nombres que
espera un servidor web —`index.html`, `ficha.html`, `recursos.html`— y sin las
páginas internas ni los artefactos de Claude Design.

Cuando el sitio quede a tu satisfacción, **borra `prueba/`**. No se pierde
nada: se vuelve a generar con un comando.

---

## Los dos comandos

```sh
fuente/construir/construir.sh              # arma la vista previa en prueba/
fuente/construir/construir.sh produccion   # arma el sitio en produccion/
fuente/verificar/verificar.sh              # corre las doce suites de comprobación
```

Para elegir qué ejemplar abre la ficha de la vista previa:

```sh
fuente/construir/construir.sh prueba tacuba
```

---

## Qué hay dentro de `fuente/`

| Archivo o carpeta | Qué es |
|---|---|
| `estilos.css` | **La hoja de estilos completa.** Una sola, para las tres páginas y las dos versiones. Los colores, tipografías y medidas se declaran como variables al principio |
| `parciales/` | Encabezado y pie, en un archivo cada uno. Se insertan en todas las páginas al ensamblar |
| `cuerpo.html` | Contenido de la portada |
| `ficha-cuerpo.html` | Contenido de la ficha de ejemplar |
| `recursos-cuerpo.html` | Contenido de la página de recursos |
| `dc-cuerpo.html`, `ficha-dc-cuerpo.html`, `recursos-dc-cuerpo.html` | Los mismos contenidos para Claude Design |
| `logica.js`, `ficha-logica.js`, `recursos-…` | El guion de cada página |
| `dc-logica.js`, `ficha-dc-logica.js` | Los mismos guiones para Claude Design |
| `mapa.js` | El mapa: marcadores, filtros, recorte a la Ciudad, ubicación |
| `indicadores.js` | Las cifras del panel y de la franja |
| `especies.js` | Las siluetas e ilustraciones por especie |
| `fotos.js` | Descubrimiento de las fotografías en sus carpetas |
| `menu.js` | Navegación y barras de desplazamiento propias |
| `geo-cdmx.js` | Perímetro oficial de la Ciudad, del INEGI |
| `patrimoniales-loader.js` | Lectura y normalización del registro |
| `datos/registro.json` | Los datos congelados que usa la vista previa |
| `assets/` | Imágenes, tipografías, geografía |
| `construir/` | Los ensambladores |
| `verificar/` | Las doce suites |

---

## Dos versiones del sitio, y en qué se diferencian

| | Vista previa (`*-vista-previa.html`) | Claude Design (`*.dc.html`) |
|---|---|---|
| **Datos** | Congelados al ensamblar | Se leen **en vivo** del CSV publicado |
| **Archivos** | Uno solo, todo incrustado | HTML + módulos en `assets/js/` |
| **Se abre** | Con doble clic | Servida por Claude Design |
| **Sirve para** | Revisar y enseñar sin conexión | Ver el avance de la captura al instante |

La diferencia que importa: con doce ejemplares sin fotografía y once sin edad,
la versión de Claude Design deja ver el avance de la captura sin volver a
ensamblar nada.

---

## Al publicar en el servidor

```sh
fuente/construir/construir.sh produccion
```

Sube el contenido de `produccion/` a la raíz del micrositio. Si las páginas
van a colgar de nombres distintos, se indican al ensamblar:

```sh
RUTA_PORTADA=inicio.html RUTA_FICHA=arbol.html fuente/construir/construir.sh produccion
```

Los enlaces entre páginas se resuelven con esos nombres. **No hay que tocar el
código.**

---

## Documentos que van en la raíz

| Archivo | Qué es |
|---|---|
| `LEEME.md` | Este documento |
| `Manual_identidad_digital.md` | Paleta, tipografía, componentes y reglas del sistema |
| `Auditoria_UX_UI_sistema_de_diseno.md` | Los 18 hallazgos priorizados y su estado |
| `Auditoria_integral.md` | Auditoría técnica anterior, de código |
| `Ficha_impresa_Viejo_del_Agua.pdf` | Ejemplo de la ficha en papel, tres hojas |

La versión navegable del manual es `prueba/guia-identidad.html`: se pinta con la misma hoja de estilos que el sitio, así que no puede quedar desfasada.

---

## Las fotografías

No se capturan en la hoja de cálculo. Van en `fuente/assets/img/ejemplares/`,
una carpeta por ejemplar nombrada con su identificador del registro, con las
imágenes numeradas `01`, `02`, `03`… sin huecos.

Las reglas completas y los trece identificadores están en
`fuente/assets/img/ejemplares/LEEME.txt` y en la página `pendientes.html`.
