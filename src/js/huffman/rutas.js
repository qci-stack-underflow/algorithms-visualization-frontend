// Rutas de la pantalla de Huffman. El libro va en el hash para que el botón
// Atrás del navegador funcione y al recargar se quede en la misma vista:
//   #/                    → biblioteca
//   #/libro/2000          → proceso del libro 2000 de Project Gutenberg
//   #/libro/2000/binario  → vista binaria del libro 2000
//   #/inspector           → inspector de archivos .suf

const PATRON = /^#?\/?(?:libro\/(\d+)(\/binario)?|(inspector))?\/?$/;

// Enlaces del esqueleto anterior, que cambiaba de vista con :target.
const RUTAS_ANTERIORES = {
  "#biblioteca": { vista: "biblioteca", libro: null },
  "#proceso": { vista: "proceso", libro: 2000 },
  "#binario": { vista: "binario", libro: 2000 },
};

// Devuelve { vista, libro } o null si el hash no es una ruta válida.
// Sin hash (o solo "#") es la biblioteca.
export function leerRuta(hash) {
  if (Object.hasOwn(RUTAS_ANTERIORES, hash ?? "")) return { ...RUTAS_ANTERIORES[hash] };

  const coincidencia = PATRON.exec(hash ?? "");
  if (!coincidencia) return null;

  const [, numero, binario, inspector] = coincidencia;
  if (inspector) return { vista: "inspector", libro: null };
  if (numero === undefined) return { vista: "biblioteca", libro: null };

  const libro = Number(numero);
  if (!Number.isSafeInteger(libro) || libro < 1) return null;
  return { vista: binario ? "binario" : "proceso", libro };
}

export function rutaA(vista, libro) {
  if (vista === "proceso") return `#/libro/${libro}`;
  if (vista === "binario") return `#/libro/${libro}/binario`;
  if (vista === "inspector") return "#/inspector";
  return "#/";
}
