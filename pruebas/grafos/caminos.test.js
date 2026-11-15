// Dijkstra y A*: resultados conocidos y comparación contra Floyd–Warshall.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aEstrella } from "../../src/js/grafos/a-estrella.js";
import { dijkstra } from "../../src/js/grafos/dijkstra.js";
import { ejemploPorId } from "../../src/js/grafos/ejemplos.js";
import { grafoAleatorio } from "../../src/js/grafos/generador.js";
import { ErrorDeGrafo, crearGrafo } from "../../src/js/grafos/grafo.js";
import { HEURISTICAS, crearHeuristica } from "../../src/js/grafos/heuristica.js";
import { crearAzar, distanciasDeReferencia, grafoDePrueba, porId } from "./apoyo.js";

const clasico = ejemploPorId("clasico").grafo;
const mapa = ejemploPorId("mapa").grafo;
const islas = ejemploPorId("islas").grafo;
const TIPOS = Object.keys(HEURISTICAS);

function costoDeRuta(grafo, resultado) {
  const aristas = porId(grafo);
  return resultado.aristasRuta.reduce((suma, id) => suma + aristas.get(id).peso, 0);
}

// La ruta empieza en el origen, termina en el destino y cada tramo es una
// arista del grafo.
function revisarRuta(grafo, { origen, destino, ruta, aristasRuta, costo }) {
  assert.equal(ruta[0], origen);
  assert.equal(ruta.at(-1), destino);
  assert.equal(aristasRuta.length, ruta.length - 1);
  const aristas = porId(grafo);
  aristasRuta.forEach((id, i) => {
    const arista = aristas.get(id);
    assert.ok(arista, `la arista ${id} no existe`);
    assert.deepEqual([arista.a, arista.b].sort(), [ruta[i], ruta[i + 1]].sort());
  });
  assert.equal(new Set(ruta).size, ruta.length, "la ruta repite un nodo");
  assert.equal(aristasRuta.reduce((suma, id) => suma + aristas.get(id).peso, 0), costo);
}

describe("Dijkstra", () => {
  it("calcula las distancias del grafo clásico desde A", () => {
    const { resultado } = dijkstra(clasico, { origen: "A" });
    assert.deepEqual(resultado.dist, { A: 0, B: 7, C: 15, D: 5, E: 14, F: 11, G: 22 });
    assert.deepEqual(resultado.previo, {
      A: null,
      B: "A",
      C: "B",
      D: "A",
      E: "B",
      F: "D",
      G: "F",
    });
    assert.equal(resultado.ruta, null);
    assert.equal(resultado.costo, null);
  });

  it("con destino, devuelve el camino y su costo", () => {
    const { resultado } = dijkstra(clasico, { origen: "A", destino: "G" });
    assert.deepEqual(resultado.ruta, ["A", "D", "F", "G"]);
    assert.deepEqual(resultado.aristasRuta, ["A-D", "D-F", "F-G"]);
    assert.equal(resultado.costo, 22);
    assert.equal(resultado.alcanzado, true);
  });

  it("con destino, se detiene al cerrarlo", () => {
    const completo = dijkstra(clasico, { origen: "A" });
    const corto = dijkstra(clasico, { origen: "A", destino: "D" });
    assert.equal(completo.metricas.nodosCerrados, 7);
    assert.equal(corto.metricas.nodosCerrados, 2); // A y D
    assert.equal(corto.resultado.costo, 5);
    assert.ok(corto.pasos.length < completo.pasos.length);
  });

  it("origen y destino iguales: camino de un nodo y costo 0", () => {
    const { resultado, metricas } = dijkstra(clasico, { origen: "C", destino: "C" });
    assert.deepEqual(resultado.ruta, ["C"]);
    assert.deepEqual(resultado.aristasRuta, []);
    assert.equal(resultado.costo, 0);
    assert.equal(metricas.nodosCerrados, 1);
  });

  it("avisa cuando no hay camino y deja en null lo inalcanzable", () => {
    const { resultado } = dijkstra(islas, { origen: "A", destino: "G" });
    assert.equal(resultado.alcanzado, false);
    assert.equal(resultado.ruta, null);
    assert.equal(resultado.costo, null);
    assert.deepEqual(resultado.dist, { A: 0, B: 4, C: 6, D: 7, E: null, F: null, G: null });
  });

  it("funciona con aristas de peso 0", () => {
    const grafo = crearGrafo({
      nodos: ["A", "B", "C"].map((id, i) => ({ id, x: i * 10, y: 0 })),
      aristas: [
        { a: "A", b: "B", peso: 0 },
        { a: "B", b: "C", peso: 0 },
        { a: "A", b: "C", peso: 1 },
      ],
    });
    const { resultado } = dijkstra(grafo, { origen: "A", destino: "C" });
    assert.equal(resultado.costo, 0);
    assert.deepEqual(resultado.ruta, ["A", "B", "C"]);
  });

  it("en empates elige el nodo que va antes en la lista", () => {
    // B y C quedan a la misma distancia; D se alcanza igual por los dos.
    const grafo = crearGrafo({
      nodos: ["A", "B", "C", "D"].map((id, i) => ({ id, x: i * 10, y: 0 })),
      aristas: [
        { a: "A", b: "C", peso: 2 },
        { a: "A", b: "B", peso: 2 },
        { a: "C", b: "D", peso: 3 },
        { a: "B", b: "D", peso: 3 },
      ],
    });
    const { pasos, resultado } = dijkstra(grafo, { origen: "A", destino: "D" });
    const extraidos = pasos.filter(({ tipo }) => tipo === "extraer").map(({ nodo }) => nodo);
    assert.deepEqual(extraidos, ["A", "B", "C", "D"]);
    assert.deepEqual(resultado.ruta, ["A", "B", "D"]);
  });

  it("rechaza un origen o un destino que no existen", () => {
    assert.throws(() => dijkstra(clasico, { origen: "Z" }), ErrorDeGrafo);
    assert.throws(() => dijkstra(clasico, {}), ErrorDeGrafo);
    assert.throws(() => dijkstra(clasico, { origen: "A", destino: "Z" }), ErrorDeGrafo);
  });

  it("coincide con Floyd–Warshall en 300 grafos al azar, desde cada nodo", () => {
    const azar = crearAzar(2026);
    for (let caso = 0; caso < 300; caso++) {
      const grafo = grafoDePrueba(azar, {
        nodos: 2 + Math.floor(azar() * 9),
        probabilidad: 0.15 + azar() * 0.6,
      });
      const referencia = distanciasDeReferencia(grafo);
      for (const { id: origen } of grafo.nodos) {
        const { resultado } = dijkstra(grafo, { origen });
        for (const { id } of grafo.nodos) {
          const esperada = Number.isFinite(referencia[origen][id]) ? referencia[origen][id] : null;
          assert.equal(resultado.dist[id], esperada, `caso ${caso}: ${origen} → ${id}`);
        }
      }
    }
  });

  it("con destino, el camino que devuelve cuesta lo mismo que la referencia", () => {
    const azar = crearAzar(77);
    for (let caso = 0; caso < 300; caso++) {
      const grafo = grafoDePrueba(azar, { nodos: 3 + Math.floor(azar() * 8) });
      const ids = grafo.nodos.map(({ id }) => id);
      const origen = ids[Math.floor(azar() * ids.length)];
      const destino = ids[Math.floor(azar() * ids.length)];
      const referencia = distanciasDeReferencia(grafo)[origen][destino];
      const { resultado } = dijkstra(grafo, { origen, destino });
      if (Number.isFinite(referencia)) {
        assert.equal(resultado.costo, referencia, `caso ${caso}`);
        revisarRuta(grafo, resultado);
      } else {
        assert.equal(resultado.alcanzado, false, `caso ${caso}`);
      }
    }
  });
});

describe("Heurísticas de A*", () => {
  it("valen 0 en el destino y nunca son negativas", () => {
    for (const tipo of TIPOS) {
      const { valores } = crearHeuristica(mapa, "L", tipo);
      assert.equal(valores.L, 0);
      for (const valor of Object.values(valores)) assert.ok(valor >= 0);
    }
  });

  it("«cero» vale 0 en todos los nodos", () => {
    const { valores } = crearHeuristica(mapa, "L", "cero");
    assert.ok(Object.values(valores).every((valor) => valor === 0));
  });

  it("la escala es el menor peso por unidad de distancia", () => {
    const grafo = crearGrafo({
      nodos: [
        { id: "A", x: 0, y: 0 },
        { id: "B", x: 30, y: 40 }, // a 50 de A
        { id: "C", x: 30, y: 0 }, // a 30 de A y a 40 de B
      ],
      aristas: [
        { a: "A", b: "B", peso: 10 }, // 0.2 por unidad
        { a: "A", b: "C", peso: 3 }, // 0.1 por unidad
        { a: "B", b: "C", peso: 20 }, // 0.5 por unidad
      ],
    });
    const euclidiana = crearHeuristica(grafo, "B");
    assert.ok(Math.abs(euclidiana.escala - 0.1) < 1e-12);
    assert.ok(Math.abs(euclidiana.valores.A - 5) < 1e-12);
    assert.ok(Math.abs(euclidiana.valores.C - 4) < 1e-12);
  });

  it("con una arista de peso 0 la heurística se apaga (h = 0)", () => {
    const grafo = crearGrafo({
      nodos: [
        { id: "A", x: 0, y: 0 },
        { id: "B", x: 10, y: 0 },
        { id: "C", x: 20, y: 0 },
      ],
      aristas: [
        { a: "A", b: "B", peso: 0 },
        { a: "B", b: "C", peso: 5 },
      ],
    });
    assert.deepEqual(crearHeuristica(grafo, "C").valores, { A: 0, B: 0, C: 0 });
  });

  it("rechaza un nombre de heurística desconocido", () => {
    assert.throws(() => crearHeuristica(mapa, "L", "magia"));
  });

  it("son consistentes y admisibles en 300 grafos al azar", () => {
    const azar = crearAzar(404);
    const TOLERANCIA = 1e-9;
    for (let caso = 0; caso < 300; caso++) {
      const grafo =
        caso % 2 === 0
          ? grafoDePrueba(azar, { nodos: 3 + Math.floor(azar() * 8) })
          : grafoAleatorio({ nodos: 4 + (caso % 11), semilla: caso });
      const ids = grafo.nodos.map(({ id }) => id);
      const destino = ids[Math.floor(azar() * ids.length)];
      const referencia = distanciasDeReferencia(grafo);
      for (const tipo of TIPOS) {
        const { valores: h } = crearHeuristica(grafo, destino, tipo);
        // Consistente: h(u) ≤ peso(u, v) + h(v), en los dos sentidos.
        for (const { a, b, peso } of grafo.aristas) {
          assert.ok(Math.abs(h[a] - h[b]) <= peso + TOLERANCIA, `caso ${caso} ${tipo}: ${a}–${b}`);
        }
        // Admisible: nunca estima más que el costo real.
        for (const id of ids) {
          assert.ok(h[id] <= referencia[id][destino] + TOLERANCIA, `caso ${caso} ${tipo}: ${id}`);
        }
      }
    }
  });
});

describe("A*", () => {
  it("encuentra el camino más corto del mapa de A a L", () => {
    const { resultado } = aEstrella(mapa, { origen: "A", destino: "L" });
    assert.equal(resultado.costo, 97);
    assert.equal(resultado.costo, dijkstra(mapa, { origen: "A", destino: "L" }).resultado.costo);
    revisarRuta(mapa, resultado);
    assert.equal(costoDeRuta(mapa, resultado), 97);
  });

  it("en el mapa cierra menos nodos que Dijkstra", () => {
    const conBrujula = aEstrella(mapa, { origen: "A", destino: "L" });
    const sinBrujula = dijkstra(mapa, { origen: "A", destino: "L" });
    assert.ok(conBrujula.metricas.nodosCerrados < sinBrujula.metricas.nodosCerrados);
    assert.ok(conBrujula.pasos.length < sinBrujula.pasos.length);
  });

  it("con h = 0 hace exactamente lo mismo que Dijkstra", () => {
    for (const grafo of [clasico, mapa, islas]) {
      const sinH = aEstrella(grafo, { origen: "A", destino: "G", heuristica: "cero" });
      const referencia = dijkstra(grafo, { origen: "A", destino: "G" });
      assert.deepEqual(sinH.metricas, referencia.metricas);
      assert.deepEqual(sinH.resultado.ruta, referencia.resultado.ruta);
      assert.deepEqual(sinH.resultado.g, referencia.resultado.dist);
      assert.deepEqual(
        sinH.pasos.map(({ tipo, nodo, vecino }) => [tipo, nodo, vecino]),
        referencia.pasos.map(({ tipo, nodo, vecino }) => [tipo, nodo, vecino])
      );
    }
  });

  it("f siempre es g + h", () => {
    const { pasos } = aEstrella(mapa, { origen: "A", destino: "L" });
    for (const paso of pasos) {
      for (const id of Object.keys(paso.g)) {
        if (paso.g[id] === null) assert.equal(paso.f[id], null);
        else assert.equal(paso.f[id], paso.g[id] + paso.h[id]);
      }
    }
  });

  it("acepta una heurística ya calculada", () => {
    const heuristica = crearHeuristica(mapa, "L", "manhattan");
    const { resultado } = aEstrella(mapa, { origen: "A", destino: "L", heuristica });
    assert.equal(resultado.costo, 97);
    assert.equal(resultado.heuristica.tipo, "manhattan");
  });

  it("avisa cuando no hay camino", () => {
    const { resultado } = aEstrella(islas, { origen: "A", destino: "G" });
    assert.equal(resultado.alcanzado, false);
    assert.equal(resultado.ruta, null);
  });

  it("origen y destino iguales: costo 0", () => {
    const { resultado } = aEstrella(mapa, { origen: "D", destino: "D" });
    assert.deepEqual(resultado.ruta, ["D"]);
    assert.equal(resultado.costo, 0);
  });

  it("necesita origen y destino", () => {
    assert.throws(() => aEstrella(mapa, { origen: "A" }), ErrorDeGrafo);
    assert.throws(() => aEstrella(mapa, { destino: "L" }), ErrorDeGrafo);
    assert.throws(() => aEstrella(mapa, { origen: "A", destino: "Z" }), ErrorDeGrafo);
  });

  it("da el mismo costo que Floyd–Warshall en 600 grafos al azar, con las tres heurísticas", () => {
    const azar = crearAzar(31337);
    for (let caso = 0; caso < 600; caso++) {
      const grafo =
        caso % 2 === 0
          ? grafoDePrueba(azar, {
              nodos: 2 + Math.floor(azar() * 10),
              probabilidad: 0.15 + azar() * 0.6,
              pesoMaximo: caso % 4 === 0 ? 3 : 20,
            })
          : grafoAleatorio({ nodos: 4 + (caso % 11), semilla: caso * 13 });
      const ids = grafo.nodos.map(({ id }) => id);
      const origen = ids[Math.floor(azar() * ids.length)];
      const destino = ids[Math.floor(azar() * ids.length)];
      const referencia = distanciasDeReferencia(grafo)[origen][destino];

      for (const heuristica of TIPOS) {
        const { resultado, metricas } = aEstrella(grafo, { origen, destino, heuristica });
        if (Number.isFinite(referencia)) {
          assert.equal(resultado.costo, referencia, `caso ${caso} ${heuristica}`);
          revisarRuta(grafo, resultado);
        } else {
          assert.equal(resultado.alcanzado, false, `caso ${caso} ${heuristica}`);
        }
        // Cada nodo se cierra una sola vez.
        assert.ok(metricas.nodosCerrados <= ids.length);
      }
    }
  });
});
