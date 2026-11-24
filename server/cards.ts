/**
 * Card decks. SERVER ONLY — this file holds the answer key, so it must never be imported by the website.
 *
 * Sources:
 *  - ASAS, ION, DRUM questions: from the game manual, converted to multiple choice.
 *  - KOVALEN: the manual's Kovalen cards are blank, so these 10 are new. Please review them.
 *  - DRUM effect cards (rewards / penalties): the manual doesn't list them, so these 7 are new.
 */
import type { CoinKind } from "../shared/config.ts";
import type { DeckId, PublicQuestion } from "../shared/types.ts";

export interface QuestionCard {
  kind: "question";
  id: string;
  deck: DeckId;
  prompt: string;
  options: string[];
  answer: number; // index into options
}

export type DrumEffect =
  | { kind: "gain"; coin: CoinKind; count: number }
  | { kind: "lose"; coin: CoinKind; count: number }
  | { kind: "collectFromEach"; points: number }
  | { kind: "payEach"; points: number }
  | { kind: "move"; steps: number }
  | { kind: "goRadikal" };

export interface EffectCard {
  kind: "effect";
  id: string;
  deck: "drum";
  text: string;
  effect: DrumEffect;
}

export type Card = QuestionCard | EffectCard;

const q = (deck: DeckId, n: number, prompt: string, options: string[], answer: number): QuestionCard => ({
  kind: "question",
  id: `${deck}-${n}`,
  deck,
  prompt,
  options,
  answer,
});

const ASAS: QuestionCard[] = [
  q("asas", 1, "Ikatan ion terbentuk kerana tarikan antara apa?", [
    "Tarikan elektrostatik antara ion positif dan ion negatif",
    "Perkongsian elektron antara dua atom bukan logam",
    "Daya tarikan antara molekul",
    "Tarikan antara proton dan neutron",
  ], 0),
  q("asas", 2, "Ikatan ion melibatkan perkongsian atau pemindahan elektron?", [
    "Perkongsian elektron",
    "Pemindahan elektron",
  ], 1),
  q("asas", 3, "Unsur jenis apakah yang boleh membentuk ikatan ion?", [
    "Dua unsur bukan logam",
    "Satu unsur logam dan satu unsur bukan logam",
    "Dua unsur gas adi",
    "Dua unsur logam",
  ], 1),
  q("asas", 4, "Apakah zarah bercas positif dan negatif dipanggil?", [
    "Kation (positif) dan anion (negatif)",
    "Anion (positif) dan kation (negatif)",
    "Proton (positif) dan elektron (negatif)",
    "Isotop (positif) dan molekul (negatif)",
  ], 0),
  q("asas", 5, "Bina formula kimia bagi ion Al³⁺ dan O²⁻.", ["AlO", "Al₂O₃", "Al₃O₂", "AlO₂"], 1),
  q("asas", 6, "Apakah jenis ikatan antara unsur bukan logam dengan bukan logam?", [
    "Ikatan ion",
    "Ikatan kovalen",
    "Ikatan logam",
  ], 1),
  q("asas", 7, "Ikatan yang melibatkan perkongsian elektron ialah _______.", [
    "Ikatan ion",
    "Ikatan kovalen",
    "Ikatan hidrogen",
  ], 1),
  q("asas", 8, "Apakah jenis ikatan dalam molekul air (H₂O)?", ["Ikatan ion", "Ikatan kovalen", "Ikatan logam"], 1),
  q("asas", 9, "Molekul klorin (Cl₂) terbentuk melalui ikatan apa?", ["Ikatan ion", "Ikatan kovalen", "Ikatan logam"], 1),
  q("asas", 10, "Sebatian manakah mempunyai ikatan kovalen?", ["MgO", "KCl", "NH₃"], 2),
];

const ION: QuestionCard[] = [
  q("ion", 1, "Sebatian manakah melibatkan pemindahan elektron?", ["NH₃", "KCl", "O₂"], 1),
  q("ion", 2, "Atom Mg: 2.8.2, ion Mg²⁺: 2.8. Mengapa ion Mg²⁺ lebih stabil?", [
    "Ion telah mencapai susunan elektron oktet",
    "Ion telah menerima dua elektron",
    "Ion mempunyai lebih banyak proton",
    "Ion membentuk ikatan kovalen",
  ], 0),
  q("ion", 3, "Mengapa sebatian ion tidak mengalirkan arus elektrik dalam keadaan pepejal?", [
    "Ion tidak bebas bergerak",
    "Sebatian ion tidak mempunyai ion",
    "Elektron dikongsi antara atom",
    "Sebatian ion terdiri daripada molekul neutral",
  ], 0),
  q("ion", 4, "X → X⁺ + e⁻ dan Y + e⁻ → Y⁻. X: 2.8.1, Y: 2.8.7. Kenal pasti X, Y dan formula sebatian.", [
    "X = Na, Y = Cl, NaCl",
    "X = K, Y = F, KF",
    "X = Mg, Y = Cl, MgCl₂",
    "X = Na, Y = O, Na₂O",
  ], 0),
  q("ion", 5, "Ramalkan kesan jika daya tarikan elektrostatik antara ion menjadi lemah.", [
    "Ikatan ion menjadi lemah dan takat lebur menurun",
    "Ikatan ion menjadi kuat dan takat lebur meningkat",
    "Sebatian bertukar menjadi sebatian kovalen",
    "Tiada perubahan",
  ], 0),
  q("ion", 6, "Apakah yang dimaksudkan dengan ikatan ionik?", [
    "Ikatan antara dua atom yang berkongsi pasangan elektron",
    "Ikatan antara dua atom yang bertukar elektron untuk membentuk ion positif dan ion negatif",
    "Ikatan antara atom yang tidak melibatkan pemindahan elektron",
    "Ikatan antara atom yang mengongsi satu elektron",
  ], 1),
  q("ion", 7, "Apakah yang berlaku kepada atom magnesium (Mg) apabila ia membentuk ikatan ionik dengan oksigen (O)?", [
    "Mg menerima dua elektron dan menjadi Mg²⁻",
    "Mg kehilangan dua elektron dan menjadi Mg²⁺",
    "O kehilangan dua elektron dan menjadi O²⁻",
    "O menerima satu elektron dan menjadi O⁻",
  ], 1),
  q("ion", 8, "Atom logam X membentuk ion X²⁺ manakala atom Y membentuk ion Y⁻. Apakah formula sebatian yang terbentuk?", [
    "XY",
    "X₂Y",
    "XY₂",
    "X₂Y₃",
  ], 2),
  q("ion", 9, "Bagaimanakah ion klorida (Cl⁻) terbentuk daripada atom klorin?", [
    "Atom klorin menerima satu elektron",
    "Atom klorin kehilangan satu elektron",
    "Atom klorin berkongsi satu elektron",
    "Atom klorin kehilangan satu proton",
  ], 0),
  q("ion", 10, "Dalam keadaan apakah sebatian ion boleh mengalirkan arus elektrik?", [
    "Pepejal sahaja",
    "Leburan atau larutan akueus",
    "Gas sahaja",
    "Semua keadaan",
  ], 1),
];

// The manual's Kovalen cards are blank — new questions, please review.
const KOVALEN: QuestionCard[] = [
  q("kovalen", 1, "Ikatan kovalen terbentuk apabila atom-atom bukan logam _______.", [
    "Memindahkan elektron",
    "Berkongsi pasangan elektron",
    "Kehilangan proton",
    "Menerima neutron",
  ], 1),
  q("kovalen", 2, "Berapakah bilangan pasangan elektron yang dikongsi dalam molekul oksigen (O₂)?", ["1", "2", "3", "4"], 1),
  q("kovalen", 3, "Apakah jenis ikatan kovalen dalam molekul nitrogen (N₂)?", [
    "Ikatan tunggal",
    "Ikatan ganda dua",
    "Ikatan ganda tiga",
    "Ikatan ion",
  ], 2),
  q("kovalen", 4, "Antara berikut, yang manakah sebatian kovalen?", ["NaCl", "MgO", "CH₄", "CaF₂"], 2),
  q("kovalen", 5, "Mengapakah sebatian kovalen ringkas mempunyai takat lebur yang rendah?", [
    "Daya tarikan antara molekul adalah lemah",
    "Ikatan kovalen sangat lemah",
    "Ion bebas bergerak",
    "Elektron dipindahkan antara atom",
  ], 0),
  q("kovalen", 6, "Mengapakah sebatian kovalen tidak mengalirkan arus elektrik?", [
    "Terdiri daripada molekul neutral dan tiada ion bebas",
    "Ion-ionnya terikat dengan kuat",
    "Sebatian kovalen ialah logam",
    "Sebatian kovalen terlalu keras",
  ], 0),
  q("kovalen", 7, "Atom karbon (2.4) perlu berkongsi berapa elektron untuk mencapai susunan oktet?", ["2", "4", "6", "8"], 1),
  q("kovalen", 8, "Dalam molekul HCl, atom manakah yang lebih elektronegatif?", [
    "Hidrogen",
    "Klorin",
    "Kedua-duanya sama",
  ], 1),
  q("kovalen", 9, "Unsur X mempunyai susunan elektron 2.5. Apakah formula sebatian kovalen X dengan hidrogen?", [
    "XH",
    "XH₂",
    "XH₃",
    "XH₄",
  ], 2),
  q("kovalen", 10, "Molekul manakah mempunyai ikatan ganda dua?", ["H₂", "Cl₂", "CO₂", "CH₄"], 2),
];

// DRUM question cards: everyone answers at the same time.
const DRUM_QUESTIONS: QuestionCard[] = [
  q("drum", 1, "Mengapakah CO₂ ialah molekul kovalen walaupun mengandungi atom karbon dan oksigen?", [
    "Kedua-duanya bukan logam dan berkongsi elektron untuk mencapai kestabilan oktet",
    "Karbon ialah logam yang memindahkan elektron kepada oksigen",
    "Oksigen kehilangan elektron kepada karbon",
    "CO₂ terdiri daripada ion positif dan ion negatif",
  ], 0),
  q("drum", 2, "Antara NaCl dan H₂O, yang manakah lebih sesuai digunakan sebagai elektrolit?", [
    "NaCl, kerana menghasilkan ion bebas dalam larutan",
    "H₂O, kerana ia molekul kovalen",
    "Kedua-duanya sama baik",
    "Tiada satu pun",
  ], 0),
  q("drum", 3, "Apakah yang dimaksudkan dengan ikatan kovalen dan bagaimana ia terbentuk?", [
    "Dua atom berkongsi satu atau lebih pasangan elektron untuk mencapai kestabilan",
    "Satu atom memindahkan elektron kepada atom lain",
    "Ion positif menarik ion negatif",
    "Atom logam berkongsi lautan elektron",
  ], 0),
  q("drum", 4, "Mengapakah ikatan dalam molekul HCl ialah ikatan kovalen polar?", [
    "Klorin lebih elektronegatif dan menarik pasangan elektron yang dikongsi lebih dekat kepadanya",
    "Hidrogen memindahkan elektronnya kepada klorin sepenuhnya",
    "Hidrogen lebih elektronegatif daripada klorin",
    "HCl terdiri daripada ion H⁺ dan Cl⁻ dalam keadaan pepejal",
  ], 0),
  q("drum", 5, "Apakah yang dimaksudkan dengan peraturan oktet?", [
    "Atom cenderung mencapai lapan elektron dalam kulit valens, seperti gas mulia",
    "Atom mesti mempunyai lapan proton",
    "Setiap atom membentuk lapan ikatan",
    "Atom mesti mempunyai lapan neutron",
  ], 0),
  q("drum", 6, "Jika jejari ion meningkat tetapi cas tetap sama, apakah kesan terhadap ikatan ion?", [
    "Ikatan lebih kuat, takat lebur naik",
    "Ikatan lebih lemah, takat lebur turun",
    "Tiada perubahan",
    "Ion menjadi anion",
  ], 1),
  // Answer kept as in the manual (D). Teams may want to double-check this one.
  q("drum", 7, "Apakah kesan perbezaan saiz antara dua ion dalam ikatan ionik terhadap kestabilan sebatian?", [
    "Semakin besar perbezaan saiz ion, semakin kuat ikatan ionik",
    "Semakin kecil perbezaan saiz ion, semakin kuat ikatan ionik",
    "Perbezaan saiz ion tidak mempengaruhi kestabilan ikatan ionik",
    "Semakin besar perbezaan saiz ion, semakin lemah ikatan ionik",
  ], 3),
  q("drum", 8, "Apakah yang dimaksudkan dengan keadaan ion bebas dalam sebatian ionik?", [
    "Ion-ion terpisah daripada struktur kristal dan bergerak bebas dalam larutan atau leburan",
    "Ion-ion terikat kuat dalam kekisi kristal",
    "Elektron dikongsi antara ion",
    "Ion-ion bertukar menjadi atom neutral",
  ], 0),
  q("drum", 9, "Antara ikatan ion berikut, yang manakah PALING kuat?", ["Na⁺ – Cl⁻", "Mg²⁺ – O²⁻", "K⁺ – Br⁻", "Li⁺ – I⁻"], 1),
];

// DRUM reward / penalty cards — not in the manual, new.
const DRUM_EFFECTS: EffectCard[] = [
  { kind: "effect", id: "drum-e1", deck: "drum", text: "Tindak balas berjaya! Ambil 1 koin oktet daripada bank.", effect: { kind: "gain", coin: "oktet", count: 1 } },
  { kind: "effect", id: "drum-e2", deck: "drum", text: "Elektron bebas! Ambil 2 koin singlet daripada bank.", effect: { kind: "gain", coin: "singlet", count: 2 } },
  { kind: "effect", id: "drum-e3", deck: "drum", text: "Ikatan kukuh! Setiap pemain lain memberi anda 1 koin singlet.", effect: { kind: "collectFromEach", points: 1 } },
  { kind: "effect", id: "drum-e4", deck: "drum", text: "Pemangkin! Maju 3 petak.", effect: { kind: "move", steps: 3 } },
  { kind: "effect", id: "drum-e5", deck: "drum", text: "Tumpahan bahan kimia! Bayar 1 koin duplet kepada bank.", effect: { kind: "lose", coin: "duplet", count: 1 } },
  { kind: "effect", id: "drum-e6", deck: "drum", text: "Letupan kecil! Pergi ke petak RADIKAL dan rehat satu pusingan.", effect: { kind: "goRadikal" } },
  { kind: "effect", id: "drum-e7", deck: "drum", text: "Derma ion! Beri 1 koin singlet kepada setiap pemain lain.", effect: { kind: "payEach", points: 1 } },
];

export const CARDS: Record<string, Card> = Object.fromEntries(
  [...ASAS, ...ION, ...KOVALEN, ...DRUM_QUESTIONS, ...DRUM_EFFECTS].map((c) => [c.id, c]),
);

export const DECK_CARD_IDS: Record<DeckId, string[]> = {
  asas: ASAS.map((c) => c.id),
  ion: ION.map((c) => c.id),
  kovalen: KOVALEN.map((c) => c.id),
  drum: [...DRUM_QUESTIONS, ...DRUM_EFFECTS].map((c) => c.id), // 16 cards, like the manual
};

export function toPublic(card: QuestionCard): PublicQuestion {
  return { id: card.id, deck: card.deck, prompt: card.prompt, options: card.options };
}
