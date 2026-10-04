// Comunicación con el backend (algorithms-visualization-backend).
// En desarrollo se usa el proxy de Vite (/api → localhost:3000); en
// producción se define VITE_API_URL con la URL pública del backend.
const API_URL = import.meta.env.VITE_API_URL || "/api";

async function solicitar(ruta, cuerpo) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new Error("No se pudo conectar con el backend.");
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(datos?.message || `Error ${respuesta.status} del backend.`);
  }
  return datos;
}

// "Bubble Sort" → "bubble-sort" (id que usa el backend)
export function nombreAId(nombre) {
  return nombre.toLowerCase().replace(/\s+/g, "-");
}

// POST /algorithms/:id/run → AlgorithmResult
export function ejecutarAlgoritmo(id, input) {
  return solicitar(`/algorithms/${id}/run`, { input });
}

// POST /algorithms/compare → AlgorithmResult[] (mínimo dos algoritmos)
export function compararAlgoritmos(ids, input) {
  return solicitar("/algorithms/compare", { algorithms: ids, input });
}
