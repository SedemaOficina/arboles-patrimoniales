import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
const D=JSON.parse(fs.readFileSync('verificar/datos/datos-reales.json','utf8'));
const I=await import('../indicadores.js');
const M=await import('../mapa.js');
let ok=0,mal=0; const t=(n,c,d='')=>{c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d));};
const E=D.ejemplares;

/* El panel del mapa se retiró. De indicadores.js sobrevive el modo agregado,
   que hoy alimenta el cintillo de cifras de la portada: las mismas sumas, en
   otro lugar. Esta suite las sigue verificando, que es lo que importa. */

console.log('══ SUMATORIAS DEL REGISTRO ══');
const A=I.indicadoresPadron(E,13);
t('Nueve sumatorias',A.length===9,String(A.length));
t('Árboles: 13',A[0].cifra==='13'&&A[0].unidad==='ejemplares');
t('Especies distintas: 3',A[1].cifra==='3');
t('Y las nombra',/Taxodium mucronatum/.test(A[1].nota));
t('Altura apilada en metros, no en 0.33 km',A[2].cifra==='330'&&A[2].unidad==='m',A[2].cifra+' '+A[2].unidad);
t('Con la narrativa de apilarlos',/apiláramos uno sobre otro/.test(A[2].texto));
t('Alcaldía top: Cuauhtémoc con 4',A[3].cifra==='Cuauhtémoc'&&A[3].unidad==='4 ejemplares');
t('Edad sumada: 1,200 años',A[4].cifra==='1,200');
t('Y declara que son 2 de 13',/2 de 13 ejemplares/.test(A[4].nota),A[4].nota);
t('Lluvia interceptada correcta',A[5].cifra==='911,487');
t('Declarando 5 de 13',/5 de 13/.test(A[5].nota));
t('Escurrimientos correctos',A[6].cifra==='1,258');
t('Carbono con dato completo',A[7].cifra==='64.2'&&A[7].nota==='');
t('CO2 con dato completo',A[8].cifra==='235.4'&&A[8].nota==='');

console.log('\n══ EL MODO EJEMPLAR YA NO EXISTE ══');
t('No se exporta indicadoresEjemplar',I.indicadoresEjemplar===undefined);
t('Ni el despachador',I.indicadores===undefined);
t('Y el mapa no lo pide',
  !/indicadores\(/.test(fs.readFileSync('mapa.js','utf8')));

console.log('\n══ SUMATORIAS · subconjuntos y casos vacíos ══');
const C=I.indicadoresPadron(M.filtrar(E,{alcaldia:'Cuauhtémoc'}),13);
t('Cuenta solo los filtrados',C[0].cifra==='4');
t('Y aclara que es un subconjunto',/De los 13 que integran el registro/.test(C[0].texto),C[0].texto);
t('La alcaldía top es la filtrada',C[3].cifra==='Cuauhtémoc');
const X=I.indicadoresPadron([],13);
t('Selección vacía no rompe',X.length===9&&X[0].cifra==='0');
t('Y lo dice sin inventar cifras',X[2].cifra==='—'&&/Aún no hay alturas/.test(X[2].texto));

console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
if(mal) process.exitCode=1;
