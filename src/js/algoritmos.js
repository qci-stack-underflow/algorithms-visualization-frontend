// src/js/algoritmos.js

// Ejemplo: Bubble Sort que retorna el arreglo ordenado y sus métricas
export function bubbleSort(arr) {
  let array = [...arr];
  let comparaciones = 0;
  let intercambios = 0;

  for (let i = 0; i < array.length - 1; i++) {
    for (let j = 0; j < array.length - i - 1; j++) {
      comparaciones++;
      if (array[j] > array[j + 1]) {
        let temp = array[j];
        array[j] = array[j + 1];
        array[j + 1] = temp;
        intercambios++;
      }
    }
  }

  return { arrayOrdenado: array, comparaciones, intercambios };
}

// Agrega aquí el resto de tus algoritmos (QuickSort, InsertionSort, etc.)