import fs from 'fs';
// Las suites leen la salida de ../../prueba y las fuentes de ..; se plantan
// solas en fuente/ para poder ejecutarse desde cualquier sitio.
process.chdir(new URL('..', import.meta.url).pathname);
const PRUEBA = '../prueba/';
let ok=0,mal=0; const t=(n,c,d='')=>{ c?(ok++,console.log('  ✅',n)):(mal++,console.log('  ❌',n,d)); };
console.log('\n══ CONTRATO DE CLAUDE DESIGN ══');
const modelo = fs.readFileSync('/root/.claude/uploads/94ad78c7-5506-5a60-ad3f-7cc40013ed06/ff822544-test.dc.html','utf8');
t('El archivo de referencia usa el script tipado', /<script type="text\/x-dc" data-dc-script>/.test(modelo));

for (const f of [PRUEBA+'portada.dc.html',PRUEBA+'ficha.dc.html']) {
  const s = fs.readFileSync(f, 'utf8');
  t(f+' · la lógica va en <script type="text/x-dc" data-dc-script>',
    /<script type="text\/x-dc" data-dc-script>\s*\nclass Component extends DCLogic/.test(s));
  t(f+' · la lógica NO va en un <script> ordinario',
    !/<script>\s*\nclass Component extends DCLogic/.test(s));
  t(f+' · el script de la lógica queda fuera de <x-dc>',
    s.indexOf('</x-dc>') < s.indexOf('data-dc-script'));
  t(f+' · support.js se carga en el <head>',
    s.indexOf('<script src="./support.js">') < s.indexOf('<body>'));
  t(f+' · un solo bloque de lógica', (s.match(/data-dc-script/g)||[]).length===1);
  t(f+' · define la clase Component', /class Component extends DCLogic \{/.test(s));
  t(f+' · expone renderVals', /renderVals\(\)/.test(s));
  // Los <script> del helmet son recursos externos o datos, nunca lógica suelta
  const sueltos = (s.match(/<script(?![^>]*(src=|type="application\/json"|type="text\/x-dc"))[^>]*>/g)||[]);
  t(f+' · sin scripts sueltos que el navegador ejecute antes de tiempo',
    sueltos.length===0, sueltos.join(' '));
}
console.log(`\nTOTAL: ${ok} aprobadas · ${mal} fallidas`);
process.exit(mal?1:0);
