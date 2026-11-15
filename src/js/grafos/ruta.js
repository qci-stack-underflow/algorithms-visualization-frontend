// La dirección de la pantalla guarda qué se está viendo, para poder
// compartirla o recargar sin perder la selección:
//   grafos.html#/a-estrella?grafo=mapa&origen=A&destino=L&h=manhattan
//   grafos.html#/prim?grafo=azar&semilla=1234&nodos=9&origen=A
// No usa nada del navegador: recibe y devuelve textos.
import { ORDEN_ALGORITMOS } from "./algoritmos.js";

export const ALGORITMO_INICIAL = "dijkstra";

// Valor de `destino` cuando Dijkstra calcula hacia todos los nodos. No puede
// confundirse con un nodo: los nombres de nodo tienen 4 caracteres o menos.
export const TODOS = "todos";

// Lee el hash. Lo que falte o no se entienda queda en null y la pantalla
// usa su valor por defecto.
export function leerRuta(hash) {
  const [, camino = "", consulta = ""] = /^#?\/?([^?]*)\??(.*)$/.exec(hash ?? "") ?? [];
  const id = camino.replace(/\/+$/, "").toLowerCase();
  const datos = new URLSearchParams(consulta);
  const entero = (clave) => {
    const valor = Number(datos.get(clave));
    return datos.has(clave) && Number.isInteger(valor) && valor >= 0 ? valor : null;
  };

  return {
    algoritmo: ORDEN_ALGORITMOS.includes(id) ? id : null,
    grafo: datos.get("grafo"),
    origen: datos.get("origen"),
    destino: datos.get("destino"),
    heuristica: datos.get("h"),
    semilla: entero("semilla"),
    nodos: entero("nodos"),
  };
}

// Arma el hash con la selección actual. Solo incluye lo que hace falta.
export function escribirRuta({ algoritmo, grafo, origen, destino, heuristica, semilla, nodos }) {
  const datos = new URLSearchParams();
  if (grafo) datos.set("grafo", grafo);
  if (grafo === "azar") {
    datos.set("semilla", semilla);
    datos.set("nodos", nodos);
  }
  if (origen) datos.set("origen", origen);
  if (destino) datos.set("destino", destino);
  if (heuristica) datos.set("h", heuristica);

  const consulta = datos.toString();
  return `#/${algoritmo}${consulta ? `?${consulta}` : ""}`;
}
