// Vistas previas de las tarjetas de grafos del inicio: un grafo pequeño en
// el que se va marcando el camino más corto (Dijkstra) o el árbol de
// expansión mínima (Kruskal).
// Lo que se ilumina sale de ejecutar los algoritmos reales de js/grafos/
// sobre este grafo: A → C → E → F con costo 12, y un árbol de peso 16.
import { dijkstra } from "./grafos/dijkstra.js";
import { crearGrafo } from "./grafos/grafo.js";
import { kruskal } from "./grafos/kruskal.js";
import { prefiereMenosMovimiento } from "./inicio.js";

const SVG = "http://www.w3.org/2000/svg";
const ANCHO = 240;
const ALTO = 104;
const RADIO = 9;

const GRAFO = crearGrafo({
  nodos: [
    { id: "A", x: 20, y: 52 },
    { id: "B", x: 80, y: 18 },
    { id: "C", x: 82, y: 88 },
    { id: "D", x: 148, y: 22 },
    { id: "E", x: 156, y: 84 },
    { id: "F", x: 220, y: 50 },
  ],
  aristas: [
    { a: "A", b: "B", peso: 4 },
    { a: "A", b: "C", peso: 2 },
    { a: "B", b: "C", peso: 3 },
    { a: "B", b: "D", peso: 6 },
    { a: "C", b: "E", peso: 4 },
    { a: "D", b: "E", peso: 2 },
    { a: "D", b: "F", peso: 5 },
    { a: "E", b: "F", peso: 6 },
  ],
});

const ESPERA_INICIAL_MS = 900;
const ENTRE_ARISTAS_MS = 420;
const MOSTRAR_RESULTADO_MS = 2400;
const DESVANECER_MS = 300;

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function crear(nombre, atributos, padre) {
  const elemento = document.createElementNS(SVG, nombre);
  for (const [clave, valor] of Object.entries(atributos)) elemento.setAttribute(clave, valor);
  padre.appendChild(elemento);
  return elemento;
}

// Dibuja el grafo y anima `aristas` (ids en el orden en que se iluminan).
// `sigueActiva()` indica si la tarjeta sigue en pantalla; cuando devuelve
// false el bucle termina.
function crearVistaPrevia(contenedor, sigueActiva, { clase, aristas, antes, despues }) {
  const raiz = document.createElement("div");
  raiz.className = `mini-grafo ${clase}`;

  const svg = crear("svg", { viewBox: `0 0 ${ANCHO} ${ALTO}`, "aria-hidden": "true" }, raiz);
  const posicion = new Map(GRAFO.nodos.map((nodo) => [nodo.id, nodo]));
  const lineas = new Map();
  for (const { id, a, b, peso } of GRAFO.aristas) {
    const [p, q] = [posicion.get(a), posicion.get(b)];
    lineas.set(id, crear("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y }, svg));
    const texto = crear("text", { class: "mini-grafo-peso", x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, svg);
    texto.textContent = peso;
  }
  const circulos = new Map();
  for (const { id, x, y } of GRAFO.nodos) {
    circulos.set(id, crear("circle", { cx: x, cy: y, r: RADIO }, svg));
    const nombre = crear("text", { class: "mini-grafo-nombre", x, y }, svg);
    nombre.textContent = id;
  }

  const pie = document.createElement("div");
  pie.className = "mini-grafo-pie";
  pie.innerHTML = `<span class="mini-grafo-antes">${antes}</span><span class="mini-grafo-despues">${despues}</span>`;
  raiz.appendChild(pie);
  contenedor.appendChild(raiz);

  const marcar = (id) => {
    lineas.get(id).classList.add("is-on");
    id.split("-").forEach((nodo) => circulos.get(nodo).classList.add("is-on"));
  };
  const limpiar = () => {
    raiz.querySelectorAll(".is-on").forEach((elemento) => elemento.classList.remove("is-on"));
    raiz.classList.remove("is-listo");
  };

  if (prefiereMenosMovimiento()) {
    aristas.forEach(marcar);
    raiz.classList.add("is-listo");
    return;
  }

  const reproducir = async () => {
    while (sigueActiva()) {
      await esperar(ESPERA_INICIAL_MS);
      for (const id of aristas) {
        if (!sigueActiva()) return;
        marcar(id);
        await esperar(ENTRE_ARISTAS_MS);
      }
      if (!sigueActiva()) return;
      raiz.classList.add("is-listo");

      // Se desvanece, se limpia sin que se vea y reaparece.
      await esperar(MOSTRAR_RESULTADO_MS);
      if (!sigueActiva()) return;
      raiz.classList.add("is-resetting");
      await esperar(DESVANECER_MS);
      limpiar();
      await esperar(DESVANECER_MS);
      raiz.classList.remove("is-resetting");
    }
  };
  reproducir();
}

export function crearVistaPreviaCamino(contenedor, sigueActiva) {
  const { resultado } = dijkstra(GRAFO, { origen: "A", destino: "F" });
  crearVistaPrevia(contenedor, sigueActiva, {
    clase: "mini-grafo--camino",
    aristas: resultado.aristasRuta,
    antes: "¿el camino más corto de A a F?",
    despues: `${resultado.ruta.join(" → ")} · <b>costo ${resultado.costo}</b>`,
  });
}

export function crearVistaPreviaArbol(contenedor, sigueActiva) {
  const { resultado } = kruskal(GRAFO);
  crearVistaPrevia(contenedor, sigueActiva, {
    clase: "mini-grafo--arbol",
    aristas: resultado.aristas,
    antes: `${GRAFO.aristas.length} aristas para unir ${GRAFO.nodos.length} nodos`,
    despues: `${resultado.aristas.length} aristas · <b>peso ${resultado.pesoTotal}</b>`,
  });
}
