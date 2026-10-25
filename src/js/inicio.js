// Detalles visuales comunes a las páginas (inicio y Huffman): íconos, barra
// de navegación, aparición de secciones al hacer scroll y contadores.
import {
  createIcons,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  Eye,
  FileArchive,
  Link,
  Maximize2,
  Play,
  Search,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  ZoomIn,
  ZoomOut,
} from "lucide";

const ICONOS = {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  Eye,
  FileArchive,
  Link,
  Maximize2,
  Play,
  Search,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  ZoomIn,
  ZoomOut,
};
const DURACION_CONTADOR_MS = 1200;

export const prefiereMenosMovimiento = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Cambia cada <i data-lucide="..."> dentro de `raiz` por su SVG.
export function dibujarIconos(raiz = document) {
  createIcons({ icons: ICONOS, root: raiz });
}

function observarNavegacion() {
  const header = document.getElementById("mainHeader");
  if (!header) return;

  const actualizar = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", actualizar, { passive: true });
  actualizar();
}

function observarRevelado() {
  const elementos = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elementos.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("visible");
        observador.unobserve(entrada.target);
      }),
    { threshold: 0.1 }
  );
  elementos.forEach((el) => observador.observe(el));
}

// Cuenta de 0 al valor de `data-contar` cuando la cifra aparece en pantalla.
function animarContador(elemento) {
  const destino = Number(elemento.dataset.contar);
  const inicio = performance.now();

  const avanzar = (ahora) => {
    const progreso = Math.min((ahora - inicio) / DURACION_CONTADOR_MS, 1);
    const suavizado = 1 - (1 - progreso) ** 3;
    elemento.textContent = Math.round(destino * suavizado);
    if (progreso < 1) requestAnimationFrame(avanzar);
  };
  requestAnimationFrame(avanzar);
}

function observarContadores() {
  const cifras = document.querySelectorAll("[data-contar]");
  if (prefiereMenosMovimiento() || !("IntersectionObserver" in window)) return;

  const observador = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        animarContador(entrada.target);
        observador.unobserve(entrada.target);
      }),
    { threshold: 0.6 }
  );
  cifras.forEach((cifra) => observador.observe(cifra));
}

export function iniciarDetallesVisuales() {
  // Sin JS las secciones se ven completas; con JS aparecen con animación.
  document.documentElement.classList.add("js");
  dibujarIconos();
  observarNavegacion();
  observarRevelado();
  observarContadores();
}
