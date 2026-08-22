/**
 * EL LECTOR DEL PADRÓN v2
 * Se prueba contra el CSV real guardado en el repositorio y contra casos
 * fabricados a mano para las trampas que el CSV real todavía no contiene.
 * El lector no toca el sitio: si esta suite pasa, el sitio sigue igual.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as L from '../padron/lector-v2.js';
/* Igual que las demás suites: se planta en fuente/ para correr desde donde sea. */
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

console.log('\n══ LECTOR DEL PADRÓN v2 ══');
let ok = 0, mal = 0;
const t = (rotulo, cond, detalle = '') => {
  if (cond) { ok++; console.log(`  ✅ ${rotulo}`); }
  else { mal++; console.log(`  ❌ ${rotulo}${detalle ? ' → ' + detalle : ''}`); }
};

const C = JSON.parse(fs.readFileSync('datos/contrato-v2.json', 'utf8'));
const CSV = fs.readFileSync('verificar/datos/salida-publica-muestra.csv', 'utf8');

console.log('\n-- el analizador de CSV --');
{
  const f = L.analizarCSV('a,b,c\n1,"dos, con coma",3\n');
  t('Separa filas y columnas', f.length === 2 && f[1].length === 3);
  t('La coma dentro de comillas no parte el campo', f[1][1] === 'dos, con coma');

  const g = L.analizarCSV('x\n"dijo ""así"" y se fue"\n');
  t('Las comillas dobladas se devuelven sencillas', g[1][0] === 'dijo "así" y se fue');

  const h = L.analizarCSV('x,y\n"primera\nsegunda",fin\n');
  t('El salto de línea dentro de comillas no parte la fila',
    h.length === 2 && h[1][0] === 'primera\nsegunda' && h[1][1] === 'fin');

  t('El CRLF de Windows no deja un retorno pegado',
    L.analizarCSV('a,b\r\n1,2\r\n')[1][1] === '2');
  t('El BOM no se cuela en el primer encabezado',
    L.analizarCSV('﻿id,x\n1,2\n')[0][0] === 'id');
  t('El salto final no inventa una fila vacía', L.analizarCSV('a\n1\n').length === 2);
  t('Un campo vacío es campo, no ausencia',
    L.analizarCSV('a,b,c\n1,,3\n')[1].length === 3);
}

console.log('\n-- limpieza de valores --');
{
  t('El vacío y los espacios dan null', L.limpiar('   ') === null && L.limpiar('') === null);
  t('Los marcadores de nulo del padrón dan null',
    ['N/A', 'n/a', 'S/D', 'Sin dato', 'Sin determinar', '--', '.'].every(v => L.limpiar(v) === null));
  t('«No aplica» NO es nulo: es una afirmación', L.limpiar('No aplica') === 'No aplica');
  t('El texto se devuelve sin espacios de sobra', L.limpiar('  Ahuehuete  ') === 'Ahuehuete');
}

console.log('\n-- números --');
{
  t('Un número en crudo se lee', L.aNumero('1240.50') === 1240.5);
  // Esta es la defensa que se queda aunque la hoja ya esté corregida: el CSV
  // exporta el valor MOSTRADO, y un reformateo en Sheets devuelve la coma.
  t('Con separador de miles también, aunque hoy no llegue así',
    L.aNumero('1,240.50') === 1240.5 && L.aNumero('134,738.05') === 134738.05);
  t('Number() sola habría devuelto NaN con esa coma', Number.isNaN(Number('1,240.50')));
  t('El vacío da null, no cero', L.aNumero('') === null && L.aNumero(null) === null);
  t('Cero es cero, no null', L.aNumero('0') === 0);
  t('El negativo conserva el signo', L.aNumero('-99.165040') === -99.16504);
  t('El texto puro da null', L.aNumero('Sin determinar') === null);
}

console.log('\n-- fechas --');
{
  t('ISO, que es como llegan hoy', L.aFecha('2026-03-12').iso === '2026-03-12');
  t('Y en legible, en español', L.aFecha('2026-03-12').legible === '12 de marzo de 2026');
  // dd/mm/aaaa es como llegaban antes de corregir el formato de la hoja.
  t('dd/mm/aaaa no se lee al revés', L.aFecha('12/03/2026').iso === '2026-03-12');
  t('El día 3 de diciembre sigue siendo 3 de diciembre', L.aFecha('03/12/2026').iso === '2026-12-03');
  // 46249 es el 15 de agosto de 2026 en la numeración de la hoja.
  t('El número de serie de la hoja se convierte', L.aFecha('46249').iso === '2026-08-15');
  t('Y con decimales de cero, también', L.aFecha('46249.00').iso === '2026-08-15');
  t('El vacío da null', L.aFecha('') === null);
  t('Lo que no es fecha se marca sospechoso en vez de inventarse',
    L.aFecha('próximamente').sospechosa === true && L.aFecha('próximamente').iso === null);
  t('Un mes 13 no pasa', L.aFecha('2026-13-01').sospechosa === true);
}

console.log('\n-- los demás convertidores --');
{
  t('SÍ con acento, Sí y si dan verdadero',
    L.aSiNo('SÍ') === true && L.aSiNo('Sí') === true && L.aSiNo('si') === true);
  t('NO da falso', L.aSiNo('NO') === false);
  t('Lo que no es ni sí ni no da null, no falso',
    L.aSiNo('') === null && L.aSiNo('tal vez') === null);
  t('El CP conserva el cero inicial', L.aCP('3100') === '03100' && L.aCP('03100') === '03100');
  t('El slug quita acentos y deja guiones',
    L.aSlug('El Ahuehuete de Doña Remedios') === 'el-ahuehuete-de-dona-remedios');
  t('Del vínculo de Drive sale el id',
    L.idDeDrive('https://drive.google.com/file/d/1AAAbbb/view?usp=sharing') === '1AAAbbb');
  t('Street View de Google se acepta',
    L.aVistaCalle('https://www.google.com/maps/embed?pb=!4v1!x').tipo === 'panorama');
  t('Y se extrae del código de inserción completo',
    L.aVistaCalle('<iframe src="https://www.google.com/maps/embed?pb=!4v1!x" width="600"></iframe>').url
      === 'https://www.google.com/maps/embed?pb=!4v1!x');
  // Una dirección ajena en un <iframe> es una puerta abierta: se rechaza aquí,
  // y quien pinte debe crear el elemento por código, nunca por innerHTML.
  t('Una dirección que no es de Google Maps se rechaza',
    L.aVistaCalle('https://ejemplo.mx/pagina') === null &&
    L.aVistaCalle('javascript:alert(1)') === null);
  t('http, aunque sea de Google, se rechaza: solo https',
    L.aVistaCalle('http://www.google.com/maps/embed?pb=!1') === null);
}

console.log('\n-- el CSV real, de punta a punta --');
const R = L.construirRegistro(CSV, C);
{
  t('De los cinco registros de prueba llegan cuatro', R.ejemplares.length === 4, String(R.ejemplares.length));
  t('Ninguna advertencia sobre el CSV real', R.meta.advertencias.length === 0,
    R.meta.advertencias.join(' · '));
  t('La hoja no perdió ninguna columna del contrato', R.meta.columnasFaltantes.length === 0,
    R.meta.columnasFaltantes.join(', '));
  t('Ni trae columnas que el contrato no conozca', R.meta.columnasNoReconocidas.length === 0,
    R.meta.columnasNoReconocidas.join(', '));

  const fresno = R.ejemplares[0];
  t('El consecutivo sale de los cuatro últimos dígitos del id', fresno.consecutivo === '9001');
  t('El código de alcaldía sale del segundo segmento', fresno.codAlcaldia === 'BJU');
  t('La fecha del decreto llega en ISO', fresno.fechaDecreto.iso === '2026-03-12');
  t('Las coordenadas conservan los seis decimales',
    fresno.coords.lat === 19.372010 && fresno.coords.lng === -99.165040);
  t('Las dos calles «entre» llegan juntas', fresno.ubicacion.entreCalles.length === 2);
  t('Las categorías salen de las banderas, no de la columna resumen',
    JSON.stringify(fresno.categorias) === JSON.stringify(['HISTORICO', 'NOTABLE']));
  t('La fecha de nominación ya no existe', fresno.fechaNominacion === null);
  t('El carbono elemental ya no se publica',
    fresno.serviciosAmbientales.carbonoSecuestrado_kg === null);
  t('El CO₂ equivalente sí', fresno.serviciosAmbientales.co2Absorbido_kg === 118.81);
  t('El importe llega con su moneda',
    fresno.serviciosAmbientales.beneficioEconomico_moneda === 1240.5 &&
    fresno.serviciosAmbientales.moneda === 'MXN (pesos mexicanos)');
  t('Y la liga de la corrida de i-Tree', /mytree\.itreetools\.org/.test(fresno.linkITree));
}

console.log('\n-- las dos compuertas, sobre datos reales --');
{
  const ahuehuete = R.ejemplares.find(e => /Ánimas/.test(e.nombreAsignado));
  t('«En revisión» deja el bloque ambiental vacío',
    !ahuehuete.tieneCifrasAmbientales &&
    ahuehuete.serviciosAmbientales.co2Absorbido_kg === null);
  t('Y sin liga de i-Tree', ahuehuete.linkITree === null);
  // El sitio necesita saber POR QUÉ no hay cifras para poder decirlo.
  t('Pero el motivo viaja: el sitio puede explicar el hueco',
    ahuehuete._compuertaITree === 'En revisión');
  const remedios = R.ejemplares.find(e => /Remedios/.test(e.nombreAsignado));
  t('«No publicable» hace lo mismo',
    !remedios.tieneCifrasAmbientales && remedios._compuertaITree === 'No publicable');
  t('El ejemplar sí se publica aunque su bloque ambiental no',
    !!remedios.id && !!remedios.coords);
  t('Los dos huecos quedan listados en meta', R.meta.sinCifrasAmbientales.length === 2);
  t('Los textos con comillas y acentos llegan enteros',
    remedios.observaciones.includes('—"así"—') && /comas, acentos/.test(remedios.observaciones));
  t('Y el nombre de quien nominó, con sus comillas',
    remedios.nominadoPor === 'Colectivo "Los Guardianes de Prueba", A.C.');
}

console.log('\n-- pueblo o barrio originario: tres estados, una sola línea publicable --');
{
  const laurel = R.ejemplares.find(e => /Laurel/.test(e.nombreAsignado));
  t('«Por confirmar» no se publica', laurel.ubicacion.puebloBarrio === null);
  t('Pero el estado se conserva para quien capture',
    laurel.ubicacion.puebloBarrioEstado === 'Por confirmar');
  t('«No aplica» tampoco se publica como nombre',
    R.ejemplares[0].ubicacion.puebloBarrio === null);
  t('El suelo de conservación llega como sí o no, no como texto',
    laurel.ubicacion.sueloConservacion === true && R.ejemplares[0].ubicacion.sueloConservacion === false);
}

console.log('\n-- las sumas dicen sobre cuántos se calcularon --');
{
  const s = R.stats;
  t('Cuatro ejemplares', s.totalEjemplares === 4);
  t('Tres especies', s.totalEspecies === 3, String(s.totalEspecies));
  t('Cuatro alcaldías', s.totalAlcaldias === 4, String(s.totalAlcaldias));
  t('La suma de alturas está completa: los cuatro tienen altura',
    s.sumatoriaAltura.completo === true && s.sumatoriaAltura.conDato === 4);
  // Con la compuerta cerrada en dos de cuatro, una suma que no lo dijera
  // estaría afirmando que el padrón entero absorbe 308 kg de CO₂.
  t('La de CO₂ NO está completa y lo declara',
    s.sumatoriaCO2.completo === false && s.sumatoriaCO2.conDato === 2 && s.sumatoriaCO2.sinDato === 2);
  t('Y suma solo los dos validados', s.sumatoriaCO2.valor === 308.03, String(s.sumatoriaCO2.valor));
  t('Ya no hay sumatoria de carbono elemental', s.sumatoriaCarbono === undefined);
  t('El conteo por categoría cuadra con las banderas',
    s.totalPorCategoria.centenarios === 2 && s.totalPorCategoria.notables === 4 &&
    s.totalPorCategoria.singulares === 1);
  t('La alcaldía con más ejemplares se resuelve sin empate inventado',
    s.alcaldiaTop && s.alcaldiaTop.cuenta === 1);
}

console.log('\n-- lo que el lector hace con los datos malos --');
{
  const enc = C.campos.map(c => c.clave).join(',');
  const fila = (over = {}) => {
    const base = {};
    C.campos.forEach(c => { base[c.clave] = ''; });
    Object.assign(base, {
      id: '26-XXX-AAA-0000ANGIO-9999', estado: 'Publicado', nombre_asignado: 'De prueba',
      latitud: '19.40', longitud: '-99.15', validacion_itree: 'Validado',
      moneda_itree: 'MXN (pesos mexicanos)',
    }, over);
    return C.campos.map(c => `"${String(base[c.clave]).replace(/"/g, '""')}"`).join(',');
  };
  const leer = (...filas) => L.construirRegistro([enc, ...filas].join('\n'), C);

  // Fuera de rango: se pierde el DATO, no el ejemplar.
  const alto = leer(fila({ altura_m: '160' }));
  t('Una altura imposible no se publica', alto.ejemplares[0].morfologia.altura_m === null);
  t('Pero el ejemplar sí, y el aviso lleva su id y su rango',
    alto.ejemplares.length === 1 &&
    /9999 · altura_m = 160 queda fuera del rango 1–60/.test(alto.meta.advertencias[0]));
  t('Un DAP de 800 cm tampoco pasa',
    leer(fila({ dap_cm: '800' })).ejemplares[0].morfologia.diametro_cm === null);
  t('Una coordenada fuera de la Ciudad deja al ejemplar sin pin',
    leer(fila({ latitud: '25.68' })).ejemplares[0].coords === null);
  t('Y el ejemplar queda listado entre los que no se pueden dibujar',
    leer(fila({ latitud: '25.68' })).meta.sinCoordenadas.length === 1);
  t('Una altura dentro de rango sí pasa',
    leer(fila({ altura_m: '22.4' })).ejemplares[0].morfologia.altura_m === 22.4);

  // La fila sin id se descarta: es el único filtro que hace falta.
  const sinId = leer(fila({ id: '' }), fila());
  t('La fila sin id se descarta', sinId.ejemplares.length === 1);
  t('Y queda anotada con su número de fila y su nombre',
    sinId.meta.filasDescartadas[0].fila === 2 && sinId.meta.filasDescartadas[0].motivo === 'sin id');

  // El id es la llave. Dos ejemplares con el mismo id es un error de captura
  // que hay que gritar, no absorber en silencio.
  t('Un id repetido se denuncia',
    leer(fila(), fila()).meta.advertencias.some(a => /viene repetido/.test(a)));
  t('Dos nombres que dan el mismo slug también, porque una ficha taparía a la otra',
    leer(fila({ id: 'A-1' }), fila({ id: 'A-2', nombre_asignado: 'DE  PRUEBA' }))
      .meta.advertencias.some(a => /comparten la dirección/.test(a)));

  // Un importe sin moneda no dice nada.
  const sinMoneda = leer(fila({ beneficio_economico: '1240.50', moneda_itree: '' }));
  t('Un importe sin moneda no se publica',
    sinMoneda.ejemplares[0].serviciosAmbientales.beneficioEconomico_moneda === null);
  t('Y se avisa', sinMoneda.meta.advertencias.some(a => /sin moneda/.test(a)));

  // Cifras validadas sin liga: la cifra no se puede rastrear.
  const sinLiga = leer(fila({ co2_eq_kg: '118.81', url_itree: '' }));
  t('Cifras validadas sin liga de la corrida se denuncian',
    sinLiga.meta.advertencias.some(a => /sin la liga de la corrida/.test(a)));
  t('Una liga que no es dirección no se acepta como liga',
    leer(fila({ co2_eq_kg: '118.81', url_itree: 'MyTree' })).ejemplares[0].linkITree === null);

  // La columna resumen contra las cuatro banderas.
  const discrepa = leer(fila({ centenario: 'SÍ', categorias: 'NOTABLE' }));
  t('Si la columna resumen y las banderas discrepan, ganan las banderas',
    JSON.stringify(discrepa.ejemplares[0].categorias) === JSON.stringify(['CENTENARIO']));
  t('Y la discrepancia se avisa',
    discrepa.meta.advertencias.some(a => /banderas dicen/.test(a)));

  // Una columna de más en la hoja no debe romper nada, pero sí avisarse.
  const conExtra = L.construirRegistro([enc + ',columna_nueva', fila() + ',x'].join('\n'), C);
  t('Una columna nueva en la hoja no rompe la lectura', conExtra.ejemplares.length === 1);
  t('Pero se avisa que no se lee',
    conExtra.meta.columnasNoReconocidas.includes('columna_nueva'));
}

console.log('\n-- el CSV vacío y el CSV roto --');
{
  const v = L.construirRegistro('', C);
  t('Un CSV vacío devuelve cero ejemplares, no una excepción', v.ejemplares.length === 0);
  t('Y lo dice', /vacío/.test(v.meta.advertencias.join(' ')));
  const soloEnc = L.construirRegistro(C.campos.map(c => c.clave).join(','), C);
  t('Solo encabezado: cero ejemplares y ninguna columna faltante',
    soloEnc.ejemplares.length === 0 && soloEnc.meta.columnasFaltantes.length === 0);
  const mocho = L.construirRegistro('id,nombre_asignado\n26-A-1,Prueba', C);
  t('Una hoja mocha se lee igual y denuncia las columnas que faltan',
    mocho.ejemplares.length === 1 && mocho.meta.columnasFaltantes.length === 81,
    String(mocho.meta.columnasFaltantes.length));
}

console.log('\n-- las búsquedas, iguales a las del registro que ya existe --');
{
  t('Por slug', L.buscarPorSlug(R, 'el-fresno-de-la-maestra-amparo').id === '26-BJU-FRA-30222ANGIO-9001');
  t('Por id', L.buscarPorId(R, '26-COY-TAX-19405GIMNO-9002').nombreComun === 'Ahuehuete');
  t('Por categoría', L.porCategoria(R, 'centenario').length === 2);
  t('Por alcaldía', L.porAlcaldia(R, 'Tlalpan').length === 1);
  t('Por especie', L.porEspecie(R, 'Taxodium mucronatum').length === 2);
  t('Lo que no existe da null, no una excepción', L.buscarPorSlug(R, 'no-existe') === null);
}

console.log('\n-- el lector no toca el sitio --');
{
  // Se mide el CÓDIGO, no la prosa: los comentarios nombran a propósito lo que
  // el lector promete no hacer, y esa promesa no debe hacer fallar la prueba.
  const src = fs.readFileSync('padron/lector-v2.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  t('No pide la red', !/\bfetch\s*\(|XMLHttpRequest/.test(src));
  t('No toca el DOM', !/\bdocument\b|\bwindow\b/.test(src));
  t('No guarda nada en el navegador', !/localStorage|sessionStorage/.test(src));
  t('No importa nada del sitio', !/^import .*from ['"]\.\.\//m.test(src));
}

console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal ? 1 : 0);
