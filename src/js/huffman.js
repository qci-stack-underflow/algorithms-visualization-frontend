// Pantalla del algoritmo de Huffman.
// Las tres vistas (biblioteca, proceso y binario) se cambian en
// huffman/navegacion.js según la ruta del hash (huffman/rutas.js). La
// biblioteca y el campo de enlace están en huffman/biblioteca.js; las cifras
// y la tabla de letras del proceso, en huffman/proceso.js y huffman/tabla.js;
// la descarga del .suf, en huffman/descarga.js, y la vista binaria, en
// huffman/binario.js.
import "@sass/huffman.scss";
import { iniciarDetallesVisuales } from "./inicio.js";
import { iniciarNavegacion } from "./huffman/navegacion.js";
import { iniciarBiblioteca } from "./huffman/biblioteca.js";
import { iniciarTabla } from "./huffman/tabla.js";
import { iniciarDescargas } from "./huffman/descarga.js";
import { iniciarBinario } from "./huffman/binario.js";

// Un script type="module" se ejecuta con el HTML ya leído, así que no hace
// falta esperar a DOMContentLoaded: mostrar la vista correcta cuanto antes
// evita que se vea otra por un momento.
// La tabla de letras se prepara antes que la navegación para que los datos
// del libro abierto caigan sobre ella. Los detalles visuales van aparte: si
// falla alguno (íconos, animaciones), las vistas siguen funcionando.
iniciarTabla();
iniciarNavegacion();
iniciarBiblioteca();
iniciarDescargas();
iniciarBinario();
try {
  iniciarDetallesVisuales();
} catch (error) {
  console.error("No se pudieron iniciar los detalles visuales:", error);
}
