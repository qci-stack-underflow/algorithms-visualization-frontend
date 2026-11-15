// Rutas de la pantalla de Huffman. El libro va en el hash para que el botón
// Atrás del navegador funcione y al recargar se quede en la misma vista:
//   #/                    → biblioteca
//   #/libro/2000          → proceso del libro 2000 de Project Gutenberg
//   #/libro/2000/binario  → vista binaria del libro 2000
//   #/inspector           → inspector de archivos .suf
//   #/archivo             → proceso de un .txt subido (vive mientras la
//   #/archivo/binario       página siga abierta; ver subida.js)

const PATRON = /^#?\/?(?:libro\/(\d+)(\/binario)?|(inspector)|(archivo)(\/binario)?)?\/?$/;

// Enlaces del esqueleto anterior, que cambiaba de vista con :target.
const RUTAS_ANTERIORES = {
  "#biblioteca": { vista: "biblioteca", libro: null },
  "#proceso": { vista: "proceso", libro: 2000 },
  "#binario": { vista: "binario", libro: 2000 },
};

// Devuelve { vista, libro } (y archivo: true en las rutas de un .txt subido)
// o null si el hash no es una ruta válida.
// Sin hash (o solo "#") es la biblioteca.
export function leerRuta(hash) {
  if (Object.hasOwn(RUTAS_ANTERIORES, hash ?? "")) return { ...RUTAS_ANTERIORES[hash] };

  const coincidencia = PATRON.exec(hash ?? "");
  if (!coincidencia) return null;

  const [, numero, binario, inspector, archivo, binarioDeArchivo] = coincidencia;
  if (inspector) return { vista: "inspector", libro: null };
  if (archivo) return { vista: binarioDeArchivo ? "binario" : "proceso", libro: null, archivo: true };
  if (numero === undefined) return { vista: "biblioteca", libro: null };

  const libro = Number(numero);
  if (!Number.isSafeInteger(libro) || libro < 1) return null;
  return { vista: binario ? "binario" : "proceso", libro };
}

export function rutaA(vista, libro, archivo = false) {
  if (archivo) return vista === "binario" ? "#/archivo/binario" : "#/archivo";
  if (vista === "proceso") return `#/libro/${libro}`;
  if (vista === "binario") return `#/libro/${libro}/binario`;
  if (vista === "inspector") return "#/inspector";
  return "#/";
}
