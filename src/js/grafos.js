// Pantalla de grafos: Dijkstra, A*, Prim y Kruskal paso a paso.
// Todo se calcula en el navegador; no usa el backend. La pantalla se arma en
// grafos/pantalla.js y cada algoritmo está en su propio archivo de grafos/.
import "@sass/grafos.scss";
import { Lightbulb, Shuffle, createIcons } from "lucide";
import { iniciarDetallesVisuales } from "./inicio.js";
import { iniciarPantalla } from "./grafos/pantalla.js";

iniciarPantalla();

// Los detalles visuales van aparte: si falla alguno (íconos, animaciones),
// la pantalla sigue funcionando.
try {
  iniciarDetallesVisuales();
  // Íconos que solo usa esta pantalla, con su propio atributo para no
  // tocar la lista compartida de inicio.js.
  createIcons({ icons: { Lightbulb, Shuffle }, nameAttr: "data-icono" });
} catch (error) {
  console.error("No se pudieron iniciar los detalles visuales:", error);
}
