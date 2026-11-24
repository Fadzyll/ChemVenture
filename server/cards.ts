/**
 * Card decks, in English and Malay. SERVER ONLY — this file holds the answer key,
 * so it must never be imported by the website.
 *
 * Sources:
 *  - ASAS, ION, DRUM questions: from the game manual (Malay), converted to multiple choice,
 *    with English translations added.
 *  - KOVALEN: the manual's Kovalen cards are blank, so these 10 are new. Please review them.
 *  - DRUM effect cards (rewards / penalties): the manual doesn't list them, so these 7 are new.
 */
import type { CoinKind } from "../shared/config.ts";
import type { Text } from "../shared/i18n.ts";
import type { DeckId, PublicQuestion } from "../shared/types.ts";

export interface QuestionCard {
  kind: "question";
  id: string;
  deck: DeckId;
  prompt: Text;
  options: Text[];
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
  text: Text;
  effect: DrumEffect;
}

export type Card = QuestionCard | EffectCard;

type Pair = [en: string, ms: string];
const T = ([en, ms]: Pair): Text => ({ en, ms });
/** Same in both languages (formulas, numbers). */
const S = (s: string): Pair => [s, s];

const q = (deck: DeckId, n: number, prompt: Pair, options: Pair[], answer: number): QuestionCard => ({
  kind: "question",
  id: `${deck}-${n}`,
  deck,
  prompt: T(prompt),
  options: options.map(T),
  answer,
});

const ASAS: QuestionCard[] = [
  q("asas", 1, ["What attraction forms an ionic bond?", "Ikatan ion terbentuk kerana tarikan antara apa?"], [
    ["Electrostatic attraction between positive and negative ions", "Tarikan elektrostatik antara ion positif dan ion negatif"],
    ["Sharing of electrons between two non-metal atoms", "Perkongsian elektron antara dua atom bukan logam"],
    ["Attraction between molecules", "Daya tarikan antara molekul"],
    ["Attraction between protons and neutrons", "Tarikan antara proton dan neutron"],
  ], 0),
  q("asas", 2, ["Does an ionic bond involve sharing or transferring electrons?", "Ikatan ion melibatkan perkongsian atau pemindahan elektron?"], [
    ["Sharing electrons", "Perkongsian elektron"],
    ["Transferring electrons", "Pemindahan elektron"],
  ], 1),
  q("asas", 3, ["Which kinds of elements can form an ionic bond?", "Unsur jenis apakah yang boleh membentuk ikatan ion?"], [
    ["Two non-metal elements", "Dua unsur bukan logam"],
    ["One metal and one non-metal element", "Satu unsur logam dan satu unsur bukan logam"],
    ["Two noble gas elements", "Dua unsur gas adi"],
    ["Two metal elements", "Dua unsur logam"],
  ], 1),
  q("asas", 4, ["What are positively and negatively charged particles called?", "Apakah zarah bercas positif dan negatif dipanggil?"], [
    ["Cation (positive) and anion (negative)", "Kation (positif) dan anion (negatif)"],
    ["Anion (positive) and cation (negative)", "Anion (positif) dan kation (negatif)"],
    ["Proton (positive) and electron (negative)", "Proton (positif) dan elektron (negatif)"],
    ["Isotope (positive) and molecule (negative)", "Isotop (positif) dan molekul (negatif)"],
  ], 0),
  q("asas", 5, ["Write the chemical formula for the ions Al³⁺ and O²⁻.", "Bina formula kimia bagi ion Al³⁺ dan O²⁻."], [S("AlO"), S("Al₂O₃"), S("Al₃O₂"), S("AlO₂")], 1),
  q("asas", 6, ["What type of bond forms between two non-metals?", "Apakah jenis ikatan antara unsur bukan logam dengan bukan logam?"], [
    ["Ionic bond", "Ikatan ion"],
    ["Covalent bond", "Ikatan kovalen"],
    ["Metallic bond", "Ikatan logam"],
  ], 1),
  q("asas", 7, ["A bond that involves sharing electrons is a _______.", "Ikatan yang melibatkan perkongsian elektron ialah _______."], [
    ["Ionic bond", "Ikatan ion"],
    ["Covalent bond", "Ikatan kovalen"],
    ["Hydrogen bond", "Ikatan hidrogen"],
  ], 1),
  q("asas", 8, ["What type of bond is found in a water molecule (H₂O)?", "Apakah jenis ikatan dalam molekul air (H₂O)?"], [
    ["Ionic bond", "Ikatan ion"],
    ["Covalent bond", "Ikatan kovalen"],
    ["Metallic bond", "Ikatan logam"],
  ], 1),
  q("asas", 9, ["What type of bond forms a chlorine molecule (Cl₂)?", "Molekul klorin (Cl₂) terbentuk melalui ikatan apa?"], [
    ["Ionic bond", "Ikatan ion"],
    ["Covalent bond", "Ikatan kovalen"],
    ["Metallic bond", "Ikatan logam"],
  ], 1),
  q("asas", 10, ["Which compound has covalent bonds?", "Sebatian manakah mempunyai ikatan kovalen?"], [S("MgO"), S("KCl"), S("NH₃")], 2),
];

const ION: QuestionCard[] = [
  q("ion", 1, ["Which compound involves a transfer of electrons?", "Sebatian manakah melibatkan pemindahan elektron?"], [S("NH₃"), S("KCl"), S("O₂")], 1),
  q("ion", 2, ["Mg atom: 2.8.2, Mg²⁺ ion: 2.8. Why is the Mg²⁺ ion more stable?", "Atom Mg: 2.8.2, ion Mg²⁺: 2.8. Mengapa ion Mg²⁺ lebih stabil?"], [
    ["The ion has an octet electron arrangement", "Ion telah mencapai susunan elektron oktet"],
    ["The ion has gained two electrons", "Ion telah menerima dua elektron"],
    ["The ion has more protons", "Ion mempunyai lebih banyak proton"],
    ["The ion forms a covalent bond", "Ion membentuk ikatan kovalen"],
  ], 0),
  q("ion", 3, ["Why can't an ionic compound conduct electricity when solid?", "Mengapa sebatian ion tidak mengalirkan arus elektrik dalam keadaan pepejal?"], [
    ["The ions are not free to move", "Ion tidak bebas bergerak"],
    ["Ionic compounds have no ions", "Sebatian ion tidak mempunyai ion"],
    ["Electrons are shared between atoms", "Elektron dikongsi antara atom"],
    ["Ionic compounds are made of neutral molecules", "Sebatian ion terdiri daripada molekul neutral"],
  ], 0),
  q("ion", 4, ["X → X⁺ + e⁻ and Y + e⁻ → Y⁻. X: 2.8.1, Y: 2.8.7. Identify X, Y and the compound's formula.", "X → X⁺ + e⁻ dan Y + e⁻ → Y⁻. X: 2.8.1, Y: 2.8.7. Kenal pasti X, Y dan formula sebatian."], [
    S("X = Na, Y = Cl, NaCl"),
    S("X = K, Y = F, KF"),
    S("X = Mg, Y = Cl, MgCl₂"),
    S("X = Na, Y = O, Na₂O"),
  ], 0),
  q("ion", 5, ["Predict what happens if the electrostatic attraction between ions becomes weaker.", "Ramalkan kesan jika daya tarikan elektrostatik antara ion menjadi lemah."], [
    ["The ionic bond weakens and the melting point falls", "Ikatan ion menjadi lemah dan takat lebur menurun"],
    ["The ionic bond strengthens and the melting point rises", "Ikatan ion menjadi kuat dan takat lebur meningkat"],
    ["The compound becomes a covalent compound", "Sebatian bertukar menjadi sebatian kovalen"],
    ["No change", "Tiada perubahan"],
  ], 0),
  q("ion", 6, ["What is an ionic bond?", "Apakah yang dimaksudkan dengan ikatan ionik?"], [
    ["A bond between two atoms that share a pair of electrons", "Ikatan antara dua atom yang berkongsi pasangan elektron"],
    ["A bond between two atoms that transfer electrons to form positive and negative ions", "Ikatan antara dua atom yang bertukar elektron untuk membentuk ion positif dan ion negatif"],
    ["A bond between atoms that doesn't involve transferring electrons", "Ikatan antara atom yang tidak melibatkan pemindahan elektron"],
    ["A bond between atoms that share one electron", "Ikatan antara atom yang mengongsi satu elektron"],
  ], 1),
  q("ion", 7, ["What happens to a magnesium (Mg) atom when it forms an ionic bond with oxygen (O)?", "Apakah yang berlaku kepada atom magnesium (Mg) apabila ia membentuk ikatan ionik dengan oksigen (O)?"], [
    ["Mg gains two electrons and becomes Mg²⁻", "Mg menerima dua elektron dan menjadi Mg²⁻"],
    ["Mg loses two electrons and becomes Mg²⁺", "Mg kehilangan dua elektron dan menjadi Mg²⁺"],
    ["O loses two electrons and becomes O²⁻", "O kehilangan dua elektron dan menjadi O²⁻"],
    ["O gains one electron and becomes O⁻", "O menerima satu elektron dan menjadi O⁻"],
  ], 1),
  q("ion", 8, ["Metal atom X forms X²⁺ while atom Y forms Y⁻. What is the formula of the compound formed?", "Atom logam X membentuk ion X²⁺ manakala atom Y membentuk ion Y⁻. Apakah formula sebatian yang terbentuk?"], [
    S("XY"), S("X₂Y"), S("XY₂"), S("X₂Y₃"),
  ], 2),
  q("ion", 9, ["How does a chlorine atom become a chloride ion (Cl⁻)?", "Bagaimanakah ion klorida (Cl⁻) terbentuk daripada atom klorin?"], [
    ["The chlorine atom gains one electron", "Atom klorin menerima satu elektron"],
    ["The chlorine atom loses one electron", "Atom klorin kehilangan satu elektron"],
    ["The chlorine atom shares one electron", "Atom klorin berkongsi satu elektron"],
    ["The chlorine atom loses one proton", "Atom klorin kehilangan satu proton"],
  ], 0),
  q("ion", 10, ["In what state can an ionic compound conduct electricity?", "Dalam keadaan apakah sebatian ion boleh mengalirkan arus elektrik?"], [
    ["Solid only", "Pepejal sahaja"],
    ["Molten or dissolved in water", "Leburan atau larutan akueus"],
    ["Gas only", "Gas sahaja"],
    ["Any state", "Semua keadaan"],
  ], 1),
];

// The manual's Kovalen cards are blank — new questions, please review.
const KOVALEN: QuestionCard[] = [
  q("kovalen", 1, ["A covalent bond forms when non-metal atoms _______.", "Ikatan kovalen terbentuk apabila atom-atom bukan logam _______."], [
    ["Transfer electrons", "Memindahkan elektron"],
    ["Share pairs of electrons", "Berkongsi pasangan elektron"],
    ["Lose protons", "Kehilangan proton"],
    ["Gain neutrons", "Menerima neutron"],
  ], 1),
  q("kovalen", 2, ["How many pairs of electrons are shared in an oxygen molecule (O₂)?", "Berapakah bilangan pasangan elektron yang dikongsi dalam molekul oksigen (O₂)?"], [S("1"), S("2"), S("3"), S("4")], 1),
  q("kovalen", 3, ["What type of covalent bond is in a nitrogen molecule (N₂)?", "Apakah jenis ikatan kovalen dalam molekul nitrogen (N₂)?"], [
    ["Single bond", "Ikatan tunggal"],
    ["Double bond", "Ikatan ganda dua"],
    ["Triple bond", "Ikatan ganda tiga"],
    ["Ionic bond", "Ikatan ion"],
  ], 2),
  q("kovalen", 4, ["Which of these is a covalent compound?", "Antara berikut, yang manakah sebatian kovalen?"], [S("NaCl"), S("MgO"), S("CH₄"), S("CaF₂")], 2),
  q("kovalen", 5, ["Why do simple covalent compounds have low melting points?", "Mengapakah sebatian kovalen ringkas mempunyai takat lebur yang rendah?"], [
    ["The forces between molecules are weak", "Daya tarikan antara molekul adalah lemah"],
    ["Covalent bonds are very weak", "Ikatan kovalen sangat lemah"],
    ["The ions move freely", "Ion bebas bergerak"],
    ["Electrons are transferred between atoms", "Elektron dipindahkan antara atom"],
  ], 0),
  q("kovalen", 6, ["Why don't covalent compounds conduct electricity?", "Mengapakah sebatian kovalen tidak mengalirkan arus elektrik?"], [
    ["They are made of neutral molecules with no free ions", "Terdiri daripada molekul neutral dan tiada ion bebas"],
    ["Their ions are held very tightly", "Ion-ionnya terikat dengan kuat"],
    ["Covalent compounds are metals", "Sebatian kovalen ialah logam"],
    ["Covalent compounds are too hard", "Sebatian kovalen terlalu keras"],
  ], 0),
  q("kovalen", 7, ["How many electrons must a carbon atom (2.4) share to reach an octet?", "Atom karbon (2.4) perlu berkongsi berapa elektron untuk mencapai susunan oktet?"], [S("2"), S("4"), S("6"), S("8")], 1),
  q("kovalen", 8, ["In an HCl molecule, which atom is more electronegative?", "Dalam molekul HCl, atom manakah yang lebih elektronegatif?"], [
    ["Hydrogen", "Hidrogen"],
    ["Chlorine", "Klorin"],
    ["Both are the same", "Kedua-duanya sama"],
  ], 1),
  q("kovalen", 9, ["Element X has the electron arrangement 2.5. What is the formula of its covalent compound with hydrogen?", "Unsur X mempunyai susunan elektron 2.5. Apakah formula sebatian kovalen X dengan hidrogen?"], [
    S("XH"), S("XH₂"), S("XH₃"), S("XH₄"),
  ], 2),
  q("kovalen", 10, ["Which molecule has a double bond?", "Molekul manakah mempunyai ikatan ganda dua?"], [S("H₂"), S("Cl₂"), S("CO₂"), S("CH₄")], 2),
];

// DRUM question cards: everyone answers at the same time.
const DRUM_QUESTIONS: QuestionCard[] = [
  q("drum", 1, ["Why is CO₂ a covalent molecule even though it contains carbon and oxygen atoms?", "Mengapakah CO₂ ialah molekul kovalen walaupun mengandungi atom karbon dan oksigen?"], [
    ["Both are non-metals and share electrons to reach a stable octet", "Kedua-duanya bukan logam dan berkongsi elektron untuk mencapai kestabilan oktet"],
    ["Carbon is a metal that transfers electrons to oxygen", "Karbon ialah logam yang memindahkan elektron kepada oksigen"],
    ["Oxygen loses electrons to carbon", "Oksigen kehilangan elektron kepada karbon"],
    ["CO₂ is made of positive and negative ions", "CO₂ terdiri daripada ion positif dan ion negatif"],
  ], 0),
  q("drum", 2, ["Between NaCl and H₂O, which is more suitable as an electrolyte?", "Antara NaCl dan H₂O, yang manakah lebih sesuai digunakan sebagai elektrolit?"], [
    ["NaCl, because it produces free ions in solution", "NaCl, kerana menghasilkan ion bebas dalam larutan"],
    ["H₂O, because it is a covalent molecule", "H₂O, kerana ia molekul kovalen"],
    ["Both are equally good", "Kedua-duanya sama baik"],
    ["Neither", "Tiada satu pun"],
  ], 0),
  q("drum", 3, ["What is a covalent bond and how does it form?", "Apakah yang dimaksudkan dengan ikatan kovalen dan bagaimana ia terbentuk?"], [
    ["Two atoms share one or more pairs of electrons to become stable", "Dua atom berkongsi satu atau lebih pasangan elektron untuk mencapai kestabilan"],
    ["One atom transfers electrons to another atom", "Satu atom memindahkan elektron kepada atom lain"],
    ["Positive ions attract negative ions", "Ion positif menarik ion negatif"],
    ["Metal atoms share a sea of electrons", "Atom logam berkongsi lautan elektron"],
  ], 0),
  q("drum", 4, ["Why is the bond in an HCl molecule a polar covalent bond?", "Mengapakah ikatan dalam molekul HCl ialah ikatan kovalen polar?"], [
    ["Chlorine is more electronegative and pulls the shared electron pair closer", "Klorin lebih elektronegatif dan menarik pasangan elektron yang dikongsi lebih dekat kepadanya"],
    ["Hydrogen transfers its electron completely to chlorine", "Hidrogen memindahkan elektronnya kepada klorin sepenuhnya"],
    ["Hydrogen is more electronegative than chlorine", "Hidrogen lebih elektronegatif daripada klorin"],
    ["HCl is made of H⁺ and Cl⁻ ions in the solid state", "HCl terdiri daripada ion H⁺ dan Cl⁻ dalam keadaan pepejal"],
  ], 0),
  q("drum", 5, ["What is the octet rule?", "Apakah yang dimaksudkan dengan peraturan oktet?"], [
    ["Atoms tend to get eight electrons in their outer shell, like a noble gas", "Atom cenderung mencapai lapan elektron dalam kulit valens, seperti gas mulia"],
    ["Atoms must have eight protons", "Atom mesti mempunyai lapan proton"],
    ["Every atom forms eight bonds", "Setiap atom membentuk lapan ikatan"],
    ["Atoms must have eight neutrons", "Atom mesti mempunyai lapan neutron"],
  ], 0),
  q("drum", 6, ["If the ionic radius increases but the charge stays the same, what happens to the ionic bond?", "Jika jejari ion meningkat tetapi cas tetap sama, apakah kesan terhadap ikatan ion?"], [
    ["Stronger bond, higher melting point", "Ikatan lebih kuat, takat lebur naik"],
    ["Weaker bond, lower melting point", "Ikatan lebih lemah, takat lebur turun"],
    ["No change", "Tiada perubahan"],
    ["The ion becomes an anion", "Ion menjadi anion"],
  ], 1),
  // Answer kept as in the manual (D). Teams may want to double-check this one.
  q("drum", 7, ["How does the size difference between two ions affect the stability of an ionic compound?", "Apakah kesan perbezaan saiz antara dua ion dalam ikatan ionik terhadap kestabilan sebatian?"], [
    ["The bigger the size difference, the stronger the ionic bond", "Semakin besar perbezaan saiz ion, semakin kuat ikatan ionik"],
    ["The smaller the size difference, the stronger the ionic bond", "Semakin kecil perbezaan saiz ion, semakin kuat ikatan ionik"],
    ["The size difference doesn't affect stability", "Perbezaan saiz ion tidak mempengaruhi kestabilan ikatan ionik"],
    ["The bigger the size difference, the weaker the ionic bond", "Semakin besar perbezaan saiz ion, semakin lemah ikatan ionik"],
  ], 3),
  q("drum", 8, ["What does \"free ions\" mean in an ionic compound?", "Apakah yang dimaksudkan dengan keadaan ion bebas dalam sebatian ionik?"], [
    ["Ions separated from the crystal lattice, moving freely in a solution or melt", "Ion-ion terpisah daripada struktur kristal dan bergerak bebas dalam larutan atau leburan"],
    ["Ions held tightly in the crystal lattice", "Ion-ion terikat kuat dalam kekisi kristal"],
    ["Electrons shared between ions", "Elektron dikongsi antara ion"],
    ["Ions turning back into neutral atoms", "Ion-ion bertukar menjadi atom neutral"],
  ], 0),
  q("drum", 9, ["Which of these ionic bonds is the STRONGEST?", "Antara ikatan ion berikut, yang manakah PALING kuat?"], [S("Na⁺ – Cl⁻"), S("Mg²⁺ – O²⁻"), S("K⁺ – Br⁻"), S("Li⁺ – I⁻")], 1),
];

const e = (n: number, text: Pair, effect: DrumEffect): EffectCard => ({ kind: "effect", id: `drum-e${n}`, deck: "drum", text: T(text), effect });

// DRUM reward / penalty cards — not in the manual, new.
const DRUM_EFFECTS: EffectCard[] = [
  e(1, ["Successful reaction! Take 1 octet coin from the bank.", "Tindak balas berjaya! Ambil 1 koin oktet daripada bank."], { kind: "gain", coin: "oktet", count: 1 }),
  e(2, ["Free electrons! Take 2 singlet coins from the bank.", "Elektron bebas! Ambil 2 koin singlet daripada bank."], { kind: "gain", coin: "singlet", count: 2 }),
  e(3, ["Strong bond! Every other player gives you 1 singlet coin.", "Ikatan kukuh! Setiap pemain lain memberi anda 1 koin singlet."], { kind: "collectFromEach", points: 1 }),
  e(4, ["Catalyst! Move forward 3 squares.", "Pemangkin! Maju 3 petak."], { kind: "move", steps: 3 }),
  e(5, ["Chemical spill! Pay 1 duplet coin to the bank.", "Tumpahan bahan kimia! Bayar 1 koin duplet kepada bank."], { kind: "lose", coin: "duplet", count: 1 }),
  e(6, ["Small explosion! Go to RADICAL and sit out one round.", "Letupan kecil! Pergi ke petak RADIKAL dan rehat satu pusingan."], { kind: "goRadikal" }),
  e(7, ["Ion donation! Give 1 singlet coin to every other player.", "Derma ion! Beri 1 koin singlet kepada setiap pemain lain."], { kind: "payEach", points: 1 }),
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
