// Los pasos son lo que anima la pantalla: aquí se revisa que cada foto sea
// completa, coherente con la anterior y con el resultado final.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALGORITMOS, ORDEN_ALGORITMOS, ejecutar } from "../../src/js/grafos/algoritmos.js";
import { describirPaso, formatoNumero, tiposDePaso } from "../../src/js/grafos/descripciones.js";
import { EJEMPLOS } from "../../src/js/grafos/ejemplos.js";
import { grafoAleatorio } from "../../src/js/grafos/generador.js";
import { idArista } from "../../src/js/grafos/grafo.js";
import { ARISTA, NODO } from "../../src/js/grafos/registro.js";
import { crearAzar, grafoDePrueba, porId } from "./apoyo.js";

const ESTADOS_NODO = new Set(Object.values(NODO));
const ESTADOS_ARISTA = new Set(Object.values(ARISTA));

// Casos: los ejemplos de la pantalla, grafos generados y grafos cualesquiera.
function* casos() {
  for (const { id, grafo, origen, destino } of EJEMPLOS) {
    yield { nombre: `ejemplo ${id}`, grafo, origen, destino };
  }
  for (let semilla = 1; semilla <= 40; semilla++) {
    const grafo = grafoAleatorio({ nodos: 4 + (semilla % 11), semilla });
    yield { nombre: `aleatorio ${semilla}`, grafo, origen: "A", destino: grafo.nodos.at(-1).id };
  }
  const azar = crearAzar(99);
  for (let i = 0; i < 60; i++) {
    const grafo = grafoDePrueba(azar, { nodos: 1 + Math.floor(azar() * 9) });
    const ids = grafo.nodos.map(({ id }) => id);
    yield {
      nombre: `prueba ${i}`,
      grafo,
      origen: ids[Math.floor(azar() * ids.length)],
      destino: ids[Math.floor(azar() * ids.length)],
    };
  }
}

function paraCadaEjecucion(revisar) {
  for (const caso of casos()) {
    for (const id of ORDEN_ALGORITMOS) {
      for (const heuristica of id === "a-estrella" ? ["euclidiana", "manhattan"] : ["euclidiana"]) {
        const ejecucion = ejecutar(id, caso.grafo, { ...caso, heuristica });
        revisar({ ...caso, id, heuristica, ejecucion, etiqueta: `${caso.nombre} / ${id}` });
      }
    }
  }
}

describe("Pasos de los cuatro algoritmos", () => {
  it("empiezan con «inicio», terminan con «fin» y solo usan tipos conocidos", () => {
    paraCadaEjecucion(({ id, ejecucion: { pasos }, etiqueta }) => {
      assert.equal(pasos[0].tipo, "inicio", etiqueta);
      assert.equal(pasos.at(-1).tipo, "fin", etiqueta);
      assert.equal(pasos.filter(({ tipo }) => tipo === "fin").length, 1, etiqueta);
      const conocidos = tiposDePaso(id);
      for (const { tipo } of pasos) assert.ok(conocidos.includes(tipo), `${etiqueta}: ${tipo}`);
    });
  });

  it("cada paso señala una línea que existe en el pseudocódigo", () => {
    paraCadaEjecucion(({ id, ejecucion: { pasos }, etiqueta }) => {
      const lineas = ALGORITMOS[id].pseudocodigo.length;
      for (const { linea } of pasos) {
        assert.ok(Number.isInteger(linea) && linea >= 0 && linea < lineas, `${etiqueta}: ${linea}`);
      }
    });
  });

  it("cada paso trae el estado de todos los nodos y aristas", () => {
    paraCadaEjecucion(({ grafo, ejecucion: { pasos }, etiqueta }) => {
      const nodos = grafo.nodos.map(({ id }) => id);
      const aristas = grafo.aristas.map(({ id }) => id);
      for (const paso of pasos) {
        assert.deepEqual(Object.keys(paso.nodos), nodos, etiqueta);
        assert.deepEqual(Object.keys(paso.aristas), aristas, etiqueta);
        for (const estado of Object.values(paso.nodos)) assert.ok(ESTADOS_NODO.has(estado));
        for (const estado of Object.values(paso.aristas)) assert.ok(ESTADOS_ARISTA.has(estado));
        if (paso.nodo !== null) assert.ok(nodos.includes(paso.nodo), etiqueta);
        if (paso.vecino !== null) assert.ok(nodos.includes(paso.vecino), etiqueta);
        if (paso.arista !== null) assert.ok(aristas.includes(paso.arista), etiqueta);
      }
    });
  });

  it("los pasos son datos planos: sobreviven a JSON sin cambios", () => {
    paraCadaEjecucion(({ ejecucion, etiqueta }) => {
      assert.deepEqual(JSON.parse(JSON.stringify(ejecucion)), ejecucion, etiqueta);
    });
  });

  it("cada paso es una foto independiente", () => {
    paraCadaEjecucion(({ ejecucion: { pasos }, etiqueta }) => {
      for (let i = 1; i < pasos.length; i++) {
        assert.notEqual(pasos[i].nodos, pasos[i - 1].nodos, etiqueta);
        assert.notEqual(pasos[i].aristas, pasos[i - 1].aristas, etiqueta);
      }
    });
  });

  it("un nodo cerrado no se vuelve a abrir y una arista del resultado no se pierde", () => {
    paraCadaEjecucion(({ ejecucion: { pasos }, etiqueta }) => {
      for (let i = 1; i < pasos.length; i++) {
        for (const [id, estado] of Object.entries(pasos[i - 1].nodos)) {
          if (estado === NODO.CERRADO) assert.equal(pasos[i].nodos[id], NODO.CERRADO, etiqueta);
          if (estado === NODO.FRONTERA) assert.notEqual(pasos[i].nodos[id], NODO.NUEVO, etiqueta);
        }
        for (const [id, estado] of Object.entries(pasos[i - 1].aristas)) {
          if (estado === ARISTA.ARBOL) assert.equal(pasos[i].aristas[id], ARISTA.ARBOL, etiqueta);
        }
      }
    });
  });

  it("todos tienen una descripción completa", () => {
    paraCadaEjecucion(({ id, ejecucion: { pasos }, etiqueta }) => {
      for (const paso of pasos) {
        const texto = describirPaso(id, paso);
        assert.ok(texto.length > 10, `${etiqueta}: «${texto}»`);
        assert.doesNotMatch(texto, /undefined|NaN|null|\[object/, etiqueta);
      }
    });
  });

  it("ejecutar dos veces da exactamente los mismos pasos", () => {
    paraCadaEjecucion(({ id, grafo, origen, destino, heuristica, ejecucion, etiqueta }) => {
      assert.deepEqual(ejecutar(id, grafo, { origen, destino, heuristica }), ejecucion, etiqueta);
    });
  });
});

describe("Pasos de Dijkstra y A*", () => {
  const deCaminos = (revisar) =>
    paraCadaEjecucion((caso) => {
      if (ALGORITMOS[caso.id].familia === "caminos") revisar(caso);
    });

  it("la cola tiene justo los nodos de la frontera, ordenados por prioridad", () => {
    deCaminos(({ ejecucion: { pasos }, etiqueta }) => {
      for (const paso of pasos) {
        const frontera = Object.keys(paso.nodos).filter((id) => paso.nodos[id] === NODO.FRONTERA);
        assert.deepEqual(paso.cola.map(({ nodo }) => nodo).sort(), frontera.sort(), etiqueta);
        for (let i = 1; i < paso.cola.length; i++) {
          assert.ok(paso.cola[i - 1].prioridad <= paso.cola[i].prioridad, etiqueta);
        }
        const valores = paso.f ?? paso.dist;
        for (const { nodo, prioridad } of paso.cola) assert.equal(prioridad, valores[nodo], etiqueta);
      }
    });
  });

  it("los nodos salen de la cola de menor a mayor prioridad", () => {
    deCaminos(({ ejecucion: { pasos }, etiqueta }) => {
      const salidas = pasos
        .filter(({ tipo }) => tipo === "extraer")
        .map((paso) => (paso.f ?? paso.dist)[paso.nodo]);
      for (let i = 1; i < salidas.length; i++) {
        assert.ok(salidas[i - 1] <= salidas[i] + 1e-9, `${etiqueta}: ${salidas}`);
      }
    });
  });

  it("las aristas marcadas siguen a previo[]: árbol si el nodo está cerrado, candidata si no", () => {
    deCaminos(({ grafo, ejecucion: { pasos }, etiqueta }) => {
      for (const paso of pasos) {
        const esperadas = {};
        for (const [id, anterior] of Object.entries(paso.previo)) {
          if (anterior === null) continue;
          esperadas[idArista(grafo, anterior, id)] =
            paso.nodos[id] === NODO.CERRADO ? ARISTA.ARBOL : ARISTA.CANDIDATA;
        }
        for (const [id, estado] of Object.entries(paso.aristas)) {
          assert.equal(estado, esperadas[id] ?? ARISTA.NORMAL, `${etiqueta}: ${id}`);
        }
      }
    });
  });

  it("el paso final repite el resultado", () => {
    deCaminos(({ ejecucion: { pasos, resultado }, etiqueta }) => {
      const fin = pasos.at(-1);
      assert.deepEqual(fin.ruta, resultado.ruta, etiqueta);
      assert.deepEqual(fin.aristasRuta, resultado.aristasRuta, etiqueta);
      assert.equal(fin.costo, resultado.costo, etiqueta);
      assert.deepEqual(fin.dist ?? fin.g, resultado.dist ?? resultado.g, etiqueta);
    });
  });

  it("las métricas cuentan los pasos de cada tipo", () => {
    deCaminos(({ ejecucion: { pasos, metricas }, etiqueta }) => {
      const cuenta = (tipo) => pasos.filter((paso) => paso.tipo === tipo).length;
      assert.equal(metricas.nodosCerrados, cuenta("extraer"), etiqueta);
      assert.equal(metricas.actualizaciones, cuenta("relajar"), etiqueta);
      assert.equal(metricas.aristasRevisadas, cuenta("relajar") + cuenta("mantener"), etiqueta);
    });
  });
});

describe("Pasos de Prim y Kruskal", () => {
  it("Prim: el árbol tiene una arista menos que nodos cerrados, y el peso va sumando", () => {
    paraCadaEjecucion(({ id, grafo, ejecucion: { pasos, resultado }, etiqueta }) => {
      if (id !== "prim") return;
      const pesos = porId(grafo);
      for (const paso of pasos) {
        const cerrados = Object.values(paso.nodos).filter((estado) => estado === NODO.CERRADO);
        assert.equal(paso.arbol.length, Math.max(0, cerrados.length - 1), etiqueta);
        assert.equal(
          paso.pesoTotal,
          paso.arbol.reduce((suma, arista) => suma + pesos.get(arista).peso, 0),
          etiqueta
        );
        for (const arista of paso.arbol) assert.equal(paso.aristas[arista], ARISTA.ARBOL);
      }
      assert.deepEqual(pasos.at(-1).arbol, resultado.aristas, etiqueta);
    });
  });

  it("Kruskal: revisa una arista por paso, en orden, y los conjuntos siempre cubren todos los nodos", () => {
    paraCadaEjecucion(({ id, grafo, ejecucion: { pasos, resultado, metricas }, etiqueta }) => {
      if (id !== "kruskal") return;
      const decisiones = pasos.filter(({ tipo }) => tipo === "aceptar" || tipo === "rechazar");
      decisiones.forEach((paso, i) => {
        assert.equal(paso.revisadas, i + 1, etiqueta);
        assert.equal(paso.arista, paso.orden[i], etiqueta);
      });
      for (const paso of pasos) {
        assert.deepEqual(
          paso.conjuntos.flat().sort(),
          grafo.nodos.map(({ id: nodo }) => nodo).sort(),
          etiqueta
        );
        // Cada arista aceptada une dos grupos: n − aceptadas = grupos.
        assert.equal(paso.conjuntos.length, grafo.nodos.length - paso.arbol.length, etiqueta);
      }
      assert.equal(metricas.aristasRevisadas, decisiones.length, etiqueta);
      assert.equal(
        metricas.aristasAceptadas + metricas.aristasDescartadas,
        metricas.aristasRevisadas,
        etiqueta
      );
      assert.equal(resultado.sinRevisar, grafo.aristas.length - decisiones.length, etiqueta);
    });
  });

  it("al terminar, toda arista es del árbol o está descartada", () => {
    paraCadaEjecucion(({ id, ejecucion: { pasos, resultado }, etiqueta }) => {
      if (ALGORITMOS[id].familia !== "arbol") return;
      for (const [arista, estado] of Object.entries(pasos.at(-1).aristas)) {
        assert.equal(
          estado,
          resultado.aristas.includes(arista) ? ARISTA.ARBOL : ARISTA.DESCARTADA,
          `${etiqueta}: ${arista}`
        );
      }
    });
  });
});

describe("ejecutar", () => {
  const { grafo } = EJEMPLOS[0];

  it("A* sin destino no se ejecuta", () => {
    assert.equal(ejecutar("a-estrella", grafo, { origen: "A" }), null);
  });

  it("Prim y Kruskal ignoran el destino; Kruskal ignora también el origen", () => {
    assert.equal(ejecutar("prim", grafo, { origen: "A", destino: "Z" }).resultado.pesoTotal, 39);
    assert.equal(ejecutar("kruskal", grafo, { origen: "Z", destino: "Z" }).resultado.pesoTotal, 39);
  });

  it("rechaza un algoritmo desconocido", () => {
    assert.throws(() => ejecutar("bfs", grafo, { origen: "A" }));
    assert.throws(() => ejecutar("toString", grafo, { origen: "A" }));
  });
});

describe("formatoNumero", () => {
  it("muestra enteros, un decimal e infinito", () => {
    assert.equal(formatoNumero(7), "7");
    assert.equal(formatoNumero(0), "0");
    assert.equal(formatoNumero(89.5512), "89.6");
    assert.equal(formatoNumero(2.5), "2.5");
    assert.equal(formatoNumero(null), "∞");
    assert.equal(formatoNumero(Infinity), "∞");
    assert.equal(formatoNumero(undefined), "∞");
  });
});
