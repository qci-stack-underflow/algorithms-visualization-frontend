// Cifras, tabla de letras y tarjeta "Archivo listo" de la vista de proceso,
// con el HuffmanResult del backend (contrato: src/types/huffman.types.ts).
import { describirAhorro, formatearBytes, numero } from "./formato.js";
import { mostrarTabla } from "./tabla.js";

function ponerCifra(clave, valor, detalle) {
  const cifra = document.querySelector(`[data-cifra="${clave}"]`);
  if (!cifra) return;
  cifra.querySelector("dd").textContent = valor;
  cifra.querySelector("span").textContent = detalle;
}

let mostrado = null; // el resultado que ya está en la vista

export function llenarProceso(resultado) {
  // Al volver del binario llega el mismo resultado: se conservan la
  // búsqueda, el orden y la selección de la tabla.
  if (resultado === mostrado) return;
  mostrado = resultado;

  const m = resultado.metrics;
  ponerCifra("original", formatearBytes(m.originalBytes), `${numero(m.originalBytes)} bytes`);
  // Comprimido es el archivo .suf completo (encabezado + datos), el mismo
  // tamaño con el que el backend calcula el ahorro.
  ponerCifra("comprimido", formatearBytes(m.fileSizeBytes), `${numero(m.fileSizeBytes)} bytes`);
  // Ahorro en bytes y KB/MB, reducción y razón (requerimientos, sección 5)
  const { ahorro, reduccion } = describirAhorro(m.originalBytes, m.fileSizeBytes);
  ponerCifra("ahorro", ...ahorro);
  ponerCifra("reduccion", ...reduccion);
  ponerCifra("bits", m.bitsPerSymbol.toFixed(2), `entropía ${m.entropy.toFixed(2)} · ASCII 8`);
  ponerCifra(
    "simbolos",
    numero(resultado.distinctSymbols),
    `${numero(resultado.nodes.length)} nodos en el árbol`
  );
  mostrarTabla(resultado.table);

  // Tamaño real del .suf; el nombre lo pone navegacion.js con el título.
  document.querySelectorAll("[data-archivo-tamano]").forEach((tamano) => {
    tamano.textContent = formatearBytes(m.fileSizeBytes);
  });
}
