// src/js/huffman.js
import "@sass/huffman.scss";
import { iniciarDetallesVisuales } from "./inicio.js";
import { iniciarNavegacion } from "./huffman/navegacion.js";
import { iniciarBiblioteca } from "./huffman/biblioteca.js";
import { iniciarTabla } from "./huffman/tabla.js";
import { iniciarDescargas } from "./huffman/descarga.js";
import { iniciarBinario } from "./huffman/binario.js";

// IMPORTAR E INICIAR EL MÓDULO DEL PROCESO Y EL REPRODUCTOR
import { iniciarHuffmanProceso } from "./huffman/main.js";

iniciarTabla();
iniciarNavegacion();
iniciarBiblioteca();
iniciarDescargas();
iniciarBinario();

// Activar la construcción del árbol y los controles del reproductor
iniciarHuffmanProceso();

try {
  iniciarDetallesVisuales();
} catch (error) {
  console.error("No se pudieron iniciar los detalles visuales:", error);
}