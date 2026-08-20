#!/bin/sh
# Corre las doce suites. Falla con codigo distinto de cero si algo se rompio.
#
# El veredicto se toma del CODIGO DE SALIDA de cada suite, no de buscar la
# frase «0 fallidas» en su texto. Buscarla era un colador: verifica-galeria
# imprime un RESULTADO parcial a media corrida y esa linea hacia pasar la
# suite entera aunque el total final trajera fallas. Un tablero que miente
# es peor que no tener tablero.
cd "$(dirname "$0")"
mal=0
for f in verifica-dc verifica-ficha-dc verifica-galeria verifica-mapa verifica-panel \
         suite-real verifica-identidad verifica-copia verifica-contenido \
         verifica-design verifica-menu verifica-auditoria; do
  salida=$(node "$f.mjs" 2>&1)
  codigo=$?
  linea=$(echo "$salida" | grep -E '^(TOTAL|RESULTADO)' | tail -1)
  printf '%-22s %s\n' "$f" "$linea"
  [ "$codigo" -eq 0 ] || mal=$((mal+1))
  echo "$salida" | grep '❌' | sed 's/^/    /'
done
echo ""
[ $mal -eq 0 ] && echo "Todo en verde." || echo "$mal suites con fallas."
exit $mal
