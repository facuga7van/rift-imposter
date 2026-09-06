// GENERADO por scripts/fetch-champions.mjs — no editar a mano.
// Data Dragon 16.17.1 · 173 campeones · en_US + es_MX
// Para actualizar tras un campeon nuevo:  npm run champions

import type { Lang } from "@/lib/i18n";

export const DDRAGON_VERSION = "16.17.1";

/** Tags de rol tal como los publica Riot. */
export type Role = "Assassin" | "Fighter" | "Mage" | "Marksman" | "Support" | "Tank";

export type Champion = {
  /** Clave de Data Dragon, tambien usada para las imagenes (ej. "MonkeyKing"). */
  id: string;
  tags: Role[];
  name: Record<Lang, string>;
  title: Record<Lang, string>;
};

export const CHAMPIONS: Champion[] = [
  {
    "id": "Aatrox",
    "tags": [
      "Fighter"
    ],
    "name": {
      "en": "Aatrox",
      "es": "Aatrox"
    },
    "title": {
      "en": "the Darkin Blade",
      "es": "la Espada Darkin"
    }
  },
  {
    "id": "Ahri",
    "tags": [
      "Mage",
      "Assassin"
    ],
    "name": {
      "en": "Ahri",
      "es": "Ahri"
    },
    "title": {
      "en": "the Nine-Tailed Fox",
      "es": "la Vastaya de Nueve Colas"
    }
  },
  {
    "id": "Akali",
    "tags": [
      "Assassin"
    ],
    "name": {
      "en": "Akali",
      "es": "Akali"
    },
    "title": {
      "en": "the Rogue Assassin",
      "es": "la Asesina Furtiva"
    }
  },
  {
    "id": "Akshan",
    "tags": [
      "Marksman",
      "Assassin"
    ],
    "name": {
      "en": "Akshan",
      "es": "Akshan"
    },
    "title": {
      "en": "the Rogue Sentinel",
      "es": "el Centinela Rebelde"
    }
  },
  {
    "id": "Alistar",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Alistar",
      "es": "Alistar"
    },
    "title": {
      "en": "the Minotaur",
      "es": "el Minotauro"
    }
  },
  {
    "id": "Ambessa",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Ambessa",
      "es": "Ambessa"
    },
    "title": {
      "en": "Matriarch of War",
      "es": "La Matriarca de la Guerra"
    }
  },
  {
    "id": "Amumu",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Amumu",
      "es": "Amumu"
    },
    "title": {
      "en": "the Sad Mummy",
      "es": "la Momia Triste"
    }
  },
  {
    "id": "Anivia",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Anivia",
      "es": "Anivia"
    },
    "title": {
      "en": "the Cryophoenix",
      "es": "la Criofénix"
    }
  },
  {
    "id": "Annie",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Annie",
      "es": "Annie"
    },
    "title": {
      "en": "the Dark Child",
      "es": "la Hija de la Oscuridad"
    }
  },
  {
    "id": "Aphelios",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Aphelios",
      "es": "Aphelios"
    },
    "title": {
      "en": "the Weapon of the Faithful",
      "es": "El Arma de los Adeptos"
    }
  },
  {
    "id": "Ashe",
    "tags": [
      "Marksman",
      "Support"
    ],
    "name": {
      "en": "Ashe",
      "es": "Ashe"
    },
    "title": {
      "en": "the Frost Archer",
      "es": "la Arquera de Hielo"
    }
  },
  {
    "id": "AurelionSol",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Aurelion Sol",
      "es": "Aurelion Sol"
    },
    "title": {
      "en": "The Star Forger",
      "es": "el Forjador de Estrellas"
    }
  },
  {
    "id": "Aurora",
    "tags": [
      "Mage",
      "Assassin"
    ],
    "name": {
      "en": "Aurora",
      "es": "Aurora"
    },
    "title": {
      "en": "the Witch Between Worlds",
      "es": "la Bruja entre Mundos"
    }
  },
  {
    "id": "Azir",
    "tags": [
      "Mage",
      "Marksman"
    ],
    "name": {
      "en": "Azir",
      "es": "Azir"
    },
    "title": {
      "en": "the Emperor of the Sands",
      "es": "el Emperador de las Arenas"
    }
  },
  {
    "id": "Bard",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Bard",
      "es": "Bardo"
    },
    "title": {
      "en": "the Wandering Caretaker",
      "es": "el Guardián Trotamundos"
    }
  },
  {
    "id": "Belveth",
    "tags": [
      "Fighter"
    ],
    "name": {
      "en": "Bel'Veth",
      "es": "Bel'Veth"
    },
    "title": {
      "en": "the Empress of the Void",
      "es": "la Emperatriz del Vacío"
    }
  },
  {
    "id": "Blitzcrank",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Blitzcrank",
      "es": "Blitzcrank"
    },
    "title": {
      "en": "the Great Steam Golem",
      "es": "el Gran Gólem de Vapor"
    }
  },
  {
    "id": "Brand",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Brand",
      "es": "Brand"
    },
    "title": {
      "en": "the Burning Vengeance",
      "es": "la Venganza Ardiente"
    }
  },
  {
    "id": "Braum",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Braum",
      "es": "Braum"
    },
    "title": {
      "en": "the Heart of the Freljord",
      "es": "el Corazón del Fréljord"
    }
  },
  {
    "id": "Briar",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Briar",
      "es": "Briar"
    },
    "title": {
      "en": "the Restrained Hunger",
      "es": "el Hambre Contenida"
    }
  },
  {
    "id": "Caitlyn",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Caitlyn",
      "es": "Caitlyn"
    },
    "title": {
      "en": "the Sheriff of Piltover",
      "es": "la Sheriff de Piltóver"
    }
  },
  {
    "id": "Camille",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Camille",
      "es": "Camille"
    },
    "title": {
      "en": "the Steel Shadow",
      "es": "la Sombra de Acero"
    }
  },
  {
    "id": "Cassiopeia",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Cassiopeia",
      "es": "Cassiopeia"
    },
    "title": {
      "en": "the Serpent's Embrace",
      "es": "el Abrazo de la Serpiente"
    }
  },
  {
    "id": "Chogath",
    "tags": [
      "Tank",
      "Mage"
    ],
    "name": {
      "en": "Cho'Gath",
      "es": "Cho'Gath"
    },
    "title": {
      "en": "the Terror of the Void",
      "es": "el Terror del Vacío"
    }
  },
  {
    "id": "Corki",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Corki",
      "es": "Corki"
    },
    "title": {
      "en": "the Daring Bombardier",
      "es": "el Bombardero Osado"
    }
  },
  {
    "id": "Darius",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Darius",
      "es": "Darius"
    },
    "title": {
      "en": "the Hand of Noxus",
      "es": "la mano de Noxus"
    }
  },
  {
    "id": "Diana",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Diana",
      "es": "Diana"
    },
    "title": {
      "en": "Scorn of the Moon",
      "es": "el Desdén de la Luna"
    }
  },
  {
    "id": "DrMundo",
    "tags": [
      "Tank",
      "Fighter"
    ],
    "name": {
      "en": "Dr. Mundo",
      "es": "Dr. Mundo"
    },
    "title": {
      "en": "the Madman of Zaun",
      "es": "el Loco de Zaun"
    }
  },
  {
    "id": "Draven",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Draven",
      "es": "Draven"
    },
    "title": {
      "en": "the Glorious Executioner",
      "es": "el Glorioso Ejecutor"
    }
  },
  {
    "id": "Ekko",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "Ekko",
      "es": "Ekko"
    },
    "title": {
      "en": "the Boy Who Shattered Time",
      "es": "el Joven que Fragmentó el Tiempo"
    }
  },
  {
    "id": "Elise",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "Elise",
      "es": "Elise"
    },
    "title": {
      "en": "the Spider Queen",
      "es": "la Reina de las Arañas"
    }
  },
  {
    "id": "Evelynn",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "Evelynn",
      "es": "Evelynn"
    },
    "title": {
      "en": "Agony's Embrace",
      "es": "Abrazo de la Agonía"
    }
  },
  {
    "id": "Ezreal",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Ezreal",
      "es": "Ezreal"
    },
    "title": {
      "en": "the Prodigal Explorer",
      "es": "el Explorador Pródigo"
    }
  },
  {
    "id": "Fiddlesticks",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Fiddlesticks",
      "es": "Fiddlesticks"
    },
    "title": {
      "en": "the Ancient Fear",
      "es": "el Terror Ancestral"
    }
  },
  {
    "id": "Fiora",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Fiora",
      "es": "Fiora"
    },
    "title": {
      "en": "the Grand Duelist",
      "es": "la Gran Duelista"
    }
  },
  {
    "id": "Fizz",
    "tags": [
      "Assassin",
      "Fighter"
    ],
    "name": {
      "en": "Fizz",
      "es": "Fizz"
    },
    "title": {
      "en": "the Tidal Trickster",
      "es": "el Bromista de las Mareas"
    }
  },
  {
    "id": "Galio",
    "tags": [
      "Tank",
      "Mage"
    ],
    "name": {
      "en": "Galio",
      "es": "Galio"
    },
    "title": {
      "en": "the Colossus",
      "es": "el Coloso"
    }
  },
  {
    "id": "Gangplank",
    "tags": [
      "Fighter"
    ],
    "name": {
      "en": "Gangplank",
      "es": "Gangplank"
    },
    "title": {
      "en": "the Saltwater Scourge",
      "es": "el Azote de los Mares"
    }
  },
  {
    "id": "Garen",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Garen",
      "es": "Garen"
    },
    "title": {
      "en": "The Might of Demacia",
      "es": "el Poder de Demacia"
    }
  },
  {
    "id": "Gnar",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Gnar",
      "es": "Gnar"
    },
    "title": {
      "en": "the Missing Link",
      "es": "el Eslabón Perdido"
    }
  },
  {
    "id": "Gragas",
    "tags": [
      "Fighter",
      "Mage"
    ],
    "name": {
      "en": "Gragas",
      "es": "Gragas"
    },
    "title": {
      "en": "the Rabble Rouser",
      "es": "el Revoltoso"
    }
  },
  {
    "id": "Graves",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Graves",
      "es": "Graves"
    },
    "title": {
      "en": "the Outlaw",
      "es": "el Forajido"
    }
  },
  {
    "id": "Gwen",
    "tags": [
      "Fighter"
    ],
    "name": {
      "en": "Gwen",
      "es": "Gwen"
    },
    "title": {
      "en": "The Hallowed Seamstress",
      "es": "La Costurera Sagrada"
    }
  },
  {
    "id": "Hecarim",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Hecarim",
      "es": "Hecarim"
    },
    "title": {
      "en": "the Shadow of War",
      "es": "la Sombra de la Guerra"
    }
  },
  {
    "id": "Heimerdinger",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Heimerdinger",
      "es": "Heimerdinger"
    },
    "title": {
      "en": "the Revered Inventor",
      "es": "el Venerable Inventor"
    }
  },
  {
    "id": "Hwei",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Hwei",
      "es": "Hwei"
    },
    "title": {
      "en": "the Visionary",
      "es": "el Visionario"
    }
  },
  {
    "id": "Illaoi",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Illaoi",
      "es": "Illaoi"
    },
    "title": {
      "en": "the Kraken Priestess",
      "es": "la Sacerdotisa del Kraken"
    }
  },
  {
    "id": "Irelia",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Irelia",
      "es": "Irelia"
    },
    "title": {
      "en": "the Blade Dancer",
      "es": "la Cuchilla Danzante"
    }
  },
  {
    "id": "Ivern",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Ivern",
      "es": "Ivern"
    },
    "title": {
      "en": "the Green Father",
      "es": "el Árbol Padre"
    }
  },
  {
    "id": "Janna",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Janna",
      "es": "Janna"
    },
    "title": {
      "en": "the Storm's Fury",
      "es": "la Furia de la Tormenta"
    }
  },
  {
    "id": "JarvanIV",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Jarvan IV",
      "es": "Jarvan IV"
    },
    "title": {
      "en": "the Exemplar of Demacia",
      "es": "el Ejemplo de Demacia"
    }
  },
  {
    "id": "Jax",
    "tags": [
      "Fighter"
    ],
    "name": {
      "en": "Jax",
      "es": "Jax"
    },
    "title": {
      "en": "Grandmaster at Arms",
      "es": "el Maestro de Armas"
    }
  },
  {
    "id": "Jayce",
    "tags": [
      "Fighter",
      "Marksman"
    ],
    "name": {
      "en": "Jayce",
      "es": "Jayce"
    },
    "title": {
      "en": "the Defender of Tomorrow",
      "es": "el Defensor del Mañana"
    }
  },
  {
    "id": "Jhin",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Jhin",
      "es": "Jhin"
    },
    "title": {
      "en": "the Virtuoso",
      "es": "el Virtuoso"
    }
  },
  {
    "id": "Jinx",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Jinx",
      "es": "Jinx"
    },
    "title": {
      "en": "the Loose Cannon",
      "es": "la Bala Perdida"
    }
  },
  {
    "id": "KSante",
    "tags": [
      "Tank",
      "Fighter"
    ],
    "name": {
      "en": "K'Sante",
      "es": "K'Sante"
    },
    "title": {
      "en": "the Pride of Nazumah",
      "es": "El Orgullo de Nazumah"
    }
  },
  {
    "id": "Kaisa",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Kai'Sa",
      "es": "Kai'Sa"
    },
    "title": {
      "en": "Daughter of the Void",
      "es": "La Hija del Vacío"
    }
  },
  {
    "id": "Kalista",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Kalista",
      "es": "Kalista"
    },
    "title": {
      "en": "the Spear of Vengeance",
      "es": "el Espíritu de la Venganza"
    }
  },
  {
    "id": "Karma",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Karma",
      "es": "Karma"
    },
    "title": {
      "en": "the Enlightened One",
      "es": "la Iluminada"
    }
  },
  {
    "id": "Karthus",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Karthus",
      "es": "Karthus"
    },
    "title": {
      "en": "the Deathsinger",
      "es": "el Canto de la Muerte"
    }
  },
  {
    "id": "Kassadin",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "Kassadin",
      "es": "Kassadin"
    },
    "title": {
      "en": "the Void Walker",
      "es": "el Caminante del Vacío"
    }
  },
  {
    "id": "Katarina",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "Katarina",
      "es": "Katarina"
    },
    "title": {
      "en": "the Sinister Blade",
      "es": "la Daga Siniestra"
    }
  },
  {
    "id": "Kayle",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Kayle",
      "es": "Kayle"
    },
    "title": {
      "en": "the Righteous",
      "es": "la Justiciera"
    }
  },
  {
    "id": "Kayn",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Kayn",
      "es": "Kayn"
    },
    "title": {
      "en": "the Shadow Reaper",
      "es": "el Segador Sombrío"
    }
  },
  {
    "id": "Kennen",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Kennen",
      "es": "Kennen"
    },
    "title": {
      "en": "the Heart of the Tempest",
      "es": "el Corazón de la Tempestad"
    }
  },
  {
    "id": "Khazix",
    "tags": [
      "Assassin"
    ],
    "name": {
      "en": "Kha'Zix",
      "es": "Kha'Zix"
    },
    "title": {
      "en": "the Voidreaver",
      "es": "el Saqueador del Vacío"
    }
  },
  {
    "id": "Kindred",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Kindred",
      "es": "Kindred"
    },
    "title": {
      "en": "The Eternal Hunters",
      "es": "los Cazadores Eternos"
    }
  },
  {
    "id": "Kled",
    "tags": [
      "Fighter"
    ],
    "name": {
      "en": "Kled",
      "es": "Kled"
    },
    "title": {
      "en": "the Cantankerous Cavalier",
      "es": "el Jinete Cascarrabias"
    }
  },
  {
    "id": "KogMaw",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Kog'Maw",
      "es": "Kog'Maw"
    },
    "title": {
      "en": "the Mouth of the Abyss",
      "es": "la Boca del Abismo"
    }
  },
  {
    "id": "Leblanc",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "LeBlanc",
      "es": "LeBlanc"
    },
    "title": {
      "en": "the Deceiver",
      "es": "la Maquiavélica"
    }
  },
  {
    "id": "LeeSin",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Lee Sin",
      "es": "Lee Sin"
    },
    "title": {
      "en": "the Blind Monk",
      "es": "el Monje Ciego"
    }
  },
  {
    "id": "Leona",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Leona",
      "es": "Leona"
    },
    "title": {
      "en": "the Radiant Dawn",
      "es": "el Radiante Amanecer"
    }
  },
  {
    "id": "Lillia",
    "tags": [
      "Fighter",
      "Mage"
    ],
    "name": {
      "en": "Lillia",
      "es": "Lillia"
    },
    "title": {
      "en": "the Bashful Bloom",
      "es": "La Flor Tímida"
    }
  },
  {
    "id": "Lissandra",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Lissandra",
      "es": "Lissandra"
    },
    "title": {
      "en": "the Ice Witch",
      "es": "la Bruja de Hielo"
    }
  },
  {
    "id": "Locke",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "Locke",
      "es": "Locke"
    },
    "title": {
      "en": "the Ashen Exorcist",
      "es": "el Exorcista de las Cenizas"
    }
  },
  {
    "id": "Lucian",
    "tags": [
      "Marksman",
      "Assassin"
    ],
    "name": {
      "en": "Lucian",
      "es": "Lucian"
    },
    "title": {
      "en": "the Purifier",
      "es": "el Purificador"
    }
  },
  {
    "id": "Lulu",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Lulu",
      "es": "Lulu"
    },
    "title": {
      "en": "the Fae Sorceress",
      "es": "La Hechicera Hadística"
    }
  },
  {
    "id": "Lux",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Lux",
      "es": "Lux"
    },
    "title": {
      "en": "the Lady of Luminosity",
      "es": "la Dama Luminosa"
    }
  },
  {
    "id": "Malphite",
    "tags": [
      "Tank",
      "Mage"
    ],
    "name": {
      "en": "Malphite",
      "es": "Malphite"
    },
    "title": {
      "en": "Shard of the Monolith",
      "es": "el Fragmento del Monolito"
    }
  },
  {
    "id": "Malzahar",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Malzahar",
      "es": "Malzahar"
    },
    "title": {
      "en": "the Prophet of the Void",
      "es": "el Profeta del Vacío"
    }
  },
  {
    "id": "Maokai",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Maokai",
      "es": "Maokai"
    },
    "title": {
      "en": "the Twisted Treant",
      "es": "el Treant Retorcido"
    }
  },
  {
    "id": "MasterYi",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Master Yi",
      "es": "Maestro Yi"
    },
    "title": {
      "en": "the Wuju Bladesman",
      "es": "la Espada Wuju"
    }
  },
  {
    "id": "Mel",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Mel",
      "es": "Mel"
    },
    "title": {
      "en": "the Soul's Reflection",
      "es": "el Reflejo del Alma"
    }
  },
  {
    "id": "Milio",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Milio",
      "es": "Milio"
    },
    "title": {
      "en": "The Gentle Flame",
      "es": "La Flama Gentil"
    }
  },
  {
    "id": "MissFortune",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Miss Fortune",
      "es": "Miss Fortune"
    },
    "title": {
      "en": "the Bounty Hunter",
      "es": "la Cazarrecompensas"
    }
  },
  {
    "id": "Mordekaiser",
    "tags": [
      "Fighter",
      "Mage"
    ],
    "name": {
      "en": "Mordekaiser",
      "es": "Mordekaiser"
    },
    "title": {
      "en": "the Iron Revenant",
      "es": "el Renacido de Hierro"
    }
  },
  {
    "id": "Morgana",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Morgana",
      "es": "Morgana"
    },
    "title": {
      "en": "the Fallen",
      "es": "la Caída"
    }
  },
  {
    "id": "Naafiri",
    "tags": [
      "Assassin",
      "Fighter"
    ],
    "name": {
      "en": "Naafiri",
      "es": "Naafiri"
    },
    "title": {
      "en": "the Hound of a Hundred Bites",
      "es": "la Sabueso de las Cien Mordidas"
    }
  },
  {
    "id": "Nami",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Nami",
      "es": "Nami"
    },
    "title": {
      "en": "the Tidecaller",
      "es": "la Invocadora de Mareas"
    }
  },
  {
    "id": "Nasus",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Nasus",
      "es": "Nasus"
    },
    "title": {
      "en": "the Curator of the Sands",
      "es": "el Curador de las Arenas"
    }
  },
  {
    "id": "Nautilus",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Nautilus",
      "es": "Nautilus"
    },
    "title": {
      "en": "the Titan of the Depths",
      "es": "el Titán de las Profundidades"
    }
  },
  {
    "id": "Neeko",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Neeko",
      "es": "Neeko"
    },
    "title": {
      "en": "the Curious Chameleon",
      "es": "la Camaleón Curiosa"
    }
  },
  {
    "id": "Nidalee",
    "tags": [
      "Assassin",
      "Mage"
    ],
    "name": {
      "en": "Nidalee",
      "es": "Nidalee"
    },
    "title": {
      "en": "the Bestial Huntress",
      "es": "la Cazadora Salvaje"
    }
  },
  {
    "id": "Nilah",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Nilah",
      "es": "Nilah"
    },
    "title": {
      "en": "the Joy Unbound",
      "es": "la Alegría Desatada"
    }
  },
  {
    "id": "Nocturne",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Nocturne",
      "es": "Nocturne"
    },
    "title": {
      "en": "the Eternal Nightmare",
      "es": "la Pesadilla Eterna"
    }
  },
  {
    "id": "Nunu",
    "tags": [
      "Tank",
      "Mage"
    ],
    "name": {
      "en": "Nunu & Willump",
      "es": "Nunu y Willump"
    },
    "title": {
      "en": "the Boy and His Yeti",
      "es": "el Niño y su Yeti"
    }
  },
  {
    "id": "Olaf",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Olaf",
      "es": "Olaf"
    },
    "title": {
      "en": "the Berserker",
      "es": "el Berserker"
    }
  },
  {
    "id": "Orianna",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Orianna",
      "es": "Orianna"
    },
    "title": {
      "en": "the Lady of Clockwork",
      "es": "la Doncella Mecánica"
    }
  },
  {
    "id": "Ornn",
    "tags": [
      "Tank"
    ],
    "name": {
      "en": "Ornn",
      "es": "Ornn"
    },
    "title": {
      "en": "The Fire below the Mountain",
      "es": "El Fuego Debajo de la Montaña"
    }
  },
  {
    "id": "Pantheon",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Pantheon",
      "es": "Pantheon"
    },
    "title": {
      "en": "the Unbreakable Spear",
      "es": "la Lanza Inquebrantable"
    }
  },
  {
    "id": "Poppy",
    "tags": [
      "Tank",
      "Fighter"
    ],
    "name": {
      "en": "Poppy",
      "es": "Poppy"
    },
    "title": {
      "en": "Keeper of the Hammer",
      "es": "la Guardiana del Martillo"
    }
  },
  {
    "id": "Pyke",
    "tags": [
      "Support",
      "Assassin"
    ],
    "name": {
      "en": "Pyke",
      "es": "Pyke"
    },
    "title": {
      "en": "the Bloodharbor Ripper",
      "es": "el Destripador del Muelle Rojo"
    }
  },
  {
    "id": "Qiyana",
    "tags": [
      "Assassin"
    ],
    "name": {
      "en": "Qiyana",
      "es": "Qiyana"
    },
    "title": {
      "en": "Empress of the Elements",
      "es": "La Emperatriz de los Elementos"
    }
  },
  {
    "id": "Quinn",
    "tags": [
      "Marksman",
      "Assassin"
    ],
    "name": {
      "en": "Quinn",
      "es": "Quinn"
    },
    "title": {
      "en": "Demacia's Wings",
      "es": "las Alas de Demacia"
    }
  },
  {
    "id": "Rakan",
    "tags": [
      "Support"
    ],
    "name": {
      "en": "Rakan",
      "es": "Rakan"
    },
    "title": {
      "en": "The Charmer",
      "es": "El Encantador"
    }
  },
  {
    "id": "Rammus",
    "tags": [
      "Tank"
    ],
    "name": {
      "en": "Rammus",
      "es": "Rammus"
    },
    "title": {
      "en": "the Armordillo",
      "es": "el Armadurillo"
    }
  },
  {
    "id": "RekSai",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Rek'Sai",
      "es": "Rek'Sai"
    },
    "title": {
      "en": "the Void Burrower",
      "es": "la Excavadora del Vacío"
    }
  },
  {
    "id": "Rell",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Rell",
      "es": "Rell"
    },
    "title": {
      "en": "the Iron Maiden",
      "es": "la Doncella de Hierro"
    }
  },
  {
    "id": "Renata",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Renata Glasc",
      "es": "Renata Glasc"
    },
    "title": {
      "en": "the Chem-Baroness",
      "es": "la Quimobaronesa"
    }
  },
  {
    "id": "Renekton",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Renekton",
      "es": "Renekton"
    },
    "title": {
      "en": "the Butcher of the Sands",
      "es": "el Carnicero de las Arenas"
    }
  },
  {
    "id": "Rengar",
    "tags": [
      "Assassin",
      "Fighter"
    ],
    "name": {
      "en": "Rengar",
      "es": "Rengar"
    },
    "title": {
      "en": "the Pridestalker",
      "es": "el Orgullo Acechante"
    }
  },
  {
    "id": "Riven",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Riven",
      "es": "Riven"
    },
    "title": {
      "en": "the Exile",
      "es": "la Desterrada"
    }
  },
  {
    "id": "Rumble",
    "tags": [
      "Fighter",
      "Mage"
    ],
    "name": {
      "en": "Rumble",
      "es": "Rumble"
    },
    "title": {
      "en": "the Mechanized Menace",
      "es": "la Amenaza Mecánica"
    }
  },
  {
    "id": "Ryze",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Ryze",
      "es": "Ryze"
    },
    "title": {
      "en": "the Rune Mage",
      "es": "el Mago Rúnico"
    }
  },
  {
    "id": "Samira",
    "tags": [
      "Marksman",
      "Assassin"
    ],
    "name": {
      "en": "Samira",
      "es": "Samira"
    },
    "title": {
      "en": "the Desert Rose",
      "es": "la Rosa del Desierto"
    }
  },
  {
    "id": "Sejuani",
    "tags": [
      "Tank"
    ],
    "name": {
      "en": "Sejuani",
      "es": "Sejuani"
    },
    "title": {
      "en": "Fury of the North",
      "es": "la Furia del Norte"
    }
  },
  {
    "id": "Senna",
    "tags": [
      "Support",
      "Marksman"
    ],
    "name": {
      "en": "Senna",
      "es": "Senna"
    },
    "title": {
      "en": "the Redeemer",
      "es": "la Redentora"
    }
  },
  {
    "id": "Seraphine",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Seraphine",
      "es": "Seraphine"
    },
    "title": {
      "en": "the Starry-Eyed Songstress",
      "es": "la Cantante Soñadora"
    }
  },
  {
    "id": "Sett",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Sett",
      "es": "Sett"
    },
    "title": {
      "en": "the Boss",
      "es": "El Jefe"
    }
  },
  {
    "id": "Shaco",
    "tags": [
      "Assassin"
    ],
    "name": {
      "en": "Shaco",
      "es": "Shaco"
    },
    "title": {
      "en": "the Demon Jester",
      "es": "el Bufón Siniestro"
    }
  },
  {
    "id": "Shen",
    "tags": [
      "Tank"
    ],
    "name": {
      "en": "Shen",
      "es": "Shen"
    },
    "title": {
      "en": "the Eye of Twilight",
      "es": "el Ojo del Crepúsculo"
    }
  },
  {
    "id": "Shyvana",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Shyvana",
      "es": "Shyvana"
    },
    "title": {
      "en": "the Half-Dragon",
      "es": "la Hija del Dragón"
    }
  },
  {
    "id": "Singed",
    "tags": [
      "Tank",
      "Mage"
    ],
    "name": {
      "en": "Singed",
      "es": "Singed"
    },
    "title": {
      "en": "the Mad Chemist",
      "es": "el Químico Loco"
    }
  },
  {
    "id": "Sion",
    "tags": [
      "Tank",
      "Fighter"
    ],
    "name": {
      "en": "Sion",
      "es": "Sion"
    },
    "title": {
      "en": "The Undead Juggernaut",
      "es": "el Coloso no Muerto"
    }
  },
  {
    "id": "Sivir",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Sivir",
      "es": "Sivir"
    },
    "title": {
      "en": "the Battle Mistress",
      "es": "la Señora de la Batalla"
    }
  },
  {
    "id": "Skarner",
    "tags": [
      "Tank",
      "Fighter"
    ],
    "name": {
      "en": "Skarner",
      "es": "Skarner"
    },
    "title": {
      "en": "the Primordial Sovereign",
      "es": "El Soberano Primordial"
    }
  },
  {
    "id": "Smolder",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Smolder",
      "es": "Smolder"
    },
    "title": {
      "en": "the Fiery Fledgling",
      "es": "el Dragoncito Flamante"
    }
  },
  {
    "id": "Sona",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Sona",
      "es": "Sona"
    },
    "title": {
      "en": "Maven of the Strings",
      "es": "la Virtuosa de las Cuerdas"
    }
  },
  {
    "id": "Soraka",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Soraka",
      "es": "Soraka"
    },
    "title": {
      "en": "the Starchild",
      "es": "la Hija de las Estrellas"
    }
  },
  {
    "id": "Swain",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Swain",
      "es": "Swain"
    },
    "title": {
      "en": "the Noxian Grand General",
      "es": "el Gran General Noxiano"
    }
  },
  {
    "id": "Sylas",
    "tags": [
      "Mage",
      "Assassin"
    ],
    "name": {
      "en": "Sylas",
      "es": "Sylas"
    },
    "title": {
      "en": "the Unshackled",
      "es": "el Usurpador"
    }
  },
  {
    "id": "Syndra",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Syndra",
      "es": "Syndra"
    },
    "title": {
      "en": "the Dark Sovereign",
      "es": "la Soberana Oscura"
    }
  },
  {
    "id": "TahmKench",
    "tags": [
      "Tank",
      "Support"
    ],
    "name": {
      "en": "Tahm Kench",
      "es": "Tahm Kench"
    },
    "title": {
      "en": "The River King",
      "es": "El Rey del Río"
    }
  },
  {
    "id": "Taliyah",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Taliyah",
      "es": "Taliyah"
    },
    "title": {
      "en": "the Stoneweaver",
      "es": "la Tejedora de Piedra"
    }
  },
  {
    "id": "Talon",
    "tags": [
      "Assassin"
    ],
    "name": {
      "en": "Talon",
      "es": "Talon"
    },
    "title": {
      "en": "the Blade's Shadow",
      "es": "la Sombra de la Navaja"
    }
  },
  {
    "id": "Taric",
    "tags": [
      "Support",
      "Tank"
    ],
    "name": {
      "en": "Taric",
      "es": "Taric"
    },
    "title": {
      "en": "the Shield of Valoran",
      "es": "el Escudo de Valoran"
    }
  },
  {
    "id": "Teemo",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Teemo",
      "es": "Teemo"
    },
    "title": {
      "en": "the Swift Scout",
      "es": "el Explorador Veloz"
    }
  },
  {
    "id": "Thresh",
    "tags": [
      "Support",
      "Tank"
    ],
    "name": {
      "en": "Thresh",
      "es": "Thresh"
    },
    "title": {
      "en": "the Chain Warden",
      "es": "el Carcelero Implacable"
    }
  },
  {
    "id": "Tristana",
    "tags": [
      "Marksman",
      "Assassin"
    ],
    "name": {
      "en": "Tristana",
      "es": "Tristana"
    },
    "title": {
      "en": "the Yordle Gunner",
      "es": "la Artillera Yordle"
    }
  },
  {
    "id": "Trundle",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Trundle",
      "es": "Trundle"
    },
    "title": {
      "en": "the Troll King",
      "es": "el Rey de los Troles"
    }
  },
  {
    "id": "Tryndamere",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Tryndamere",
      "es": "Tryndamere"
    },
    "title": {
      "en": "the Barbarian King",
      "es": "el Rey Bárbaro"
    }
  },
  {
    "id": "TwistedFate",
    "tags": [
      "Mage",
      "Marksman"
    ],
    "name": {
      "en": "Twisted Fate",
      "es": "Twisted Fate"
    },
    "title": {
      "en": "the Card Master",
      "es": "el Maestro de las Cartas"
    }
  },
  {
    "id": "Twitch",
    "tags": [
      "Marksman",
      "Assassin"
    ],
    "name": {
      "en": "Twitch",
      "es": "Twitch"
    },
    "title": {
      "en": "the Plague Rat",
      "es": "la Rata Mutante"
    }
  },
  {
    "id": "Udyr",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Udyr",
      "es": "Udyr"
    },
    "title": {
      "en": "the Spirit Walker",
      "es": "el Cambiapieles"
    }
  },
  {
    "id": "Urgot",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Urgot",
      "es": "Urgot"
    },
    "title": {
      "en": "the Dreadnought",
      "es": "el Temerario"
    }
  },
  {
    "id": "Varus",
    "tags": [
      "Marksman",
      "Mage"
    ],
    "name": {
      "en": "Varus",
      "es": "Varus"
    },
    "title": {
      "en": "the Arrow of Retribution",
      "es": "la Flecha del Castigo"
    }
  },
  {
    "id": "Vayne",
    "tags": [
      "Marksman",
      "Assassin"
    ],
    "name": {
      "en": "Vayne",
      "es": "Vayne"
    },
    "title": {
      "en": "the Night Hunter",
      "es": "la Cazadora Nocturna"
    }
  },
  {
    "id": "Veigar",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Veigar",
      "es": "Veigar"
    },
    "title": {
      "en": "the Tiny Master of Evil",
      "es": "el Pequeño Maestro del Mal"
    }
  },
  {
    "id": "Velkoz",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Vel'Koz",
      "es": "Vel'Koz"
    },
    "title": {
      "en": "the Eye of the Void",
      "es": "el Ojo del Vacío"
    }
  },
  {
    "id": "Vex",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Vex",
      "es": "Vex"
    },
    "title": {
      "en": "the Gloomist",
      "es": "la Tristóloga"
    }
  },
  {
    "id": "Vi",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Vi",
      "es": "Vi"
    },
    "title": {
      "en": "the Piltover Enforcer",
      "es": "la Vigilante de Piltóver"
    }
  },
  {
    "id": "Viego",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Viego",
      "es": "Viego"
    },
    "title": {
      "en": "The Ruined King",
      "es": "El Rey Arruinado"
    }
  },
  {
    "id": "Viktor",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Viktor",
      "es": "Viktor"
    },
    "title": {
      "en": "the Herald of the Arcane",
      "es": "El Heraldo de lo Arcano"
    }
  },
  {
    "id": "Vladimir",
    "tags": [
      "Mage",
      "Fighter"
    ],
    "name": {
      "en": "Vladimir",
      "es": "Vladimir"
    },
    "title": {
      "en": "the Crimson Reaper",
      "es": "el Segador Carmesí"
    }
  },
  {
    "id": "Volibear",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Volibear",
      "es": "Volibear"
    },
    "title": {
      "en": "the Relentless Storm",
      "es": "la Tormenta Implacable"
    }
  },
  {
    "id": "Warwick",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Warwick",
      "es": "Warwick"
    },
    "title": {
      "en": "the Uncaged Wrath of Zaun",
      "es": "la Furia Desatada de Zaun"
    }
  },
  {
    "id": "MonkeyKing",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Wukong",
      "es": "Wukong"
    },
    "title": {
      "en": "the Monkey King",
      "es": "el Rey de los Monos"
    }
  },
  {
    "id": "Xayah",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Xayah",
      "es": "Xayah"
    },
    "title": {
      "en": "the Rebel",
      "es": "la Rebelde"
    }
  },
  {
    "id": "Xerath",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Xerath",
      "es": "Xerath"
    },
    "title": {
      "en": "the Magus Ascendant",
      "es": "el Mago Ascendente"
    }
  },
  {
    "id": "XinZhao",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Xin Zhao",
      "es": "Xin Zhao"
    },
    "title": {
      "en": "the Seneschal of Demacia",
      "es": "el Senescal de Demacia"
    }
  },
  {
    "id": "Yasuo",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Yasuo",
      "es": "Yasuo"
    },
    "title": {
      "en": "the Unforgiven",
      "es": "el Imperdonable"
    }
  },
  {
    "id": "Yone",
    "tags": [
      "Fighter",
      "Assassin"
    ],
    "name": {
      "en": "Yone",
      "es": "Yone"
    },
    "title": {
      "en": "the Unforgotten",
      "es": "el Imborrable"
    }
  },
  {
    "id": "Yorick",
    "tags": [
      "Fighter",
      "Tank"
    ],
    "name": {
      "en": "Yorick",
      "es": "Yorick"
    },
    "title": {
      "en": "Shepherd of Souls",
      "es": "Pastor de Almas"
    }
  },
  {
    "id": "Yunara",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Yunara",
      "es": "Yunara"
    },
    "title": {
      "en": "the Unbroken Faith",
      "es": "La Fe Inquebrantable"
    }
  },
  {
    "id": "Yuumi",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Yuumi",
      "es": "Yuumi"
    },
    "title": {
      "en": "the Magical Cat",
      "es": "la gatita mágica"
    }
  },
  {
    "id": "Zaahen",
    "tags": [
      "Fighter"
    ],
    "name": {
      "en": "Zaahen",
      "es": "Zaahen"
    },
    "title": {
      "en": "The Unsundered",
      "es": "El Incorrupto"
    }
  },
  {
    "id": "Zac",
    "tags": [
      "Tank",
      "Fighter"
    ],
    "name": {
      "en": "Zac",
      "es": "Zac"
    },
    "title": {
      "en": "the Secret Weapon",
      "es": "el Arma Secreta"
    }
  },
  {
    "id": "Zed",
    "tags": [
      "Assassin"
    ],
    "name": {
      "en": "Zed",
      "es": "Zed"
    },
    "title": {
      "en": "the Master of Shadows",
      "es": "el Maestro de las Sombras"
    }
  },
  {
    "id": "Zeri",
    "tags": [
      "Marksman"
    ],
    "name": {
      "en": "Zeri",
      "es": "Zeri"
    },
    "title": {
      "en": "The Spark of Zaun",
      "es": "La chispa de Zaun"
    }
  },
  {
    "id": "Ziggs",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Ziggs",
      "es": "Ziggs"
    },
    "title": {
      "en": "the Hexplosives Expert",
      "es": "el Experto en Hexplosivos "
    }
  },
  {
    "id": "Zilean",
    "tags": [
      "Support",
      "Mage"
    ],
    "name": {
      "en": "Zilean",
      "es": "Zilean"
    },
    "title": {
      "en": "the Chronokeeper",
      "es": "el Guardián del Tiempo"
    }
  },
  {
    "id": "Zoe",
    "tags": [
      "Mage"
    ],
    "name": {
      "en": "Zoe",
      "es": "Zoe"
    },
    "title": {
      "en": "the Aspect of Twilight",
      "es": "el Aspecto del Crepúsculo"
    }
  },
  {
    "id": "Zyra",
    "tags": [
      "Mage",
      "Support"
    ],
    "name": {
      "en": "Zyra",
      "es": "Zyra"
    },
    "title": {
      "en": "Rise of the Thorns",
      "es": "el Despertar de las Espinas"
    }
  }
];

/** Retrato cuadrado 120x120. Liviano, para grillas. */
export function championIcon(id: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${id}.png`;
}

/** Ilustracion vertical 308x560. Para la carta de revelacion. */
export function championArt(id: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_0.jpg`;
}
