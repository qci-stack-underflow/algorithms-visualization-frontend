// Pide el resultado de Huffman de un libro mostrando la carga y los errores
// de la vista de proceso (carga.js). Se conecta a la navegación cuando el
// backend tenga las rutas de /huffman (C3 y C5); mientras, la pantalla sigue
// mostrando los datos de ejemplo del Quijote.
import { huffmanListo, obtenerHuffman } from "../api.js";
import { mostrarCarga, mostrarError, terminarCarga } from "./carga.js";
import { leerRuta } from "./rutas.js";

// Si el usuario ya cambió de libro, la respuesta tardía no debe tocar la vista.
const sigueAbierto = (numero) => leerRuta(location.hash)?.libro === numero;

// Devuelve el HuffmanResult, o null si falló o el usuario cambió de libro.
export async function cargarLibro(numero) {
  // Ya guardado (p. ej. al volver del binario): sin carga ni petición nueva.
  if (huffmanListo(numero)) return obtenerHuffman(numero);

  mostrarCarga();
  try {
    const resultado = await obtenerHuffman(numero);
    if (!sigueAbierto(numero)) return null;
    await terminarCarga();
    return resultado;
  } catch (error) {
    if (sigueAbierto(numero)) {
      mostrarError(error.estado ?? 0, () => cargarLibro(numero));
    }
    return null;
  }
}
