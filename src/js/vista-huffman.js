// Vista previa de la tarjeta de Huffman: "aabccc" se convierte en bits.
// Son los códigos reales con la regla de desempate propuesta (por peso y
// luego por orden de creación; el primero que sale de la cola va a la
// izquierda con 0): c = 0, b = 10, a = 11.
// Así "aabccc" = 11 11 10 0 0 0, o sea 9 bits en lugar de 48.
import { prefiereMenosMovimiento } from "./inicio.js";

const TEXTO = "aabccc";
const CODIGOS = { a: "11", b: "10", c: "0" };
const BITS_ASCII = TEXTO.length * 8;
const BITS_HUFFMAN = [...TEXTO].reduce((total, letra) => total + CODIGOS[letra].length, 0);

const ESPERA_INICIAL_MS = 900;
const ENTRE_LETRAS_MS = 220;
const ANTES_DE_UNIR_MS = 600;
const MOSTRAR_RESULTADO_MS = 2400;
const DESVANECER_MS = 300;
const VOLVER_A_LETRAS_MS = 500;

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// `sigueActiva()` indica si la tarjeta sigue en pantalla; cuando devuelve
// false (se volvieron a dibujar las tarjetas o se abrió otra pantalla) el
// bucle termina.
export function crearVistaPreviaHuffman(contenedor, sigueActiva) {
  const raiz = document.createElement("div");
  raiz.className = "huff";
  raiz.innerHTML = `
    <div class="huff-row">
      ${[...TEXTO]
        .map(
          (letra) => `
        <span class="huff-tile huff-tile--${letra}" style="--n: ${CODIGOS[letra].length}">
          <span class="huff-letter">${letra}</span>
          <span class="huff-bits">${CODIGOS[letra]}</span>
        </span>`
        )
        .join("")}
    </div>
    <div class="huff-caption">
      <span class="huff-caption-before">${TEXTO.length} letras × 8 bits = ${BITS_ASCII} bits</span>
      <span class="huff-caption-after">${BITS_ASCII} bits → <b>${BITS_HUFFMAN} bits</b></span>
    </div>
  `;
  contenedor.appendChild(raiz);

  const fichas = [...raiz.querySelectorAll(".huff-tile")];

  if (prefiereMenosMovimiento()) {
    fichas.forEach((ficha) => ficha.classList.add("is-coded"));
    raiz.classList.add("is-compressed");
    return;
  }

  const reproducir = async () => {
    while (sigueActiva()) {
      await esperar(ESPERA_INICIAL_MS);

      // Cada letra se cambia por su código, una por una.
      for (const ficha of fichas) {
        if (!sigueActiva()) return;
        ficha.classList.add("is-coded");
        await esperar(ENTRE_LETRAS_MS);
      }

      // Los códigos se juntan en una sola cadena de bits.
      await esperar(ANTES_DE_UNIR_MS);
      if (!sigueActiva()) return;
      raiz.classList.add("is-compressed");

      // Se desvanece, vuelve a las letras sin que se vea y reaparece.
      await esperar(MOSTRAR_RESULTADO_MS);
      if (!sigueActiva()) return;
      raiz.classList.add("is-resetting");
      await esperar(DESVANECER_MS);
      raiz.classList.remove("is-compressed");
      fichas.forEach((ficha) => ficha.classList.remove("is-coded"));
      await esperar(VOLVER_A_LETRAS_MS);
      raiz.classList.remove("is-resetting");
    }
  };
  reproducir();
}
