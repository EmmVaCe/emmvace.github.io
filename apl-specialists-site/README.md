# APL Specialists — réplica estática

Réplica en HTML5/CSS puro del sitio de Notion **APL Specialists** (Sensei Learning / Soluciones Exa).

## Qué incluye

- `index.html` — página de inicio (portada, ícono, menú y recursos más usados).
- 7 páginas de sección: `bienvenida.html`, `sensei-learning.html`, `primeros-pasos.html`,
  `prepara-tu-sesion.html`, `durante-la-capacitacion.html`, `seguimiento-a-colegios.html`,
  `explore-playgrounds.html`.
- `playgrounds/` — las 22 sub-páginas individuales de la galería "Explore Playgrounds".
- `assets/style.css` — hoja de estilos compartida (tema oscuro, colores y tipografía calcados del original).

No requiere build ni dependencias: son archivos estáticos.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (o usa uno existente) y sube todo el contenido de esta carpeta
   a la raíz del repo (o a una carpeta `/docs`).
2. En el repo: **Settings → Pages → Source**, elige la rama (`main`) y la carpeta (`/root` o `/docs`).
3. Guarda. GitHub te dará una URL tipo `https://<usuario>.github.io/<repo>/` en un par de minutos.

## Notas sobre el contenido

- La portada y el ícono usan las imágenes originales alojadas en Unsplash y en el CDN público de Notion
  (enlaces directos, no se copiaron los archivos).
- Las 22 tarjetas de "Explore Playgrounds" no incluyen la captura de pantalla original de cada app: Notion
  las sirve mediante URLs firmadas que expiran, así que se sustituyeron por un ícono genérico. Todo el
  texto, orden y estructura sí es el original.
- Las dos bases de datos de Airtable incrustadas en "Seguimiento a Colegios" (bitácora de sesiones y
  fichas técnicas) no se replican por ser contenido privado y dinámico; se dejó una nota en su lugar.
- Los enlaces externos (Box, sensei.s.gy, Airtable, Apple, etc.) apuntan a las URLs reales del sitio
  original.

## Protección con contraseña

Este sitio está protegido con **StatiCrypt** (cifrado del lado del cliente, sin necesidad de servidor).

- Contraseña: `Th1nk_D1ff3r3nt!`
- **Páginas públicas (sin contraseña):** `index.html`, `bienvenida.html`, `explore-playgrounds.html`, y
  las 22 páginas individuales dentro de `playgrounds/`.
- **Páginas protegidas:** `sensei-learning.html`, `primeros-pasos.html`, `prepara-tu-sesion.html`,
  `durante-la-capacitacion.html`, `seguimiento-a-colegios.html`.
- Protección disuasoria (evita buscadores, curiosos o quien tenga el link por error), no autenticación
  de servidor real: el HTML cifrado sigue siendo público en el repositorio.

## Imágenes de Explore Playgrounds

Las 22 tarjetas tienen su imagen original en `assets/pg/<slug>.jpg`.

## Bases de Airtable incrustadas

Las dos secciones de "Seguimiento a Colegios" usan el embed de Airtable (`shrZXP9a02ABu92nm`), y el
enlace de texto "Formulario de Bitácora" apunta al formulario (`pag1q0Dg9b4gTimMy/form`).

## Ventana emergente y botones GET en Explore Playgrounds

Al hacer clic en cualquier tarjeta se abre una ventana emergente (peek) con la imagen, descripción y
botón GET, que descarga el .zip correspondiente desde Box en una pestaña nueva. Las descripciones de
Affirmations, Self Portrait y Say It también incluyen enlaces a los recursos de Apple Education / Box
mencionados en el texto.
