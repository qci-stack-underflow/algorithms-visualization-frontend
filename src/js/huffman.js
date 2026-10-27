// Pantalla del algoritmo de Huffman.
// Las tres vistas (biblioteca, proceso y binario) se cambian en
// huffman/navegacion.js según la ruta del hash (huffman/rutas.js). Los datos
// todavía son de ejemplo: ningún botón ni campo descarga o comprime nada.
import "@sass/huffman.scss";
import { iniciarDetallesVisuales } from "./inicio.js";
import { iniciarNavegacion } from "./huffman/navegacion.js";

// Un script type="module" se ejecuta con el HTML ya leído, así que no hace
// falta esperar a DOMContentLoaded: mostrar la vista correcta cuanto antes
// evita que se vea otra por un momento.
// La navegación va primero y por separado: si falla algún detalle visual
// (íconos, animaciones), las vistas siguen funcionando.
iniciarNavegacion();
try {
  iniciarDetallesVisuales();
} catch (error) {
  console.error("No se pudieron iniciar los detalles visuales:", error);
}
