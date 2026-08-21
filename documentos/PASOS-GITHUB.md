# Publicar el sitio desde GitHub Desktop

Guía de una sola pasada. Al terminar tendrás una carpeta local donde trabajas,
un repositorio en GitHub y una dirección pública para probar en entorno real.

---

## 0 · Lo que vas a necesitar

- **GitHub Desktop** — <https://desktop.github.com>
- **Node.js LTS** — <https://nodejs.org> · Solo hace falta para *reconstruir*
  el sitio después de editar contenido. Para publicar lo que ya está, no.

---

## 1 · Armar la carpeta local

La carpeta será:

```
C:\Users\jorge\OneDrive\Escritorio\SEDEMA\Sistema de Información Ambiental\Páginas web\arboles-patrimoniales
```

**Está dentro de OneDrive. Lee la sección «OneDrive» del final antes de
seguir**: hay un ajuste que sí conviene hacer y una razón de fondo para
considerar moverla.

Comprobación de longitud de ruta, que en Windows tiene tope de 260 caracteres:
la ruta más larga del repositorio queda en **179**. Hay margen.

**Este paso ya está hecho.** La carpeta se armó y se verificó archivo por
archivo: 502 archivos, con la misma huella digital que el original. No tienes
que descomprimir ni copiar nada.

Queda una limpieza a tu cargo: borra la carpeta `Páginas web\_a_borrar\`.
Ahí quedaron los ZIP de la entrega y unos sobrantes de la descompresión.

*(Si algún día tuvieras que rehacer la carpeta desde cero: descomprimir el ZIP
del repositorio, descomprimir encima los dos de fotos, y copiar la carpeta
`ejemplares` resultante a `fuente\assets\img\` y a `docs\assets\img\`.
Los ZIP venían partidos por un tope de las herramientas de entrega —20 MB por
archivo—, no por ninguna limitación de tu equipo ni del proyecto.)*

Al final tienes que ver esto:

```
arboles-patrimoniales\
├── README.md
├── .gitignore
├── docs\          ← el sitio publicado
│   ├── index.html
│   ├── ficha.html
│   ├── recursos.html
│   └── assets\img\ejemplares\   ← las fotos, también aquí
├── documentos\    ← auditorías, manuales, guías del padrón
└── fuente\        ← el código fuente
    └── assets\img\ejemplares\   ← las fotos
```

**Comprobación:** abre `docs\index.html` con doble clic. Debe verse el sitio
completo, con las trece fotografías. Si las tarjetas salen sin foto, la carpeta
`ejemplares` no quedó dentro de `docs\assets\img\`.

---

## 2 · Crear el repositorio

1. Abre GitHub Desktop e inicia sesión con tu cuenta.
2. **File → Add local repository…** y elige la carpeta que acabas de armar.
3. Te dirá que no es un repositorio de Git y te ofrecerá **«create a
   repository»**. Acepta.
4. En la ventana que sale:
   - **Name:** `arboles-patrimoniales`
   - **Description:** Micrositio del registro público de árboles patrimoniales de la Ciudad de México
   - **Git ignore:** *None* — el repositorio ya trae su `.gitignore`
   - **License:** *None* por ahora
5. **Create repository.**
6. Botón **Publish repository** arriba a la derecha.
   - **Deja desmarcado** «Keep this code private» — Pages gratuito necesita que
     el repositorio sea público, y es lo que buscas para esta prueba.
   - **Publish repository.**

La primera subida tarda unos minutos: son 56 MB de fotografías.

---

## 3 · Encender GitHub Pages

1. En GitHub Desktop: **Repository → View on GitHub**.
2. En la web: pestaña **Settings** → menú izquierdo **Pages**.
3. En «Build and deployment»:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` y, en el desplegable de al lado, **`/docs`**
   - **Save**
4. Espera de dos a tres minutos y recarga. Aparecerá arriba:

   `https://<tu-usuario>.github.io/arboles-patrimoniales/`

Esa es tu dirección de prueba.

---

## 4 · Ciclo de trabajo de aquí en adelante

Se acabaron los ZIP. A partir de ahora:

1. Editas lo que sea **dentro de `fuente\`**. Nunca dentro de `docs\`: el
   armado la borra y la vuelve a escribir.
2. Reconstruyes. Clic derecho en la carpeta del repositorio → **Git Bash Here**
   (lo instala GitHub Desktop), y ahí:

   ```sh
   fuente/construir/construir.sh produccion
   fuente/verificar/verificar.sh
   ```

   El primero rearma `docs\`. El segundo corre las catorce suites de
   comprobaciones y **falla con error si algo se rompió**. Córrelo siempre
   antes de publicar.

   > **Este paso no es opcional y es el que más se olvida.** Un commit sin
   > reconstruir sube el código pero deja la página exactamente igual, porque
   > GitHub Pages sirve `docs\`, no `fuente\`. Si publicas un cambio y el
   > sitio no cambia, es casi siempre esto.
3. En GitHub Desktop verás los archivos cambiados. **Tienen que aparecer
   archivos de `docs\`**: si solo aparecen los de `fuente\`, te saltaste el
   paso 2. Escribe una descripción
   corta abajo a la izquierda, **Commit to main**, y luego **Push origin**.
4. El sitio se actualiza solo en un par de minutos.

---

## 5 · Qué gana el sitio al salir de `file://`

Publicado por HTTPS empiezan a funcionar cosas que en local no pueden:

- **El botón de ubicación del mapa.** Los navegadores solo entregan la
  ubicación en contexto seguro. Con doble clic en un archivo local nunca
  funciona; en Pages sí.
- **Los mapas y la vista de calle** cargan sus teselas sin bloqueos.
- **El PDF de la ficha** sale con todas las imágenes.

---

## 6 · Cuando pases a tu servidor definitivo

Copia el contenido de `docs\` a la raíz del sitio. Nada más.
No hay proceso de compilación, ni base de datos, ni configuración de servidor.
Todas las rutas son relativas, así que funciona igual en la raíz de un dominio
que en una subcarpeta.

---

## OneDrive

La carpeta que elegiste está sincronizada por OneDrive. Funciona, pero conviene
saber qué estás aceptando.

**El riesgo real** no son los archivos del sitio: es la carpeta oculta `.git`.
Git escribe ahí cientos de archivos pequeños en cada operación, y OneDrive los
sincroniza mientras se escriben. Cuando las dos cosas coinciden, el repositorio
puede quedar corrupto. No pasa siempre —puede no pasarte nunca— pero cuando
pasa, se pierde el historial local.

**El ajuste que sí hay que hacer.** OneDrive puede convertir archivos en
marcadores de posición para ahorrar espacio; Git entonces los ve como
modificados o no los puede leer. Para evitarlo:

> Clic derecho en la carpeta `arboles-patrimoniales` →
> **«Mantener siempre en este dispositivo»**

**Lo que te haría reconsiderar.** Si guardas el proyecto en OneDrive es para
tenerlo respaldado. Una vez publicado en GitHub, **GitHub ya es el respaldo**:
guarda cada versión, con su fecha y su descripción, y se puede recuperar
cualquier estado anterior. OneDrive encima de eso no añade seguridad y sí añade
un modo de falla. Mi recomendación es mover la carpeta a
`C:\Users\jorge\Documentos\arboles-patrimoniales` en cuanto el repositorio
esté publicado. Si prefieres dejarla donde está, haz el ajuste de arriba.

**Y nunca** abras la misma carpeta de OneDrive desde dos computadoras a la vez
con GitHub Desktop en ambas: ahí la corrupción es cuestión de tiempo.

---

## Advertencias

- **`FOTOS_PAGINA-Arboles Patrimoniales` se queda fuera del repositorio.** Son
  los originales de cámara: 905 MB que GitHub no debe cargar. Las versiones
  para web ya viven dentro del proyecto. Guarda los originales donde están.
- **El repositorio será público.** Antes de subirlo revisa que ninguna
  fotografía tenga restricciones de uso: solo deben publicarse imágenes cuyos
  derechos tenga la Secretaría o estén expresamente licenciadas para uso
  público.
- **`pendientes.html` no viaja a `docs\`.** Es documentación interna y el
  armado la deja únicamente en la vista previa. En el repositorio público vive
  como fuente, no como página publicada.
- **`prueba\` está en `.gitignore`.** Se regenera con
  `fuente/construir/construir.sh` sin argumentos.
