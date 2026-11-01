// Cómo se escriben los números en la pantalla de Huffman.

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
