import type { Role } from "@/data/champions";

export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];

/** Ingles en la raiz, español en /es. Sin redirects: el export estatico no los tiene. */
export const DEFAULT_LANG: Lang = "en";

export const LANG_META: Record<Lang, { htmlLang: string; ogLocale: string; label: string }> = {
  en: { htmlLang: "en", ogLocale: "en_US", label: "English" },
  es: { htmlLang: "es", ogLocale: "es_AR", label: "Español" },
};

export function pathFor(lang: Lang): string {
  return lang === DEFAULT_LANG ? "/" : `/${lang}`;
}

/** Paginas del modo online. El codigo de sala viaja en `?c=` y se lee en el cliente. */
export const ONLINE_PATH: Record<Lang, string> = { en: "/play", es: "/es/jugar" };

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "es" : "en";
}

/**
 * Enumera nombres en el idioma correcto ("Juli y Fer" / "Juli and Fer").
 *
 * Intl.ListFormat es deterministico, asi que el server y el cliente producen la
 * misma cadena y no hay mismatch de hidratacion. El catch cubre runtimes viejos.
 */
export function listNames(lang: Lang, names: string[]): string {
  try {
    return new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(names);
  } catch {
    return names.join(", ");
  }
}

/**
 * El diccionario se define con el ingles como fuente de verdad, y el castellano
 * se tipa contra el. Si falta una clave o sobra, el build rompe: no hay forma de
 * publicar la app con una traduccion a medias.
 */
/** Aviso obligatorio de la politica "Legal Jibber Jabber" de Riot: va textual en ingles. */
export const LEGAL_EN =
  "Rift Impostor was created under Riot Games' \"Legal Jibber Jabber\" policy using assets " +
  "owned by Riot Games. Riot Games does not endorse or sponsor this project.";

const en = {
  legal: LEGAL_EN,
  meta: {
    title: "Rift Impostor — The impostor game with League of Legends champions",
    description:
      "Social deduction game with League of Legends champions. Everyone sees the same " +
      "champion except one, who has to fake it. Free, no signup: pass one phone around or " +
      "play online, each on your own device. 3 to 10 players.",
    keywords: [
      "impostor game",
      "social deduction game",
      "chameleon game online",
      "spyfall alternative",
      "party games for groups",
      "free browser party game",
      "no signup game",
    ],
    tagline: "One player doesn't know the champion. They have to fake it.",
    /** Solo para el rail decorativo de escritorio. */
    railMeta: "3–10 players · one phone or online · no signup",
  },
  // En singular: el unico lugar donde aparecen es "The champion is a ___".
  roles: {
    Assassin: "assassin",
    Fighter: "fighter",
    Mage: "mage",
    Marksman: "marksman",
    Support: "support",
    Tank: "tank",
  } satisfies Record<Role, string>,
  nav: {
    play: "Play",
    table: "Scores",
    rules: "Rules",
    /** Etiqueta larga del cambio de idioma: va en el aria-label, nunca a la vista. */
    switchTo: "Switch to Spanish",
    /** Dos letras. En 320px de ancho no entra "Español" al lado de la marca. */
    switchShort: "ES",
  },
  loading: "Loading the game…",
  setup: {
    headline: "Everyone sees the same champion",
    lede: "Everyone except one. That one has to pretend they do.",
    playersLabel: "Players",
    playerCount: (n: number, max: number) => `${n} / ${max}`,
    playerPlaceholder: (n: number) => `Player ${n}`,
    playerLabel: (n: number) => `Name of player ${n}`,
    remove: (name: string) => `Remove ${name}`,
    minPlayers: (n: number) => `You need at least ${n} players`,
    addPlayer: "+ Add player",
    maxPlayers: (n: number) => `${n} players max`,
    roleHintLabel: "Tell the impostor the class",
    roleHintOn: "The impostor will know it's a mage, a tank, a marksman… Something to bluff with.",
    roleHintOff: "Hard mode. The impostor gets nothing at all and has to read the room.",
    start: "Deal the cards",
    playOnline: "Play online",
  },
  deal: {
    counter: (i: number, n: number) => `Card ${i} of ${n}`,
    /** Cabecera de la carta abierta: quien la tiene y en que numero va. */
    cardOf: (name: string, i: number, n: number) => `${name} · card ${i} of ${n}`,
    upNext: "It's on",
    lede: "Take the phone by yourself. Nobody else looks at the screen.",
    view: "See my card",
    remaining: (list: string, n: number) =>
      n === 1 ? `${list} still to go` : `${list} still to go`,
    cover: "Cover the screen with your hand",
    category: (role: string) => `The champion is a ${role}`,
    /** Se parte en dos lineas. Junto dice "You're the impostor". */
    impostorTitleTop: "You're the",
    impostorTitleMain: "impostor",
    impostorEyebrow: "You saw nothing",
    hintLabel: "Your only clue",
    impostorHint:
      "The others are looking at a champion. You aren't. When your turn comes, say a word " +
      "that sounds plausible, listen to the others, and build yours out of theirs.",
    impostorHintBlind:
      "The others are looking at a champion. You aren't, and you don't even know the class. " +
      "Say a word that sounds plausible, listen to the others, and build yours out of theirs.",
    hideAndPass: (name: string) => `Hide and pass to ${name}`,
    ready: "Done, let's start",
  },
  clues: {
    context: (round: number) => `Round ${round} · clues`,
    title: "One word each",
    lede: "Out loud, in this order. No sentences: one single word about the champion.",
    starts: "Goes first — the hardest seat",
    note: "The order is drawn fresh every round",
    done: "Clues are done, let's vote",
  },
  vote: {
    context: (round: number) => `Round ${round} · vote`,
    title: "Who goes out?",
    lede: "Count to three and point. Whoever holds the phone taps the most pointed at.",
    tie: "It's a tie, nobody goes out",
    tieHint: "On a tie the impostor gets away and takes the 3 points anyway.",
    confirm: "Reveal",
    pick: "Pick someone first",
  },
  reveal: {
    context: (round: number) => `Round ${round}`,
    escaped: "The impostor got away",
    caught: "The impostor went down",
    impostorWas: "The impostor was",
    accused: (name: string) => `They accused ${name}, who was innocent.`,
    nobody: "Nobody could agree, so they walked.",
    championWas: "The champion was",
    roundPoints: "Round points",
    wasImpostor: "impostor",
    next: "Next round",
    table: "See the scores",
    /** Votos recibidos, al lado del nombre. Solo en el modo online. */
    votes: (n: number) => (n === 1 ? "1 vote" : `${n} votes`),
  },
  scores: {
    title: "Scores",
    subtitle: (rounds: number, target: number) =>
      `${rounds} ${rounds === 1 ? "round" : "rounds"} played · first to ${target} wins`,
    emptyTitle: "Nothing played yet",
    empty: "The table fills up when the first round ends. Points are kept on this phone.",
    emptyCta: "Set up a game",
    bestImpostor: "Best impostor",
    bestImpostorDetail: (wins: number, rounds: number) =>
      `won ${wins} of the ${rounds} ${rounds === 1 ? "time" : "times"} they got the role`,
    colRank: "#",
    colPlayer: "Player",
    colImpostor: "Impostor",
    colPoints: "Pts",
    won: "won the game",
    wonTag: "Wins",
    back: "Back to the game",
    reset: "Reset the game",
    resetConfirm: "Sure? Tap again",
    resetNote: "Tap twice: the second tap confirms",
  },
  rules: {
    heading: "How to play",
    intro: (n: number) =>
      `Rift Impostor is a social deduction game for 3 to 10 people using the ${n} League of ` +
      "Legends champions. Play it on a single phone passed around the group, or online with " +
      "everyone on their own device (made for Discord calls). No signup, nothing to install.",
    stepsHeading: "A round, step by step",
    steps: [
      "The game secretly picks one champion out of every champion in the game.",
      "Each player looks at their card alone. Everyone sees the champion except the impostor, who is only told they got the role.",
      "Clue round: everyone says one single word about the champion, in the order shown on screen. Who speaks first is drawn fresh every round.",
      "Vote: the group argues and accuses someone. On a tie, the impostor gets away.",
    ],
    hintHeading: "Two difficulties",
    hintOnLabel: "With the class",
    hintOnText:
      "The impostor is told the champion's class. They have somewhere to start and can blend " +
      "in a lot faster.",
    hintOffLabel: "Without the class",
    hintOffText:
      "The impostor is told nothing at all and has to read the room. Much harder for them, " +
      "much funnier for everyone else.",
    hint:
      "Before you deal, you choose whether the impostor is told the class. With the hint they " +
      "have something to bluff with. Without it they know nothing at all, which is much harder " +
      "and much funnier to watch.",
    scoringHeading: "How points work",
    scoringCols: ["What happened", "Impostor", "Everyone else"],
    scoringRows: [
      ["Got away, or the vote tied", "3", "0"],
      ["Voted out", "0", "1 each"],
    ],
    tipHeading: "How not to give yourself away",
    tip:
      "The tension is in calibrating your clue. Too obvious and the impostor works the champion " +
      "out and blends right in. Too vague and everyone starts suspecting you. And hesitating too " +
      "long before you speak gives you away just as much.",
    feedbackHeading: "Got an idea?",
    feedback:
      "Rift Impostor is open source. Suggestions and bug reports go to the repository on " +
      "GitHub, where you can also see what other people already asked for.",
    feedbackCta: "Send a suggestion",
    feedbackNote: "Opens GitHub in a new tab. A free account is needed to post.",
    sourceHeading: "Where do the champions come from?",
    source:
      "Champion data and images come from Data Dragon, Riot Games' public CDN, so the list keeps " +
      "up with every new champion. Rift Impostor is a fan project.",
  },
  online: {
    metaTitle: "Play online",
    metaDescription:
      "Create a room, share the link and play Rift Impostor with everyone on their own " +
      "device. Made for Discord calls: clues and arguing stay on voice.",
    headline: "Play online",
    lede: "Everyone on their own device. Clues and arguing stay on the call.",
    create: "Create a room",
    creating: "Creating…",
    createFailed: "Couldn't create the room. Try again in a moment.",
    codeLabel: "Room code",
    join: "Join",
    badCode: "A code is 4 letters or numbers",
    nameLabel: "Your name",
    nameLede: "This is how the others will see you.",
    enter: "Enter the room",
    connecting: "Connecting to the room…",
    roomLabel: (code: string) => `Room ${code}`,
    roomCode: "Room code",
    share: "Share the link",
    copied: "Link copied",
    shareText: "Join my Rift Impostor room",
    playersLabel: "Players",
    host: "host",
    you: "you",
    online: "connected",
    offline: "disconnected",
    kick: (name: string) => `Remove ${name}`,
    start: "Start the game",
    needPlayers: (n: number) => `You need ${n} connected players`,
    waitHost: "Waiting for the host…",
    leave: "Leave",
    cancelRound: "Cancel round",
    yourCard: "Your card",
    dealLede: "Make sure nobody else can see your screen.",
    ready: "I've seen it",
    readyCount: (k: number, n: number) => `${k} of ${n} ready`,
    advanceDeal: "Go to clues",
    waitingTitle: "You're in",
    waitingText: "You joined mid-round. You play from the next one.",
    voteLede: "Argue on the call, then vote here. You can change your vote until it closes.",
    voteTie: "Nobody, I'm not sure",
    voteConfirm: "Send my vote",
    voteSent: "your vote is in",
    votedCount: (k: number, n: number) => `${k} of ${n} voted`,
    closeVote: "Close the vote",
    newGame: "New game",
    reconnecting: "Reconnecting…",
    errors: {
      room_not_found: "That room doesn't exist or it expired.",
      room_full: "That room is full. 10 players max.",
      bad_version: "There's a new version of the game.",
      kicked: "The host removed you from the room.",
      replaced: "This room is open in another tab.",
      too_big: "Something went wrong with the connection.",
      rate_limited: "Too many messages in a row.",
    },
    createNew: "Create a new room",
    reload: "Reload",
    joinAgain: "Join again",
    leftPlayer: "A player who left",
  },
};

export type Dict = typeof en;

const es: Dict = {
  legal:
    "Rift Impostor fue creado bajo la política \"Legal Jibber Jabber\" de Riot Games usando " +
    "recursos propiedad de Riot Games. Riot Games no respalda ni patrocina este proyecto.",
  meta: {
    title: "Rift Impostor — El juego del impostor con campeones del LoL",
    description:
      "Juego del impostor con campeones de League of Legends. Todos ven el mismo campeón " +
      "menos uno, que tiene que fingir. Gratis y sin registro: con un solo celular que se " +
      "pasa de mano u online, cada uno desde el suyo. De 3 a 10 jugadores.",
    keywords: [
      "juego del impostor",
      "juegos para juntadas",
      "juego de deduccion social",
      "chameleon en español",
      "juego sin registro",
      "juegos para previas",
    ],
    tagline: "Uno no sabe cuál es el campeón. Tiene que fingir que sí.",
    railMeta: "3–10 jugadores · un celular u online · sin registro",
  },
  roles: {
    Assassin: "asesino",
    Fighter: "luchador",
    Mage: "mago",
    Marksman: "tirador",
    Support: "soporte",
    Tank: "tanque",
  },
  nav: {
    play: "Jugar",
    table: "Tabla",
    rules: "Reglas",
    switchTo: "Cambiar a inglés",
    switchShort: "EN",
  },
  loading: "Cargando la partida…",
  setup: {
    headline: "Todos ven el mismo campeón",
    lede: "Menos uno. Ese uno tiene que fingir que lo ve.",
    playersLabel: "Jugadores",
    playerCount: (n, max) => `${n} / ${max}`,
    playerPlaceholder: (n) => `Jugador ${n}`,
    playerLabel: (n) => `Nombre del jugador ${n}`,
    remove: (name) => `Sacar a ${name}`,
    minPlayers: (n) => `Hacen falta al menos ${n} jugadores`,
    addPlayer: "+ Agregar jugador",
    maxPlayers: (n) => `Máximo ${n} jugadores`,
    roleHintLabel: "Decirle la clase al impostor",
    roleHintOn: "El impostor va a saber si es un mago, un tanque, un tirador… Algo para arrancar.",
    roleHintOff: "Modo difícil. El impostor no sabe absolutamente nada y tiene que leer la mesa.",
    start: "Repartir cartas",
    playOnline: "Jugar online",
  },
  deal: {
    counter: (i, n) => `Carta ${i} de ${n}`,
    cardOf: (name, i, n) => `${name} · carta ${i} de ${n}`,
    upNext: "Le toca a",
    lede: "Tomá el celular. Que nadie más mire la pantalla mientras la abrís.",
    view: "Ver mi carta",
    remaining: (list, n) => (n === 1 ? `Falta ${list}` : `Faltan ${list}`),
    cover: "Tapá la pantalla con la mano",
    category: (role) => `El campeón es un ${role}`,
    impostorTitleTop: "Sos el",
    impostorTitleMain: "impostor",
    impostorEyebrow: "Vos no viste nada",
    hintLabel: "Tu única pista",
    impostorHint:
      "Los demás están viendo a un campeón. Vos no. Cuando te toque, decí una palabra que " +
      "suene creíble, escuchá lo que dicen los otros y armá la tuya con eso.",
    impostorHintBlind:
      "Los demás están viendo a un campeón. Vos no, y ni siquiera sabés la clase. Decí una " +
      "palabra que suene creíble, escuchá lo que dicen los otros y armá la tuya con eso.",
    hideAndPass: (name) => `Ocultar y pasar a ${name}`,
    ready: "Listo, empezamos",
  },
  clues: {
    context: (round) => `Ronda ${round} · pistas`,
    title: "Una palabra cada uno",
    lede: "En voz alta y en este orden. Nada de frases: una sola palabra sobre el campeón.",
    starts: "Arranca — la posición más difícil",
    note: "El orden se sortea de nuevo cada ronda",
    done: "Terminamos las pistas, a votar",
  },
  vote: {
    context: (round) => `Ronda ${round} · votación`,
    title: "¿A quién echamos?",
    lede: "Cuenten hasta tres y señalen. El que sostiene el celular marca al más señalado.",
    tie: "Hubo empate, no echamos a nadie",
    tieHint: "El empate deja zafar al impostor: se anota los 3 puntos igual.",
    confirm: "Revelar",
    pick: "Elegí a alguien primero",
  },
  reveal: {
    context: (round) => `Ronda ${round}`,
    escaped: "El impostor zafó",
    caught: "Cayó el impostor",
    impostorWas: "El impostor era",
    accused: (name) => `Acusaron a ${name} y era inocente.`,
    nobody: "Nadie se puso de acuerdo, así que se fue de arriba.",
    championWas: "El campeón era",
    roundPoints: "Puntos de esta ronda",
    wasImpostor: "impostor",
    next: "Siguiente ronda",
    table: "Ver la tabla",
    votes: (n) => (n === 1 ? "1 voto" : `${n} votos`),
  },
  scores: {
    title: "Tabla",
    subtitle: (rounds, target) =>
      `${rounds} ${rounds === 1 ? "ronda jugada" : "rondas jugadas"} · se gana con ${target} puntos`,
    emptyTitle: "Todavía no jugaron nada",
    empty:
      "La tabla se llena cuando termina la primera ronda. Los puntos quedan guardados en este celular.",
    emptyCta: "Armar una partida",
    bestImpostor: "Mejor impostor",
    bestImpostorDetail: (wins, rounds) =>
      `ganó ${wins} de ${rounds} ${rounds === 1 ? "vez" : "veces"} que le tocó`,
    colRank: "#",
    colPlayer: "Jugador",
    colImpostor: "Impostor",
    colPoints: "Pts",
    won: "ganó la partida",
    wonTag: "Gana",
    back: "Volver a la partida",
    reset: "Reiniciar la partida",
    resetConfirm: "¿Seguro? Tocá de nuevo",
    resetNote: "Tocá dos veces: el segundo toque confirma",
  },
  rules: {
    heading: "Cómo se juega",
    intro: (n) =>
      `Rift Impostor es un juego de deducción social para 3 a 10 personas con los ${n} campeones ` +
      "de League of Legends. Se juega desde un solo celular que se pasa de mano en mano, u online " +
      "con cada uno desde su dispositivo (pensado para llamadas de Discord). No hace falta " +
      "registrarse ni instalar nada.",
    stepsHeading: "La ronda, paso a paso",
    steps: [
      "El juego elige un campeón en secreto, entre todos los del juego.",
      "Cada jugador mira su carta a solas. Todos ven el campeón menos el impostor, al que solo se le avisa que le tocó.",
      "Ronda de pistas: cada uno dice una sola palabra sobre el campeón, en el orden que marca la pantalla. El primero en hablar es sorteado cada ronda.",
      "Votación: el grupo discute y acusa a alguien. Si hay empate, el impostor zafa.",
    ],
    hintHeading: "Dos dificultades",
    hintOnLabel: "Con la clase",
    hintOnText:
      "Al impostor se le dice la clase del campeón. Tiene de dónde agarrarse y se camufla " +
      "mucho más rápido.",
    hintOffLabel: "Sin la clase",
    hintOffText:
      "Al impostor no se le dice absolutamente nada y tiene que leer la mesa. Mucho más " +
      "difícil para él, mucho más divertido para el resto.",
    hint:
      "Antes de repartir elegís si al impostor se le dice la clase. Con la pista tiene algo de " +
      "donde agarrarse. Sin la pista no sabe absolutamente nada, que es mucho más difícil y " +
      "mucho más divertido de mirar.",
    scoringHeading: "Cómo se suman los puntos",
    scoringCols: ["Qué pasó", "Impostor", "El resto"],
    scoringRows: [
      ["Zafó, o la votación quedó empatada", "3", "0"],
      ["Lo echaron", "0", "1 cada uno"],
    ],
    tipHeading: "La clave para no quedar en evidencia",
    tip:
      "La tensión está en calibrar la pista. Si sos muy obvio, el impostor deduce el campeón y se " +
      "camufla. Si sos muy vago, el resto va a sospechar de vos. Y si dudás mucho antes de hablar, " +
      "también te delata.",
    feedbackHeading: "¿Se te ocurre algo?",
    feedback:
      "Rift Impostor es código abierto. Las sugerencias y los errores van al repositorio en " +
      "GitHub, donde además podés ver lo que ya pidió el resto.",
    feedbackCta: "Mandar una sugerencia",
    feedbackNote: "Abre GitHub en una pestaña nueva. Hace falta una cuenta gratuita para escribir.",
    sourceHeading: "¿De dónde salen los campeones?",
    source:
      "Los datos y las imágenes vienen de Data Dragon, la CDN pública de Riot Games, así que la " +
      "lista se mantiene al día con cada campeón nuevo. Rift Impostor es un proyecto de fans.",
  },
  online: {
    metaTitle: "Jugar online",
    metaDescription:
      "Creá una sala, compartí el link y jugá Rift Impostor cada uno desde su dispositivo. " +
      "Pensado para llamadas de Discord: las pistas y la discusión siguen por voz.",
    headline: "Jugar online",
    lede: "Cada uno desde su dispositivo. Las pistas y la discusión, por la llamada.",
    create: "Crear sala",
    creating: "Creando…",
    createFailed: "No se pudo crear la sala. Probá de nuevo en un rato.",
    codeLabel: "Código de sala",
    join: "Unirme",
    badCode: "El código tiene 4 letras o números",
    nameLabel: "Tu nombre",
    nameLede: "Así te van a ver los demás.",
    enter: "Entrar a la sala",
    connecting: "Conectando con la sala…",
    roomLabel: (code) => `Sala ${code}`,
    roomCode: "Código de sala",
    share: "Compartir el link",
    copied: "Link copiado",
    shareText: "Sumate a mi sala de Rift Impostor",
    playersLabel: "Jugadores",
    host: "anfitrión",
    you: "vos",
    online: "conectado",
    offline: "desconectado",
    kick: (name) => `Sacar a ${name}`,
    start: "Empezar la partida",
    needPlayers: (n) => `Hacen falta ${n} jugadores conectados`,
    waitHost: "Esperando al anfitrión…",
    leave: "Salir",
    cancelRound: "Cancelar ronda",
    yourCard: "Tu carta",
    dealLede: "Fijate que nadie más esté mirando tu pantalla.",
    ready: "Ya la vi",
    readyCount: (k, n) => `${k} de ${n} listos`,
    advanceDeal: "Pasar a las pistas",
    waitingTitle: "Ya estás adentro",
    waitingText: "Entraste con la ronda empezada. Jugás desde la siguiente.",
    voteLede: "Discutan por la llamada y después votá acá. Podés cambiar el voto hasta que se cierre.",
    voteTie: "Nadie, no estoy seguro",
    voteConfirm: "Mandar mi voto",
    voteSent: "tu voto ya está",
    votedCount: (k, n) => `${k} de ${n} votaron`,
    closeVote: "Cerrar la votación",
    newGame: "Nueva partida",
    reconnecting: "Reconectando…",
    errors: {
      room_not_found: "Esa sala no existe o ya venció.",
      room_full: "La sala está llena. Entran 10 como máximo.",
      bad_version: "Hay una versión nueva del juego.",
      kicked: "El anfitrión te sacó de la sala.",
      replaced: "Esta sala está abierta en otra pestaña.",
      too_big: "Algo salió mal con la conexión.",
      rate_limited: "Demasiados mensajes seguidos.",
    },
    createNew: "Crear una sala nueva",
    reload: "Recargar",
    joinAgain: "Volver a entrar",
    leftPlayer: "Alguien que se fue",
  },
};

export const DICTS: Record<Lang, Dict> = { en, es };

export function dict(lang: Lang): Dict {
  return DICTS[lang];
}
