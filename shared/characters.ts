export const CHARACTER_IDS = ["oxyra", "ghoston", "mystra", "quark", "calco"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface Character {
  id: CharacterId;
  name: string;
  /** Power text from the manual (Malay) */
  power: string;
  /** English summary, for the team */
  powerEn: string;
  color: string;
  image: string;
}

/** Every power can be used 2 times per game (manual: "Had"). */
export const POWER_USES = 2;

export const CHARACTERS: Record<CharacterId, Character> = {
  oxyra: {
    id: "oxyra",
    name: "Oxyra",
    power: "Mengambil 1 koin duplet daripada bank.",
    powerEn: "Take 1 duplet coin from the bank.",
    color: "#5aa9ff",
    image: "/characters/oxyra.png",
  },
  ghoston: {
    id: "ghoston",
    name: "Ghoston",
    power: "Mengambil 2 koin singlet daripada mana-mana pemain.",
    powerEn: "Take 2 singlet coins from any player.",
    color: "#4fd18b",
    image: "/characters/ghoston.png",
  },
  mystra: {
    id: "mystra",
    name: "Mystra",
    power:
      "Boleh mencabar pemain lain untuk menjawab soalan pemain tersebut (kad soalan ion/kovalen sahaja).",
    powerEn: "Challenge another player to answer your Ion/Kovalen question.",
    color: "#e0457b",
    image: "/characters/mystra.png",
  },
  quark: {
    id: "quark",
    name: "Quark",
    power: "Boleh melihat & memilih soalan yang ingin dijawab jika menjejak petak ion/kovalen.",
    powerEn: "On Ion/Kovalen squares, see the questions and choose one.",
    color: "#f2a33a",
    image: "/characters/quark.png",
  },
  calco: {
    id: "calco",
    name: "Calco",
    power:
      "Boleh menghalang pemain lain mendapat ganjaran jika pemain lain berjaya menjawab kad soalan ion/kovalen.",
    powerEn: "Block another player's reward after they answer an Ion/Kovalen card correctly.",
    color: "#9b7bff",
    image: "/characters/calco.png",
  },
};

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === "string" && (CHARACTER_IDS as readonly string[]).includes(v);
}
