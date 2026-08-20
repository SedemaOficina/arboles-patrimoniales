import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
const D=JSON.parse(fs.readFileSync('/tmp/audit/datos-reales.json','utf8'));
const I=await import('/tmp/audit/portada/indicadores.js');
const M=await import('/tmp/audit/portada/mapa.js');
let ok=0,mal=0; const t=(n,c,d='')=>{c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d));};
const E=D.ejemplares;

console.log('══ PANEL · sin selección ══');
const A=I.indicadores({lista:E,seleccionado:null,totalPadron:13});
t('Nueve indicadores',A.length===9,String(A.length));
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

console.log('\n══ PANEL · con un ejemplar ══');
const V=I.indicadores({lista:E,seleccionado:E.find(e=>e.slug==='viejo-del-agua'),totalPadron:13});
t('Encabeza con el nombre del ejemplar',V[0].cifra==='Viejo del Agua'&&V[0].unidad==='Ahuehuete');
// La nota «Uno de los 13 del registro» se retiró por decisión editorial.
t('Sin nota de pertenencia al registro',V[0].nota==='',V[0].nota);
t('Su especie y categoría UICN',V[1].cifra==='Taxodium mucronatum'&&/Preocupación menor/.test(V[1].texto));
t('Su altura, no la sumatoria',V[2].cifra==='27'&&V[2].unidad==='metros');
t('Traducida a personas de 1.70 m',/16 personas/.test(V[2].texto),V[2].texto.slice(-40));
t('Su alcaldía',V[3].cifra==='Azcapotzalco');
t('Su edad y año de germinación',V[4].cifra==='700'&&/año 1326/.test(V[4].texto));
t('Sus servicios sin dato se declaran como cálculo imposible',V[5].cifra==='—'&&/No se pudo estimar este servicio/.test(V[5].texto),V[5].texto);
t('Y los que sí tiene, con su valor',V[7].cifra==='1.13');

console.log('\n══ PANEL · con filtro aplicado ══');
const C=I.indicadores({lista:M.filtrar(E,{alcaldia:'Cuauhtémoc'}),seleccionado:null,totalPadron:13});
t('Cuenta solo los filtrados',C[0].cifra==='4');
t('Y aclara que es un subconjunto',/De los 13 que integran el registro/.test(C[0].texto),C[0].texto);
t('La alcaldía top es la filtrada',C[3].cifra==='Cuauhtémoc');
const X=I.indicadores({lista:[],seleccionado:null,totalPadron:13});
t('Selección vacía no rompe',X.length===9&&X[0].cifra==='0');
t('Y lo dice sin inventar cifras',X[2].cifra==='—'&&/Aún no hay alturas/.test(X[2].texto));

console.log('\nTOTAL:',ok,'aprobadas ·',mal,'fallidas');
if(mal) process.exitCode=1;
