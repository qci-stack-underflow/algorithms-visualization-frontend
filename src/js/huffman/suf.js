// Lee el encabezado de un archivo .suf (formato SUF1, SufHeader en el
// contrato de A1). Todos los números son big-endian:
//   "SUF1" (4 bytes ASCII)
//   total de caracteres (uint32)
//   bits de relleno del último byte (uint8, 0..7)
//   símbolos distintos k (uint16)
//   largo del título (uint16) + título en UTF-8
//   diccionario, k veces: largo del símbolo (uint8) + símbolo en UTF-8 +
//     frecuencia (uint32) + largo del código (uint8) + código en ASCII ("010")
//   datos: los bits comprimidos, el primero en el bit más significativo

export const FIRMA_SUF = "SUF1";

export class ErrorSuf extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorSuf";
  }
}

// Devuelve { encabezado, bytesEncabezado, datos, bitsDatos }:
// - encabezado: { magic, totalCharacters, paddingBits, symbolCount, title, dictionary },
//   con dictionary = [{ symbol, frequency, codeLength, code }] (SufDictionaryEntry)
// - datos: Uint8Array con solo los bits comprimidos
// - bitsDatos: bits útiles de los datos (sin el relleno)
export function leerSuf(buffer) {
  const bytes = new Uint8Array(buffer);
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  let posicion = 0;

  const tomar = (cuantos) => {
    if (posicion + cuantos > bytes.length) {
      throw new ErrorSuf("El archivo .suf está incompleto: se acaba antes de terminar el encabezado.");
    }
    const inicio = posicion;
    posicion += cuantos;
    return inicio;
  };
  const uint8 = () => vista.getUint8(tomar(1));
  const uint16 = () => vista.getUint16(tomar(2));
  const uint32 = () => vista.getUint32(tomar(4));
  const texto = (cuantos) => {
    const inicio = tomar(cuantos);
    try {
      return utf8.decode(bytes.subarray(inicio, inicio + cuantos));
    } catch {
      throw new ErrorSuf("El encabezado del .suf tiene texto que no es UTF-8.");
    }
  };

  const inicioFirma = tomar(4);
  const magic = String.fromCharCode(...bytes.subarray(inicioFirma, inicioFirma + 4));
  if (magic !== FIRMA_SUF) {
    throw new ErrorSuf(`No es un archivo .suf: empieza con «${magic}» en lugar de «${FIRMA_SUF}».`);
  }
  const totalCharacters = uint32();
  const paddingBits = uint8();
  if (paddingBits > 7) throw new ErrorSuf(`Los bits de relleno deben ser de 0 a 7, no ${paddingBits}.`);
  const symbolCount = uint16();
  const title = texto(uint16());
  const dictionary = Array.from({ length: symbolCount }, () => {
    const symbol = texto(uint8());
    const frequency = uint32();
    const codeLength = uint8();
    const inicioCodigo = tomar(codeLength);
    const code = String.fromCharCode(...bytes.subarray(inicioCodigo, inicioCodigo + codeLength));
    if (!/^[01]+$/.test(code)) {
      throw new ErrorSuf(`El código del símbolo «${symbol}» debe ser de ceros y unos, no «${code}».`);
    }
    return { symbol, frequency, codeLength, code };
  });

  const datos = bytes.subarray(posicion);
  return {
    encabezado: { magic, totalCharacters, paddingBits, symbolCount, title, dictionary },
    bytesEncabezado: posicion,
    datos,
    bitsDatos: Math.max(0, datos.length * 8 - paddingBits),
  };
}
