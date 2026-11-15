// Panel "Estado": lo que el algoritmo tiene en memoria en el paso actual.
//   Dijkstra, A* y Prim  → cola de prioridad y una tabla con una fila por nodo
//   Kruskal              → conjuntos disjuntos y la lista de aristas ordenadas
//
// El HTML se arma con textos del grafo. Es seguro porque crearGrafo solo
// acepta nombres de nodo formados por letras y números.
import { formatoNumero as n } from "./descripciones.js";
import { ARISTA } from "./registro.js";

// Columnas de la tabla por nodo: [título, campo del paso]. La última es el
// nodo desde el que se llega.
const COLUMNAS = {
  dijkstra: [
    ["dist", "dist"],
    ["previo", "previo"],
  ],
  "a-estrella": [
    ["g", "g"],
    ["h", "h"],
    ["f = g + h", "f"],
    ["previo", "previo"],
  ],
  prim: [
    ["clave", "clave"],
    ["padre", "padre"],
  ],
};

const CAMPOS_DE_NODO = new Set(["previo", "padre"]);
// h no cambia durante la ejecución, así que nunca se marca como "cambió".
const CAMPOS_FIJOS = new Set(["h"]);

const plural = (cantidad, uno, varios) => `${cantidad} ${cantidad === 1 ? uno : varios}`;

function fichasDeCola(paso) {
  if (paso.cola.length === 0) {
    return `<ol class="gr-fichas"><li class="gr-fichas-vacio">vacía</li></ol>`;
  }
  const fichas = paso.cola
    .map(({ nodo, prioridad }, i) => {
      const clases = ["gr-ficha"];
      if (i === 0) clases.push("is-siguiente");
      return `<li class="${clases.join(" ")}"><b>${nodo}</b><span>${n(prioridad)}</span></li>`;
    })
    .join("");
  return `<ol class="gr-fichas">${fichas}</ol>`;
}

function tablaPorNodo(algoritmo, grafo, paso) {
  const columnas = COLUMNAS[algoritmo];
  const encabezado = columnas.map(([titulo]) => `<th scope="col">${titulo}</th>`).join("");

  const filas = grafo.nodos
    .map(({ id }) => {
      const clases = [];
      if (id === paso.nodo && paso.tipo !== "fin") clases.push("is-foco");
      if (id === paso.vecino) clases.push("is-vecino");
      const cambio = paso.tipo === "relajar" && id === paso.vecino;

      const celdas = columnas
        .map(([, campo]) => {
          const valor = paso[campo][id];
          const esNodo = CAMPOS_DE_NODO.has(campo);
          const texto = esNodo ? (valor ?? "–") : n(valor);
          const clasesCelda = [];
          if (cambio && !CAMPOS_FIJOS.has(campo)) clasesCelda.push("is-cambio");
          if (valor === null) clasesCelda.push("is-vacio");
          return `<td class="${clasesCelda.join(" ")}">${texto}</td>`;
        })
        .join("");

      return `<tr class="${clases.join(" ")}">
        <th scope="row"><span class="gr-punto" data-estado="${paso.nodos[id]}"></span>${id}</th>
        ${celdas}
      </tr>`;
    })
    .join("");

  return `<div class="gr-tabla-marco gr-tabla-marco--alta">
    <table class="gr-tabla">
      <thead><tr><th scope="col">Nodo</th>${encabezado}</tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </div>`;
}

function estadoConCola(algoritmo, grafo, paso) {
  const titulo =
    algoritmo === "a-estrella"
      ? "Cola de prioridad, ordenada por f"
      : algoritmo === "prim"
        ? "Cola de prioridad, ordenada por clave"
        : "Cola de prioridad, ordenada por dist";
  const total =
    algoritmo === "prim"
      ? `<p class="gr-total"><span>Peso del árbol hasta ahora (${plural(paso.arbol.length, "arista", "aristas")})</span><b>${n(paso.pesoTotal)}</b></p>`
      : "";

  return {
    cuenta: `${paso.cola.length} en la cola`,
    html: `<h3>${titulo}</h3>${fichasDeCola(paso)}<h3>Tabla por nodo</h3>${tablaPorNodo(algoritmo, grafo, paso)}${total}`,
  };
}

function estadoDeKruskal(grafo, paso) {
  const pesos = new Map(grafo.aristas.map(({ id, peso }) => [id, peso]));

  const conjuntos = paso.conjuntos
    .map((grupo) => {
      const cambio =
        paso.tipo === "aceptar" && grupo.includes(paso.nodo) && grupo.includes(paso.vecino);
      return `<li class="gr-ficha${cambio ? " is-cambio" : ""}">{${grupo.join(", ")}}</li>`;
    })
    .join("");

  const filas = paso.orden
    .map((id, i) => {
      const revisada = i < paso.revisadas;
      const estado = !revisada
        ? "pendiente"
        : paso.aristas[id] === ARISTA.ARBOL
          ? "arbol"
          : "descartada";
      const texto = {
        arbol: "✓ en el árbol",
        descartada: "✗ cerraría un ciclo",
        pendiente: paso.tipo === "fin" ? "no hizo falta" : "pendiente",
      }[estado];
      const clases = [];
      if (id === paso.arista) clases.push("is-foco");
      if (!revisada) clases.push("is-pendiente");

      return `<tr class="${clases.join(" ")}" ${id === paso.arista ? "data-actual" : ""}>
        <th scope="row">${id.replace("-", " – ")}</th>
        <td>${n(pesos.get(id))}</td>
        <td class="is-texto"><span class="gr-marca" data-estado="${estado}">${texto}</span></td>
      </tr>`;
    })
    .join("");

  return {
    cuenta: `${paso.revisadas} de ${plural(paso.orden.length, "arista", "aristas")}`,
    html: `<h3>Conjuntos (${paso.conjuntos.length})</h3>
      <ul class="gr-fichas">${conjuntos}</ul>
      <h3>Aristas, de menor a mayor peso</h3>
      <div class="gr-tabla-marco gr-tabla-marco--alta">
        <table class="gr-tabla">
          <thead><tr><th scope="col">Arista</th><th scope="col">Peso</th><th scope="col">Decisión</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      <p class="gr-total"><span>Peso del árbol hasta ahora (${plural(paso.arbol.length, "arista", "aristas")})</span><b>${n(paso.pesoTotal)}</b></p>`,
  };
}

// Dibuja el panel. `raiz` es el contenedor y `cuenta` el texto pequeño del
// encabezado del panel.
export function pintarEstado(raiz, cuenta, { algoritmo, grafo, paso }) {
  // Se conserva el desplazamiento de la tabla entre un paso y el siguiente.
  const desplazamiento = raiz.querySelector(".gr-tabla-marco--alta")?.scrollTop ?? 0;

  const { html, cuenta: texto } =
    algoritmo === "kruskal" ? estadoDeKruskal(grafo, paso) : estadoConCola(algoritmo, grafo, paso);
  raiz.innerHTML = html;
  cuenta.textContent = texto;

  const marco = raiz.querySelector(".gr-tabla-marco--alta");
  if (!marco) return;
  marco.scrollTop = desplazamiento;

  // Si la fila del paso actual quedó fuera de la vista, se desplaza solo la
  // tabla (no la página) hasta mostrarla.
  const actual = marco.querySelector("[data-actual], tr.is-foco");
  if (!actual) return;
  const encabezado = marco.querySelector("thead")?.offsetHeight ?? 0;
  const arriba = actual.offsetTop - encabezado;
  const abajo = actual.offsetTop + actual.offsetHeight;
  if (arriba < marco.scrollTop) marco.scrollTop = arriba;
  else if (abajo > marco.scrollTop + marco.clientHeight) marco.scrollTop = abajo - marco.clientHeight;
}
