// Comparación del texto recuperado de un .suf con el archivo original
// (suf.js), la que muestra "Integridad: … idéntico" después de una subida.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compararConOriginal } from "../../src/js/huffman/suf.js";

const utf8 = (texto) => new TextEncoder().encode(texto).buffer;

describe("compararConOriginal", () => {
  it("es idéntico byte a byte cuando el texto es el mismo", () => {
    const r = compararConOriginal("niño\r\ncorazón", utf8("niño\r\ncorazón"));
    assert.equal(r.identico, true);
    assert.equal(r.normalizado, false);
  });

  it("acepta el BOM y \\r\\n quitados (limpieza de los libros de Gutenberg)", () => {
    const r = compararConOriginal("hola\nmundo", utf8("﻿hola\r\nmundo"));
    assert.equal(r.identico, true);
    assert.equal(r.normalizado, true);
  });

  it("no da por idéntico un original en Latin-1 cuyos acentos se perdieron", () => {
    // "Canción" en Latin-1: la ó es el byte 0xF3, que no es UTF-8 válido. Al
    // decodificarlo sin cuidado queda U+FFFD, igual que en el texto recuperado.
    const latin1 = new Uint8Array([0x43, 0x61, 0x6e, 0x63, 0x69, 0xf3, 0x6e]).buffer;
    const r = compararConOriginal("Canci�n", latin1);
    assert.equal(r.identico, false);
    assert.equal(r.primeraDiferencia, 5);
  });

  it("señala la primera diferencia", () => {
    const r = compararConOriginal("abcX", utf8("abcd"));
    assert.equal(r.identico, false);
    assert.equal(r.primeraDiferencia, 3);
  });
});
