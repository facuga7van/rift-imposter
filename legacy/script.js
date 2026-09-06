const CAMPEONES = [
  "Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia",
  "Annie", "Aphelios", "Ashe", "Aurelion Sol", "Aurora", "Azir",
  "Bardo", "Bel'Veth", "Blitzcrank", "Brand", "Braum", "Briar",
  "Caitlyn", "Camille", "Cassiopeia", "Cho'Gath", "Corki",
  "Darius", "Diana", "Dr. Mundo", "Draven",
  "Ekko", "Elise", "Evelynn", "Ezreal",
  "Fiddlesticks", "Fiora", "Fizz",
  "Galio", "Gangplank", "Garen", "Gnar", "Gragas", "Graves", "Gwen",
  "Hecarim", "Heimerdinger", "Hwei",
  "Illaoi", "Irelia", "Ivern",
  "Janna", "Jarvan IV", "Jax", "Jayce", "Jhin", "Jinx",
  "K'Sante", "Kai'Sa", "Kalista", "Karma", "Karthus", "Kassadin", "Katarina",
  "Kayle", "Kayn", "Kennen", "Kha'Zix", "Kindred", "Kled", "Kog'Maw",
  "LeBlanc", "Lee Sin", "Leona", "Lillia", "Lissandra", "Locke", "Lucian", "Lulu", "Lux",
  "Malphite", "Malzahar", "Maokai", "Master Yi", "Mel", "Milio", "Miss Fortune",
  "Mordekaiser", "Morgana",
  "Naafiri", "Nami", "Nasus", "Nautilus", "Neeko", "Nidalee", "Nilah",
  "Nocturne", "Nunu y Willump",
  "Olaf", "Orianna", "Ornn",
  "Pantheon", "Poppy", "Pyke",
  "Qiyana", "Quinn",
  "Rakan", "Rammus", "Rek'Sai", "Rell", "Renata Glasc", "Renekton", "Rengar",
  "Riven", "Rumble", "Ryze",
  "Samira", "Sejuani", "Senna", "Seraphine", "Sett", "Shaco", "Shen", "Shyvana",
  "Singed", "Sion", "Sivir", "Skarner", "Smolder", "Sona", "Soraka", "Swain",
  "Sylas", "Syndra",
  "Tahm Kench", "Taliyah", "Talon", "Taric", "Teemo", "Thresh", "Tristana",
  "Trundle", "Tryndamere", "Twisted Fate", "Twitch",
  "Udyr", "Urgot",
  "Varus", "Vayne", "Veigar", "Vel'Koz", "Vex", "Vi", "Viego", "Viktor",
  "Vladimir", "Volibear",
  "Warwick", "Wukong",
  "Xayah", "Xerath", "Xin Zhao",
  "Yasuo", "Yone", "Yorick", "Yunara", "Yuumi",
  "Zaahir", "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra"
];

const TOTAL_JUGADORES = 4;

const el = {
  screens: document.querySelectorAll(".screen"),
  puntos: document.getElementById("puntos"),
  turnoLabel: document.getElementById("turno-label"),
  cartaLabel: document.getElementById("carta-label"),
  carta: document.getElementById("carta"),
  cartaRol: document.getElementById("carta-rol"),
  cartaValor: document.getElementById("carta-valor"),
  cartaFinal: document.getElementById("carta-final"),
  finalCampeon: document.getElementById("final-campeon"),
  finalImpostor: document.getElementById("final-impostor")
};

let estado = {
  campeon: null,
  impostor: null,
  turno: 1
};

function mostrar(id) {
  el.screens.forEach(s => s.classList.toggle("active", s.id === id));
}

function azar(max) {
  return Math.floor(Math.random() * max);
}

function nuevaPartida() {
  estado = {
    campeon: CAMPEONES[azar(CAMPEONES.length)],
    impostor: azar(TOTAL_JUGADORES) + 1,
    turno: 1
  };
  irAPasar();
}

function irAPasar() {
  el.puntos.innerHTML = "";
  for (let i = 1; i <= TOTAL_JUGADORES; i++) {
    const p = document.createElement("div");
    p.className = "punto" + (i < estado.turno ? " hecho" : "");
    el.puntos.appendChild(p);
  }
  el.turnoLabel.textContent = `Turno de Usuario ${estado.turno}`;
  mostrar("screen-pasar");
}

function verCarta() {
  const esImpostor = estado.turno === estado.impostor;
  el.cartaLabel.textContent = `Usuario ${estado.turno}`;
  el.carta.classList.toggle("impostor", esImpostor);
  el.cartaRol.textContent = esImpostor ? "Tu rol" : "El campeón es";
  el.cartaValor.textContent = esImpostor ? "SOS EL IMPOSTOR" : estado.campeon;
  mostrar("screen-carta");
}

function siguienteTurno() {
  estado.turno++;
  if (estado.turno > TOTAL_JUGADORES) {
    el.cartaFinal.style.display = "none";
    el.finalCampeon.textContent = estado.campeon;
    el.finalImpostor.textContent = `Usuario ${estado.impostor}`;
    mostrar("screen-fin");
    return;
  }
  irAPasar();
}

document.getElementById("btn-empezar").addEventListener("click", nuevaPartida);
document.getElementById("btn-ver").addEventListener("click", verCarta);
document.getElementById("btn-ocultar").addEventListener("click", siguienteTurno);
document.getElementById("btn-revelar").addEventListener("click", () => {
  el.cartaFinal.style.display = "block";
});

document.querySelectorAll("[data-reset]").forEach(btn => {
  btn.addEventListener("click", () => mostrar("screen-inicio"));
});
