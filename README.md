# Árboles Patrimoniales de la Ciudad de México

Micrositio del registro público de árboles patrimoniales.
Secretaría del Medio Ambiente · Sistema de Información Ambiental de la Ciudad de México.

Sitio estático: HTML, CSS y JavaScript sin dependencias de servidor.
No necesita PHP, ni base de datos, ni proceso de compilación en el servidor.

## Qué hay en cada carpeta

| Carpeta | Qué es | ¿Se sube al servidor? |
|---|---|---|
| `docs/` | **El sitio publicado.** Lo que sirve GitHub Pages y lo que se copia al servidor final. | Sí, esto y nada más |
| `fuente/` | El código fuente. Es lo único que se edita. | No |
| `prueba/` | Vista previa local con datos congelados. Se regenera sola. | No (está en `.gitignore`) |

**Nunca edites `docs/` a mano.** El armado la borra y la vuelve a escribir.
Todo cambio se hace en `fuente/` y se reconstruye.

## Cómo se reconstruye

Requiere Node.js. Desde la raíz del repositorio:

```sh
fuente/construir/construir.sh              # vista previa → prueba/
fuente/construir/construir.sh produccion   # sitio publicado → docs/
```

En Windows, con Git Bash (viene con GitHub Desktop) o con el Subsistema de Windows para Linux.

## Cómo se verifica

```sh
fuente/verificar/verificar.sh
```

Corre doce suites de comprobaciones sobre el sitio ya armado y falla con
código distinto de cero si algo se rompió. Conviene correrlo antes de cada
publicación.

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
en el primer número que falta.

## Los datos

`fuente/datos/registro.json` es una copia congelada del registro. La versión
publicada lee ese archivo; la de Claude Design lee la hoja en vivo.

## Publicación

El repositorio está configurado para GitHub Pages desde la rama principal,
carpeta `/docs`. Cada vez que se publica un cambio, el sitio se actualiza solo
en unos minutos.

Para mudarlo al servidor definitivo basta copiar el contenido de `docs/` a la
raíz del sitio. No hace falta nada más.
