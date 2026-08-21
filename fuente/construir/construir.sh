#!/bin/sh
# Construye el sitio completo. Sin argumentos, arma la vista previa.
#   ./construir.sh            → ../../prueba/
#   ./construir.sh produccion → ../../docs/
set -e
cd "$(dirname "$0")"
DESTINO="${1:-prueba}"
export DESTINO
# La carpeta publicada se llama docs/: es el nombre que GitHub Pages
# reconoce para servir un sitio desde una subcarpeta de la rama principal.
if [ "$DESTINO" = "produccion" ]; then CARPETA=docs; else CARPETA=prueba; fi

node armar.js
node armar-ficha.js "${2:-viejo-del-agua}"
node armar-recursos.js
# Los datos abiertos se publican como archivos con direccion propia, no se
# fabrican en el navegador: asi se pueden citar y enlazar desde fuera.
node armar-datos.js
# La capa geografica del inventario, para QGIS y compania.
node armar-capa.js
# Las versiones .dc.html son artefactos de Claude Design, no del servidor.
[ "$DESTINO" != "produccion" ] && node armar-dc.js

DEST="../../$CARPETA"
# Los archivos de apoyo viajan con el sitio. Se borra antes de copiar: si no,
# los archivos que se retiran de la fuente sobreviven en la salida y acaban
# subiendo al servidor.
rm -rf "$DEST/assets" "$DEST/vendor"
mkdir -p "$DEST/assets"
cp -r ../assets/. "$DEST/assets/"
cp -r ../vendor "$DEST/" 2>/dev/null || true
mkdir -p "$DEST/assets/js"
cp ../mapa.js ../indicadores.js ../especies.js ../menu.js ../geo-cdmx.js ../fotos.js ../patrimoniales-loader.js "$DEST/assets/js/"
mkdir -p "$DEST/assets/css"
cp ../estilos.css "$DEST/assets/css/estilos.css"

# Los PDF de las declaratorias viajan al sitio con su nombre intacto: la ficha
# los busca por el nombre que la hoja de calculo guarda en el campo del
# decreto. La carpeta puede estar vacia; en ese caso las tarjetas se apagan
# solas en la ficha, sin enlaces rotos.
mkdir -p "$DEST/decretos"
cp ../decretos/*.pdf "$DEST/decretos/" 2>/dev/null || true

# La guía de identidad y la página de pendientes son documentación interna:
# solo viajan a pruebas, nunca al servidor público.
if [ "$DESTINO" != "produccion" ]; then
  node armar-guia.js
  cp ../pendientes.html "$DEST/"
  # La guía de alta es autocontenida: se puede copiar sola a la carpeta de
  # Drive que comparte el equipo técnico y se abre sin el resto del sitio.
  cp ../guia-alta.html "$DEST/"
fi

echo ""
echo "Listo. Sitio en $DEST/"
ls -1 "$DEST" | sed 's/^/  /'
