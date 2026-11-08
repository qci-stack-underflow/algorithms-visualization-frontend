// Cómo se escriben los números y los símbolos en la pantalla de Huffman.

const ENTERO = new Intl.NumberFormat("es-MX");

// 2206001 → "2,206,001"
export const numero = (valor) => ENTERO.format(valor);

// Tamaños en múltiplos de 1000, como los muestra Project Gutenberg:
// 980 → "980 bytes", 772386 → "772 KB", 2206001 → "2.2 MB"
export function formatearBytes(bytes) {
  if (bytes < 1000) return `${numero(bytes)} bytes`;
  const kb = Math.round(bytes / 1000);
  if (kb < 1000) return `${kb} KB`;
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

// Cuánto se redujo un archivo: bytes ahorrados (negativos si el .suf quedó
// más grande, lo que pasa con textos muy cortos por el diccionario),
// porcentaje de reducción y razón de compresión (original ÷ comprimido).
export function compararTamanos(originalBytes, comprimidoBytes) {
  const ahorro = originalBytes - comprimidoBytes;
  return {
    ahorro,
    reduccion: originalBytes > 0 ? (ahorro / originalBytes) * 100 : 0,
    razon: comprimidoBytes > 0 ? originalBytes / comprimidoBytes : 0,
  };
}

// Las cifras de ahorro y reducción como se muestran en la página:
// { ahorro: [valor, detalle], reduccion: [valor, detalle] }
export function describirAhorro(originalBytes, comprimidoBytes) {
  const { ahorro, reduccion, razon } = compararTamanos(originalBytes, comprimidoBytes);
  if (ahorro < 0) {
    return {
      ahorro: [`+${formatearBytes(-ahorro)}`, `el .suf pesa ${numero(-ahorro)} bytes más`],
      reduccion: [`${reduccion.toFixed(1)} %`, `razón ${razon.toFixed(2)} : 1`],
    };
  }
  return {
    ahorro: [formatearBytes(ahorro), `${numero(ahorro)} bytes`],
    reduccion: [`${reduccion.toFixed(1)} %`, `razón ${razon.toFixed(2)} : 1`],
  };
}

// Caracteres que no se ven: se muestran con un signo y se nombran para
// los lectores de pantalla y la búsqueda.
const INVISIBLES = {
  " ": { signo: "␣", nombre: "espacio" },
  "\n": { signo: "↵", nombre: "salto de línea" },
  "\t": { signo: "⇥", nombre: "tabulador" },
  " ": { signo: "⍽", nombre: "espacio duro" },
};

// Otros espacios y caracteres de control (p. ej. U+200B) se muestran con
// su código Unicode.
const SIN_FORMA = /^[\p{C}\p{Z}]$/u;

const codigoUnicode = (simbolo) =>
  `U+${simbolo.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;

// Lo que se ve en la tabla y en las fichas: "e", "␣", "↵", "U+200B"
export function mostrarSimbolo(simbolo) {
  if (INVISIBLES[simbolo]) return INVISIBLES[simbolo].signo;
  if (SIN_FORMA.test(simbolo)) return codigoUnicode(simbolo);
  return simbolo;
}

// Nombre para leer en voz alta, o null si el símbolo se ve tal cual.
export function nombrarSimbolo(simbolo) {
  if (INVISIBLES[simbolo]) return INVISIBLES[simbolo].nombre;
  if (SIN_FORMA.test(simbolo)) return `carácter ${codigoUnicode(simbolo)}`;
  return null;
}

// Lo contrario de mostrarSimbolo para los signos de la tabla de ejemplo.
export function leerSimboloMostrado(texto) {
  const invisible = Object.entries(INVISIBLES).find(([, { signo }]) => signo === texto);
  return invisible ? invisible[0] : texto;
}
