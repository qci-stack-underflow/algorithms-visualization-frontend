// Panel "Resultado": qué encontró el algoritmo y cómo le fue frente al otro
// algoritmo que resuelve el mismo problema (Dijkstra con A*, Prim con
// Kruskal), ejecutados sobre el mismo grafo y con los mismos datos.
import { ALGORITMOS, ORDEN_ALGORITMOS, ejecutar } from "./algoritmos.js";
import { formatoNumero as n } from "./descripciones.js";

const plural = (cantidad, uno, varios) => `${cantidad} ${cantidad === 1 ? uno : varios}`;

// Filas de la comparación: [título, valor de una ejecución, ¿menos es mejor?]
const FILAS = {
  caminos: [
    ["Costo del camino", (e) => (e.resultado.destino === null ? "–" : e.resultado.alcanzado ? n(e.resultado.costo) : "sin camino"), false],
    ["Nodos cerrados", (e) => e.metricas.nodosCerrados, true],
    ["Aristas revisadas", (e) => e.metricas.aristasRevisadas, true],
    ["Actualizaciones de la cola", (e) => e.metricas.actualizaciones, true],
    ["Pasos de la animación", (e) => e.pasos.length - 1, true],
  ],
  arbol: [
    ["Peso total", (e) => n(e.resultado.pesoTotal), false],
    ["Aristas en el árbol", (e) => e.resultado.aristas.length, false],
    ["Aristas revisadas", (e) => e.metricas.aristasRevisadas, true],
    ["Pasos de la animación", (e) => e.pasos.length - 1, true],
  ],
};

function fraseDeCamino({ resultado }, grafo) {
  const { origen, destino } = resultado;
  if (destino === null) {
    const alcanzables = Object.values(resultado.dist).filter((d) => d !== null).length;
    const faltan = grafo.nodos.length - alcanzables;
    const sinAlcanzar = faltan
      ? ` ${faltan === 1 ? "Queda 1 nodo" : `Quedan ${faltan} nodos`} sin alcanzar.`
      : "";
    return `Distancias mínimas desde <b>${origen}</b> a ${plural(alcanzables, "nodo", "nodos")}; están en la tabla de estado del último paso.${sinAlcanzar}`;
  }
  if (!resultado.alcanzado) {
    return `No hay camino de <b>${origen}</b> a <b>${destino}</b>: están en partes del grafo que no se conectan.`;
  }
  return `Camino más corto de <b>${origen}</b> a <b>${destino}</b>: <span class="gr-ruta">${resultado.ruta.join(" → ")}</span>, con costo <b>${n(resultado.costo)}</b>.`;
}

function fraseDeArbol({ algoritmo, resultado }, grafo) {
  const aristas = plural(resultado.aristas.length, "arista", "aristas");
  if (resultado.conexo) {
    return `Árbol de expansión mínima: <b>${aristas}</b>, peso total <b>${n(resultado.pesoTotal)}</b>.`;
  }
  if (algoritmo === "prim") {
    return `El grafo no es conexo. Desde <b>${resultado.origen}</b>, Prim solo cubre ${resultado.nodosEnArbol} de ${grafo.nodos.length} nodos: <b>${aristas}</b>, peso <b>${n(resultado.pesoTotal)}</b>.`;
  }
  return `El grafo no es conexo. Kruskal arma un bosque de ${resultado.arboles} árboles: <b>${aristas}</b>, peso total <b>${n(resultado.pesoTotal)}</b>.`;
}

function notaDeCaminos({ dijkstra, "a-estrella": aEstrella }, origen) {
  if (!aEstrella) return "Elige un destino para comparar con A*, que necesita saber a dónde va.";
  if (!dijkstra.resultado.alcanzado) {
    return `Como no hay camino, los dos terminan de revisar toda la parte del grafo que se alcanza desde ${origen}.`;
  }
  const d = dijkstra.metricas.nodosCerrados;
  const a = aEstrella.metricas.nodosCerrados;
  const mismaRuta = dijkstra.resultado.ruta.join() === aEstrella.resultado.ruta.join();
  const rutas = mismaRuta
    ? "Los dos encuentran el mismo camino."
    : "Los dos llegan al mismo costo por caminos distintos, porque hay un empate.";
  if (a < d) return `A* cerró ${a} nodos y Dijkstra ${d}: la heurística le ahorró ${d - a}. ${rutas}`;
  if (a === d) {
    return `A* y Dijkstra cerraron los mismos ${plural(a, "nodo", "nodos")}: aquí la heurística no ahorra trabajo. ${rutas}`;
  }
  return `Aquí A* cerró ${a} nodos y Dijkstra ${d}; puede pasar cuando varios nodos empatan en prioridad. ${rutas}`;
}

function notaDeArboles({ prim, kruskal }) {
  if (!kruskal.resultado.conexo) {
    return "Kruskal deja un árbol por cada parte del grafo; Prim solo crece dentro de la parte donde empieza.";
  }
  const mismas =
    [...prim.resultado.aristas].sort().join() === [...kruskal.resultado.aristas].sort().join();
  return mismas
    ? "Prim y Kruskal eligen las mismas aristas, en distinto orden."
    : "Prim y Kruskal llegan al mismo peso con árboles distintos, porque hay aristas que empatan en peso.";
}

// elementos: { parrafo, tabla, nota }
export function pintarResultado(elementos, { algoritmo, grafo, opciones, ejecucion }) {
  const { familia } = ALGORITMOS[algoritmo];
  const ids = ORDEN_ALGORITMOS.filter((id) => ALGORITMOS[id].familia === familia);
  // La ejecución que ya está en pantalla se reutiliza; la otra se calcula.
  const ejecuciones = Object.fromEntries(
    ids.map((id) => [id, id === algoritmo ? ejecucion : ejecutar(id, grafo, opciones)])
  );

  elementos.parrafo.innerHTML =
    familia === "caminos" ? fraseDeCamino(ejecucion, grafo) : fraseDeArbol(ejecucion, grafo);

  const clase = (id) => (id === algoritmo ? "is-actual" : "");
  const encabezado = ids
    .map((id) => `<th scope="col" class="${clase(id)}">${ALGORITMOS[id].nombre}</th>`)
    .join("");
  const filas = FILAS[familia]
    .map(([titulo, valorDe, menosEsMejor]) => {
      const valores = ids.map((id) => (ejecuciones[id] ? valorDe(ejecuciones[id]) : "–"));
      const numeros = valores.filter((valor) => typeof valor === "number");
      const mejor =
        menosEsMejor && numeros.length === ids.length && new Set(numeros).size > 1
          ? Math.min(...numeros)
          : null;
      const celdas = ids
        .map((id, i) => {
          const clases = [clase(id), valores[i] === mejor ? "is-mejor" : ""].join(" ").trim();
          return `<td class="${clases}">${valores[i]}</td>`;
        })
        .join("");
      return `<tr><th scope="row">${titulo}</th>${celdas}</tr>`;
    })
    .join("");
  elementos.tabla.innerHTML = `<thead><tr><th scope="col"><span class="visually-hidden">Medida</span></th>${encabezado}</tr></thead><tbody>${filas}</tbody>`;

  elementos.nota.textContent =
    familia === "caminos" ? notaDeCaminos(ejecuciones, opciones.origen) : notaDeArboles(ejecuciones);
}
