// Cifras de la vista de proceso, con el HuffmanResult del
// backend (contrato: src/types/huffman.types.ts).
import { formatearBytes, numero } from "./formato.js";

function ponerCifra(clave, valor, detalle) {
  const cifra = document.querySelector(`[data-cifra="${clave}"]`);
  if (!cifra) return;
  cifra.querySelector("dd").textContent = valor;
  cifra.querySelector("span").textContent = detalle;
}

let mostrado = null; // el resultado que ya está en la vista

export function llenarProceso(resultado) {
  // Al volver del binario llega el mismo resultado: no se vuelve a llenar.
  if (resultado === mostrado) return;
  mostrado = resultado;

  const m = resultado.metrics;
  ponerCifra("original", formatearBytes(m.originalBytes), `${numero(m.originalBytes)} bytes`);
  // Comprimido es el archivo .suf completo (encabezado + datos), el mismo
  // tamaño con el que el backend calcula el ahorro.
  ponerCifra("comprimido", formatearBytes(m.fileSizeBytes), `${numero(m.fileSizeBytes)} bytes`);
  ponerCifra(
    "ahorro",
    `${m.savingsPercentage.toFixed(1)} %`,
    `queda en ${(100 - m.savingsPercentage).toFixed(1)} %`
  );
  ponerCifra("bits", m.bitsPerSymbol.toFixed(2), `entropía ${m.entropy.toFixed(2)} · ASCII 8`);
  ponerCifra(
    "simbolos",
    numero(resultado.distinctSymbols),
    `${numero(resultado.nodes.length)} nodos en el árbol`
  );
}
