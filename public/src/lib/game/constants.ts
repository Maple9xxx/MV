export const TILE = 48;
export const COLS = 30;
export const ROWS = 22;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;
export const SAVE_KEY = "mayvang-save";
export const SAVE_VERSION = 2;
export const MAX_ENERGY = 100;
export const PLAYER_SPEED = 128;
export const PLAYER_RADIUS = 10;

export const DIRS = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
} as const;

export const DIR_VEC = [
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
] as const;

export const PALETTE = {
  cream: "#f4efe6",
  ink: "#2c2419",
  inkSoft: "#5c5346",
  sage: "#4a7c59",
  sageDark: "#2f553c",
  clay: "#b85c38",
  teal: "#3d7a8c",
  mist: "#d9d0c3",
  gold: "#c4a35a",
} as const;

export const CROP_INFO = {
  carrot: { days: 2, seedCost: 8, sell: 22, energy: 18, label: "Cà rốt" },
  tomato: { days: 3, seedCost: 12, sell: 38, energy: 16, label: "Cà chua" },
  rice: { days: 4, seedCost: 16, sell: 52, energy: 22, label: "Lúa" },
  berry: { days: 3, seedCost: 22, sell: 60, energy: 20, label: "Dâu" },
} as const;

export const PRODUCT_INFO = {
  egg: { sell: 18, label: "Trứng" },
  milk: { sell: 45, label: "Sữa" },
  truffle: { sell: 70, label: "Nấm cục" },
  fish: { sell: 36, label: "Cá" },
} as const;

export const ANIMAL_INFO = {
  chicken: { price: 90, product: "egg" as const, label: "Gà", max: 4 },
  cow: { price: 280, product: "milk" as const, label: "Bò", max: 3 },
  pig: { price: 200, product: "truffle" as const, label: "Heo", max: 3 },
} as const;

export const SHOP_SEEDS = ["carrot", "tomato", "rice", "berry"] as const;
export const TOOLS = ["hoe", "water", "carrot", "tomato", "rice", "berry", "feed", "fishfood"] as const;

export const TOOL_LABEL: Record<(typeof TOOLS)[number], string> = {
  hoe: "Cuốc",
  water: "Bình tưới",
  carrot: "Hạt cà rốt",
  tomato: "Hạt cà chua",
  rice: "Hạt lúa",
  berry: "Hạt dâu",
  feed: "Cám",
  fishfood: "Thức ăn cá",
};

export const ENERGY_COST = {
  hoe: 6,
  plant: 4,
  water: 3,
  harvest: 4,
  feed: 4,
  collect: 2,
  fish: 5,
} as const;

export function timeOfDay(t: number): string {
  if (t < 0.14) return "Bình minh";
  if (t < 0.4) return "Buổi sáng";
  if (t < 0.56) return "Trưa";
  if (t < 0.72) return "Chiều";
  if (t < 0.86) return "Hoàng hôn";
  return "Đêm";
}

export function clockLabel(t: number): string {
  const minutes = Math.floor(t * 16 * 60 + 6 * 60) % (24 * 60);
  const h = Math.floor(minutes / 60);
  const m = Math.floor((minutes % 60) / 10) * 10;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
