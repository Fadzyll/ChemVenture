/**
 * Game numbers. The manual doesn't give these, so they are our assumptions.
 * Change them here: both the server and the screens read from this file.
 */
export type CoinKind = "singlet" | "duplet" | "oktet";
export type Coins = Record<CoinKind, number>;

export const COIN_VALUE: Coins = { singlet: 1, duplet: 2, oktet: 8 };
export const COIN_LABEL: Record<CoinKind, string> = { singlet: "Singlet", duplet: "Duplet", oktet: "Oktet" };

/** Coins each player starts with (3×1 + 2×2 + 1×8 = 15 points). */
export const START_COINS: Coins = { singlet: 3, duplet: 2, oktet: 1 };

export const GAME_MINUTES = 20;
export const QUESTION_SECONDS = 30;
export const DRUM_QUESTION_SECONDS = 30;
export const CHOICE_SECONDS = 20;
export const RESULT_SECONDS = 5;

/** Passing or landing on REAKSI. */
export const REAKSI_BONUS: Partial<Coins> = { duplet: 1 };
/** RADIKAL: pay to leave. GANGGUAN: pay to stay. */
export const ESCAPE_COST: Partial<Coins> = { singlet: 1, duplet: 1 };

export const REWARD = {
  asasCorrect: { singlet: 1 } as Partial<Coins>,
  ionKovalenCorrect: { duplet: 1 } as Partial<Coins>,
  drumQuestionCorrect: { duplet: 1 } as Partial<Coins>,
};
export const PENALTY = {
  wrongAnswer: { singlet: 1 } as Partial<Coins>,
};

export function coinPoints(c: Partial<Coins>): number {
  return (c.singlet ?? 0) * COIN_VALUE.singlet + (c.duplet ?? 0) * COIN_VALUE.duplet + (c.oktet ?? 0) * COIN_VALUE.oktet;
}
