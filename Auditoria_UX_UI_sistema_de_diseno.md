# Auditoría de UX/UI y sistema de diseño
## Micrositio de árboles patrimoniales de la Ciudad de México
**Secretaría del Medio Ambiente · Agosto de 2026**

Alcance: `estilos.css` (1 062 líneas, 27 variables, 288 clases) y las cinco páginas que lo consumen. Toda medición de contraste se calculó con la fórmula de las Pautas de Accesibilidad para el Contenido Web sobre los colores **efectivos** —resolviendo transparencias y degradados contra el fondo real— y se verificó en navegador sobre 303 pares de texto/fondo renderizados. Los anchos se probaron en 32 anchuras entre 320 y 1920 píxeles.

---

## Resumen ejecutivo

| Prioridad | Hallazgos | Naturaleza |
|---|---|---|
| **P1 · Bloquea publicación** | 3 | Contraste por debajo del mínimo AA |
| **P2 · Deuda de paleta** | 6 | Color fuera del sistema de variables |
| **P3 · Reglas no escritas** | 3 | Convención real sin documentar, o rota |
| **P4 · Redundancia** | 3 | Componentes con propósito solapado |
| **P5 · Consistencia menor** | 3 | Escala y nomenclatura |

**Lo que está sano:** cero desbordamiento horizontal en 32 anchuras; cero clases en camelCase (nomenclatura BEM en español consistente); las 15 combinaciones de `.etiqueta`, `.servicio`, `.cifra` y `.grupo` sobre fondo profundo **pasan todas** —entre 5.02:1 y 9.41:1—; los `clamp()` no rompen la jerarquía en ningún ancho intermedio de la portada ni de la ficha.

---

# P1 · Contraste por debajo del mínimo (bloquea publicación)

Tres combinaciones incumplen el nivel AA. Las tres son texto pequeño, que es donde el requisito es más estricto (4.5:1).

### P1.1 · «Capital de la Transformación» — 2.84:1
**Dónde:** `.marca__gob i`, línea 74-75. Aparece en el encabezado de **las cinco páginas**.
**Qué pasa:** `#B28E5C` sobre `#FEF7E4` a 8.5 px y peso 700. Necesita 4.5:1, tiene 2.84:1.
**Por qué importa:** es parte del bloque institucional de Gobierno de la Ciudad. Un texto de identidad oficial ilegible es el peor lugar donde tener este problema.
**Arreglo:** subir a `var(--corteza)` `#6B5136` → **6.88:1**. Conserva el registro cálido y dorado del bloque. Alternativa si se quiere mantener el tono exacto del manual de Gobierno: subir el tamaño a 11 px, que sigue sin alcanzar; el cambio de color es la única vía real.

### P1.2 · Rótulo del aviso de ubicación — 3.40:1
**Dónde:** `.mapa-aviso__rotulo`, línea 1028. Se ve al pulsar el botón de ubicación en el mapa.
**Qué pasa:** `var(--jacaranda-bruma)` `#967DA5` sobre el crema del aviso, a 10.5 px y peso 700.
**Arreglo:** cambiar a `var(--jacaranda-hondo)` `#7A3E7F` → **6.96:1**. Es el token que el propio sistema reserva para «texto pequeño sobre papel».
**Nota de sistema:** `--jacaranda-bruma` está declarado como *«jacarandas al fondo de la ilustración»*. Usarlo como color de texto contradice su propia definición. Este es el único lugar donde ocurre.

### P1.3 · Código sobre la cabecera oscura de pendientes — 2.25:1
**Dónde:** regla `code` en `pendientes.html`, dentro de `.pend-cabeza` (fondo `#2A1630`).
**Qué pasa:** `var(--jacaranda-hondo)` está pensado para fondo claro; sobre el morado profundo cae a 2.25:1.
**Arreglo:** acotar la regla a fondo claro y declarar la variante oscura:
```css
.pend-cabeza code{color:var(--jacaranda-luz);background:rgba(199,159,202,.16)}
```
→ **7.36:1**.

---

# P2 · Consistencia de paleta

Fuera de `:root` viven **41 valores hexadecimales distintos**. No todos son un problema —los neutros de impresión son legítimos—, pero seis casos sí lo son.

### P2.1 · `#413647` es el color de cuerpo de facto y no tiene token · **27 usos**
Es, por mucho, el hex suelto más repetido: `.encabezado p`, `.norma p`, `.paso p`, `.linea__cuerpo p`, `.ruta__opcion p`, `.medida span`, `.visita p`, `.postula__pie`, `.dato__texto`, `.barra nav a` y quince más.

**El diagnóstico:** el sistema declara `--tinta` (#1A1A1A) para «texto principal» y `--gris` (#5E5563) para «secundario», pero el texto que realmente lee la ciudadanía en el 80 % de la página no es ninguno de los dos — es este morado-tinta intermedio que nadie declaró.

**Arreglo:** `--tinta-suave:#413647; /* cuerpo sobre papel: 10.65:1 */` y sustituir los 27 usos. Contraste verificado: **10.65:1** sobre papel. Es el cambio de mayor impacto en mantenibilidad de toda la auditoría.

### P2.2 · Cuatro hex que duplican tokens existentes
| Valor | Es idéntico a | Dónde |
|---|---|---|
| `#8D4992` ×2 | `--jacaranda` | filetes del membrete de impresión |
| `#B28E5C` ×1 | `--dorado` | `.marca__gob i` |
| `#8FC77F` ×1 | `--verde-luz` | `.guia-par__mal` (muestra didáctica) |
| `#8B6F47` ×1 | `--corteza-luz` | degradado de `.escala__tronco` |

**Arreglo:** sustituir por la variable. Sin efecto visual; elimina cuatro puntos donde un cambio de paleta se olvidaría.

### P2.3 · Familia de grises-morados con un miembro indistinguible
Cinco tonos hacen el mismo trabajo: `--gris` #5E5563, `#5A5660`, `#6F6A79`, `#5B4F62`, `#4A3F50`.

`#5A5660` (en `.mapa-item__met`) está a **Δ8.1** de `--gris` — imperceptible a simple vista. Es ruido puro.

**Arreglo:** `#5A5660` → `var(--gris)`. Los otros tres sí se distinguen (Δ60 a 85) y pueden quedarse, pero conviene decidir si `.mapa-aviso__pie` y `.galeria__pie b` necesitan tono propio o si también colapsan a `--gris`.

### P2.4 · El guinda de Gobierno de la Ciudad no tiene token · **3 usos**
`#9D2148` en `.marca__gob b` y `.marca__dep`. Es el guinda oficial del Gobierno de la Ciudad de México, y por eso **no debe absorberse en la familia jacaranda**: es una marca ajena que el sitio hospeda.

**Arreglo:** declararlo como tal, con su procedencia comentada:
```css
--guinda-gobierno:#9D2148;  /* marca del Gobierno de la Ciudad: no es del sistema, no se altera */
```

### P2.5 · Dos verdes oscuros violan la regla escrita del verde · **5 usos**
`#16301D` y `#0F2115` sobreviven en `.miniatura`, `.sin-foto`, `.vista-calle`, `.globo-mapa img` y `.galeria__principal`.

**El problema:** son fondos de imagen, y la hoja de estilos declara explícitamente que *«sobre el jacaranda profundo no entra ningún verde»*. Estos rectángulos verde oscuro conviven con la cabecera morada de la tarjeta y con la portada morada de la ficha, en la misma pantalla. Son residuo de la paleta anterior.

**Arreglo:** alinearlos al degradado que ya usa `.ficha__retrato` (`#1D0F23` → `#4A2A50`), o al `--tinta-jacaranda` plano. Es el hallazgo con más impacto visual de los P2.

### P2.6 · El degradado de la tarjeta no tiene token
`#1D0F23` y `#4A2A50` en `.ficha__retrato` son la cabecera de las trece tarjetas del listado y no están declarados.

**Arreglo:** `--jacaranda-noche:#1D0F23;` y `--jacaranda-brasa:#4A2A50;`, o un token de degradado completo.

---

# P3 · Reglas de color no escritas

La hoja documenta con claridad dos reglas —el verde no entra al fondo profundo, y el morado es la tinta y no el fondo—. Existe una tercera regla que **el código obedece sin haberla escrito nunca**.

### P3.1 · La convención de estado existe pero no está documentada
Reconstruida de los usos reales:

| Estado | Color | Dónde aparece |
|---|---|---|
| **Resuelto / abierto / disponible** | `--verde-vivo` y `--verde-niebla` | `.convocatoria[data-estado="abierta"]`, `.pend--listo`, `.pend__quien[data-q="listo"]` |
| **En espera / requiere decisión** | `--dorado` y `--corteza` | `.convocatoria` cerrada, `.pend` base, `.pend__quien[data-q="registro"]`, `.norma` |
| **Bloqueado / prohibido / urgente** | `--alerta` | `.pend--bloquea`, `.pend__quien[data-q="tu"]`, `.cuidado__idea--alerta` |

Es coherente en los tres componentes. **Falta escribirla**, con el mismo rango que las otras dos:

```css
/* Estados. REGLA: verde = resuelto o disponible; dorado = en espera o
   requiere decisión; alerta = bloqueado o prohibido. El estado nunca se
   comunica solo con color: siempre lo acompaña una palabra —«Hecho»,
   «Decidir», «Tú»— porque el color no llega a quien no lo distingue. */
```

La segunda oración no es adorno: es lo que hace que el sistema cumpla el criterio de no depender del color, y conviene dejarlo escrito para que nadie lo quite.

### P3.2 · El azul de «trámite» está fuera de todas las familias
`.etiqueta--tramite` usa `#EDF0F6` / `#4C5B7A`, y su variante oscura `#B9C8E4`. **Es el único azul del sitio.** No pertenece al jacaranda, ni al verde, ni al dorado, ni a la corteza, ni a la mariposa.

**Diagnóstico:** el azul entró para decir «esto es un procedimiento en curso», que es justo lo que la convención de estado ya expresa con el dorado. Es un cuarto estado inventado para un solo caso.

**Arreglo recomendado:** colapsarlo al dorado de «en espera», que es semánticamente lo que es —una declaratoria en trámite está esperando—. Si se decide conservar el azul porque distingue «trámite» de «pendiente de captura», entonces debe declararse como familia con su regla, no vivir como tres hex sueltos.

### P3.3 · Dos etiquetas de estado son indistinguibles entre sí
`.etiqueta--dorada` (`#F6EFE3` / `#7A5E33`) y `.etiqueta--historica` (`#F3EDE2` / `#7A6136`) están a **Δ6.7 en el fondo y Δ7.7 en el texto**. A simple vista son el mismo color.

Comunican cosas distintas: una es la categoría **Histórico**; la otra, que el **decreto es anterior al programa**. Un usuario no puede distinguirlas.

**Arreglo:** o se diferencian de verdad —la segunda al gris de `.etiqueta--vacia`, que es lo que semánticamente es: ausencia de categoría—, o se unifican en una sola clase. Mantener dos que se ven igual es lo peor de las dos opciones.

---

# P4 · Redundancia de componentes

### P4.1 · `h3` carga once tratamientos visuales distintos
Va de 11.5 px en versalitas (`.dato h3`) a 26 px en tipografía de despliegue (`.ruta__cabeza h3`), y la familia salta entre `--display`, `--texto` y herencia.

Son **dos roles distintos** usando la misma etiqueta:

- **Título de bloque** — 17 a 26 px, `--display`, capitalización normal: `.ruta__cabeza`, `.linea__cuerpo`, `.postula-dudas .paso`, `.cuidado__idea`, `.recurso`, `.ficha__cuerpo`, `.grupo`.
- **Rótulo** — 11.5 a 14 px, `--texto`, versalitas, interletrado abierto: `.dato`, `.paso`, `.pie`, `.datos-abiertos`, `.cuidado__cierre`.

El segundo grupo **reproduce exactamente lo que hace `.rotulo`**, que ya existe como clase.

**Arreglo:** los cinco casos del segundo grupo usan `<span class="rotulo">` —como ya hacen todas las secciones— y `h3` queda reservado a títulos de bloque. Reduce once reglas a dos y devuelve coherencia entre el nivel semántico del encabezado y su peso visual.

### P4.2 · `.recurso` y `.paso` son la misma tarjeta
Comparten 3 de 5 propiedades **idénticas** (`background`, `border`, `border-top:3px solid var(--jacaranda)`) y solo difieren en `padding` y `position`.

**Arreglo:** una clase base —`.tarjeta`— y dos modificadores, o directamente unificar. `.ruta__opcion` es una tercera variante de lo mismo con borde distinto.

### P4.3 · `.norma--eje` aporta dos propiedades
Solo cambia `border-left-color` y `background` respecto de `.norma`. Es un modificador legítimo, pero conviene confirmar que la distinción se sigue leyendo tras el cambio de paleta; hoy el contraste entre ambas variantes es sutil.

---

# P5 · Consistencia menor

### P5.1 · Tres puntos de quiebre para el mismo tipo de componente
El sistema declara **16 valores distintos** de `@media`. Para «rejilla de dos columnas pasa a una» conviven tres:

| Ancho | Componentes |
|---|---|
| **860 px** | `.escala`, `.ubicacion`, `.dos-columnas`, `.galeria`, `.galeria__tiras`, `.mapa-caja__lienzo` |
| **820 px** | `.cumplimiento`, `.pie__fino`, `.sello--ficha` |
| **720 px** | `.ruta__opciones` |

Entre 820 y 860 píxeles, `.cumplimiento` ya es una columna mientras `.dos-columnas` sigue en dos. Entre 720 y 820, `.ruta__opciones` sigue en dos cuando todo lo demás colapsó.

**No produce ningún defecto visual** —verificado en 32 anchuras, incluidas 819, 821, 859 y 861—, pero el sistema promete una escala que no cumple.

**Arreglo:** consolidar en 860 px salvo justificación escrita. Lo mismo con el par 620/560, que hoy se reparte sin criterio aparente.

### P5.2 · La entrada de sección crece por encima del `h3`
`.entrada` y `.encabezado p` usan `clamp(17px, 1.9vw, 21px)` y llegan a 25 px en la portada a partir de 1180 px, mientras `h3` está fijo en 22 px. A pantalla completa, un subtítulo de sección es más pequeño que el párrafo de entrada.

No rompe nada —son elementos de secciones distintas y rara vez se ven juntos—, pero es una inversión de jerarquía. **Arreglo:** dar a `h3` su propio `clamp(19px, 1.7vw, 24px)`.

### P5.3 · Nomenclatura: consistente, con una zona gris
**Lo bueno:** cero clases en camelCase, cero mezcla de idiomas —salvo las de Leaflet, que son de la biblioteca y no deben tocarse—, 125 clases con `bloque__elemento` y 42 con `bloque--modificador`. La convención BEM en español se sostiene en las 288 clases.

**La zona gris:** 45 clases usan guion simple (`mapa-caja`, `dato-linea`, `vista-calle`, `nota-categoria`, `sin-foto`). Ahí el guion a veces separa palabras de un bloque (`vista-calle`) y a veces marca pertenencia a otro bloque (`mapa-caja`, que es un elemento de la sección de mapa y debería ser `mapa__caja`).

**Arreglo:** es deuda cosmética, no funcional. Si se toca, hacerlo de una sola vez con búsqueda y reemplazo verificada por las suites; no vale la pena mezclarlo con cambios de fondo.

---

# Orden de ejecución sugerido

1. **P1 completo** — tres cambios de una línea cada uno. Son requisito de accesibilidad y el sitio es de gobierno.
2. **P2.5** — los verdes oscuros residuales. Es el hallazgo con más impacto visual y el que más contradice lo ya documentado.
3. **P2.1 + P2.2 + P2.3** — tokenizar `#413647`, sustituir los cuatro duplicados y colapsar `#5A5660`. Un solo pase de búsqueda y reemplazo, sin efecto visual.
4. **P3.1** — escribir la regla de estados. Cinco minutos, y evita que la próxima persona invente un cuarto color.
5. **P3.2 y P3.3** — decisión editorial sobre el azul de trámite y sobre las dos etiquetas indistinguibles. Requiere criterio, no código.
6. **P4.1** — separar `h3` de `.rotulo`. Es el de mayor beneficio estructural y el más laborioso.
7. **P5** — cuando haya holgura.

Los pasos 1 a 4 no cambian ninguna decisión de diseño: solo hacen que el sistema diga lo que ya hace.
