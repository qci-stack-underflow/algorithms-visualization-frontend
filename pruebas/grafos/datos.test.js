// Ejemplos, grafos generados al azar y grafos escritos a mano.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALTO_LIENZO,
  ANCHO_LIENZO,
  EJEMPLOS,
  ejemploPorId,
  pesoPorDistancia,
} from "../../src/js/grafos/ejemplos.js";
import { MAX_NODOS, MIN_NODOS, crearAzar, grafoAleatorio } from "../../src/js/grafos/generador.js";
import { ErrorDeGrafo, esConexo, tieneNodo } from "../../src/js/grafos/grafo.js";
import { crearHeuristica } from "../../src/js/grafos/heuristica.js";
import {
  MAX_ARISTAS_TEXTO,
  MAX_NODOS_TEXTO,
  grafoATexto,
  leerGrafo,
} from "../../src/js/grafos/texto.js";

const dentroDelLienzo = ({ x, y }) => x >= 30 && x <= ANCHO_LIENZO - 30 && y >= 30 && y <= ALTO_LIENZO - 30;

describe("Ejemplos", () => {
  it("tienen ids distintos, origen y destino válidos y caben en el lienzo", () => {
    assert.equal(new Set(EJEMPLOS.map(({ id }) => id)).size, EJEMPLOS.length);
    for (const { id, grafo, origen, destino, nombre, nota } of EJEMPLOS) {
      assert.ok(tieneNodo(grafo, origen), id);
      assert.ok(tieneNodo(grafo, destino), id);
      assert.notEqual(origen, destino, id);
      assert.ok(nombre && nota, id);
      assert.ok(grafo.nodos.every(dentroDelLienzo), id);
    }
  });

  it("todos son conexos menos «islas»", () => {
    for (const { id, grafo } of EJEMPLOS) assert.equal(esConexo(grafo), id !== "islas", id);
  });

  it("ningún nodo queda encima de otro", () => {
    for (const { id, grafo } of EJEMPLOS) {
      grafo.nodos.forEach((p, i) =>
        grafo.nodos.slice(i + 1).forEach((q) => {
          assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 90, `${id}: ${p.id} y ${q.id}`);
        })
      );
    }
  });

  it("en el mapa cada peso es el largo de la arista, y la heurística queda casi a escala", () => {
    const { grafo } = ejemploPorId("mapa");
    const posicion = Object.fromEntries(grafo.nodos.map((nodo) => [nodo.id, nodo]));
    for (const { a, b, peso } of grafo.aristas) {
      assert.equal(peso, pesoPorDistancia(posicion[a], posicion[b]));
    }
    const { escala } = crearHeuristica(grafo, "L");
    assert.ok(escala >= 0.1 && escala < 0.11, `escala ${escala}`);
  });

  it("ejemploPorId devuelve null si no existe", () => {
    assert.equal(ejemploPorId("nada"), null);
  });
});

describe("grafoAleatorio", () => {
  it("con la misma semilla da el mismo grafo, y con otra uno distinto", () => {
    const uno = grafoAleatorio({ nodos: 9, semilla: 5 });
    const dos = grafoAleatorio({ nodos: 9, semilla: 5 });
    const otro = grafoAleatorio({ nodos: 9, semilla: 6 });
    assert.deepEqual(uno.nodos, dos.nodos);
    assert.deepEqual(uno.aristas, dos.aristas);
    assert.notDeepEqual(uno.nodos, otro.nodos);
  });

  it("siempre es conexo, cabe en el lienzo y se puede leer (500 semillas)", () => {
    for (let semilla = 0; semilla < 500; semilla++) {
      const cantidad = MIN_NODOS + (semilla % (MAX_NODOS - MIN_NODOS + 1));
      const grafo = grafoAleatorio({ nodos: cantidad, semilla });
      const etiqueta = `semilla ${semilla}`;
      assert.equal(grafo.nodos.length, cantidad, etiqueta);
      assert.ok(esConexo(grafo), etiqueta);
      assert.ok(grafo.nodos.every(dentroDelLienzo), etiqueta);
      assert.ok(grafo.aristas.length >= cantidad - 1, etiqueta);
      assert.ok(grafo.aristas.length <= 3 * cantidad, etiqueta);
      // Nodos separados para que no se encimen los círculos.
      grafo.nodos.forEach((p, i) =>
        grafo.nodos.slice(i + 1).forEach((q) => {
          assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 85, `${etiqueta}: ${p.id} y ${q.id}`);
        })
      );
      // Ningún peso es menor que la línea recta: la heurística de A* sirve.
      const posicion = Object.fromEntries(grafo.nodos.map((nodo) => [nodo.id, nodo]));
      for (const { a, b, peso } of grafo.aristas) {
        assert.ok(peso >= pesoPorDistancia(posicion[a], posicion[b]), etiqueta);
        assert.ok(Number.isInteger(peso) && peso > 0, etiqueta);
      }
    }
  });

  it("ajusta la cantidad de nodos a los límites", () => {
    assert.equal(grafoAleatorio({ nodos: 1 }).nodos.length, MIN_NODOS);
    assert.equal(grafoAleatorio({ nodos: 99 }).nodos.length, MAX_NODOS);
    assert.equal(grafoAleatorio({ nodos: "x" }).nodos.length, MIN_NODOS);
  });

  it("crearAzar da valores en [0, 1) y repetibles", () => {
    const a = crearAzar(3);
    const b = crearAzar(3);
    for (let i = 0; i < 1000; i++) {
      const valor = a();
      assert.equal(valor, b());
      assert.ok(valor >= 0 && valor < 1);
    }
  });
});

describe("leerGrafo", () => {
  it("lee una arista por línea, con espacios o comas", () => {
    const grafo = leerGrafo("A B 7\nB, C, 2.5\n\n  C   D\t4  \n");
    assert.deepEqual(
      grafo.nodos.map(({ id }) => id),
      ["A", "B", "C", "D"]
    );
    assert.deepEqual(
      grafo.aristas.map(({ id, peso }) => [id, peso]),
      [
        ["A-B", 7],
        ["B-C", 2.5],
        ["C-D", 4],
      ]
    );
  });

  it("una línea con un solo nombre agrega un nodo suelto", () => {
    const grafo = leerGrafo("A B 1\nZ");
    assert.deepEqual(
      grafo.nodos.map(({ id }) => id),
      ["A", "B", "Z"]
    );
    assert.equal(grafo.aristas.length, 1);
  });

  it("reparte los nodos nuevos dentro del lienzo, sin encimarlos", () => {
    const lineas = Array.from({ length: MAX_NODOS_TEXTO - 1 }, (_, i) => `N${i} N${i + 1} 1`);
    const grafo = leerGrafo(lineas.join("\n"));
    assert.equal(grafo.nodos.length, MAX_NODOS_TEXTO);
    assert.ok(grafo.nodos.every(dentroDelLienzo));
    grafo.nodos.forEach((p, i) =>
      grafo.nodos.slice(i + 1).forEach((q) => {
        assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 60, `${p.id} y ${q.id}`);
      })
    );
  });

  it("si solo cambian los pesos, conserva las posiciones y el orden de los nodos", () => {
    const { grafo: original } = ejemploPorId("clasico");
    const texto = grafoATexto(original).replace("A B 7", "B A 70");
    const editado = leerGrafo(`E G 9\n${texto.replace("E G 9\n", "")}`, original);
    assert.deepEqual(editado.nodos, original.nodos);
    assert.equal(editado.aristas.find(({ id }) => id === "A-B").peso, 70);
  });

  it("si aparece un nodo nuevo, vuelve a acomodar todos", () => {
    const { grafo: original } = ejemploPorId("clasico");
    const editado = leerGrafo(`${grafoATexto(original)}\nG H 3`, original);
    assert.equal(editado.nodos.length, 8);
    assert.notDeepEqual(editado.nodos.slice(0, 7), original.nodos);
  });

  it("grafoATexto y leerGrafo son inversos", () => {
    for (const { grafo } of EJEMPLOS) {
      const copia = leerGrafo(grafoATexto(grafo), grafo);
      assert.deepEqual(copia.nodos, grafo.nodos);
      assert.deepEqual(copia.aristas, grafo.aristas);
    }
    const conSuelto = leerGrafo("A B 1\nC");
    assert.equal(grafoATexto(conSuelto), "A B 1\nC");
  });

  const invalidos = {
    "texto vacío": "",
    "solo espacios": "  \n \n",
    "falta el peso": "A B",
    "sobra un dato": "A B 3 4",
    "peso con letras": "A B tres",
    "peso negativo": "A B -2",
    "nodo consigo mismo": "A A 2",
    "arista repetida": "A B 2\nB A 3",
    "nombre con símbolos": "A* B 2",
    "nombre muy largo": "ALFA1 B 2",
    "demasiados nodos": Array.from({ length: MAX_NODOS_TEXTO }, (_, i) => `N${i} N${i + 1} 1`).join("\n"),
  };
  for (const [caso, texto] of Object.entries(invalidos)) {
    it(`rechaza: ${caso}`, () => {
      assert.throws(() => leerGrafo(texto), ErrorDeGrafo);
    });
  }

  it("rechaza más aristas que el máximo", () => {
    const nombres = "ABCDEFGHIJ".split("");
    const lineas = [];
    for (let i = 0; i < nombres.length; i++) {
      for (let j = i + 1; j < nombres.length; j++) lineas.push(`${nombres[i]} ${nombres[j]} 1`);
    }
    assert.ok(lineas.length > MAX_ARISTAS_TEXTO);
    assert.throws(() => leerGrafo(lineas.join("\n")), /aristas/);
  });

  it("el mensaje de error dice en qué línea está el problema", () => {
    assert.throws(() => leerGrafo("A B 1\nB C\nC D 2"), /Línea 2/);
    assert.throws(() => leerGrafo("A B 1\n\nB C x"), /Línea 3/);
  });
});
