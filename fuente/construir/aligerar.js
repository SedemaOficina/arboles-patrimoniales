/**
 * aligerar.js · Quitar los comentarios SOLO en lo que se publica.
 *
 * EL PROBLEMA. Entre el 39 y el 51 % del peso comprimido de cada página son
 * comentarios: la hoja de estilo es un 40 % comentarios y viaja incrustada en
 * las tres páginas, y el guion va incrustado también. Medido en perfil móvil,
 * quitarlos mueve el primer pintado de 1 080 a 764 ms.
 *
 * LO QUE NO SE HACE. No se tocan los archivos de `fuente/`. Los comentarios de
 * este proyecto explican decisiones que nadie recordaría en seis meses y son
 * su mejor documentación: se quedan donde se escriben. Esto solo actúa sobre
 * la copia que se incrusta en la página, y solo cuando el destino es
 * producción: la vista previa conserva todo, porque es donde se depura.
 *
 * POR QUÉ NO SE USA UN MINIFICADOR. Traería una dependencia que habría que
 * vendorizar y actualizar, para hacer mucho más de lo que aquí hace falta. Se
 * quitan comentarios y nada más: ni se renombran variables, ni se reordenan
 * declaraciones, ni se cambia una sola línea de lógica. Lo que se publica
 * sigue siendo legible.
 *
 * LA PARTE DELICADA. Un `//` dentro de una cadena —`"https://…"`— no es un
 * comentario, y una barra puede empezar una expresión regular o ser una
 * división. Equivocarse ahí rompe el sitio en silencio. Por eso el recorrido
 * distingue cadenas, plantillas y expresiones regulares, y por eso cada
 * resultado se comprueba antes de devolverse: se extraen las cadenas del texto
 * original y del aligerado, y si la lista no es IDÉNTICA se lanza un error y
 * el armado se detiene. Un armado que falla es reparable; una página rota que
 * nadie nota, no.
 */

/* Un `/` empieza expresión regular, y no división, cuando lo anterior no puede
   terminar un valor. Esta es la regla de siempre: se mira el último carácter
   significativo, y las palabras que admiten una expresión regular detrás. */
const ANTES_DE_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?',
  '{', '}', ';', '+', '-', '*', '%', '~', '^', '<', '>', '\n']);
const PALABRAS_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of',
  'new', 'delete', 'void', 'do', 'else', 'yield', 'await', 'case']);

/** Recorre el guion y devuelve {texto, cadenas}. Si `quitar` es falso, no toca nada. */
function recorrerJS(src, quitar) {
  let fuera = '';
  const cadenas = [];
  let i = 0, ultimo = '', palabra = '';
  const n = src.length;
  const soltar = (t) => { if (quitar) fuera += t; else fuera += t; };
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];

    // comentario de línea
    if (c === '/' && d === '/') {
      let j = i + 2;
      while (j < n && src[j] !== '\n') j++;
      if (!quitar) fuera += src.slice(i, j);
      i = j;
      continue;
    }
    // comentario de bloque
    if (c === '/' && d === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      const trozo = src.slice(i, j);
      if (!quitar) fuera += trozo;
      // Un comentario de bloque que abarca renglones se sustituye por un salto:
      // sin él, dos sentencias separadas solo por el comentario quedarían
      // pegadas y una inserción automática de punto y coma cambiaría de sitio.
      else if (trozo.includes('\n')) fuera += '\n';
      i = j;
      continue;
    }
    // cadenas normales
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        j++;
      }
      const t = src.slice(i, j);
      cadenas.push(t); fuera += t; ultimo = c; palabra = ''; i = j;
      continue;
    }
    // plantillas, con sus huecos ${…} que pueden llevar cualquier cosa dentro
    if (c === '`') {
      let j = i + 1, prof = 0;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (prof === 0 && src[j] === '`') { j++; break; }
        if (prof === 0 && src[j] === '$' && src[j + 1] === '{') { prof = 1; j += 2; continue; }
        if (prof > 0) {
          if (src[j] === '{') prof++;
          else if (src[j] === '}') prof--;
          else if (src[j] === '`') {   // plantilla anidada dentro del hueco
            let k = j + 1;
            while (k < n && !(src[k] === '`' && src[k - 1] !== '\\')) k++;
            j = k;
          }
        }
        j++;
      }
      const t = src.slice(i, j);
      cadenas.push(t); fuera += t; ultimo = '`'; palabra = ''; i = j;
      continue;
    }
    // expresión regular
    if (c === '/' && (ANTES_DE_REGEX.has(ultimo) || PALABRAS_REGEX.has(palabra) || ultimo === '')) {
      let j = i + 1, corchete = false;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') corchete = true;
        else if (src[j] === ']') corchete = false;
        else if (src[j] === '/' && !corchete) { j++; break; }
        else if (src[j] === '\n') break;   // no era regex
        j++;
      }
      while (j < n && /[a-z]/.test(src[j])) j++;   // banderas
      const t = src.slice(i, j);
      cadenas.push(t); fuera += t; ultimo = '/'; palabra = ''; i = j;
      continue;
    }

    fuera += c;
    if (!/\s/.test(c)) { ultimo = c; }
    else if (c === '\n') { ultimo = ultimo || '\n'; }
    palabra = /[A-Za-z$_]/.test(c) ? palabra + c : '';
    i++;
  }
  return { texto: fuera, cadenas };
}

/** Quita los comentarios de un guion, comprobando que no se llevó nada más. */
function sinComentariosJS(src) {
  const antes = recorrerJS(src, false);
  const salida = recorrerJS(src, true);
  const despues = recorrerJS(salida.texto, false);
  if (antes.cadenas.length !== despues.cadenas.length
      || antes.cadenas.some((t, k) => t !== despues.cadenas[k])) {
    throw new Error('aligerar.js: quitar los comentarios alteró alguna cadena o expresión regular. '
      + 'No se publica nada: revisa el recorrido antes de seguir.');
  }
  // Renglones vacíos de más, que quedan donde había un comentario suelto.
  return salida.texto.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

/** Quita los comentarios de una hoja de estilo, respetando las cadenas. */
function sinComentariosCSS(src) {
  let fuera = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        j++;
      }
      fuera += src.slice(i, j); i = j; continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      if (src.slice(i, j).includes('\n')) fuera += '\n';
      i = j; continue;
    }
    fuera += c; i++;
  }
  return fuera.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

/* Solo en producción. La vista previa conserva los comentarios: es donde se
   depura, y ahí el peso no le cuesta a nadie. */
const enProduccion = () => process.env.DESTINO === 'produccion';
const aligerarJS = (src) => (enProduccion() ? sinComentariosJS(src) : src);
const aligerarCSS = (src) => (enProduccion() ? sinComentariosCSS(src) : src);

module.exports = { sinComentariosJS, sinComentariosCSS, aligerarJS, aligerarCSS };
