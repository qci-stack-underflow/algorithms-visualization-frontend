// Algoritmo de Kruskal: árbol de expansión mínima, eligiendo aristas.
//
// Es voraz: recorre las aristas de la más barata a la más cara y se queda
// con cada una que no cierre un ciclo. Para saber si cierra un ciclo usa
// conjuntos disjuntos: si los dos extremos ya están en el mismo grupo, ya
// hay un camino entre ellos y la arista sobra.
//
// Complejidad: O(E log E) por ordenar las aristas; las operaciones de
// conjuntos disjuntos cuestan casi O(1) cada una.
//
// Si el grafo no es conexo, el resultado es un bosque: un árbol mínimo por
// cada parte del grafo.
import { ConjuntosDisjuntos } from "./conjuntos.js";
import { ARISTA, NODO, crearRegistro } from "./registro.js";

export const PSEUDOCODIGO = [
  "Kruskal(G)",
  "  ordenar las aristas por peso",
  "  crear un conjunto por cada nodo",
  "  para cada arista (u, v), en orden",
  "    si encontrar(u) ≠ encontrar(v)",
  "      agregar (u, v) al árbol",
  "      unir(u, v)",
  "    si no",
  "      descartar (u, v)   // cierra un ciclo",
  "    si el árbol tiene n − 1 aristas",
  "      terminar",
  "  devolver el árbol",
];

const LINEA = { INICIO: 2, ACEPTAR: 5, RECHAZAR: 8, FIN: 11 };

export function kruskal(grafo) {
  const registro = crearRegistro(grafo);
  const conjuntos = new ConjuntosDisjuntos(grafo.nodos.map(({ id }) => id));

  // sort() es estable: las aristas con el mismo peso conservan el orden en
  // que se definieron.
  const ordenadas = [...grafo.aristas].sort((p, q) => p.peso - q.peso);
  const orden = ordenadas.map(({ id }) => id);

  const arbol = [];
  let pesoTotal = 0;
  const metricas = { aristasRevisadas: 0, aristasAceptadas: 0, aristasDescartadas: 0 };

  const anotar = (tipo, linea, datos) =>
    registro.anotar(tipo, linea, {
      ...datos,
      orden, // ids de las aristas, de menor a mayor peso
      revisadas: metricas.aristasRevisadas, // cuántas de `orden` ya se decidieron
      conjuntos: conjuntos.grupos(),
      arbol: [...arbol],
      pesoTotal,
    });

  anotar("inicio", LINEA.INICIO);

  const aristasNecesarias = grafo.nodos.length - 1;
  let posicion = 0;
  for (; posicion < ordenadas.length && arbol.length < aristasNecesarias; posicion++) {
    const { id, a, b, peso } = ordenadas[posicion];
    metricas.aristasRevisadas++;

    if (conjuntos.unir(a, b)) {
      arbol.push(id);
      pesoTotal += peso;
      registro.aristas[id] = ARISTA.ARBOL;
      registro.nodos[a] = NODO.CERRADO;
      registro.nodos[b] = NODO.CERRADO;
      metricas.aristasAceptadas++;
      anotar("aceptar", LINEA.ACEPTAR, { nodo: a, vecino: b, arista: id, peso });
    } else {
      registro.aristas[id] = ARISTA.DESCARTADA;
      metricas.aristasDescartadas++;
      anotar("rechazar", LINEA.RECHAZAR, { nodo: a, vecino: b, arista: id, peso });
    }
  }

  // Las aristas que ya no hizo falta revisar tampoco son parte del árbol.
  for (const { id } of grafo.aristas) {
    if (registro.aristas[id] !== ARISTA.ARBOL) registro.aristas[id] = ARISTA.DESCARTADA;
  }
  // Un nodo sin aristas es un árbol de un solo nodo.
  for (const { id } of grafo.nodos) registro.nodos[id] = NODO.CERRADO;

  const grupos = conjuntos.grupos();
  const resultado = {
    aristas: [...arbol],
    pesoTotal,
    conexo: grupos.length === 1,
    arboles: grupos.length,
    sinRevisar: ordenadas.length - posicion,
  };
  anotar("fin", LINEA.FIN, {
    conexo: resultado.conexo,
    arboles: resultado.arboles,
    sinRevisar: resultado.sinRevisar,
  });

  return { algoritmo: "kruskal", pasos: registro.pasos, resultado, metricas };
}
