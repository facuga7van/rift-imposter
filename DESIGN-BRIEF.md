# Rift Impostor — brief de diseño

Diseñá la interfaz completa de **Rift Impostor**, una webapp de juego de deducción
social con los campeones de League of Legends.

Versión actual en vivo: **https://rift-impostor.vercel.app**
(también en español: https://rift-impostor.vercel.app/es)

> **NO SIGAS EL DISEÑO ACTUAL.** Tomalo solo como referencia funcional, para
> entender el flujo. Tenés libertad total sobre paleta, tipografía, grilla,
> densidad, ilustración, motion y estructura de pantallas. Ninguna decisión
> estética está tomada ni heredada. Si tu dirección pide romper con la idea de
> "app oscura de gaming", rompela.

---

## Qué es

Party game **presencial** para 3 a 10 personas, jugado en **un solo celular que se
pasa de mano en mano**.

Todos ven el mismo campeón menos uno —el impostor—, que tiene que fingir que lo
ve. Después cada jugador dice **una sola palabra** sobre el campeón, el grupo vota
a quién echar, y se revela quién era.

Gratis, sin registro, sin backend. Todo el estado vive en el dispositivo.

## El núcleo emocional

La escena real: **seis amigos apretados en un sillón a la una de la mañana, el
living a oscuras, el celular pasando de mano en mano y alguien gritando que el
otro miente.**

Hay tres tiempos bien distintos:

1. **El secreto íntimo** — mirás tu carta solo, tapando la pantalla con la mano.
2. **La tensión pública** — la ronda de pistas y la discusión.
3. **La sentencia** — la votación y la revelación.

Podés tratarlos como tres registros visuales distintos o unificarlos. Es
decisión tuya.

---

## Pantallas y estados

### 1. Setup

- Título del juego y bajada: *"Todos ven el mismo campeón menos uno. Ese uno
  tiene que fingir que lo ve."*
- Lista de **3 a 10 jugadores**, nombres editables inline, con agregar y quitar.
  Máximo 16 caracteres por nombre. Estado deshabilitado al llegar al mínimo (3)
  y al máximo (10).
- Un **switch de dificultad**: *"Decirle la clase al impostor"*, con texto de
  apoyo de dos líneas que cambia según el estado:
  - Prendido: *"El impostor va a saber si es un mago, un tanque, un tirador…
    Algo para arrancar."*
  - Apagado: *"Modo difícil. El impostor no sabe absolutamente nada y tiene que
    leer la mesa."*
- Acción primaria: **"Repartir cartas"**.

### 2. Pasar el celular

- *"Carta 3 de 5"*, el nombre del jugador en grande, y la instrucción de que
  nadie más mire la pantalla.
- Una sola acción: **"Ver mi carta"**.

### 3. Carta — inocente

- Chip opcional con la clase: *"El campeón es un mago"*. Solo aparece si el
  switch de dificultad está prendido.
- **Ilustración vertical del campeón.** Relación **308 × 560 fija** (ver
  restricciones).
- Nombre del campeón y su título: *"Darius"* / *"la Mano de Noxus"*.
- Acción: **"Ocultar y pasar a Nico"**.

### 4. Carta — impostor

- Mismo chip opcional de clase.
- **"Sos el impostor"** más un párrafo de ~30 palabras explicando qué hacer.
- **Sin imagen.**

> Este contraste es un problema de diseño real: es el momento de mayor tensión
> del juego y visualmente es la pantalla más vacía. Resolvelo.

### 5. Ronda de pistas

- Título y bajada de ~20 palabras.
- Chip opcional de clase.
- **Lista ordenada** de 3 a 10 jugadores. El primero va destacado: hablar primero
  es la posición más difícil (no tenés pistas previas de las que colgarte) y se
  sortea de nuevo cada ronda.
- Acción: **"Terminamos las pistas, a votar"**.

### 6. Votación

- Pregunta y bajada.
- Un elemento tocable por jugador (3 a 10).
- Una opción aparte: **"Hubo empate, no echamos a nadie"**, con la nota de que el
  empate deja zafar al impostor.

### 7. Revelación

Dos variantes que tienen que **leerse distinto de un vistazo, desde lejos**:

- Gana el impostor: *"El impostor zafó"*
- Gana el grupo: *"Cayó el impostor"*

Debajo:

- Quién era el impostor y qué pasó, en una línea.
- La ilustración del campeón con su nombre y su título.
- Lista de puntos ganados esta ronda por jugador (`+3`, `+1`, `0`), con una marca
  en quien era el impostor.
- Dos acciones: **"Siguiente ronda"** y **"Ver la tabla"**.

### 8. Tabla de puntajes

- **Estado vacío**: todavía no jugaron ninguna ronda.
- Una línea destacada: *"Mejor impostor: Cami — ganó 2 de 3 veces que le tocó"*.
- Tabla de 3 a 10 filas: **jugador / como impostor (2/3) / puntos**.
- Marca de ganador al llegar a 10 puntos.
- Volver, y reiniciar puntajes con **confirmación en dos pasos** (evitá el modal
  si podés).

### 9. Barra superior (persistente)

Marca, accesos a *Jugadores* y *Tabla*, y cambio de idioma.

### 10. Bloque de reglas

Va **debajo del juego y siempre visible**. Es contenido indexable por Google, no
un modal ni un acordeón. Contiene:

- Un `h2` y un párrafo de introducción
- Una lista ordenada de 4 pasos
- Una explicación de las dos dificultades
- Una tabla de puntajes de 2 filas
- Un párrafo de consejo
- Un aviso legal

Es texto largo y tiene que leerse cómodo.

### Estado de carga

Mientras se lee el estado guardado del dispositivo hay un instante sin datos. No
puede haber parpadeo de contenido incorrecto.

---

## Restricciones reales

Esto **no es estética**, son hechos del producto. Todo lo demás es tuyo.

- **Mobile first, y en serio.** Se usa a una mano, con el celular en el aire, y se
  pasa entre personas. Objetivos táctiles generosos. Referencia 390 × 844. Que
  funcione lindo en desktop es bienvenido pero secundario.
- **Bilingüe inglés / español.** El español ocupa entre 15% y 25% más. Nada de
  layouts que dependan de un largo de texto exacto.
- **Las imágenes de campeón salen de la CDN pública de Riot** y vienen en dos
  formatos, nada más:
  - retrato vertical **308 × 560**
  - ícono cuadrado **120 × 120**

  No hay ilustración propia ni presupuesto para encargarla. El retrato no se
  puede recortar a otra proporción sin perderle la cara al personaje.
- **Nunca se puede filtrar el campeón secreto** fuera de la carta del inocente.
  Ojo con transiciones, previews, skeletons e indicadores de carga.
- **La carta del inocente y la del impostor no deberían distinguirse a la
  distancia por su silueta.** Si alguien mira de reojo desde el sillón de enfrente
  y adivina quién es el impostor por la forma de la pantalla, el juego se rompe.
- **Sin backend.** Todo el estado vive en el dispositivo.
- **Accesibilidad no negociable**: contraste AA, foco visible, y una alternativa
  real para `prefers-reduced-motion`.

---

## Qué entregar

1. Las 10 pantallas con sus estados.
2. La dirección visual completa: paleta, tipografía, escala de espaciado, motion.
3. Los componentes reutilizables que se desprendan del sistema.

---

## Contexto técnico (por si ayuda, no condiciona el diseño)

Next.js con export estático, sin backend. El texto está centralizado en un solo
archivo de diccionario y los estilos en un solo CSS Module, así que se puede
rediseñar la app entera sin tocar la lógica de juego.
