# Montar el sitio en Express bajo `/arboles-patrimoniales`

Para quien clone este repositorio y lo sirva desde el servidor de
geoprocesamiento. Destino: `https://sedema.sia.cdmx.gob.mx/arboles-patrimoniales/`.

**Resumen en una línea:** se sirve la carpeta `docs/` tal cual, montada en
`/arboles-patrimoniales`, con compresión y con la barra final. No hay que
construir nada en el servidor ni instalar dependencias del sitio.

---

## 1 · Lo que se sirve

**Solo `docs/`.** Está ya construida: HTML, CSS y JavaScript incrustados, fotos,
datos abiertos y el Leaflet local en `vendor/`. No hay proceso de compilación
en el servidor, ni base de datos, ni PHP. `fuente/` es el código y no se
publica; `documentos/` tampoco.

Comprobado antes de entregar:

- Todas las rutas del sitio son **relativas** (`assets/…`, `arbol-tacuba.html`).
  No hay ninguna que arranque en `/`, así que funcionan bajo cualquier prefijo.
- No hay recursos por `http://`: nada de contenido mixto en HTTPS.
- Cada referencia local existe con su nombre **exacto**, mayúsculas incluidas.
  En Linux eso importa y en Windows no; ya está verificado para Linux.
- Los guiones `.sh` llevan finales de línea LF (lo fuerza `.gitattributes`).

---

## 2 · El montaje

```js
const path = require('path');
const express = require('express');
const compression = require('compression');   // npm i compression

const app = express();
app.use(compression());

app.use('/arboles-patrimoniales', express.static(path.join(__dirname, 'docs'), {
  // Con la barra final. Sin ella, las rutas relativas resuelven contra la raíz
  // del dominio y todos los assets dan 404. `redirect: true` es el valor por
  // defecto y hace el 301 de /arboles-patrimoniales a /arboles-patrimoniales/;
  // se deja explícito para que nadie lo apague.
  redirect: true,
  // Las páginas cambian con cada publicación; las fotos casi nunca. Una hora
  // con ETag deja que el navegador revalide barato (304) sin servir versiones
  // viejas por días.
  maxAge: '1h',
  etag: true,
  // Opcional: permite /arboles-patrimoniales/recursos además de recursos.html.
  extensions: ['html'],
}));

// Sin esto Express contesta «Cannot GET» en texto plano a cualquier ruta rota.
app.use('/arboles-patrimoniales', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'docs', 'index.html'));
});
```

**La compresión no es opcional.** Cada página lleva el CSS y el JavaScript
incrustados y pesa 320 KB en crudo; comprimida, 85 KB. GitHub Pages comprimía
solo; Express no. Sin `compression()` —o sin gzip en el nginx de enfrente— el
sitio se vuelve cuatro veces más pesado de un día para otro.

Si hay un nginx delante que ya comprime y cachea, se quita `compression()` y se
dejan los encabezados a nginx. Lo que no se puede quitar es la barra final.

---

## 3 · Si el servidor pone Content-Security-Policy

**Este es el punto donde el sitio se rompe entero sin que nadie toque el
código.** Si se usa `helmet()` con sus valores por defecto, o cualquier CSP
restrictiva, la página carga en blanco: todo el JavaScript va incrustado y la
política por defecto lo prohíbe.

Si hace falta una CSP, esta es la mínima que deja funcionar todo:

| Directiva | Orígenes | Para qué |
|---|---|---|
| `script-src` | `'self' 'unsafe-inline'` | El JavaScript va incrustado en cada página |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | La hoja va incrustada; las tipografías vienen de Google |
| `font-src` | `https://fonts.gstatic.com` | Los archivos de tipografía |
| `img-src` | `'self' data: https://basemaps.cartocdn.com` | Las fotos, las máscaras de los símbolos y las teselas del mapa |
| `connect-src` | `'self' https://docs.google.com` | La lectura en vivo de la hoja de cálculo |
| `frame-src` | `https://www.youtube-nocookie.com https://www.facebook.com https://www.google.com` | Los dos videos de Recursos y la vista de calle |

Lo más sencillo, si no hay una política institucional que lo exija, es **no
declarar CSP** para este sitio.

---

## 4 · Los metadatos ya apuntan al dominio definitivo

**Hecho el 9 de septiembre de 2026.** El `canonical`, el `og:url`, la imagen para
compartir y el `sitemap` de las cuatro páginas ya dicen
`https://sedema.sia.cdmx.gob.mx/arboles-patrimoniales/`, y la imagen para
compartir lleva versión nueva (`?v=3`) para que WhatsApp y Facebook la vuelvan
a leer en lugar de servir la que tenían guardada.

Lo único que hace falta del lado del servidor es **`git pull`** y que `docs/`
se sirva como dice el punto 2.

Si más adelante la vista previa de WhatsApp sigue saliendo vieja en algún
teléfono, no es el servidor: es la caché del propio WhatsApp, que guarda la
tarjeta por dirección durante semanas. Se resuelve subiendo `VERSION_TARJETA`
en `fuente/construir/sitio.js`, reconstruyendo y publicando.

---

## 5 · Qué revisar en el navegador después de montar

| Comprobar | Qué debe pasar |
|---|---|
| `…/arboles-patrimoniales` sin barra | Redirige a `…/arboles-patrimoniales/` y carga con estilos |
| Una ficha, p. ej. `…/arbol-tacuba.html` | Fotos y mapa visibles |
| El mapa al máximo acercamiento | Nítido, con nombres de calles. **Si sale gris**, la llave de CARTO puede estar atada al dominio anterior: se pide otra en `carto.com/basemaps/apikey` y se cambia en tres archivos (`mapa.js`, `ficha-logica.js`, `modelo-ficha.js`) |
| El botón de ubicación del mapa | Pide permiso y marca el pin. Requiere HTTPS, que ya hay |
| Recursos → «Copiar cita» | Aparece el botón y copia. Requiere HTTPS |
| Recursos → los dos videos | Cargan (YouTube sin cookies y Facebook) |
| Compartir la portada por WhatsApp | Sale la tarjeta con la imagen. Si sale la vieja, es la caché de WhatsApp: ver el punto 4 |
| Pestaña Red del navegador | Las páginas llegan con `Content-Encoding: gzip` (o `br`) |

---

## 6 · Lo que NO hay que hacer

- No editar nada dentro de `docs/` a mano: el armado la borra y la reescribe.
- No correr `construir.sh` en el servidor: `docs/` ya viene construida.
- No servir el repositorio completo, solo `docs/`.
- No agregar CSP «por seguridad» sin la tabla de arriba.
- El archivo `docs/.nojekyll` es de GitHub Pages; en Express no hace nada y no estorba.
