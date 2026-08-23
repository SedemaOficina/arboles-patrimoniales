# Árboles Patrimoniales · 2 · el padrón y sus datos

Actualizado el 23 de agosto de 2026.

## La hoja v2.1, medida sobre la hoja real

- `Listado`: **95 columnas** — 66 de captura, 29 de fórmula (encabezado con `ƒ`).
- `Salida_Publica`: **83 campos**.
- Bloques: 1 Control interno (6) · 2 Identificación (3) · 3 Categorías (5) · 4 Declaratoria (5) · 5 Ubicación (20) · 6 Taxonomía SNIB (19, todas fórmula) · 7 Dendrometría (14) · 8 Servicios ambientales i-Tree (20) · 9 Publicación (3).

El contrato como dato vive en `fuente/datos/contrato-v2.json`: los 83 campos, las dos compuertas, los catálogos y los rangos. La guía de captura de las 95 columnas es `documentos/padron/Guia_captura_padron_v2.html`.

Sheets en vivo: «Listado público de árboles patrimoniales» (`10BdUKLkWI09eC-6wdC9-7ZQnfrvty5Tum7xGdHtDQFU`), carpeta «Arboles Patrimoniales» (`1sjVl9-IJOgHj3eOr4K4eFRbUa9O3CnQ1`).

**No leer ni publicar la hoja `Listado`:** contiene observaciones internas y el nombre de quien dictamina.

Enlaces de Drive: el archivo se comparte como «Cualquier persona con el vínculo · Lector» y una fórmula extrae el id entre `/d/` y la siguiente diagonal, concatenándolo con las bases de `Parametros` — **B4** descarga directa del decreto, **B5** origen de imagen, **B6** patrón de Street View sin clave de API.

## Fase 2 cerrada: el lector

`fuente/padron/lector-v2.js` recibe texto CSV y el contrato y devuelve `{ejemplares, meta, stats}` con la forma que el sitio ya consume. Lo respaldan 106 aserciones en `verifica-lector.mjs`. **No está conectado:** el sitio sigue leyendo el JSON congelado. Conectarlo es la fase 5.

Decisiones fijas del lector:

- **El carbono elemental no se publica.** La salida lleva CO₂ equivalente (CO₂e = carbono × 3.667), que es la convención internacional. `carbonoSecuestrado_kg: null` a propósito. **Consecuencia para la fase 5:** los textos que hoy dicen «Carbono que retira del aire» tendrán que decir «CO₂ equivalente».
- **El rango se cobra sobre el dato, no sobre la fila.** Un ejemplar con la altura mal capturada se publica sin altura y con un aviso que lleva id, valor, rango y norma. Se descarta el dato, nunca el árbol.
- **Las banderas mandan sobre la columna resumen.** Si `categorias` dice una cosa y las cuatro columnas SÍ/NO otra, se publican las banderas y la discrepancia va a los avisos.
- **La compuerta de i-Tree viaja siempre.** Sin validar, las cifras llegan vacías pero el motivo (`En revisión`, `No publicable`) llega con el ejemplar, para que el sitio pueda decir por qué faltan en lugar de callar.
- **Sin moneda no hay importe.** Un número sin unidad no dice nada.

## El formato de las celdas: defensa permanente

El CSV se exporta con el **valor mostrado**, no con el almacenado: manda el formato de la celda y nadie recibe aviso si alguien reformatea una columna. Tres defectos ya corregidos en origen el 21 de agosto, cuyas defensas el lector conserva:

- Separador de miles en `beneficio_economico`, `escorrentia_l` y `precip_interceptada_l`. **Solo asoma arriba de mil**: invisible hasta el día que un ejemplar rebase los 1000.
- `fecha_decreto` en dd/mm/aaaa.
- `fecha_itree` como número de serie.

Formatos correctos: cifras `0.00`, coordenadas `0.000000`, fechas `aaaa-mm-dd`, código postal como texto sin formato.

## Auditoría de la base de datos · 49 hallazgos

Entregable: `documentos/auditorias/Auditoria_base_de_datos_arboles_patrimoniales.xlsx` (12 altos, 14 medios, 23 bajos). Contrastada contra la NADF-001-RNAT-2015.

**Causa raíz de los «12,052,025 kg de CO₂».** El bloque **BR:BV (Emisiones evitadas)** está capturado como **texto**. La validación que exige «número y que no sea fecha» cubre AY y BG:BQ y **se detiene justo antes de BR**: las cinco columnas fuera del rango validado son exactamente las cinco dañadas. «12/05/2025» se convirtió en fecha y el sitio la leyó como el entero. Celdas que siguen siendo fechas: BR11, BT9, BT11, BT13, BV11.

**La llave primaria se recalcula sola.** `A2` depende de fecha de nominación, alcaldía, género e id taxonómico: corregir cualquiera **renombra el árbol** y deja huérfana su carpeta `assets/img/ejemplares/<ID>/`. Peor: `P2 = VLOOKUP(O2,Alcaldias[#ALL],2)` **sin FALSE** — una alcaldía mal escrita no da #N/A, da en silencio la abreviatura de la alcaldía anterior en orden alfabético. Las validaciones de especie (D) y alcaldía (O) apuntan a `#REF!`.

**El bloque i-Tree no es coherente:**

- Carbono vs DAP: **r = −0.30**, debería ser fuerte y positiva. La Glorieta (48.95 kg/año, DAP 92 cm) secuestra 80× más que el Sabino de San Juan (0.61 kg/año, DAP 590 cm).
- `BI = BH × 3.667` en los trece: no es medición independiente, publicar ambas duplica la cuenta.
- **Renglones 11–14 vienen de otra corrida:** r(ozono, área de copa) = −0.04 con los trece, **+0.71** al excluirlos.
- **Interceptación imposible:** Sabino de San Juan, 610 049 L ÷ 363 m² = **1 680 mm** sobre la copa, dos o tres veces la precipitación de la zona.
- Razón interceptación:escorrentía **constante** (711:1 a 728:1) → factor fijo o error de unidad.
- Emisiones evitadas **negativas** en el Sabino (−107.11 kg CO₂) con ahorro eléctrico positivo.

**Dendrometría, la pregunta abierta.** La NADF-001 define DAP como diámetro a 1.30 m, pero su Anexo 1 admite que el dictaminador puede carecer de cinta diamétrica — el escenario en que se anota el perímetro. La esbeltez del padrón se separa en tres grupos: 4.2–6.1, 13.6–19.9 y 24.6–25.6. Un DAP de 590 cm implica **18.5 m de circunferencia**: si es correcto, es uno de los árboles más gruesos del país; si es perímetro, el DAP real es 188 cm.

**Desviaciones del catálogo:** tipo de ubicación (6 de 13 con texto libre); condición general dice «Buena» donde la norma dice «Bueno»; expectativa de vida «Mas de 40» sin acento ni «años». En cambio la **extensión de copa `=(largo+ancho)/2` es correcta**: el lineamiento 5 del Anexo 1 está mal redactado, no la hoja. Documentarlo en la metodología del sitio.

**Cosas que explican pendientes viejos:**

- `urlejemplar` y `urlorigen` son **VLOOKUP sobre la especie**, no sobre el ejemplar: que sean idénticas en los trece es el diseño de la fórmula. *(Desde el 23 de agosto sí se publican, con el renglón diciendo qué es cada una.)*
- `Link i-Tree` dice «MyTree» en los trece: MyTree no genera URL por árbol.
- `DECRETO VIEJO DL AGUA LAUREANO.pdf` en dos filas **es correcto**: un decreto ampara a los dos ejemplares. Solo hay que corregir la errata «DL» → «DEL».
- **El video de Santa Catarina** se explica: hay colonia Santa Catarina en Azcapotzalco (donde está el Viejo del Agua) y otra en Coyoacán (donde está el fresno «Santa Catarina»).
- Marcadores de nulo mezclados: «No determinado» (filas 3–10) y «S/D» (filas 11–14).

**Lo que salió bien:** los 21 VLOOKUP taxonómicos apuntan al desplazamiento correcto; las tres especies existen en el catálogo; las trece parejas de coordenadas geográficas y UTM concuerdan dentro de 6.4 m y no se derivan una de otra.

## Una fotografía archivada como dos ejemplares · sin resolver

| Archivo | Ejemplar | Posición |
|---|---|---|
| `25-CUH-TAX-19405GIMNO-0004/02.jpg` | Ahuehuete del **Jardín Ramón López Velarde**, Roma Sur | foto 02 |
| `25-CUH-TAX-19405GIMNO-0005/01.jpg` | Ahuehuete del **Parque España**, Roma Norte | foto 01 — **portada** |

Md5 idéntico (`ba874dd8…`; miniaturas `2344cb25…`). Publicado en vivo. Una de las dos atribuciones es falsa, y en Parque España es la de portada.

Hay además una **sospecha visual sin comprobar**: la portada de Ramón López Velarde parece ser una segunda foto del Jardín San Fernando. No son el mismo archivo. Los dos apuntan a que se barajaron fotografías de ahuehuetes vecinos de la Roma y el Centro: conviene revisar los cuatro de Cuauhtémoc de una pasada.

**Al corregir:** `fotos.js` pide 01, 02, 03… y **se detiene en el primer archivo que falta**; si falta la 01 el ejemplar se queda sin galería. Hay que borrar las dos versiones (`NN.jpg` y `NN-chica.jpg`) y renumerar en cadena. El procedimiento completo está en `fuente/pendientes.html`.

## Pendientes sobre los datos reales

1. **Portar los 23 registros al `Listado` v2.** Antes: rescatar las 13 ligas de i-Tree de la columna BW, corregir la fecha de `BT13` y el «No determinadi» de `BU10`, unificar marcadores de nulo.
2. Rehacer la corrida de i-Tree con **parámetros homogéneos** para los 23.
3. Resolver el ID y consecutivo duplicados de «Los Gemelos de San Álvaro» (siguiente libre 0033).
4. Diez de los trece publicados no tienen decreto; doce no tienen fotografía ni Street View.
5. Falta suelo de conservación en los 23; verificar en campo las diez coordenadas derivadas de UTM.
6. Asignar categoría al Sabino de San Juan y a Eugenio; confirmar si Laureano es NOTABLE o SINGULAR.
7. Confirmar la moneda del beneficio económico y el criterio taxonómico de *Cupressus / Hesperocyparis lusitanica*.
8. Revisar la dendrometría del Sabino de San Juan (DAP 590), Molotla (50.9) y Tlalnahuac (41.4).
9. **Consultar a jurídico** la publicación del nombre de quien nomina: la ficha muestra `SEDEMA-Fernando Venegas Rosas`. No es fallo del código —el contrato define el campo como «Nombre completo, institución u organización»— sino una decisión que nadie ha revisado desde protección de datos. Resolver antes de portar los 23.

## Defectos del control de calidad de la hoja

Semáforo en tres estados (LISTO / REVISAR / NO PUBLICABLE), 24 verificaciones por ejemplar. Sin arreglar:

1. El contador de «Incidencias» muestra 0 en renglones marcados REVISAR. El veredicto es correcto; el contador no.
2. La verificación de coordenadas solo se dispara con «Derivada de UTM» y «Sin verificar»: «Verificada en gabinete» tampoco se verificó en campo y pasa sin aviso.
3. La verificación del DAP revisa en un solo sentido; conviene que sea bidireccional.

## Nota sobre Google Drive desde estas sesiones

El conector **lee** y **crea archivos de texto**, pero no expone la API de Sheets: no se pueden escribir celdas ni subir un libro binario de ese tamaño. El usuario sube el .xlsx y lo abre con Sheets; desde aquí sí se puede leer de vuelta para verificar qué sobrevivió a la conversión.
