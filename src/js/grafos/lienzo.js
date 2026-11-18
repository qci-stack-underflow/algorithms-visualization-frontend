// Dibujo del grafo en SVG.
// `dibujar(grafo)` crea los elementos una sola vez y `pintar(paso, …)` solo
// les cambia clases y textos, así las transiciones de CSS animan el cambio
// entre un paso y otro.
import { ALTO_LIENZO, ANCHO_LIENZO } from "./ejemplos.js";

const SVG = "http://www.w3.org/2000/svg";
const RADIO = 30;
const ALTO_ETIQUETA = 28;
// Espacio extra abajo para el valor que se escribe bajo los nodos del borde.
const ALTO_VISTA = ALTO_LIENZO + 20;
// Lugares de la arista (0 = un extremo, 1 = el otro) donde se intenta poner
// el peso, del preferido al último recurso.
const LUGARES_DEL_PESO = [0.5, 0.4, 0.6, 0.32, 0.68, 0.25, 0.75];

function crear(nombre, atributos = {}, padre = null) {
  const elemento = document.createElementNS(SVG, nombre);
  for (const [clave, valor] of Object.entries(atributos)) elemento.setAttribute(clave, valor);
  padre?.appendChild(elemento);
  return elemento;
}

// Recuadro redondeado con un texto centrado en (0, 0).
function crearEtiqueta(padre, clase, texto, ancho) {
  const grupo = crear("g", { class: clase }, padre);
  const caja = crear(
    "rect",
    { x: -ancho / 2, y: -ALTO_ETIQUETA / 2, width: ancho, height: ALTO_ETIQUETA, rx: 8 },
    grupo
  );
  const letras = crear("text", {}, grupo);
  letras.textContent = texto;
  return { grupo, caja, letras };
}

const anchoDeTexto = (texto, porLetra = 12.5) => Math.max(36, texto.length * porLetra + 16);

const seEnciman = (p, q) =>
  Math.abs(p.x - q.x) < (p.ancho + q.ancho) / 2 + 4 && Math.abs(p.y - q.y) < ALTO_ETIQUETA + 4;

/* Etiquetas alrededor de un nodo (su valor y su papel de origen o destino) */

const ABAJO = Math.PI / 2;
const ARRIBA = -Math.PI / 2;
const DIRECCIONES = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8);
// Separación mínima con una arista para usar la dirección preferida.
const ANGULO_LIBRE = (38 * Math.PI) / 180;
const SEPARACION = 9; // entre el círculo y la etiqueta
const ANCHO_VALOR = 60; // anchos típicos, para reservar el lugar
const ANCHO_PAPEL = 92;

// Diferencia entre dos direcciones, entre 0 y π.
const separacion = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// Centro de una etiqueta de ese ancho puesta junto al nodo en esa dirección.
function lugarJuntoAlNodo(nodo, direccion, ancho) {
  return {
    x: nodo.x + Math.cos(direccion) * (RADIO + SEPARACION + ancho / 2),
    y: nodo.y + Math.sin(direccion) * (RADIO + SEPARACION + ALTO_ETIQUETA / 2),
    ancho,
  };
}

const cabeEnElLienzo = ({ x, y, ancho }) =>
  x - ancho / 2 >= 2 &&
  x + ancho / 2 <= ANCHO_LIENZO - 2 &&
  y - ALTO_ETIQUETA / 2 >= 2 &&
  y + ALTO_ETIQUETA / 2 <= ALTO_VISTA - 2;

// Hacia dónde poner una etiqueta junto al nodo para que no quede sobre sus
// aristas: la dirección preferida si está despejada y, si no, la que quede
// más lejos de todas las aristas (y de las etiquetas ya puestas).
// `estorbos` son etiquetas ya puestas junto al mismo nodo: no se enciman.
function direccionLibre(nodo, ocupadas, preferida, ancho, estorbos = []) {
  const despeje = (direccion) => Math.min(Math.PI, ...ocupadas.map((o) => separacion(direccion, o)));
  const cabe = (direccion) => {
    const lugar = lugarJuntoAlNodo(nodo, direccion, ancho);
    return cabeEnElLienzo(lugar) && !estorbos.some((estorbo) => seEnciman(lugar, estorbo));
  };
  if (despeje(preferida) >= ANGULO_LIBRE && cabe(preferida)) return preferida;

  let mejor = preferida;
  let mejorDespeje = -1;
  for (const direccion of DIRECCIONES) {
    if (!cabe(direccion)) continue;
    // Entre dos igual de despejadas, gana la más cercana a la preferida.
    const valor = despeje(direccion) - separacion(direccion, preferida) * 1e-3;
    if (valor > mejorDespeje) [mejor, mejorDespeje] = [direccion, valor];
  }
  return mejor;
}

// Dirección del valor y del papel de cada nodo.
function ubicarEtiquetas(grafo, posicion) {
  return new Map(
    grafo.nodos.map((nodo) => {
      const aristas = (grafo.adyacencia.get(nodo.id) ?? []).map(({ nodo: vecino }) => {
        const otro = posicion.get(vecino);
        return Math.atan2(otro.y - nodo.y, otro.x - nodo.x);
      });
      const valor = direccionLibre(nodo, aristas, ABAJO, ANCHO_VALOR);
      const papel = direccionLibre(nodo, aristas, ARRIBA, ANCHO_PAPEL, [
        lugarJuntoAlNodo(nodo, valor, ANCHO_VALOR),
      ]);
      return [nodo.id, { valor, papel }];
    })
  );
}

// Busca dónde poner el peso de cada arista sin tapar un nodo, el valor de
// un nodo ni otro peso.
function ubicarPesos(grafo, posicion, direcciones) {
  const ocupados = grafo.nodos.flatMap((nodo) => [
    { x: nodo.x, y: nodo.y, ancho: 2 * RADIO },
    lugarJuntoAlNodo(nodo, direcciones.get(nodo.id).valor, ANCHO_VALOR),
  ]);
  return grafo.aristas.map(({ a, b, peso }) => {
    const [p, q] = [posicion.get(a), posicion.get(b)];
    const ancho = anchoDeTexto(String(peso));
    const candidatos = LUGARES_DEL_PESO.map((t) => ({
      x: p.x + (q.x - p.x) * t,
      y: p.y + (q.y - p.y) * t,
      ancho,
    }));
    const lugar = candidatos.find((c) => !ocupados.some((o) => seEnciman(c, o))) ?? candidatos[0];
    ocupados.push(lugar);
    return lugar;
  });
}

export function crearLienzo(svg, { alElegirNodo }) {
  let nodos = new Map(); // id → { grupo, valor, papel }
  let aristas = new Map(); // id → { grupo, peso, a, b, lugar }
  let seleccionable = false;

  svg.setAttribute("viewBox", `0 0 ${ANCHO_LIENZO} ${ALTO_VISTA}`);

  const elegir = (evento) => {
    if (!seleccionable) return;
    const id = evento.target.closest?.("[data-nodo]")?.dataset.nodo;
    if (id === undefined) return;
    if (evento.type === "keydown") {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault(); // Espacio no debe desplazar la página
    }
    alElegirNodo(id);
  };
  svg.addEventListener("click", elegir);
  svg.addEventListener("keydown", elegir);

  function dibujar(grafo) {
    svg.replaceChildren();
    nodos = new Map();
    aristas = new Map();

    const posicion = new Map(grafo.nodos.map((nodo) => [nodo.id, nodo]));
    const capaAristas = crear("g", {}, svg);
    const capaPesos = crear("g", {}, svg);
    const capaNodos = crear("g", {}, svg);

    const direcciones = ubicarEtiquetas(grafo, posicion);
    const lugares = ubicarPesos(grafo, posicion, direcciones);
    grafo.aristas.forEach(({ id, a, b, peso }, i) => {
      const [p, q] = [posicion.get(a), posicion.get(b)];
      const grupo = crear("g", { class: "gr-arista", "data-arista": id }, capaAristas);
      crear("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y }, grupo);
      // Puntos que avanzan por la arista cuando es parte de la ruta que se
      // está considerando (ver `propuesta` en pintar).
      crear("line", { class: "gr-arista-propuesta", x1: p.x, y1: p.y, x2: q.x, y2: q.y }, grupo);

      const etiqueta = crearEtiqueta(capaPesos, "gr-peso", String(peso), lugares[i].ancho);
      etiqueta.grupo.setAttribute("transform", `translate(${lugares[i].x} ${lugares[i].y})`);
      aristas.set(id, { grupo, peso: etiqueta.grupo, a, b, lugar: lugares[i] });
    });

    for (const nodo of grafo.nodos) {
      const { id, x, y } = nodo;
      const grupo = crear(
        "g",
        { class: "gr-nodo", "data-nodo": id, transform: `translate(${x} ${y})` },
        capaNodos
      );
      crear("circle", { class: "gr-nodo-foco", r: RADIO + 14 }, grupo);
      crear("circle", { class: "gr-nodo-halo", r: RADIO + 7 }, grupo);
      crear("circle", { class: "gr-nodo-circulo", r: RADIO }, grupo);
      const nombre = crear("text", { class: "gr-nodo-nombre" }, grupo);
      nombre.textContent = id;
      // Los nombres largos se achican para caber en el círculo.
      if (id.length > 2) nombre.style.fontSize = id.length === 3 ? "19px" : "15px";

      const papel = crearEtiqueta(grupo, "gr-nodo-papel", "", ANCHO_PAPEL);
      papel.caja.setAttribute("rx", ALTO_ETIQUETA / 2);
      const valor = crearEtiqueta(grupo, "gr-nodo-valor", "", ANCHO_VALOR);

      nodos.set(id, { nodo, grupo, papel, valor, direcciones: direcciones.get(id) });
    }
    permitirElegir(seleccionable);
  }

  // Escribe el texto de una etiqueta y la coloca junto a su nodo, en la
  // dirección reservada y a la distancia que pide su ancho.
  function escribir(etiqueta, nodo, direccion, texto, porLetra) {
    const ancho = anchoDeTexto(texto, porLetra);
    const lugar = lugarJuntoAlNodo(nodo, direccion, ancho);
    etiqueta.letras.textContent = texto;
    etiqueta.caja.setAttribute("x", -ancho / 2);
    etiqueta.caja.setAttribute("width", ancho);
    // El grupo del nodo ya está trasladado a (x, y): aquí va solo la diferencia.
    etiqueta.grupo.setAttribute("transform", `translate(${lugar.x - nodo.x} ${lugar.y - nodo.y})`);
  }

  // Los nodos son botones solo cuando elegirlos sirve de algo.
  function permitirElegir(permitido) {
    seleccionable = permitido;
    for (const { grupo } of nodos.values()) {
      if (permitido) {
        grupo.setAttribute("role", "button");
        grupo.setAttribute("tabindex", "0");
      } else {
        grupo.setAttribute("role", "img");
        grupo.removeAttribute("tabindex");
      }
    }
  }

  // paso      foto del algoritmo (ver registro.js)
  // papeles   { idNodo: "origen" | "destino" | "inicio" | … }
  // valores   { idNodo: texto } para el recuadro bajo cada nodo, o null si
  //           el algoritmo no tiene un valor por nodo
  // describir (id) → texto para lectores de pantalla
  // propuesta ruta que se está considerando, { tono, tramos: [{ arista,
  //           desde, hacia }] } (ver explicaciones.js), o null
  function pintar(
    paso,
    { papeles = {}, valores = null, describir = (id) => id, propuesta = null } = {}
  ) {
    svg.dataset.tipo = paso.tipo;
    const enRuta = new Set(paso.ruta ?? []);
    const aristasEnRuta = new Set(paso.aristasRuta ?? []);

    for (const [id, { nodo, grupo, papel, valor, direcciones }] of nodos) {
      grupo.dataset.estado = paso.nodos[id];
      grupo.classList.toggle("is-foco", id === paso.nodo);
      grupo.classList.toggle("is-vecino", id === paso.vecino);
      grupo.classList.toggle("is-ruta", enRuta.has(id));
      grupo.setAttribute("aria-label", describir(id));

      const textoPapel = papeles[id] ?? "";
      papel.grupo.style.display = textoPapel ? "" : "none";
      if (textoPapel) escribir(papel, nodo, direcciones.papel, textoPapel, 9.5);

      valor.grupo.style.display = valores ? "" : "none";
      if (valores) {
        const texto = valores[id];
        escribir(valor, nodo, direcciones.valor, texto, 11.5);
        valor.grupo.classList.toggle("is-vacio", texto === "∞");
        valor.grupo.classList.toggle("is-cambio", paso.tipo === "relajar" && id === paso.vecino);
      }
    }

    const tramos = new Map((propuesta?.tramos ?? []).map((tramo) => [tramo.arista, tramo]));
    for (const [id, { grupo, peso, a }] of aristas) {
      for (const elemento of [grupo, peso]) {
        elemento.dataset.estado = paso.aristas[id];
        elemento.classList.toggle("is-foco", id === paso.arista);
        elemento.classList.toggle("is-ruta", aristasEnRuta.has(id));
      }
      const tramo = tramos.get(id);
      if (tramo) {
        grupo.dataset.propuesta = propuesta.tono;
        // Los puntos avanzan de `desde` a `hacia`; la línea va de a a b.
        grupo.dataset.sentido = tramo.desde === a ? "directo" : "inverso";
      } else {
        delete grupo.dataset.propuesta;
        delete grupo.dataset.sentido;
      }
    }
  }

  // Posiciones en unidades del dibujo (viewBox) para colocar el globo.
  //   nodos    [{ id, x, y, valor: { x, y, ancho } }] (valor: su recuadro)
  //   aristas  [{ id, x1, y1, x2, y2, peso: { x, y, ancho } }]
  //   punto(ancla)  a dónde apunta el globo y a qué distancia empieza lo
  //                 que no se debe tapar (el radio del nodo, medio peso…)
  function geometria() {
    const listaNodos = [...nodos].map(([id, { nodo, direcciones }]) => ({
      id,
      x: nodo.x,
      y: nodo.y,
      valor: lugarJuntoAlNodo(nodo, direcciones.valor, ANCHO_VALOR),
    }));
    const posicion = new Map(listaNodos.map((nodo) => [nodo.id, nodo]));
    const listaAristas = [...aristas].map(([id, { a, b, lugar }]) => {
      const [p, q] = [posicion.get(a), posicion.get(b)];
      return { id, x1: p.x, y1: p.y, x2: q.x, y2: q.y, peso: lugar };
    });

    function punto(ancla) {
      if (ancla?.tipo === "arista" && aristas.has(ancla.id)) {
        const { lugar } = aristas.get(ancla.id);
        return { x: lugar.x, y: lugar.y, radio: ALTO_ETIQUETA / 2 };
      }
      const nodo = posicion.get(ancla?.id);
      return nodo ? { x: nodo.x, y: nodo.y, radio: RADIO } : null;
    }

    return {
      ancho: ANCHO_LIENZO,
      alto: ALTO_VISTA,
      radio: RADIO,
      altoEtiqueta: ALTO_ETIQUETA,
      nodos: listaNodos,
      aristas: listaAristas,
      punto,
    };
  }

  return { dibujar, pintar, permitirElegir, geometria };
}
