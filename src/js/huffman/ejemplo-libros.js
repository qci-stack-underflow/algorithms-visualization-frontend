// Búsqueda de ejemplo: mientras el backend no tenga GET /huffman/books/search,
// se busca en esta lista de libros de Project Gutenberg (números y títulos
// comprobados en gutenberg.org). Tienen la forma de BookInfo del contrato.
// Cuando el backend tenga la búsqueda, se usa la suya y esta lista no se carga.
const LIBROS = [
  // Los seis del catálogo de la biblioteca
  { id: 2000, title: "Don Quijote", author: "Miguel de Cervantes Saavedra", language: "Español" },
  { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", language: "Inglés" },
  { id: 2701, title: "Moby Dick; Or, The Whale", author: "Herman Melville", language: "Inglés" },
  { id: 84, title: "Frankenstein", author: "Mary Wollstonecraft Shelley", language: "Inglés" },
  { id: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", language: "Inglés" },
  { id: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", language: "Inglés" },
  // En español
  { id: 1619, title: "La Celestina", author: "Fernando de Rojas", language: "Español" },
  { id: 49836, title: "Niebla (Nivola)", author: "Miguel de Unamuno", language: "Español" },
  { id: 17013, title: "Fortunata y Jacinta: dos historias de casadas", author: "Benito Pérez Galdós", language: "Español" },
  { id: 24536, title: "Los cuatro jinetes del apocalipsis", author: "Vicente Blasco Ibáñez", language: "Español" },
  { id: 58221, title: "La Odisea", author: "Homero", language: "Español" },
  { id: 16625, title: "Libro de Buen Amor", author: "Juan Ruiz", language: "Español" },
  // En inglés
  { id: 98, title: "A Tale of Two Cities", author: "Charles Dickens", language: "Inglés" },
  { id: 1400, title: "Great Expectations", author: "Charles Dickens", language: "Inglés" },
  { id: 174, title: "The Picture of Dorian Gray", author: "Oscar Wilde", language: "Inglés" },
  { id: 345, title: "Dracula", author: "Bram Stoker", language: "Inglés" },
  { id: 64317, title: "The Great Gatsby", author: "F. Scott Fitzgerald", language: "Inglés" },
  { id: 1513, title: "Romeo and Juliet", author: "William Shakespeare", language: "Inglés" },
  { id: 76, title: "Adventures of Huckleberry Finn", author: "Mark Twain", language: "Inglés" },
  { id: 5200, title: "Metamorphosis", author: "Franz Kafka", language: "Inglés" },
  { id: 2600, title: "War and Peace", author: "Leo Tolstoy", language: "Inglés" },
  { id: 2554, title: "Crime and Punishment", author: "Fyodor Dostoyevsky", language: "Inglés" },
  { id: 1260, title: "Jane Eyre: An Autobiography", author: "Charlotte Brontë", language: "Inglés" },
  { id: 768, title: "Wuthering Heights", author: "Emily Brontë", language: "Inglés" },
  { id: 1232, title: "The Prince", author: "Niccolò Machiavelli", language: "Inglés" },
  { id: 1184, title: "The Count of Monte Cristo", author: "Alexandre Dumas", language: "Inglés" },
  { id: 43, title: "The Strange Case of Dr. Jekyll and Mr. Hyde", author: "Robert Louis Stevenson", language: "Inglés" },
  { id: 120, title: "Treasure Island", author: "Robert Louis Stevenson", language: "Inglés" },
  { id: 1080, title: "A Modest Proposal", author: "Jonathan Swift", language: "Inglés" },
  { id: 1952, title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", language: "Inglés" },
];

export const TOTAL_DE_LIBROS_DE_EJEMPLO = LIBROS.length;

// "Pérez Galdós" → "perez galdos": sin acentos ni mayúsculas.
const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

// Libros cuyo título o autor contienen todas las palabras de la consulta.
export function buscarEnEjemplo(consulta) {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  return LIBROS.filter((libro) => {
    const texto = normalizar(`${libro.title} ${libro.author}`);
    return palabras.every((palabra) => texto.includes(palabra));
  });
}
