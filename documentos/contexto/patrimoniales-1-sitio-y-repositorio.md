# Árboles Patrimoniales · 1 · el sitio y su repositorio

Actualizado el 23 de agosto de 2026.

## Dónde vive

- **Local:** `C:\Users\jorge\OneDrive\Escritorio\SEDEMA\Sistema de Información Ambiental\Páginas web\arboles-patrimoniales`
- **Publicado:** <https://sedemaoficina.github.io/arboles-patrimoniales/> — GitHub Pages desde `/docs`
- **Remoto:** github.com/SedemaOficina/arboles-patrimoniales

## La regla que más se olvida

```
editar fuente/  →  fuente/construir/construir.sh produccion  →  commit
```

**Un commit sin construir no cambia el sitio.** Pages sirve `docs/`, no `fuente/`. Ya pasó: el commit y el push estaban bien —`main` y `origin/main` en el mismo hash— pero `docs/` era la construcción de día y medio antes. Señal para diagnosticarlo: en GitHub Desktop solo aparecen archivos de `fuente/` y ninguno de `docs/`.

**Nunca ejecutar Git dentro del repositorio del usuario.** Un `git status` dejó un `index.lock` que le bloqueó un commit. Lo entregado se verifica **por comparación de hashes**, que es solo lectura.

## Estructura

```
arboles-patrimoniales/
├── README.md   .gitignore   .gitattributes
├── fuente/                ← el código. Lo único que se edita
│   ├── assets/  construir/  datos/  decretos/
│   ├── padron/            ← el lector v2, todavía sin conectar
│   ├── parciales/  vendor/  verificar/
│   └── modelo-portada.js · modelo-ficha.js · modelo-recursos.js
├── docs/                  ← el sitio armado. Lo que sirve Pages
└── documentos/
    ├── Manual_identidad_digital.md · PASOS-GITHUB.md · Ficha_impresa_*.pdf
    ├── auditorias/        ← vigentes, más historico/ con LEEME que dice qué las sustituye
    └── padron/            ← guía de captura v2, plan de migración
```

`prueba/` está en `.gitignore` (243 archivos, 33.7 MB, regenerable). `_a_borrar/` también: existe porque desde estas sesiones **no se pueden borrar archivos en la carpeta montada, solo moverlos**.

Peso: 66 MB de árbol de trabajo y 41 MB en `.git/objects` con 810 objetos sueltos. Un `git gc` desde terminal lo compacta; no urge.

## Los `modelo-*.js` son el arnés de prueba

`modelo-portada.js`, `modelo-ficha.js` y `modelo-recursos.js` exponen un `renderVals()` puro: devuelve los valores que la página mostraría, sin tocar el DOM. Las suites los instancian así:

```js
const F = new Function('DCLogic', fs.readFileSync('modelo-ficha.js','utf8') + '; return Component;')(DCLogic);
const c = new F(); c.state = {...}; const r = c.renderVals();
```

Los módulos de producción escriben directo con `innerHTML`, así que **no se pueden probar sin navegador**. Si algún día se quieren retirar, primero hay que extraer un `renderVals()` de los de producción. No al revés.

## Retirado: la rama Claude Design (23 de agosto)

Once archivos, 2 122 líneas, 208 KB: las tres plantillas `*-dc-cuerpo.html`, `pie-design.html`, `armar-dc.js`, tres suites propias y las tres páginas `*.dc.html`. Fuera también su paso en `construir.sh` y en `verificar.sh`.

**Lo que se conservó fueron sus tres módulos de lógica**, renombrados a `modelo-*.js`: eran el arnés descrito arriba. Al borrarlos reventaron nueve suites de golpe.

Coste: de 15 suites y ~1 283 aserciones a **12 suites y 966**. Las ~317 perdidas fueron 79 de las suites propias y el resto la **mitad `.dc` de afirmaciones pareadas** —`/x/.test(pv) && /x/.test(dc)`— cuya primera mitad sigue viva. Solo una docena existía únicamente para esa salida.

Se retiró también el **bloque 9 de `verifica-sistema`**, que vigilaba dos parejas idénticas (`pie.html` ≡ `pie-design.html`, `recursos-cuerpo.html` ≡ `recursos-dc-cuerpo.html`): cada pareja se quedó con un solo archivo. Siguen siendo duplicados a propósito, ya sin vigilancia: `emblema-color-media.png` ≡ `emblema-media.png` y `emblema-chico.png` ≡ `emblema-color-chico.png`.

## Lección: la comprobación por referencias no basta

Un barrido marcó como «sin uso» 16 archivos de `assets/img/marca/` porque ningún código los nombra. **Son entregables de marca y dos suites afirman que existen.** Igual de engañoso al revés: las fotografías de `assets/img/ejemplares/` tampoco se nombran —`fotos.js` las descubre por número— así que un barrido ingenuo las marca todas.

Regla: en `assets/`, «nadie lo nombra» no equivale a «sobra». Correr las suites antes de retirar nada.

## Trampa: aserciones que dependen del orden

Dos suites verificaban filas **por posición** (`procedencia[2]`). Al retirar la fecha de nominación —la fila de en medio— se rompieron aunque el dato siguiera correcto. Ninguna aserción debe depender del orden de una lista que puede crecer o encoger.

## Construir desde estas sesiones deja residuos

`construir.sh` borra `docs/assets` y `docs/vendor` antes de copiar. Como `rm -rf` está prohibido en la carpeta montada, las construcciones hechas desde aquí corren los pasos de Node y copian encima, **sin el borrado previo**. Así sobrevivieron dos `persona-*.png` retirados de `fuente/` que se seguían publicando.

Comprobación:

```sh
diff <(cd fuente/assets && find . -type f | sort) <(cd docs/assets && find . -type f | sort)
```

La única diferencia correcta son los 8 archivos que el script inyecta: `css/estilos.css` y los 7 módulos de `js/`.

## Sin enlazar, sin decidir

`fuente/assets/geo/descargas/` — `perimetro-cdmx.geojson`, `.kml` y `-shp.zip`, 31 KB. No los enlaza ninguna página; el mapa usa `geo-cdmx.js`, que trae el perímetro en línea.

## Advertencia sobre capturas de pantalla

Anton, Fraunces y Source Sans 3 se cargan desde Google Fonts. En capturas hechas sin red salen sustituidas: no emitir juicios de tipografía ni de proporción a partir de esas capturas.
