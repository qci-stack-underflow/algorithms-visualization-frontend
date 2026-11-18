// El globo de "¿por qué?" (explicaciones.js): que apunte a algo que existe,
// que sus números digan lo mismo que el paso y que la ruta que marca sea de
// verdad un camino desde el origen.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ejecutar } from "../../src/js/grafos/algoritmos.js";
import { EJEMPLOS } from "../../src/js/grafos/ejemplos.js";
import { explicarPaso, tieneExplicacion } from "../../src/js/grafos/explicaciones.js";
import { grafoAleatorio } from "../../src/js/grafos/generador.js";
import { idArista } from "../../src/js/grafos/grafo.js";
import { crearAzar, grafoDePrueba } from "./apoyo.js";

const CON_GLOBO = ["dijkstra", "a-estrella", "prim"];
const TONOS = new Set(["inicio", "elige", "mejora", "descarta", "final"]);
const MARCAS = new Set(["elegida", "nueva", "actual", "descartada", "otra"]);

function* casos() {
  for (const { id, grafo, origen, destino } of EJEMPLOS) {
    yield { nombre: `ejemplo ${id}`, grafo, origen, destino };
    yield { nombre: `ejemplo ${id} sin destino`, grafo, origen, destino: null };
  }
  for (let semilla = 1; semilla <= 25; semilla++) {
    const grafo = grafoAleatorio({ nodos: 4 + (semilla % 11), semilla });
    yield { nombre: `aleatorio ${semilla}`, grafo, origen: "A", destino: grafo.nodos.at(-1).id };
  }
  // Grafos cualesquiera: no conexos, con pesos en cero y repetidos (empates).
  const azar = crearAzar(7);
  for (let i = 0; i < 50; i++) {
    const grafo = grafoDePrueba(azar, { nodos: 1 + Math.floor(azar() * 8), pesoMaximo: 4 });
    const ids = grafo.nodos.map(({ id }) => id);
    yield {
      nombre: `prueba ${i}`,
      grafo,
      origen: ids[Math.floor(azar() * ids.length)],
      destino: ids[Math.floor(azar() * ids.length)],
    };
  }
}

function paraCadaPaso(revisar) {
  for (const caso of casos()) {
    for (const id of CON_GLOBO) {
      const ejecucion = ejecutar(id, caso.grafo, caso);
      if (!ejecucion) continue; // A* sin destino
      ejecucion.pasos.forEach((paso, indice) => {
        const explicacion = explicarPaso(id, caso.grafo, ejecucion.pasos, indice);
        revisar({ ...caso, id, paso, indice, pasos: ejecucion.pasos, explicacion, etiqueta: `${caso.nombre} / ${id} / paso ${indice}` });
      });
    }
  }
}

describe("Globo de explicaciones", () => {
  it("existe en Dijkstra, A* y Prim, y no en Kruskal", () => {
    for (const id of CON_GLOBO) assert.ok(tieneExplicacion(id), id);
    assert.equal(tieneExplicacion("kruskal"), false);
    const { grafo } = EJEMPLOS[0];
    const { pasos } = ejecutar("kruskal", grafo);
    assert.equal(explicarPaso("kruskal", grafo, pasos, 0), null);
  });

  it("todos los pasos tienen textos completos, sin undefined ni NaN", () => {
    paraCadaPaso(({ explicacion: e, etiqueta }) => {
      assert.ok(e, etiqueta);
      assert.ok(TONOS.has(e.tono), `${etiqueta}: tono ${e.tono}`);
      for (const campo of ["etiqueta", "titulo", "texto"]) {
        assert.equal(typeof e[campo], "string", `${etiqueta}: ${campo}`);
        assert.ok(e[campo].length > 0, `${etiqueta}: ${campo} vacío`);
      }
      const todo = [e.etiqueta, e.titulo, e.texto, e.nota, ...e.barras.flatMap((b) => [b.nombre, b.detalle])].join(" ");
      assert.doesNotMatch(todo, /undefined|NaN|null|\[object/, etiqueta);
    });
  });

  it("apunta a un nodo o a una arista que existen", () => {
    paraCadaPaso(({ grafo, paso, explicacion: { ancla }, etiqueta }) => {
      if (ancla.tipo === "nodo") {
        assert.ok(grafo.indice.has(ancla.id), etiqueta);
      } else {
        assert.equal(ancla.tipo, "arista", etiqueta);
        assert.equal(ancla.id, idArista(grafo, ancla.desde, ancla.hacia), etiqueta);
        assert.equal(ancla.id, paso.arista, etiqueta);
      }
    });
  });

  it("las barras dicen lo mismo que el paso", () => {
    paraCadaPaso(({ id, paso, pasos, indice, explicacion: { barras, resto }, etiqueta }) => {
      for (const barra of barras) assert.ok(MARCAS.has(barra.marca), etiqueta);
      const valor = (marca) => barras.find((b) => b.marca === marca)?.valor;
      const comoNumero = (v) => (v === null ? Infinity : v);

      if (paso.tipo === "relajar") {
        assert.equal(barras.length, 2, etiqueta);
        assert.ok(comoNumero(valor("nueva")) < comoNumero(valor("actual")), etiqueta);
      }
      if (paso.tipo === "mantener") {
        assert.equal(barras.length, 2, etiqueta);
        assert.ok(valor("descartada") >= valor("actual"), etiqueta);
      }
      // Al sacar un nodo, el elegido es el primero y el menor de la cola.
      if (paso.tipo === "extraer" && barras.length > 0) {
        assert.equal(barras[0].marca, "elegida", etiqueta);
        assert.equal(barras[0].nombre, paso.nodo, etiqueta);
        for (const otra of barras.slice(1)) assert.ok(otra.valor >= barras[0].valor, etiqueta);
        assert.equal(barras.length + resto, pasos[indice - 1].cola.length, etiqueta);
      }
      if (id === "prim" && paso.tipo === "extraer" && paso.arista) {
        assert.equal(barras[0].valor, paso.clave[paso.nodo], etiqueta);
      }
    });
  });

  it("la ruta propuesta es un camino desde el origen que termina en lo que se revisa", () => {
    paraCadaPaso(({ id, grafo, origen, paso, explicacion: { propuesta }, etiqueta }) => {
      if (!propuesta) return;
      const { tramos } = propuesta;
      assert.ok(tramos.length > 0, etiqueta);
      for (const { arista, desde, hacia } of tramos) {
        assert.equal(arista, idArista(grafo, desde, hacia), etiqueta);
      }
      for (let i = 1; i < tramos.length; i++) {
        assert.equal(tramos[i].desde, tramos[i - 1].hacia, `${etiqueta}: tramos sin unir`);
      }
      const ultimo = tramos.at(-1);
      if (paso.tipo === "extraer") {
        assert.equal(ultimo.hacia, paso.nodo, etiqueta);
      } else {
        assert.equal(ultimo.arista, paso.arista, etiqueta);
        assert.equal(ultimo.hacia, paso.vecino, etiqueta);
      }
      // En Dijkstra y A* la ruta sale del origen; en Prim es solo la arista.
      if (id === "prim") assert.equal(tramos.length, 1, etiqueta);
      else assert.equal(tramos[0].desde, origen, etiqueta);
    });
  });

  it("en el ejemplo clásico explica con los números correctos", () => {
    const { grafo, origen, destino } = EJEMPLOS.find(({ id }) => id === "clasico");
    const { pasos } = ejecutar("dijkstra", grafo, { origen, destino });
    const indice = pasos.findIndex((p) => p.tipo === "relajar" && p.vecino === "E" && p.nodo === "B");
    const e = explicarPaso("dijkstra", grafo, pasos, indice);
    assert.equal(e.titulo, "Mejor ruta hacia E");
    assert.match(e.texto, /7 \+ 7 = 14/);
    assert.match(e.texto, /20 por D/);
    assert.deepEqual(
      e.propuesta.tramos.map(({ desde, hacia }) => `${desde}${hacia}`),
      ["AB", "BE"]
    );
  });
});
