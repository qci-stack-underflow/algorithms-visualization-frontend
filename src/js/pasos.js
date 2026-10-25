// Convierte los pasos del backend (compare, swap, write, pivot, range,
// sorted) al formato que reproduce MotorAnimacion: { tipo, indices, arrayState, linea }.
// El backend solo envía lo que cambia; aquí se reconstruye el arreglo
// aplicando cada swap y write sobre `input`.
// `linea` es el índice de la línea de pseudocódigo que se ejecuta (o null).
export function convertirPasos(resultado) {
  const arreglo = [...resultado.input];
  const pasos = [{ tipo: "inicial", indices: [], arrayState: [...arreglo], linea: null }];

  for (const paso of resultado.steps) {
    const linea = paso.line ?? null;

    switch (paso.type) {
      case "compare":
        pasos.push({ tipo: "comparacion", indices: paso.indices, arrayState: [...arreglo], linea });
        break;
      case "swap": {
        const [i, j] = paso.indices;
        [arreglo[i], arreglo[j]] = [arreglo[j], arreglo[i]];
        pasos.push({ tipo: "intercambio", indices: paso.indices, arrayState: [...arreglo], linea });
        break;
      }
      case "write":
        arreglo[paso.index] = paso.value;
        pasos.push({ tipo: "escritura", indices: [paso.index], arrayState: [...arreglo], linea });
        break;
      case "pivot":
        pasos.push({ tipo: "pivote", indices: [paso.index], arrayState: [...arreglo], linea });
        break;
      case "sorted":
        // Solo el paso final (todas las posiciones) se anima como completado.
        if (paso.indices.length === arreglo.length) {
          pasos.push({ tipo: "completado", indices: [], arrayState: [...arreglo], linea });
        }
        break;
      default:
        // `range` no se dibuja por ahora.
        break;
    }
  }

  return pasos;
}
