// Inspector de archivos .suf (requerimientos, secciones 7 y 8): se carga solo
// el archivo comprimido, sin el .txt original, y se muestra su estructura.
// Después, a petición del usuario, se descomprime, se comprueba la
// integridad y se descarga el texto. Todo pasa en el navegador con suf.js;
// el archivo no se sube a ningún lado.
// Al terminar se dispara `suf-inspeccionado` en document con
// { nombre, encabezado, nodes, rootId }, para que el árbol (bloque D) pueda
// dibujar el árbol reconstruido.
import {
  bytesOriginales,
  compararConOriginal,
  comprobarTexto,
  descomprimir,
  ErrorSuf,
  leerSuf,
  reconstruirArbol,
} from "./suf.js";
import { guardarArchivo } from "./descarga.js";
import { describirAhorro, formatearBytes, mostrarSimbolo, nombrarSimbolo, numero } from "./formato.js";
import { prefiereMenosMovimiento } from "../inicio.js";

const BYTES_POR_FILA = 8;
const FILAS_DE_MUESTRA = 16; // 128 bytes de datos
const BITS = Array.from({ length: 256 }, (_, byte) => byte.toString(2).padStart(8, "0"));

const NOMBRES_DE_SECCION = {
  firma: "Firma",
  caracteres: "Caracteres",
  relleno: "Bits de relleno",
  simbolos: "Símbolos distintos",
  titulo: "Título",
  diccionario: "Diccionario",
  datos: "Datos comprimidos",
};

const en = (selector) => document.querySelector(`#inspector ${selector}`);

// El archivo abierto y, después de descomprimir, su texto.
let abierto = null; // { nombre, suf, arbol }
let recuperado = null; // texto

function elemento(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function ponerCifra(clave, valor, detalle) {
  const cifra = en(`[data-insp-cifra="${clave}"]`);
  cifra.querySelector("dd").textContent = valor;
  cifra.querySelector("span").textContent = detalle;
}

const plural = (cantidad, singular, varios) => `${numero(cantidad)} ${cantidad === 1 ? singular : varios}`;

function llenarCifras(suf, tamanoArchivo, original) {
  const { encabezado, bitsDatos } = suf;
  const { ahorro, reduccion } = describirAhorro(original, tamanoArchivo);
  ponerCifra("original", formatearBytes(original), `${numero(original)} bytes`);
  ponerCifra("comprimido", formatearBytes(tamanoArchivo), `${numero(tamanoArchivo)} bytes`);
  ponerCifra("ahorro", ...ahorro);
  ponerCifra("reduccion", ...reduccion);
  ponerCifra("simbolos", numero(encabezado.symbolCount), plural(encabezado.totalCharacters, "carácter", "caracteres"));
  ponerCifra("bits", numero(bitsDatos), `+ ${plural(encabezado.paddingBits, "bit", "bits")} de relleno`);
}

// Qué guarda cada sección, en palabras.
function contenidoDeSeccion(clave, suf) {
  const { encabezado, bitsDatos } = suf;
  return {
    firma: `«${encabezado.magic}»: identifica el formato y su versión`,
    caracteres: `${numero(encabezado.totalCharacters)} caracteres en el texto original`,
    relleno: `${plural(encabezado.paddingBits, "bit", "bits")} sin datos al final del último byte`,
    simbolos: `${numero(encabezado.symbolCount)} entradas en el diccionario`,
    titulo: `«${encabezado.title}»`,
    diccionario: "símbolo, apariciones y código de cada símbolo",
    datos: `${numero(bitsDatos)} bits del texto codificado`,
  }[clave];
}

function llenarEstructura(suf) {
  const filas = suf.secciones.map(({ clave, inicio, bytes }) => {
    // Lo que guarda cada sección va bajo su nombre, para que la tabla quepa
    // en un celular con solo tres columnas.
    const seccion = elemento("th", "", NOMBRES_DE_SECCION[clave]);
    seccion.scope = "row";
    seccion.append(elemento("small", "", contenidoDeSeccion(clave, suf)));
    const tr = document.createElement("tr");
    tr.append(seccion, elemento("td", "insp-numero", numero(inicio)), elemento("td", "insp-numero", numero(bytes)));
    return tr;
  });
  en("[data-insp-estructura]").replaceChildren(...filas);
}

function llenarDiccionario(encabezado) {
  const total = encabezado.totalCharacters || 1;
  const ordenado = [...encabezado.dictionary].sort((a, b) => b.frequency - a.frequency);
  const filas = ordenado.map(({ symbol, frequency, code }) => {
    const simbolo = elemento("span", "simbolo", mostrarSimbolo(symbol));
    const nombre = nombrarSimbolo(symbol);
    if (nombre) simbolo.setAttribute("aria-label", nombre);
    const celdaSimbolo = document.createElement("td");
    celdaSimbolo.append(simbolo);

    const porcentaje = (frequency / total) * 100;
    const celdaFrecuencia = elemento("td", "", numero(frequency));
    celdaFrecuencia.append(" ", elemento("small", "", porcentaje < 0.05 ? "< 0.1 %" : `${porcentaje.toFixed(1)} %`));

    const tr = document.createElement("tr");
    tr.append(celdaSimbolo, celdaFrecuencia, elemento("td", "codigo", code));
    return tr;
  });
  en("[data-insp-diccionario]").replaceChildren(...filas);
}

function llenarArbol({ nodes, niveles }, k) {
  en("[data-insp-arbol]").textContent =
    `Con los códigos del diccionario se reconstruyó un árbol de ${plural(nodes.length, "nodo", "nodos")} ` +
    `(${plural(k, "hoja", "hojas")}) y ${plural(niveles, "nivel", "niveles")}. Ningún código es prefijo ` +
    "de otro, así que los datos se pueden decodificar sin ambigüedad.";
}

// Las primeras filas de los datos en bits, con la posición del primer byte.
function llenarMuestra(suf) {
  const { datos, encabezado } = suf;
  const filas = Math.min(FILAS_DE_MUESTRA, Math.ceil(datos.length / BYTES_POR_FILA));
  const items = [];
  for (let fila = 0; fila < filas; fila += 1) {
    const inicio = fila * BYTES_POR_FILA;
    const fin = Math.min(inicio + BYTES_POR_FILA, datos.length);
    const li = document.createElement("li");
    li.append(elemento("span", "bits-offset", String(inicio).padStart(6, "0")));
    const bits = elemento("span", "bits-fila");
    const texto = Array.from(datos.subarray(inicio, fin), (byte) => BITS[byte]).join(" ");
    // Si el archivo es tan corto que el último byte se ve, se marca el relleno.
    if (fin === datos.length && encabezado.paddingBits > 0) {
      bits.append(
        texto.slice(0, -encabezado.paddingBits),
        elemento("span", "bits-relleno", texto.slice(-encabezado.paddingBits))
      );
    } else {
      bits.textContent = texto;
    }
    li.append(bits);
    items.push(li);
  }
  en("[data-insp-bits]").replaceChildren(...items);
  en("[data-insp-bits-pie]").textContent = datos.length
    ? `Primeros ${numero(Math.min(filas * BYTES_POR_FILA, datos.length))} ` +
      `de ${plural(datos.length, "byte", "bytes")} de datos`
    : "El archivo no tiene datos comprimidos.";
}

function mostrarError(mensaje) {
  const error = en("[data-insp-error]");
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

async function abrir(archivo) {
  if (!archivo) return;
  mostrarError("");
  const estado = en("[data-insp-estado]");
  estado.textContent = `Leyendo ${archivo.name}…`;

  let suf;
  let arbol;
  try {
    const bytes = await archivo.arrayBuffer();
    suf = leerSuf(bytes);
    arbol = reconstruirArbol(suf.encabezado.dictionary);
  } catch (error) {
    if (!(error instanceof ErrorSuf)) console.error(error);
    estado.textContent = "";
    en("[data-insp-resultado]").hidden = true;
    mostrarError(
      error instanceof ErrorSuf
        ? `No se pudo inspeccionar ${archivo.name}. ${error.message}`
        : `No se pudo leer ${archivo.name}.`
    );
    return;
  }

  const extension = archivo.name.includes(".") ? archivo.name.split(".").pop().toLowerCase() : "";
  en("[data-insp-nombre]").textContent = archivo.name;
  en("[data-insp-formato]").textContent =
    `Extensión ${extension ? `.${extension}` : "sin extensión"} · formato ${suf.encabezado.magic}` +
    (extension && extension !== "suf" ? " (el contenido sí es un .suf)" : "");

  llenarCifras(suf, archivo.size, bytesOriginales(suf.encabezado.dictionary));
  llenarEstructura(suf);
  llenarDiccionario(suf.encabezado);
  llenarArbol(arbol, suf.encabezado.symbolCount);
  llenarMuestra(suf);

  abierto = { nombre: archivo.name, suf, arbol };
  reiniciarDescompresion();
  estado.textContent = "Se lee en tu navegador; no se sube a ningún servidor.";
  en("[data-insp-resultado]").hidden = false;
  en("[data-insp-nombre]").focus({ preventScroll: true });
  en("[data-insp-nombre]").scrollIntoView({
    block: "start",
    behavior: prefiereMenosMovimiento() ? "instant" : "smooth",
  });

  document.dispatchEvent(
    new CustomEvent("suf-inspeccionado", {
      detail: { nombre: archivo.name, encabezado: suf.encabezado, nodes: arbol.nodes, rootId: arbol.rootId },
    })
  );
}

// --- Descomprimir y comprobar la integridad (sección 8) -------------------

const TEXTO_DE_COMPROBACION = {
  caracteres: (c) => `${numero(c.obtenido)} caracteres recuperados; el encabezado dice ${numero(c.esperado)}`,
  frecuencias: (c) =>
    c.ok
      ? "Las apariciones de cada símbolo coinciden con el diccionario"
      : `${plural(c.obtenido, "símbolo no coincide", "símbolos no coinciden")} con el diccionario`,
  bytes: (c) => `${numero(c.obtenido)} bytes en UTF-8; el tamaño original calculado es ${numero(c.esperado)}`,
};

function reiniciarDescompresion() {
  recuperado = null;
  en("[data-insp-recuperado]").hidden = true;
  en("[data-insp-texto]").value = "";
  en("[data-insp-descomprimir-estado]").textContent = "";
  en("[data-insp-comparacion]").textContent = "";
  en("[data-insp-descomprimir]").removeAttribute("aria-disabled");
}

function comprobacion(ok, texto) {
  const li = elemento("li", ok ? "is-ok" : "is-falla", texto);
  li.prepend(elemento("span", "visually-hidden", ok ? "Correcto: " : "Falla: "));
  return li;
}

async function huella(texto) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function alDescomprimir() {
  const boton = en("[data-insp-descomprimir]");
  if (!abierto || boton.getAttribute("aria-disabled") === "true") return;
  const estado = en("[data-insp-descomprimir-estado]");
  boton.setAttribute("aria-disabled", "true");
  estado.textContent = "Descomprimiendo…";
  // Un cuadro para que se vea el mensaje antes del trabajo pesado.
  await new Promise((resolver) => setTimeout(resolver, 30));

  const inicio = performance.now();
  try {
    recuperado = descomprimir(abierto.suf, abierto.arbol);
  } catch (error) {
    if (!(error instanceof ErrorSuf)) console.error(error);
    estado.textContent = `No se pudo descomprimir. ${error instanceof ErrorSuf ? error.message : ""}`.trim();
    boton.removeAttribute("aria-disabled");
    return;
  }
  const milisegundos = Math.round(performance.now() - inicio);

  const comprobaciones = comprobarTexto(recuperado, abierto.suf);
  const lista = comprobaciones.map((c) => comprobacion(c.ok, TEXTO_DE_COMPROBACION[c.clave](c)));
  const sha = await huella(recuperado);
  if (sha) lista.push(elemento("li", "is-dato", `SHA-256 del texto: ${sha}`));
  en("[data-insp-comprobaciones]").replaceChildren(...lista);

  const todoBien = comprobaciones.every((c) => c.ok);
  estado.textContent = todoBien
    ? `Texto recuperado en ${numero(milisegundos)} ms; coincide con el encabezado.`
    : "El texto recuperado no coincide con el encabezado: el archivo puede estar dañado.";
  en("[data-insp-texto]").value = recuperado;
  en("[data-insp-recuperado]").hidden = false;
  boton.removeAttribute("aria-disabled");
}

// "don-quijote.suf" → "don-quijote.txt"
const nombreDeTexto = (nombre) => `${nombre.replace(/\.[^.]*$/, "") || "recuperado"}.txt`;

function alDescargarTexto() {
  if (recuperado === null) return;
  guardarArchivo(new TextEncoder().encode(recuperado), nombreDeTexto(abierto.nombre), "text/plain;charset=utf-8");
}

async function alCompararOriginal(archivo) {
  if (!archivo || recuperado === null) return;
  const salida = en("[data-insp-comparacion]");
  const r = compararConOriginal(recuperado, await archivo.arrayBuffer());
  salida.classList.toggle("is-falla", !r.identico);
  if (r.identico && !r.normalizado) {
    salida.textContent = `Idéntico a ${archivo.name}: los ${numero(r.bytes)} bytes coinciden uno a uno.`;
  } else if (r.identico) {
    salida.textContent =
      `Idéntico a ${archivo.name} después de quitar el BOM y cambiar \\r\\n por \\n, ` +
      "la misma limpieza que hace el backend antes de comprimir.";
  } else {
    salida.textContent =
      `No es igual a ${archivo.name}: la primera diferencia está en el byte ${numero(r.primeraDiferencia)}. ` +
      "Si es un libro de Gutenberg, el original incluye la licencia que el backend quita antes de comprimir.";
  }
}

export function iniciarInspector() {
  const zona = en("[data-insp-zona]");
  if (!zona) return;
  en("[data-insp-descomprimir]").addEventListener("click", alDescomprimir);
  en("[data-insp-descargar-txt]").addEventListener("click", alDescargarTexto);
  const original = en("[data-insp-original]");
  original.addEventListener("change", () => {
    alCompararOriginal(original.files[0]);
    original.value = "";
  });
  const entrada = zona.querySelector("input[type=file]");

  entrada.addEventListener("change", () => {
    abrir(entrada.files[0]);
    // Así se puede volver a elegir el mismo archivo.
    entrada.value = "";
  });

  zona.addEventListener("dragover", (evento) => {
    evento.preventDefault();
    zona.classList.add("is-arrastrando");
  });
  zona.addEventListener("dragleave", () => zona.classList.remove("is-arrastrando"));
  zona.addEventListener("drop", (evento) => {
    evento.preventDefault();
    zona.classList.remove("is-arrastrando");
    abrir(evento.dataTransfer.files[0]);
  });
}
