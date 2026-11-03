// Tabla de letras del proceso: todos los símbolos del libro, ordenados por
// apariciones o por código, con búsqueda. Al elegir una fila se avisa al
// árbol (bloque D) con el evento `simbolo-seleccionado`, que sube hasta
// document:
//   document.addEventListener("simbolo-seleccionado", (evento) => {
//     evento.detail; // { symbol, code, nodeId } o null si se quitó la selección
//   });
import { leerSimboloMostrado, mostrarSimbolo, nombrarSimbolo, numero } from "./formato.js";

// Dirección con la que empieza cada orden: más apariciones primero, y los
// códigos de izquierda a derecha del árbol (orden alfabético de 0 y 1).
const DIRECCION_INICIAL = { apariciones: "descending", codigo: "ascending" };

let filas = []; // SymbolStat[]: del backend, o leídas de la tabla de ejemplo
let porSimbolo = new Map();
let total = 0; // símbolos del libro (la tabla de ejemplo solo trae 12)
let orden = { campo: "apariciones", direccion: DIRECCION_INICIAL.apariciones };
let seleccionado = null;
let consulta = "";

const tabla = () => document.querySelector("[data-letras]");
const cuerpo = () => document.querySelector("[data-letras-filas]");
const buscador = () => document.querySelector("[data-letras-buscar]");

const sinAcentos = (texto) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Un carácter sin acento encuentra también sus versiones con acento y
// mayúscula ("e" → e, E, é…); con acento, solo ese ("é" → é, É). Dos o más
// ceros y unos buscan códigos que empiecen así; otro texto busca por nombre
// ("espacio", "salto") o por código Unicode ("U+200B").
export function coincide(fila, texto) {
  if (!texto) return true;
  if (!texto.trim()) return fila.symbol === texto[0];

  const buscado = texto.trim().toLowerCase();
  if ([...buscado].length === 1) {
    const simbolo = fila.symbol.toLowerCase();
    if (mostrarSimbolo(fila.symbol) === texto.trim()) return true;
    return sinAcentos(buscado) === buscado ? sinAcentos(simbolo) === buscado : simbolo === buscado;
  }
  if (/^[01]+$/.test(buscado)) return fila.code.startsWith(buscado);

  const nombre = nombrarSimbolo(fila.symbol);
  const base = sinAcentos(buscado);
  return Boolean(nombre && sinAcentos(nombre).includes(base)) || sinAcentos(mostrarSimbolo(fila.symbol)).includes(base);
}

function ordenadas() {
  const signo = orden.direccion === "ascending" ? 1 : -1;
  const porCodigo = (a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
  const comparar =
    orden.campo === "codigo"
      ? (a, b) => signo * porCodigo(a, b)
      : (a, b) => signo * (a.frequency - b.frequency) || porCodigo(a, b);
  return [...filas].sort(comparar);
}

function crearFila(fila, maximo) {
  const tr = document.createElement("tr");
  const elegida = fila.symbol === seleccionado;
  tr.classList.toggle("is-seleccionada", elegida);

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "simbolo";
  boton.tabIndex = -1;
  boton.dataset.simbolo = fila.symbol;
  boton.textContent = mostrarSimbolo(fila.symbol);
  boton.setAttribute("aria-pressed", String(elegida));
  const nombre = nombrarSimbolo(fila.symbol);
  if (nombre) boton.setAttribute("aria-label", nombre);
  const celdaSimbolo = document.createElement("td");
  celdaSimbolo.append(boton);

  // Barra proporcional al símbolo más frecuente del libro
  const frecuencia = document.createElement("span");
  frecuencia.className = "frecuencia";
  frecuencia.style.setProperty("--w", `${((fila.frequency / maximo) * 100).toFixed(1)}%`);
  frecuencia.textContent = numero(fila.frequency);
  const porcentaje = document.createElement("small");
  // Un símbolo raro no aparece "0.0 %": sí está en el libro.
  porcentaje.textContent = fila.percentage < 0.05 ? "< 0.1 %" : `${fila.percentage.toFixed(1)} %`;
  const celdaFrecuencia = document.createElement("td");
  celdaFrecuencia.append(frecuencia, " ", porcentaje);

  const celdaCodigo = document.createElement("td");
  celdaCodigo.className = "codigo";
  celdaCodigo.textContent = fila.code;

  tr.append(celdaSimbolo, celdaFrecuencia, celdaCodigo);
  return tr;
}

const botones = () => [...cuerpo().querySelectorAll("button.simbolo")];

// Solo un botón de la tabla está en el orden del tabulador (el elegido o el
// primero); las flechas se mueven entre filas.
function fijarTabulador(boton) {
  botones().forEach((otro) => {
    otro.tabIndex = otro === boton ? 0 : -1;
  });
}

function pintar() {
  const maximo = Math.max(1, ...filas.map((fila) => fila.frequency));
  const visibles = ordenadas().filter((fila) => coincide(fila, consulta));
  cuerpo().replaceChildren(...visibles.map((fila) => crearFila(fila, maximo)));
  const todos = botones();
  fijarTabulador(todos.find((boton) => boton.dataset.simbolo === seleccionado) ?? todos[0]);

  document.querySelectorAll("[data-orden]").forEach((boton) => {
    const th = boton.closest("th");
    if (boton.dataset.orden === orden.campo) th.setAttribute("aria-sort", orden.direccion);
    else th.removeAttribute("aria-sort");
  });

  const cuenta = document.querySelector("[data-letras-cuenta]");
  if (cuenta) cuenta.textContent = `${numero(total)} símbolos`;

  let pie = "";
  if (consulta) {
    pie = visibles.length
      ? `${numero(visibles.length)} de ${numero(total)} símbolos`
      : `Ningún símbolo coincide con «${consulta.trim() || consulta}»`;
  } else if (filas.length < total) {
    pie = `y ${numero(total - filas.length)} símbolos más`;
  }
  const textoPie = document.querySelector("[data-letras-pie]");
  if (textoPie) textoPie.textContent = pie;
}

function seleccionar(simbolo) {
  seleccionado = seleccionado === simbolo ? null : simbolo;
  cuerpo()
    .querySelectorAll("tr")
    .forEach((tr) => {
      const boton = tr.querySelector("button.simbolo");
      const elegida = boton.dataset.simbolo === seleccionado;
      tr.classList.toggle("is-seleccionada", elegida);
      boton.setAttribute("aria-pressed", String(elegida));
    });

  const fila = porSimbolo.get(seleccionado);
  const detalle = fila ? { symbol: fila.symbol, code: fila.code, nodeId: fila.nodeId ?? null } : null;
  tabla().dispatchEvent(new CustomEvent("simbolo-seleccionado", { bubbles: true, detail: detalle }));
}

function moverFoco(evento) {
  const todos = botones();
  const actual = todos.indexOf(document.activeElement);
  if (actual < 0) return;
  const destino = {
    ArrowDown: Math.min(actual + 1, todos.length - 1),
    ArrowUp: Math.max(actual - 1, 0),
    Home: 0,
    End: todos.length - 1,
  }[evento.key];
  if (destino === undefined) return;
  evento.preventDefault();
  fijarTabulador(todos[destino]);
  todos[destino].focus();
}

function usarFilas(nuevas, cuantas) {
  filas = nuevas;
  porSimbolo = new Map(filas.map((fila) => [fila.symbol, fila]));
  total = cuantas;
}

// Las filas escritas en huffman.html (Don Quijote) mientras no hay backend.
function leerTablaDeEjemplo() {
  const leidas = [...cuerpo().querySelectorAll("tr")].map((tr) => {
    const [simbolo, frecuencia, codigo] = tr.querySelectorAll("td");
    const code = codigo.textContent.trim();
    return {
      symbol: leerSimboloMostrado(simbolo.textContent.trim()),
      frequency: Number(frecuencia.querySelector(".frecuencia").textContent.replace(/\D/g, "")),
      percentage: Number.parseFloat(frecuencia.querySelector("small").textContent),
      code,
      bits: code.length,
      elegida: tr.classList.contains("is-seleccionada"),
    };
  });
  const cuenta = Number.parseInt(document.querySelector("[data-letras-cuenta]")?.textContent, 10);
  usarFilas(leidas, Number.isNaN(cuenta) ? leidas.length : cuenta);
  seleccionado = leidas.find((fila) => fila.elegida)?.symbol ?? null;
}

// Prepara los eventos y vuelve interactiva la tabla de ejemplo.
export function iniciarTabla() {
  if (!tabla()) return;
  leerTablaDeEjemplo();
  pintar();

  cuerpo().addEventListener("click", (evento) => {
    const boton = evento.target.closest("tr")?.querySelector("button.simbolo");
    if (!boton) return;
    fijarTabulador(boton);
    seleccionar(boton.dataset.simbolo);
  });
  cuerpo().addEventListener("keydown", moverFoco);

  buscador()?.addEventListener("input", (evento) => {
    consulta = evento.target.value;
    pintar();
  });

  document.querySelectorAll("[data-orden]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const campo = boton.dataset.orden;
      const direccion =
        orden.campo === campo
          ? orden.direccion === "ascending"
            ? "descending"
            : "ascending"
          : DIRECCION_INICIAL[campo];
      orden = { campo, direccion };
      pintar();
    });
  });
}

// Muestra la tabla completa de un libro (resultado.table del backend).
export function mostrarTabla(table) {
  if (!tabla()) return;
  usarFilas([...table], table.length);
  seleccionado = null;
  consulta = "";
  if (buscador()) buscador().value = "";
  orden = { campo: "apariciones", direccion: DIRECCION_INICIAL.apariciones };
  pintar();
}
