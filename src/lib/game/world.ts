import { COLS, MAX_ENERGY, ROWS, TILE } from "./constants";
import type { Animal, Building, CropCell, GameState, Ground, ItemId, Pen, Quest } from "./types";

function grid<T>(fill: T): T[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => fill));
}

function inb(x: number, y: number) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function fill<T>(g: T[][], x: number, y: number, w: number, h: number, v: T) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (inb(x + i, y + j)) g[y + j][x + i] = v;
    }
  }
}

export function emptyInventory(): Record<ItemId, number> {
  return {
    carrot: 0,
    tomato: 0,
    rice: 0,
    berry: 0,
    egg: 0,
    milk: 0,
    truffle: 0,
    fish: 0,
    feed: 5,
    fishfood: 4,
    carrotSeed: 8,
    tomatoSeed: 4,
    riceSeed: 3,
    berrySeed: 2,
  };
}

export function starterQuests(): Quest[] {
  return [
    {
      id: "d1-plant",
      kind: "plant",
      label: "Gieo 4 hạt",
      need: 4,
      have: 0,
      gold: 16,
      claimed: false,
    },
    {
      id: "d1-water",
      kind: "water",
      label: "Tưới 6 luống",
      need: 6,
      have: 0,
      gold: 14,
      claimed: false,
    },
  ];
}

export function createWorld(): GameState {
  const ground = grid<Ground>("grass");
  const blocked = grid(false);
  const crops = grid<CropCell | null>(null);

  const hPath = (y: number, x0: number, x1: number) => {
    for (let x = x0; x <= x1; x++) if (inb(x, y)) ground[y][x] = "path";
  };
  const vPath = (x: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y++) if (inb(x, y)) ground[y][x] = "path";
  };

  hPath(3, 4, 25);
  hPath(10, 2, 26);
  hPath(16, 2, 18);
  vPath(12, 3, 18);
  vPath(19, 3, 18);

  fill(ground, 3, 4, 8, 5, "tilled");

  const chickenPen: Pen = { kind: "chicken", x: 2, y: 12, w: 5, h: 3 };
  const cowPen: Pen = { kind: "cow", x: 21, y: 6, w: 5, h: 3 };
  const pigPen: Pen = { kind: "pig", x: 2, y: 17, w: 5, h: 3 };
  fill(ground, chickenPen.x, chickenPen.y, chickenPen.w, chickenPen.h, "dirt");
  fill(ground, cowPen.x, cowPen.y, cowPen.w, cowPen.h, "dirt");
  fill(ground, pigPen.x, pigPen.y, pigPen.w, pigPen.h, "dirt");

  const pond = { x: 20, y: 12, w: 8, h: 6 };
  fill(ground, pond.x, pond.y, pond.w, pond.h, "water");
  fill(blocked, pond.x, pond.y, pond.w, pond.h, true);

  const buildings: Building[] = [
    { id: "house", kind: "house", tx: 13, ty: 1, tw: 3, th: 2, action: "sleep" },
    { id: "coop", kind: "coop", tx: 2, ty: 10, tw: 3, th: 2 },
    { id: "barn", kind: "barn", tx: 21, ty: 3, tw: 4, th: 3 },
    { id: "pigsty", kind: "pigsty", tx: 2, ty: 15, tw: 3, th: 2 },
    { id: "shop", kind: "shop", tx: 14, ty: 8, tw: 3, th: 2, action: "shop" },
  ];

  for (const b of buildings) fill(blocked, b.tx, b.ty, b.tw, b.th, true);
  blocked[3][14] = false;
  ground[3][14] = "path";
  blocked[10][15] = false;

  const trees: { x: number; y: number }[] = [];
  for (let x = 0; x < COLS; x++) {
    for (const y of [0, ROWS - 1]) {
      trees.push({ x, y });
      blocked[y][x] = true;
    }
  }
  for (let y = 1; y < ROWS - 1; y++) {
    for (const x of [0, COLS - 1]) {
      trees.push({ x, y });
      blocked[y][x] = true;
    }
  }
  for (const [x, y] of [
    [5, 1],
    [8, 1],
    [18, 1],
    [24, 1],
    [1, 6],
    [1, 8],
    [27, 5],
    [26, 8],
    [8, 19],
    [16, 20],
    [25, 20],
  ] as const) {
    if (inb(x, y) && ground[y][x] === "grass") {
      trees.push({ x, y });
      blocked[y][x] = true;
    }
  }

  const fences: { x: number; y: number }[] = [];
  const ring = (pen: Pen) => {
    for (let i = 0; i < pen.w; i++) {
      fences.push({ x: pen.x + i, y: pen.y - 1 });
      fences.push({ x: pen.x + i, y: pen.y + pen.h });
    }
    for (let j = 0; j < pen.h; j++) {
      fences.push({ x: pen.x - 1, y: pen.y + j });
      fences.push({ x: pen.x + pen.w, y: pen.y + j });
    }
  };
  ring(chickenPen);
  ring(cowPen);
  ring(pigPen);

  const lilies = [
    { x: (pond.x + 1.4) * TILE, y: (pond.y + 1.2) * TILE },
    { x: (pond.x + 4.2) * TILE, y: (pond.y + 2.6) * TILE },
    { x: (pond.x + 2.5) * TILE, y: (pond.y + 4.1) * TILE },
    { x: (pond.x + 6.1) * TILE, y: (pond.y + 3.4) * TILE },
  ];

  const animals: Animal[] = [
    {
      id: 1,
      kind: "chicken",
      x: (chickenPen.x + 1.3) * TILE,
      y: (chickenPen.y + 1.2) * TILE,
      facing: 0,
      fed: false,
      ready: false,
      walk: 0,
    },
    {
      id: 2,
      kind: "chicken",
      x: (chickenPen.x + 3.1) * TILE,
      y: (chickenPen.y + 1.7) * TILE,
      facing: 2,
      fed: false,
      ready: false,
      walk: 0,
    },
  ];

  return {
    version: 2,
    day: 1,
    gold: 120,
    energy: MAX_ENERGY,
    time: 0.12,
    weather: "sun",
    player: {
      x: 12.5 * TILE,
      y: 4.2 * TILE,
      dir: 0,
      walk: 0,
      vx: 0,
      vy: 0,
    },
    ground,
    blocked,
    crops,
    animals,
    fish: [],
    inventory: emptyInventory(),
    tool: "hoe",
    buildings,
    pens: [chickenPen, cowPen, pigPen],
    pond,
    trees,
    fences,
    lilies,
    quests: starterQuests(),
    nextId: 10,
    sawHelp: false,
  };
}

export function restoreWorld(
  partial: Partial<GameState> &
    Pick<GameState, "ground" | "crops" | "animals" | "fish" | "inventory" | "player">,
): GameState {
  const fresh = createWorld();
  const crops = partial.crops.map((row) =>
    row.map((c) => {
      if (!c) return null;
      return { kind: c.kind, stage: c.stage, watered: c.watered, grown: c.grown ?? c.stage ?? 0 };
    }),
  );
  return {
    ...fresh,
    ...partial,
    crops,
    weather: partial.weather ?? "sun",
    quests: partial.quests?.length ? partial.quests : fresh.quests,
    buildings: fresh.buildings,
    pens: fresh.pens,
    pond: fresh.pond,
    trees: fresh.trees,
    fences: fresh.fences,
    lilies: fresh.lilies,
    blocked: fresh.blocked,
  };
}
