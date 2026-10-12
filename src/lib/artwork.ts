/** Official-artwork ids for the Unite roster. Odd forms use their PokéAPI form id. */
export const ARTWORK_ID: Record<string, number> = {
  Absol: 359,
  Aegislash: 681,
  Alcremie: 869,
  Armarouge: 936,
  Articuno: 144,
  Azumarill: 184,
  Blastoise: 9,
  Blaziken: 257,
  Blissey: 242,
  Buzzwole: 794,
  Ceruledge: 937,
  Chandelure: 609,
  Charizard: 6,
  "Mega-Charizard-X": 10034,
  "Mega-Charizard-Y": 10035,
  Cinderace: 815,
  Clefable: 36,
  Comfey: 764,
  Cramorant: 845,
  Crustle: 558,
  Darkrai: 491,
  Decidueye: 724,
  Delphox: 655,
  Dhelmise: 781,
  Dodrio: 85,
  Dragapult: 887,
  Dragonite: 149,
  Duraludon: 884,
  Eldegoss: 830,
  Empoleon: 395,
  Espeon: 196,
  Falinks: 870,
  Feraligatr: 160,
  Garchomp: 445,
  Gardevoir: 282,
  Gengar: 94,
  Glaceon: 471,
  Goodra: 706,
  Greedent: 820,
  Greninja: 658,
  Gyarados: 130,
  "Mega-Gyarados": 10041,
  "Ho-Oh": 250,
  Hoopa: 720,
  Inteleon: 818,
  Lapras: 131,
  Latias: 380,
  Latios: 381,
  Leafeon: 470,
  Lucario: 448,
  "Mega-Lucario": 10059,
  Machamp: 68,
  Mamoswine: 473,
  Meganium: 154,
  Meowscarada: 908,
  Meowth: 52,
  Metagross: 376,
  Mew: 151,
  MewtwoX: 10043,
  MewtwoY: 10044,
  Mimikyu: 778,
  Miraidon: 1008,
  Moltres: 146,
  Morpeko: 877,
  "Mr.Mime": 10168,
  Ninetales: 10104,
  Palkia: 484,
  Pawmot: 923,
  Pikachu: 25,
  Psyduck: 54,
  Quaquaval: 914,
  Raichu: 26,
  Rapidash: 10163,
  Reshiram: 643,
  Sableye: 302,
  Scizor: 212,
  Scyther: 123,
  Sirfetchd: 865,
  Skeledirge: 911,
  Slowbro: 80,
  Snorlax: 143,
  Solgaleo: 791,
  Suicune: 245,
  Sylveon: 700,
  Talonflame: 663,
  Tinkaton: 959,
  Toxtricity: 849,
  Trevenant: 709,
  Tsareena: 763,
  Typhlosion: 157,
  Tyranitar: 248,
  Umbreon: 197,
  Urshifu: 892,
  Vaporeon: 134,
  Venusaur: 3,
  Wigglytuff: 40,
  Yveltal: 717,
  Zacian: 888,
  Zapdos: 145,
  Zeraora: 807,
  Zoroark: 571,
};

export function artworkUrl(name: string): string | null {
  const id = ARTWORK_ID[name];
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/** Unite portrait shipped with the prototype. Falls back to PokéAPI artwork. */
export function portraitUrl(name: string): string {
  const file = name.replace(/'/g, "").replace(/\s+/g, "-");
  return `/unite/${encodeURIComponent(file)}.png`;
}

export async function downloadNameplate(name: string): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#070b12";
  ctx.fillRect(0, 0, 800, 1000);
  ctx.strokeStyle = "#f0c14a";
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, 744, 944);

  try {
    const img = new Image();
    img.src = portraitUrl(name);
    await img.decode();
    const box = 560;
    const scale = Math.min(box / img.width, box / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (800 - dw) / 2, 80 + (box - dh) / 2, dw, dh);
  } catch {
    /* The name still prints if the portrait is missing. */
  }

  try {
    await document.fonts.load('700 84px "Barlow Condensed"');
  } catch {
    /* System sans is fine. */
  }

  ctx.fillStyle = "#f4efe4";
  ctx.font = '700 84px "Barlow Condensed", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 400, 760, 700);
  ctx.fillStyle = "#f0c14a";
  ctx.font = '700 28px Figtree, sans-serif';
  ctx.fillText("POKÉMON SOCIAL", 400, 860);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${name.replace(/[^\w. -]+/g, "").trim() || "pokemon"}-pokemon-social.png`;
  link.click();
}
