// Vista binaria: el encabezado del .suf, la frase de ejemplo (`preview`) y
// los bits de los datos en filas de 8 bytes. La lista está virtualizada: solo
// se dibujan las filas que se ven (el .suf del Quijote tiene más de un
// millón de bytes, unas 146 mil filas).
import { mostrarSimbolo, nombrarSimbolo, numero } from "./formato.js";
import { ErrorSuf, leerSuf } from "./suf.js";

const BYTES_POR_FILA = 8;
// Filas de más arriba y abajo de las visibles, para que al recorrer rápido
// no se vean huecos.
const FILAS_EXTRA = 12;
const BITS = Array.from({ length: 256 }, (_, byte) => byte.toString(2).padStart(8, "0"));

let mostrado = { resultado: null, bytes: null };
let lista = null; // { datos, relleno, filas, digitos, alto, rango }
let cuadroPendiente = 0;

const en = (selector) => document.querySelector(`#binario ${selector}`);

function elemento(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function llenarFrase(preview) {
  const panel = en("[data-frase]");
  if (!preview?.tokens?.length) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  en("[data-frase-titulo]").textContent = `Así se codifica «${preview.text}»`;
  en("[data-frase-fichas]").replaceChildren(
    ...preview.tokens.map(({ char, code }) => {
      const letra = document.createElement("b");
      const nombre = nombrarSimbolo(char);
      if (nombre) {
        const signo = elemento("span", "", mostrarSimbolo(char));
        signo.setAttribute("aria-hidden", "true");
        letra.append(signo, elemento("span", "visually-hidden", nombre));
      } else {
        letra.textContent = char;
      }
      const ficha = elemento("span", "frase-ficha");
      ficha.append(letra, elemento("code", "", code));
      return ficha;
    })
  );
  const bitsOriginales = new TextEncoder().encode(preview.text).length * 8;
  en("[data-frase-total]").textContent =
    `${numero([...preview.text].length)} caracteres: ${numero(bitsOriginales)} bits en el ` +
    `texto original y ${numero(preview.encodedBits.length)} con Huffman.`;
}

function llenarEncabezado(suf, tamanoArchivo) {
  const { encabezado, bytesEncabezado, datos, bitsDatos } = suf;
  en("[data-binario-resumen]").textContent =
    `${numero(tamanoArchivo)} bytes · ${numero(bitsDatos)} bits de datos`;
  en("[data-bits-encabezado]").textContent = `Encabezado · ${numero(bytesEncabezado)} bytes`;
  en("[data-bits-datos]").textContent = `Datos · ${numero(datos.length)} bytes`;
  const relleno = en("[data-bits-relleno]");
  relleno.textContent = `Relleno · ${encabezado.paddingBits} ${encabezado.paddingBits === 1 ? "bit" : "bits"}`;
  relleno.hidden = encabezado.paddingBits === 0;

  const campos = {
    firma: encabezado.magic,
    caracteres: numero(encabezado.totalCharacters),
    simbolos: numero(encabezado.symbolCount),
    relleno: `${encabezado.paddingBits} ${encabezado.paddingBits === 1 ? "bit" : "bits"}`,
    titulo: encabezado.title,
  };
  Object.entries(campos).forEach(([campo, valor]) => {
    en(`[data-suf="${campo}"]`).textContent = valor;
  });
  en("[data-suf-encabezado]").hidden = false;
}

// Una fila: posición del primer byte (dentro de los datos) y sus 8 bytes en
// bits. Al final del último byte van los bits de relleno, marcados.
function htmlDeFila(indice) {
  const inicio = indice * BYTES_POR_FILA;
  const fin = Math.min(inicio + BYTES_POR_FILA, lista.datos.length);
  const grupos = [];
  for (let byte = inicio; byte < fin; byte += 1) grupos.push(BITS[lista.datos[byte]]);
  let bits = grupos.join(" ");
  if (fin === lista.datos.length && lista.relleno > 0) {
    bits =
      `${bits.slice(0, -lista.relleno)}` +
      `<span class="bits-relleno" title="Bits de relleno">${bits.slice(-lista.relleno)}</span>`;
  }
  const posicion = String(inicio).padStart(lista.digitos, "0");
  return `<li><span class="bits-offset">${posicion}</span><span class="bits-fila">${bits}</span></li>`;
}

function pintarFilas() {
  if (!lista) return;
  const ventana = en("[data-bits-ventana]");
  const { alto } = lista;
  // Oculta (display: none) mide 0: se dibuja como si midiera 480 px.
  const altoVisible = ventana.clientHeight || 480;
  const primeraVisible = Math.floor(ventana.scrollTop / alto);
  const ultimaVisible = Math.min(lista.filas, Math.ceil((ventana.scrollTop + altoVisible) / alto));

  const desde = Math.max(0, primeraVisible - FILAS_EXTRA);
  const hasta = Math.min(lista.filas, ultimaVisible + FILAS_EXTRA);
  if (lista.rango?.desde !== desde || lista.rango?.hasta !== hasta) {
    let html = "";
    for (let fila = desde; fila < hasta; fila += 1) html += htmlDeFila(fila);
    const ol = en("[data-bits-lista]");
    ol.innerHTML = html; // solo ceros, unos, números y el span del relleno
    ol.style.transform = `translateY(${desde * alto}px)`;
    lista.rango = { desde, hasta };
  }

  en("[data-bits-pie]").textContent = lista.filas
    ? `Filas ${numero(Math.min(primeraVisible + 1, lista.filas))}–${numero(ultimaVisible)} ` +
      `de ${numero(lista.filas)} · 8 bytes por fila`
    : "El archivo no tiene datos comprimidos.";
}

function prepararLista(suf) {
  const ventana = en("[data-bits-ventana]");
  ventana.hidden = false;
  ventana.classList.add("is-virtual");
  en("[data-bits-pie]").classList.remove("is-error");

  const filas = Math.ceil(suf.datos.length / BYTES_POR_FILA);
  const ultimaPosicion = Math.max(0, (filas - 1) * BYTES_POR_FILA);
  lista = {
    datos: suf.datos,
    relleno: suf.encabezado.paddingBits,
    filas,
    digitos: Math.max(6, String(ultimaPosicion).length),
    // El alto de cada fila sale del CSS (--alto-fila en .bits-ventana).
    alto: Number.parseFloat(getComputedStyle(ventana).getPropertyValue("--alto-fila")) || 26,
    rango: null,
  };
  // Un libro de 6 MB (el máximo) da unas 450 mil filas: cabe en el alto
  // máximo de un elemento en Chrome y Firefox.
  en("[data-bits-espacio]").style.height = `${filas * lista.alto}px`;
  ventana.scrollTop = 0;
  pintarFilas();
}

function mostrarFalloDeFormato(mensaje) {
  lista = null;
  en("[data-bits-ventana]").hidden = true;
  en("[data-suf-encabezado]").hidden = true;
  const pie = en("[data-bits-pie]");
  pie.textContent = `No se pudieron leer los bits: ${mensaje}`;
  pie.classList.add("is-error");
}

// Llena la vista con el HuffmanResult y los bytes del .suf (ArrayBuffer).
export function llenarBinario(resultado, bytes) {
  // Al volver a esta vista con el mismo libro solo se redibujan las filas.
  if (resultado === mostrado.resultado && bytes === mostrado.bytes) {
    pintarFilas();
    return;
  }
  mostrado = { resultado, bytes };
  llenarFrase(resultado.preview);

  let suf;
  try {
    suf = leerSuf(bytes);
  } catch (error) {
    if (!(error instanceof ErrorSuf)) throw error;
    mostrarFalloDeFormato(error.message);
    return;
  }
  llenarEncabezado(suf, bytes.byteLength);
  prepararLista(suf);
}

export function iniciarBinario() {
  const ventana = en("[data-bits-ventana]");
  if (!ventana) return;
  // Un dibujo por cuadro aunque lleguen muchos eventos de scroll.
  const alMoverse = () => {
    if (cuadroPendiente) return;
    cuadroPendiente = requestAnimationFrame(() => {
      cuadroPendiente = 0;
      pintarFilas();
    });
  };
  ventana.addEventListener("scroll", alMoverse, { passive: true });
  window.addEventListener("resize", alMoverse);
}
