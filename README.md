# Stack Underflow — Visualizador web de algoritmos de ordenamiento

Aplicación web para visualizar, ejecutar y comparar ocho algoritmos de ordenamiento paso a paso.

Este repositorio contiene el **frontend** (página web). El backend está en [algorithms-visualization-backend](https://github.com/qci-stack-underflow/algorithms-visualization-backend).

| | |
|---|---|
| **Aplicación publicada** | https://stack-underflow-frontend-algviz.vercel.app |
| **API publicada** | https://stack-underflow-backend-algviz.vercel.app |
| **Repositorio frontend** | https://github.com/qci-stack-underflow/algorithms-visualization-frontend |
| **Repositorio backend** | https://github.com/qci-stack-underflow/algorithms-visualization-backend |
| **GitHub Projects** | https://github.com/orgs/qci-stack-underflow/projects/1 |

![Pantalla de inicio](docs/capturas/inicio.png)

## Integrantes

| Integrante | Usuario de GitHub | Área |
|---|---|---|
| Arath Josué Campos Gutiérrez | [`arcamp0130`](https://github.com/arcamp0130) | Backend |
| Salvador Ramos García | [`SalvadorRGDev`](https://github.com/SalvadorRGDev) | Backend |
| Edwin Juan Pablo Guzmán Mendoza | [`edguzsv`](https://github.com/edguzsv) | Frontend |
| Alessandra Rodriguez Piz | [`alesspiz`](https://github.com/alesspiz) | Frontend |

Materia: Análisis de Algoritmos — Sección D01 — Ciclo 2026B.

## Descripción

El visualizador permite elegir un algoritmo de ordenamiento, generar o escribir un arreglo de números y ver cómo el algoritmo lo ordena: qué elementos compara, cuáles intercambia y cómo cambia el arreglo hasta quedar ordenado. También permite ejecutar varios algoritmos sobre el mismo arreglo y comparar su comportamiento con métricas (comparaciones, intercambios, pasos, tiempo de ejecución y complejidad teórica).

Los algoritmos se ejecutan en el backend, que registra cada operación como un *paso*. El frontend recibe esos pasos y los anima con un código de colores.

## Objetivo

Ayudar a entender visualmente cómo funciona cada algoritmo de ordenamiento visto en clase y comparar su eficiencia de forma práctica, aplicando el ciclo completo de desarrollo: implementar, visualizar, comparar, documentar, colaborar y publicar.

## Algoritmos implementados

| Algoritmo | Mejor caso | Caso promedio | Peor caso | Idea principal |
|---|---|---|---|---|
| Bubble Sort | O(n) | O(n²) | O(n²) | Intercambia elementos adyacentes; termina antes si una pasada no intercambia nada |
| Selection Sort | O(n²) | O(n²) | O(n²) | Busca el mínimo de lo que falta y lo coloca al frente |
| Insertion Sort | O(n) | O(n²) | O(n²) | Desliza cada elemento hacia la izquierda hasta su lugar en la parte ya ordenada |
| Stooge Sort | O(n^2.71) | O(n^2.71) | O(n^2.71) | Ordena recursivamente los primeros 2/3, los últimos 2/3 y otra vez los primeros 2/3 |
| Gnome Sort | O(n) | O(n²) | O(n²) | Avanza si el par está en orden; si no, intercambia y retrocede |
| Exchange Sort | O(n²) | O(n²) | O(n²) | Compara cada posición con todas las de su derecha |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | Divide el arreglo, ordena cada mitad y las mezcla |
| Quick Sort | O(n log n) | O(n log n) | O(n²) | Partición de Lomuto: el pivote (último elemento) queda en su lugar final |

El código de cada algoritmo está en [`src/algorithms/definitions/`](https://github.com/qci-stack-underflow/algorithms-visualization-backend/tree/main/src/algorithms/definitions) del backend: un archivo por algoritmo con su ficha (`info`) y su función `sort(t)`.

## Tecnologías utilizadas

| Backend | Frontend |
|---|---|
| Node.js + TypeScript | Vite |
| NestJS 11 (con `@nestjs/config`) | JavaScript (módulos ES, sin framework) |
| Jest y Supertest (pruebas unitarias y e2e) | SASS |
| pnpm | Chart.js (gráfica de métricas) |
| | pnpm |

**Publicación:** Vercel (plan gratuito), con un proyecto independiente para el frontend y otro para el backend.

## Cómo ejecutar el proyecto

Requisitos: Node.js 22 o superior y pnpm 12 (indicado en `packageManager` de `package.json`).

### Frontend (este repositorio)

```bash
git clone https://github.com/qci-stack-underflow/algorithms-visualization-frontend.git
cd algorithms-visualization-frontend
pnpm install
pnpm dev                 # http://localhost:3030
```

Por defecto, el servidor de Vite reenvía las peticiones `/api` al backend local en `http://localhost:3000` (ver la sección siguiente). Para usar en cambio la API publicada, crear un archivo `.env` en la raíz con:

```bash
VITE_API_URL=https://stack-underflow-backend-algviz.vercel.app
```

Producción:

```bash
pnpm build               # genera la carpeta dist/
```

### Backend

Las instrucciones están en el [README del backend](https://github.com/qci-stack-underflow/algorithms-visualization-backend#cómo-ejecutar-el-proyecto). En resumen: `pnpm install` y `pnpm start:dev` (http://localhost:3000).

## Uso de la aplicación

1. En la pantalla de inicio, cada tarjeta muestra una animación corta de su algoritmo. Se puede **buscar** por nombre o **filtrar** por complejidad.
2. Al hacer clic en una tarjeta se abre el **visualizador**.
3. En el panel **Options** se genera un arreglo aleatorio (**Elements**, máximo 50) o se escribe uno propio (**Custom Elements** + **Insert**).
4. Se elige la velocidad (**Speed**).
5. **Comparar** ejecuta la simulación. Las barras cambian de color según la operación:

   | Color | Significado |
   |---|---|
   | Amarillo | Comparación |
   | Rojo | Intercambio |
   | Morado | Escritura (Merge Sort) |
   | Azul | Pivote (Quick Sort) |
   | Verde | Arreglo ordenado |

6. Para comparar, se activa **Comparar algoritmos** y se marcan dos o más: todos se ejecutan sobre el mismo arreglo y se animan a la vez.
7. Las métricas aparecen en las tarjetas y en la gráfica.
8. **Reset** regresa al estado inicial y **Regresar** vuelve al inicio.

### Capturas

**Visualización de un algoritmo** (Insertion Sort comparando dos posiciones):

![Visualización](docs/capturas/visualizacion.png)

**Comparación de cuatro algoritmos** sobre el mismo arreglo, con la gráfica y las métricas:

![Comparación](docs/capturas/comparacion.png)

## Deployment

| | URL | Proyecto en Vercel |
|---|---|---|
| Frontend | https://stack-underflow-frontend-algviz.vercel.app | `stack-underflow-frontend-algviz` |
| Backend | https://stack-underflow-backend-algviz.vercel.app | `stack-underflow-backend-algviz` |

- Ambos repositorios están conectados a Vercel: cada cambio en `main` se publica automáticamente y cada pull request genera un despliegue de prueba.
- **Backend:** `vercel.json` compila `src/main.ts` con `@vercel/node` y envía todas las rutas (`GET`, `POST` y `OPTIONS` para el preflight de CORS) a la aplicación de Nest.
- **Frontend:** preset de Vite (carpeta de salida `dist`) con la variable `VITE_API_URL` apuntando a la API publicada.
- Todo se publica con el plan gratuito de Vercel.

## Organización del equipo

- **Tablero:** [GitHub Projects](https://github.com/orgs/qci-stack-underflow/projects/1) con las columnas Backlog, Ready, In progress, In review y Done. Cada tarea indica qué se hará, responsable, fecha y criterio de terminado.
- **Ramas:** `main` (versión publicada, solo recibe merges de `dev`), `dev` (integración) y ramas personales `{usuario}/...` que llegan a `dev` mediante pull requests revisados por otro integrante.
- **Sprints:** Sprint 1 (26–30 de septiembre) y Sprint 2 (1–4 de octubre).

### Responsabilidades

| Integrante | Responsabilidades |
|---|---|
| Arath | Configuración del proyecto NestJS, Jest y alias de rutas; organización de módulos; rutas del API, validaciones y manejo de errores HTTP; base del proyecto Vite; configuración y despliegue en Vercel de ambos repositorios |
| Salvador | Formato de entrada y salida de los algoritmos (pasos y métricas); tracer y `runAlgorithm`; servicio de algoritmos; implementación de los 8 algoritmos; pruebas con 3 tamaños de entrada; integración del frontend con el backend (cliente de la API, adaptador de pasos y vista previa animada de las tarjetas); revisión de pull requests |
| Edwin | Motor de animación (reproducción de pasos, velocidad, reinicio y colores de las barras) |
| Alessandra | Diseño de la interfaz: pantalla de inicio, búsqueda y filtro, tarjetas, visualizador, panel de opciones, modo comparar, gráfica y tarjetas de métricas |

## Uso de IA

| Integrante | Herramientas | Para qué |
|---|---|---|
| Arath | *Pendiente de completar* | *Pendiente de completar* |
| Salvador | Claude Code | Diseño del formato de pasos y del tracer, implementación y pruebas de los algoritmos, integración del frontend con el backend, revisión de pull requests y documentación |
| Edwin | *Pendiente de completar* | *Pendiente de completar* |
| Alessandra | *Pendiente de completar* | *Pendiente de completar* |

Todo el código generado con apoyo de IA fue revisado y probado por el equipo, que es responsable de él.

## Aprendizajes y conclusiones

**Arath.** Configurar el backend con Nest fue más laborioso de lo que esperaba, sobre todo la parte de Jest y los alias de rutas. Lo que más tiempo me llevó fue el deploy en Vercel: varias veces compilaba sin errores pero no respondía, y tuve que ir probando hasta dar con la configuración correcta. Me quedo con que una cosa es que funcione en local y otra muy distinta que funcione publicado.

**Salvador.** No tenía experiencia con Git ni con páginas web, y al principio no entendía bien cómo se conectaban el frontend y el backend. Diseñar el formato de los pasos me ayudó a ver cada algoritmo como una serie de operaciones pequeñas que se pueden contar y animar. También aprendí a trabajar con ramas y pull requests, y a revisar el código de mis compañeros antes de unirlo.

**Edwin.** El motor de animación lo empecé en React, pero tuve que pasarlo a JavaScript normal para que coincidiera con lo que ya tenía el equipo. Fue frustrante rehacerlo, aunque terminó siendo más sencillo de lo que pensaba. Entendí mejor cómo funciona `setInterval` y cómo cambiar el aspecto de una barra según lo que esté haciendo el algoritmo.

**Alessandra.** Me tocó la parte visual, así que estuve trabajando mucho con HTML, SASS y la gráfica de Chart.js. Hacer que las pantallas se vieran bien en computadora y en celular costó más de lo que imaginaba. Algo que haría diferente es subir mis avances antes, porque al integrarlo todo al final hubo cosas repetidas con lo de Edwin.

**Conclusión del equipo.** El proyecto nos sirvió para ver los algoritmos de ordenamiento de otra forma: no solo como código, sino como pasos que se pueden observar y comparar. Notamos que la diferencia entre O(n²) y O(n log n) se vuelve muy clara al ver cuántas comparaciones hace cada uno con el mismo arreglo. La organización fue lo más difícil; varias partes se unieron tarde y eso complicó la integración, pero al final logramos tener todo funcionando y publicado.

## Documentación técnica del frontend

| Archivo | Contenido |
|---|---|
| `src/index.html` | Estructura de la pantalla de inicio y del visualizador |
| `src/sass/` | Estilos (SASS) |
| `src/js/script.js` | Lógica de la interfaz: tarjetas, búsqueda y filtro, panel de opciones, modo comparar, gráfica y tarjetas de métricas, vista previa de las tarjetas |
| `src/js/api.js` | Cliente de la API: `POST /algorithms/:id/run` (un algoritmo) y `POST /algorithms/compare` (dos o más) |
| `src/js/pasos.js` | Adaptador: convierte los pasos del backend (`compare`, `swap`, `write`, `pivot`, `sorted`) al formato `{ tipo, indices, arrayState }` del motor, reconstruyendo el arreglo a partir de `input` |
| `src/js/animador.js` | `MotorAnimacion`: reproduce los pasos con `setInterval`, permite cambiar la velocidad y reiniciar, y colorea las barras |
| `vite.config.js` | Configuración de Vite y proxy `/api` → backend local para desarrollo |

### Flujo de una ejecución

1. El usuario presiona **Comparar**.
2. `api.js` envía el arreglo al backend (`/run` o `/compare`).
3. El backend devuelve los pasos y las métricas de cada algoritmo.
4. `pasos.js` convierte los pasos al formato del motor.
5. `MotorAnimacion` anima las barras de cada algoritmo a la vez.
6. Las métricas se muestran en las tarjetas y en la gráfica de Chart.js.

La dirección del backend se toma de `VITE_API_URL`; si no está definida, se usa `/api` (el proxy de desarrollo).
