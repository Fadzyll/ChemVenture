/**
 * The 22 squares of the ChemVenture board, in play order (clockwise),
 * starting at REAKSI (bottom-right corner) and moving left along the bottom row.
 */
export type SquareType = "reaksi" | "asas" | "ion" | "kovalen" | "drum" | "radikal" | "neutral" | "gangguan";

export interface Square {
  index: number;
  type: SquareType;
  /** grid cell on the 8 x 5 board image (col 0 = left, row 0 = top) */
  col: number;
  row: number;
}

const ORDER: SquareType[] = [
  "reaksi", "asas", "ion", "kovalen", "drum", "ion", "kovalen", // bottom row, right → left
  "radikal", "ion", "asas", "kovalen", // bottom-left corner, then up the left side
  "neutral", "drum", "ion", "kovalen", "asas", "ion", "kovalen", // top row, left → right
  "gangguan", "ion", "drum", "kovalen", // top-right corner, then down the right side
];

function cellFor(i: number): { col: number; row: number } {
  if (i <= 7) return { col: 7 - i, row: 4 }; // bottom row
  if (i <= 10) return { col: 0, row: 4 - (i - 7) }; // left side
  if (i <= 18) return { col: i - 11, row: 0 }; // top row
  return { col: 7, row: i - 18 }; // right side
}

export const BOARD: Square[] = ORDER.map((type, index) => ({ index, type, ...cellFor(index) }));
export const BOARD_SIZE = BOARD.length; // 22
export const REAKSI_INDEX = 0;
export const RADIKAL_INDEX = 7;

/** Where the tile grid sits on /img/board.jpg, as fractions of the image size. */
export const BOARD_IMAGE = {
  src: "/img/board.jpg",
  aspect: 2150 / 1521,
  left: 0.0227,
  top: 0.0374,
  cellW: 0.1191,
  cellH: 0.185,
};

export const SQUARE_LABEL: Record<SquareType, string> = {
  reaksi: "REAKSI",
  asas: "ASAS",
  ion: "ION",
  kovalen: "KOVALEN",
  drum: "DRUM",
  radikal: "RADIKAL",
  neutral: "NEUTRAL",
  gangguan: "GANGGUAN RADIKAL",
};

export const SQUARE_COLOR: Record<SquareType, string> = {
  reaksi: "#ffffff",
  asas: "#1fa34a",
  ion: "#ff8a1f",
  kovalen: "#ffd21f",
  drum: "#f2301f",
  radikal: "#2bb3ff",
  neutral: "#ffd84d",
  gangguan: "#5d7d3a",
};
