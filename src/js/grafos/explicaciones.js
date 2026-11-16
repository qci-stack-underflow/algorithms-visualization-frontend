// Explicación de un paso para el globo que aparece sobre el dibujo.
//
// describirPaso() dice QUÉ hizo el paso; esto dice POR QUÉ: por qué se saca
// ese nodo de la cola, por qué una ruta mejora o no a la que se tenía. Va
// con números concretos y, cuando hay algo que comparar, con barras.
//
// Devuelve null en los algoritmos que no tienen globo (Kruskal). Si no:
//   ancla      dónde apunta el globo: { tipo: "nodo", id } o
//              { tipo: "arista", id, desde, hacia }
//   tono       "inicio" | "elige" | "mejora" | "descarta" | "final"
//   etiqueta   texto corto del chip ("Mejora", "No conviene"…)
//   titulo     una frase
//   texto      el porqué, en una o dos frases
//   nota       aclaración opcional, más chica
//   barras     [{ nombre, detalle, valor, marca }] o [], para comparar
//              valores (valor null = ∞). marca: "elegida" | "nueva" |
//              "actual" | "descartada" | "otra"
//   resto      cuántos nodos de la cola no caben en las barras
//   propuesta  ruta que se está considerando, para marcarla en el dibujo:
//              { tono, tramos: [{ arista, desde, hacia }] } o null
//
// No usa nada del navegador.
import { formatoNumero as n } from "./descripciones.js";
import { idArista } from "./grafo.js";

const MAX_BARRAS = 4;

// Tramos desde el origen hasta `id` siguiendo `previo` (o `padre`).
function tramosHasta(grafo, previo, id) {
  const tramos = [];
  let actual = id;
  const vistos = new Set();
  while (previo[actual] !== null && previo[actual] !== undefined && !vistos.has(actual)) {
    vistos.add(actual);
    const anterior = previo[actual];
    tramos.unshift({ arista: idArista(grafo, anterior, actual), desde: anterior, hacia: actual });
    actual = anterior;
  }
  return tramos;
}

const tramo = (grafo, desde, hacia) => ({ arista: idArista(grafo, desde, hacia), desde, hacia });

// La cola como estaba justo antes de este paso (el nodo que sale va primero).
const colaPrevia = (pasos, indice) => pasos[indice - 1]?.cola ?? [];

function barrasDeCola(cola, elegido, { detalle = () => "" } = {}) {
  const visibles = cola.slice(0, MAX_BARRAS);
  return {
    barras: visibles.map(({ nodo, prioridad }) => ({
      nombre: nodo,
      detalle: detalle(nodo),
      valor: prioridad,
      marca: nodo === elegido ? "elegida" : "otra",
    })),
    resto: Math.max(0, cola.length - visibles.length),
  };
}

// Otro nodo de la cola con la misma prioridad que el elegido, si lo hay.
const empatado = (cola, elegido) => {
  const valor = cola.find(({ nodo }) => nodo === elegido)?.prioridad;
  return cola.find(({ nodo, prioridad }) => nodo !== elegido && prioridad === valor)?.nodo ?? null;
};

const sinExplicacion = { nota: "", barras: [], resto: 0, propuesta: null };

/* Dijkstra y A*: comparten casi todo, cambia el valor que ordena la cola */

function explicarCamino(algoritmo, grafo, pasos, indice) {
  const paso = pasos[indice];
  const esA = algoritmo === "a-estrella";
  const costo = esA ? paso.g : paso.dist; // lo recorrido desde el origen
  const fin = pasos.at(-1);
  const origen = pasos[0].nodo;
  const destino = fin.destino ?? null;

  if (paso.tipo === "inicio") {
    return {
      ...sinExplicacion,
      ancla: { tipo: "nodo", id: origen },
      tono: "inicio",
      etiqueta: "Inicio",
      titulo: `Se parte de ${origen}`,
      texto: esA
        ? `g = 0 (nada recorrido) y h = ${n(paso.h[origen])} (lo que se estima hasta ${destino}): f = ${n(paso.f[origen])}.`
        : `${origen} está a 0 de sí mismo; los demás, en ∞ porque aún no hay ruta hacia ellos.`,
      nota: esA
        ? "Siempre se sigue por el nodo con la menor f = g + h."
        : "Siempre se sigue por el nodo abierto más cercano al origen.",
    };
  }

  if (paso.tipo === "extraer") {
    const u = paso.nodo;
    const cola = colaPrevia(pasos, indice);
    const otro = empatado(cola, u);
    const segundo = cola.find(({ nodo }) => nodo !== u);
    const esDestino = u === destino;
    const { barras, resto } = barrasDeCola(cola, u, {
      detalle: esA ? (id) => `${n(paso.g[id])} + ${n(paso.h[id])}` : undefined,
    });
    const tramos = tramosHasta(grafo, paso.previo, u);

    let texto;
    if (esA) {
      texto = esDestino
        ? `Es el destino con la menor f (${n(paso.f[u])}): ninguna ruta abierta sale más barata. Fin.`
        : `f = ${n(paso.g[u])} + ${n(paso.h[u])} = ${n(paso.f[u])}: lo recorrido más lo que falta. Es la ruta que promete ser más corta.`;
    } else if (esDestino) {
      texto = `Es el destino y su distancia ${n(costo[u])} ya no puede mejorar. Fin de la búsqueda.`;
    } else if (!segundo) {
      texto = `Es el único en la cola: su distancia ${n(costo[u])} queda fija.`;
    } else {
      texto = `Las demás rutas abiertas cuestan ${n(segundo.prioridad)} o más y los pesos no restan: ${n(costo[u])} ya no puede mejorar.`;
    }

    let nota = "";
    if (otro) {
      nota =
        esA && paso.h[u] < paso.h[otro]
          ? `Empata con ${otro}; gana el que estima menos por recorrer (menor h).`
          : `Empata con ${otro}; gana el que va primero en la lista.`;
    }

    return {
      ancla: { tipo: "nodo", id: u },
      tono: "elige",
      etiqueta: esDestino ? "Destino" : "Se cierra",
      titulo: esA ? `${u} tiene la menor f de la cola` : `${u} es el más cercano de la cola`,
      texto,
      nota,
      barras,
      resto,
      propuesta: tramos.length ? { tono: "elige", tramos } : null,
    };
  }

  if (paso.tipo === "relajar" || paso.tipo === "mantener") {
    const { nodo: u, vecino: v, arista, calculo: c } = paso;
    const antes = pasos[indice - 1];
    const previoAntes = antes.previo[v];
    const mejora = paso.tipo === "relajar";
    const tramos = [...tramosHasta(grafo, paso.previo, u), tramo(grafo, u, v)];
    const ancla = { tipo: "arista", id: arista, desde: u, hacia: v };
    const g = esA ? "g = " : "";
    const suma = `${g}${n(c.base)} + ${n(c.peso)} = ${n(c.total)}`;
    const actual = {
      nombre: previoAntes === null ? "Sin ruta" : `Por ${previoAntes}`,
      detalle: previoAntes === null ? "" : "actual",
      valor: c.anterior,
      marca: "actual",
    };

    if (mejora) {
      const texto =
        c.anterior === null
          ? `Primera ruta hacia ${v}: por ${u} cuesta ${suma}.`
          : `Por ${u} cuesta ${suma}, menos que los ${n(c.anterior)} por ${previoAntes}. ${v} ahora llega por ${u}.`;
      return {
        ancla,
        tono: "mejora",
        etiqueta: "Mejora",
        titulo: `Mejor ruta hacia ${v}`,
        texto,
        nota: esA
          ? `Con lo que falta (h = ${n(c.h)}), promete f = ${n(c.total + c.h)}.`
          : "",
        barras: [
          { nombre: `Por ${u}`, detalle: `${n(c.base)} + ${n(c.peso)}`, valor: c.total, marca: "nueva" },
          actual,
        ],
        resto: 0,
        propuesta: { tono: "mejora", tramos },
      };
    }

    const texto =
      c.total === c.anterior
        ? `Por ${u} cuesta ${suma}, igual que por ${previoAntes}. Con un empate se queda la que había.`
        : `Por ${u} costaría ${suma}; ${v} ya llega con ${n(c.anterior)} por ${previoAntes}. Se queda esa.`;
    return {
      ancla,
      tono: "descarta",
      etiqueta: "No conviene",
      titulo: `Por ${u} no se mejora a ${v}`,
      texto,
      nota: "",
      barras: [
        { nombre: `Por ${u}`, detalle: `${n(c.base)} + ${n(c.peso)}`, valor: c.total, marca: "descartada" },
        actual,
      ],
      resto: 0,
      propuesta: { tono: "descarta", tramos },
    };
  }

  // fin
  const cerrados = Object.values(paso.nodos).filter((estado) => estado === "cerrado").length;
  const total = grafo.nodos.length;
  const cuenta = `Se cerraron ${cerrados} de ${total} nodos.`;

  if (destino === null) {
    return {
      ...sinExplicacion,
      ancla: { tipo: "nodo", id: origen },
      tono: "final",
      etiqueta: "Resultado",
      titulo: `Distancias listas desde ${origen}`,
      texto: `El número bajo cada nodo es su distancia mínima; las aristas verdes dicen por dónde se llega.`,
      nota: cuenta,
    };
  }
  if (!paso.alcanzado) {
    return {
      ...sinExplicacion,
      ancla: { tipo: "nodo", id: destino },
      tono: "descarta",
      etiqueta: "Sin camino",
      titulo: `No se puede llegar a ${destino}`,
      texto: `La cola se vació sin alcanzarlo: ninguna arista lo une con lo que se recorre desde ${origen}.`,
      nota: cuenta,
    };
  }
  return {
    ...sinExplicacion,
    ancla: { tipo: "nodo", id: destino },
    tono: "final",
    etiqueta: "Resultado",
    titulo: `Ruta más corta: ${paso.ruta.join(" → ")}`,
    texto: `Cuesta ${n(paso.costo)}. Se arma de atrás hacia adelante: desde ${destino}, por dónde llegó cada nodo.`,
    nota: cuenta,
  };
}

/* Prim */

function explicarPrim(grafo, pasos, indice) {
  const paso = pasos[indice];
  const origen = pasos[0].nodo;

  if (paso.tipo === "inicio") {
    return {
      ...sinExplicacion,
      ancla: { tipo: "nodo", id: origen },
      tono: "inicio",
      etiqueta: "Inicio",
      titulo: `El árbol empieza en ${origen}`,
      texto: `Aún no tiene aristas. Clave de ${origen} = 0; las demás, ∞.`,
      nota: "La clave de un nodo es el peso de la arista más barata que lo une al árbol.",
    };
  }

  if (paso.tipo === "extraer") {
    const u = paso.nodo;
    if (!paso.arista) {
      return {
        ...sinExplicacion,
        ancla: { tipo: "nodo", id: u },
        tono: "elige",
        etiqueta: "Primer nodo",
        titulo: `${u} es el primer nodo del árbol`,
        texto: `No necesita arista. Ahora se ve qué nodos se pueden unir desde aquí y a qué precio.`,
      };
    }
    const antes = pasos[indice - 1];
    const cola = colaPrevia(pasos, indice);
    const otro = empatado(cola, u);
    const padre = paso.padre[u];
    const { barras, resto } = barrasDeCola(cola, u, {
      detalle: (id) => (antes.padre[id] === null ? "" : `${antes.padre[id]}–${id}`),
    });
    const peso = n(paso.clave[u]);
    return {
      ancla: { tipo: "arista", id: paso.arista, desde: padre, hacia: u },
      tono: "elige",
      etiqueta: "Entra al árbol",
      titulo: `${u} entra con ${padre}–${u} (peso ${peso})`,
      texto:
        cola.length === 1
          ? `Es la única que une el árbol con un nodo de afuera.`
          : `Es la arista más barata entre el árbol y un nodo de afuera.`,
      nota: otro ? `Empata con ${otro}; gana el que va primero en la lista.` : "",
      barras,
      resto,
      propuesta: null,
    };
  }

  if (paso.tipo === "relajar" || paso.tipo === "mantener") {
    const { nodo: u, vecino: v, arista, calculo: c } = paso;
    const padreAntes = pasos[indice - 1].padre[v];
    const ancla = { tipo: "arista", id: arista, desde: u, hacia: v };
    const actual = {
      nombre: padreAntes === null ? "Sin conexión" : `${padreAntes}–${v}`,
      detalle: padreAntes === null ? "" : "actual",
      valor: c.anterior,
      marca: "actual",
    };
    // La diferencia con Dijkstra se aclara solo en la primera comparación.
    const primera = pasos.findIndex(({ tipo }) => tipo === "relajar" || tipo === "mantener");
    const nota = indice === primera ? "Solo cuenta el peso de la arista, no lo recorrido desde el inicio." : "";

    if (paso.tipo === "relajar") {
      return {
        ancla,
        tono: "mejora",
        etiqueta: "Mejora",
        titulo: `${u}–${v} es la conexión más barata para ${v}`,
        texto:
          c.anterior === null
            ? `Primera arista que une a ${v} con el árbol: cuesta ${n(c.peso)}.`
            : `Cuesta ${n(c.peso)}, menos que ${padreAntes}–${v} (${n(c.anterior)}). ${v} ahora se uniría por ${u}.`,
        nota,
        barras: [{ nombre: `${u}–${v}`, detalle: "nueva", valor: c.peso, marca: "nueva" }, actual],
        resto: 0,
        propuesta: { tono: "mejora", tramos: [tramo(grafo, u, v)] },
      };
    }
    return {
      ancla,
      tono: "descarta",
      etiqueta: "No conviene",
      titulo: `${u}–${v} no mejora la conexión de ${v}`,
      texto:
        c.peso === c.anterior
          ? `Cuesta ${n(c.peso)}, igual que ${padreAntes}–${v}. Con un empate se queda la que había.`
          : `Cuesta ${n(c.peso)}; ${v} ya se une con ${padreAntes}–${v}, que cuesta ${n(c.anterior)}.`,
      nota,
      barras: [{ nombre: `${u}–${v}`, detalle: "nueva", valor: c.peso, marca: "descartada" }, actual],
      resto: 0,
      propuesta: { tono: "descarta", tramos: [tramo(grafo, u, v)] },
    };
  }

  // fin
  const aristas = paso.arbol.length;
  return {
    ...sinExplicacion,
    ancla: { tipo: "nodo", id: origen },
    tono: "final",
    etiqueta: "Resultado",
    titulo: paso.conexo ? "Árbol de expansión mínima listo" : `El árbol solo cubre ${paso.nodosEnArbol} nodos`,
    texto: paso.conexo
      ? `${aristas} ${aristas === 1 ? "arista une" : "aristas unen"} los ${grafo.nodos.length} nodos con peso total ${n(paso.pesoTotal)}. Las punteadas costaban más o cerraban un ciclo.`
      : `Los demás nodos no tienen arista que los una con ${origen}. Peso de lo cubierto: ${n(paso.pesoTotal)}.`,
  };
}

const EXPLICADORES = {
  dijkstra: (grafo, pasos, indice) => explicarCamino("dijkstra", grafo, pasos, indice),
  "a-estrella": (grafo, pasos, indice) => explicarCamino("a-estrella", grafo, pasos, indice),
  prim: explicarPrim,
};

export function tieneExplicacion(algoritmo) {
  return Object.hasOwn(EXPLICADORES, algoritmo);
}

export function explicarPaso(algoritmo, grafo, pasos, indice) {
  if (!tieneExplicacion(algoritmo) || !pasos[indice]) return null;
  return EXPLICADORES[algoritmo](grafo, pasos, indice);
}
