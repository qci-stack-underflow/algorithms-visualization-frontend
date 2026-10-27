// Pantalla del algoritmo de Huffman.
// Las tres vistas (biblioteca, proceso y binario) se cambian con el router
// de huffman/rutas.js. Los datos todavía son de ejemplo: ningún botón ni
// campo descarga o comprime nada.
import "@sass/huffman.scss";
import { iniciarDetallesVisuales } from "./inicio.js";
import { iniciarNavegacion } from "./huffman/vistas.js";

document.addEventListener("DOMContentLoaded", () => {
  iniciarDetallesVisuales();
  iniciarNavegacion();
});
