import {
  ANIMAL_INFO,
  COLS,
  CROP_INFO,
  DIR_VEC,
  ENERGY_COST,
  MAX_ENERGY,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PRODUCT_INFO,
  ROWS,
  TILE,
  TOOLS,
  timeOfDay,
} from "./constants";
import { setRainAmbience, sfx } from "./audio";
import { saveGame } from "./save";
import type { AnimalKind, CropKind, GameState, ItemId, Quest, QuestKind, ToolId } from "./types";
import { createWorld } from "./world";

export const particles: {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  text?: string;
  size: number;
}[] = [];

let state: GameState = createWorld();
let toast = "";
let toastT = 0;
let hint = "";
let trauma = 0;
let lastStep = 0;
let injectKeys: Set<string> | null = null;
let paused = false;
let sleepFade = 0;
let sleeping = false;
let dirty = false;
let saveAcc = 0;
let nightDrain = 0;

const QUEST_POOL: Omit<Quest, "have" | "claimed">[] = [
  { id: "h-carrot", kind: "harvest", item: "carrot", label: "Thu hoạch 3 cà rốt", need: 3, gold: 28 },
  { id: "h-tomato", kind: "harvest", item: "tomato", label: "Thu hoạch 2 cà chua", need: 2, gold: 32 },
  { id: "h-rice", kind: "harvest", item: "rice", label: "Thu hoạch 2 lúa", need: 2, gold: 36 },
  { id: "h-berry", kind: "harvest", item: "berry", label: "Thu hoạch 2 dâu", need: 2, gold: 40 },
  { id: "feed", kind: "feed", label: "Cho 3 vật nuôi ăn", need: 3, gold: 22 },
  { id: "fish", kind: "fish", label: "Bắt 1 cá", need: 1, gold: 24 },
  { id: "water", kind: "water", label: "Tưới 8 luống", need: 8, gold: 18 },
  { id: "plant", kind: "plant", label: "Gieo 5 hạt", need: 5, gold: 20 },
  { id: "sell", kind: "sell", label: "Bán 4 nông sản", need: 4, gold: 26 },
];

export function getGame() {
  return state;
}

export function setPaused(v: boolean) {
  paused = v;
  if (v) flushSave();
}

export function isPaused() {
  return paused;
}

export function getToast() {
  return toastT > 0 ? toast : "";
}

export function getHint() {
  return hint;
}

export function getTrauma() {
  return trauma;
}

export function getSleepFade() {
  return sleepFade;
}

export function setInjectedKeys(codes: string[]) {
  injectKeys = codes.length ? new Set(codes) : null;
}

function say(msg: string) {
  toast = msg;
  toastT = 2.2;
}

function markDirty() {
  dirty = true;
}

function flushSave() {
  if (!dirty) return;
  saveGame(state);
  dirty = false;
}

function burst(x: number, y: number, color: string, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * (40 + Math.random() * 50),
      vy: Math.sin(a) * (40 + Math.random() * 50) - 20,
      life: 0.5 + Math.random() * 0.35,
      max: 0.8,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function floatText(x: number, y: number, text: string, color: string) {
  particles.push({
    x,
    y,
    vx: 0,
    vy: -28,
    life: 1.1,
    max: 1.1,
    color,
    text,
    size: 14,
  });
}

function inb(x: number, y: number) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function tileAt(px: number, py: number) {
  return { tx: Math.floor(px / TILE), ty: Math.floor(py / TILE) };
}

function blockedAt(px: number, py: number) {
  const { tx, ty } = tileAt(px, py);
  if (!inb(tx, ty)) return true;
  return state.blocked[ty][tx];
}

function spend(n: number) {
  if (state.energy < n) {
    say("Hết sức. Ăn nông sản hoặc về nhà ngủ.");
    sfx.error();
    return false;
  }
  state.energy -= n;
  markDirty();
  return true;
}

function seedKey(kind: CropKind): ItemId {
  if (kind === "carrot") return "carrotSeed";
  if (kind === "tomato") return "tomatoSeed";
  if (kind === "rice") return "riceSeed";
  return "berrySeed";
}

function cropStage(grown: number, days: number) {
  if (grown <= 0) return 0;
  return Math.min(3, Math.max(1, Math.ceil((grown / days) * 3)));
}

function progressQuest(kind: QuestKind, item?: CropKind, n = 1) {
  let paid = false;
  for (const q of state.quests) {
    if (q.claimed || q.kind !== kind) continue;
    if (q.item && item && q.item !== item) continue;
    if (q.item && !item) continue;
    q.have = Math.min(q.need, q.have + n);
    if (q.have >= q.need) {
      q.claimed = true;
      state.gold += q.gold;
      say(`Xong: ${q.label}  +${q.gold}g`);
      sfx.quest();
      paid = true;
    }
  }
  if (paid) markDirty();
}

function rollQuests(day: number): Quest[] {
  if (day <= 1) {
    return [
      { id: "d1-plant", kind: "plant", label: "Gieo 4 hạt", need: 4, have: 0, gold: 16, claimed: false },
      { id: "d1-water", kind: "water", label: "Tưới 6 luống", need: 6, have: 0, gold: 14, claimed: false },
    ];
  }
  const pool = QUEST_POOL.filter((q) => {
    if (q.kind === "harvest" && day < 3) return false;
    if (q.kind === "fish" && day < 2) return false;
    return true;
  });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2).map((q) => ({ ...q, have: 0, claimed: false }));
}

export function facingTile() {
  const d = DIR_VEC[state.player.dir];
  const tx = Math.floor(state.player.x / TILE) + d.x;
  const ty = Math.floor(state.player.y / TILE) + d.y;
  return { tx, ty };
}

function nearPond() {
  const p = state.pond;
  const { tx, ty } = facingTile();
  const here = tileAt(state.player.x, state.player.y);
  const onEdge = (x: number, y: number) =>
    x >= p.x - 1 && x <= p.x + p.w && y >= p.y - 1 && y <= p.y + p.h;
  return onEdge(tx, ty) || onEdge(here.tx, here.ty);
}

function nearestAnimal() {
  let best: (typeof state.animals)[number] | null = null;
  let bestD = 56;
  for (const a of state.animals) {
    const d = Math.hypot(a.x - state.player.x, a.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function buildingAt(tx: number, ty: number) {
  return state.buildings.find((b) => tx >= b.tx && tx < b.tx + b.tw && ty >= b.ty && ty < b.ty + b.th);
}

export function setTool(tool: ToolId) {
  state.tool = tool;
  sfx.ui();
}

export function cycleTool(dir: number) {
  const i = TOOLS.indexOf(state.tool);
  const n = (i + dir + TOOLS.length) % TOOLS.length;
  state.tool = TOOLS[n];
}

export function toolCount(tool: ToolId): number | null {
  if (tool === "hoe" || tool === "water") return null;
  if (tool === "feed") return state.inventory.feed;
  if (tool === "fishfood") return state.inventory.fishfood;
  return state.inventory[seedKey(tool)];
}

function plant(tx: number, ty: number, kind: CropKind) {
  const key = seedKey(kind);
  if (state.inventory[key] <= 0) {
    say("Hết hạt giống.");
    sfx.error();
    return;
  }
  const g = state.ground[ty][tx];
  if (g !== "tilled" && g !== "watered") {
    say("Cần đất đã xới.");
    sfx.error();
    return;
  }
  if (state.crops[ty][tx]) {
    say("Ô này đã có cây.");
    sfx.error();
    return;
  }
  if (!spend(ENERGY_COST.plant)) return;
  state.inventory[key] -= 1;
  const watered = g === "watered" || state.weather === "rain";
  state.crops[ty][tx] = { kind, stage: 0, watered, grown: 0 };
  burst(tx * TILE + 24, ty * TILE + 24, "#6d8f5a", 6);
  sfx.plant();
  say(`Gieo ${CROP_INFO[kind].label}.`);
  progressQuest("plant");
}

function hoe(tx: number, ty: number) {
  if (state.blocked[ty][tx]) return;
  const g = state.ground[ty][tx];
  if (g === "water" || g === "path") return;
  if (state.crops[ty][tx]) {
    say("Không xới được lúc đang có cây.");
    sfx.error();
    return;
  }
  if (g === "tilled" || g === "watered") {
    say("Đất đã xới.");
    return;
  }
  if (!spend(ENERGY_COST.hoe)) return;
  state.ground[ty][tx] = state.weather === "rain" ? "watered" : "tilled";
  burst(tx * TILE + 24, ty * TILE + 28, "#8a5a3a", 7);
  sfx.plant();
  trauma = Math.min(1, trauma + 0.12);
}

function water(tx: number, ty: number) {
  const g = state.ground[ty][tx];
  const crop = state.crops[ty][tx];
  if (g !== "tilled" && g !== "watered" && !crop) {
    say("Không tưới chỗ này.");
    sfx.error();
    return;
  }
  if (crop?.watered || g === "watered") {
    say("Đã đủ nước.");
    return;
  }
  if (!spend(ENERGY_COST.water)) return;
  state.ground[ty][tx] = "watered";
  if (crop) crop.watered = true;
  burst(tx * TILE + 24, ty * TILE + 24, "#4a8fa8", 8);
  sfx.water();
  progressQuest("water");
}

function harvest(tx: number, ty: number) {
  const crop = state.crops[ty][tx];
  if (!crop) return false;
  if (crop.stage < 3) {
    say("Chưa chín.");
    sfx.error();
    return true;
  }
  if (!spend(ENERGY_COST.harvest)) return true;
  const info = CROP_INFO[crop.kind];
  state.inventory[crop.kind] += 1;
  state.crops[ty][tx] = null;
  state.ground[ty][tx] = "tilled";
  burst(tx * TILE + 24, ty * TILE + 18, "#d7a441", 10);
  floatText(tx * TILE + 24, ty * TILE, `+1 ${info.label}`, "#2c2419");
  sfx.harvest();
  trauma = Math.min(1, trauma + 0.18);
  progressQuest("harvest", crop.kind);
  return true;
}

function feedAnimal() {
  const a = nearestAnimal();
  if (!a) {
    say("Đến gần vật nuôi.");
    sfx.error();
    return;
  }
  if (a.fed) {
    say("Đã no rồi.");
    return;
  }
  if (state.inventory.feed <= 0) {
    say("Hết cám.");
    sfx.error();
    return;
  }
  if (!spend(ENERGY_COST.feed)) return;
  state.inventory.feed -= 1;
  a.fed = true;
  burst(a.x, a.y - 10, "#c4a35a", 6);
  sfx.feed();
  say(`Cho ${ANIMAL_INFO[a.kind].label.toLowerCase()} ăn.`);
  progressQuest("feed");
}

function collectAnimal() {
  const a = nearestAnimal();
  if (!a || !a.ready) return false;
  if (!spend(ENERGY_COST.collect)) return true;
  const prod = ANIMAL_INFO[a.kind].product;
  state.inventory[prod] += 1;
  a.ready = false;
  floatText(a.x, a.y - 20, `+1 ${PRODUCT_INFO[prod].label}`, "#2c2419");
  burst(a.x, a.y, "#f4efe6", 8);
  sfx.harvest();
  return true;
}

function feedPond() {
  if (!nearPond()) {
    say("Đến bờ hồ.");
    sfx.error();
    return;
  }
  if (state.inventory.fishfood <= 0) {
    say("Hết thức ăn cá.");
    sfx.error();
    return;
  }
  if (state.fish.length >= 6) {
    say("Hồ đã đầy.");
    sfx.error();
    return;
  }
  if (!spend(ENERGY_COST.fish)) return;
  state.inventory.fishfood -= 1;
  const p = state.pond;
  state.fish.push({
    id: state.nextId++,
    x: (p.x + 1 + Math.random() * (p.w - 2)) * TILE,
    y: (p.y + 1 + Math.random() * (p.h - 2)) * TILE,
    angle: Math.random() * Math.PI * 2,
    turn: (Math.random() - 0.5) * 0.6,
    ready: false,
    plantedDay: state.day,
  });
  sfx.splash();
  say("Thả thức ăn xuống hồ.");
}

function catchFish() {
  if (!nearPond()) return false;
  const ready = state.fish.find((f) => f.ready);
  if (!ready) return false;
  if (!spend(ENERGY_COST.collect)) return true;
  state.fish = state.fish.filter((f) => f.id !== ready.id);
  state.inventory.fish += 1;
  floatText(ready.x, ready.y, "+1 Cá", "#2c2419");
  sfx.harvest();
  progressQuest("fish");
  return true;
}

export function eat(item: CropKind) {
  if (paused || sleeping) return;
  if (state.inventory[item] <= 0) {
    say("Không còn món này.");
    sfx.error();
    return;
  }
  if (state.energy >= MAX_ENERGY) {
    say("Sức đã đầy.");
    return;
  }
  const info = CROP_INFO[item];
  state.inventory[item] -= 1;
  state.energy = Math.min(MAX_ENERGY, state.energy + info.energy);
  sfx.eat();
  floatText(state.player.x, state.player.y - 28, `+${info.energy} sức`, "#4a7c59");
  say(`Ăn ${info.label.toLowerCase()}.`);
  markDirty();
}

export function interact() {
  if (paused || sleeping) return;
  const { tx, ty } = facingTile();
  const here = tileAt(state.player.x, state.player.y);

  const b =
    buildingAt(tx, ty) ||
    buildingAt(here.tx, here.ty) ||
    (here.tx === 14 && here.ty === 3 ? state.buildings.find((x) => x.kind === "house") : undefined);
  if (b?.action === "sleep") {
    beginSleep();
    return;
  }
  if (b?.action === "shop" || (here.tx >= 14 && here.tx <= 16 && here.ty >= 8 && here.ty <= 10)) {
    window.dispatchEvent(new CustomEvent("mayvang-shop"));
    sfx.ui();
    return;
  }

  if (inb(tx, ty) && harvest(tx, ty)) return;
  if (collectAnimal()) return;
  if (catchFish()) return;

  if (state.tool === "hoe" && inb(tx, ty)) {
    hoe(tx, ty);
    return;
  }
  if (state.tool === "water" && inb(tx, ty)) {
    water(tx, ty);
    return;
  }
  if (state.tool === "feed") {
    feedAnimal();
    return;
  }
  if (state.tool === "fishfood") {
    feedPond();
    return;
  }
  if (state.tool === "carrot" || state.tool === "tomato" || state.tool === "rice" || state.tool === "berry") {
    if (inb(tx, ty)) plant(tx, ty, state.tool);
    return;
  }

  if (nearPond()) say("Chọn thức ăn cá, hoặc chờ cá lớn để thu.");
  else if (nearestAnimal()) say("Cho ăn, hoặc thu sản phẩm khi sẵn sàng.");
  else say("Chọn công cụ rồi tương tác.");
}

export function interactTile(tx: number, ty: number) {
  const { tx: px, ty: py } = tileAt(state.player.x, state.player.y);
  if (Math.abs(tx - px) + Math.abs(ty - py) > 2) return;
  if (tx !== px || ty !== py) {
    if (Math.abs(tx - px) > Math.abs(ty - py)) state.player.dir = tx < px ? 1 : 2;
    else state.player.dir = ty < py ? 3 : 0;
  }
  interact();
}

function beginSleep() {
  if (sleeping) return;
  sleeping = true;
  sleepFade = 0.01;
  sfx.sleep();
}

function finishSleep() {
  state.day += 1;
  state.energy = MAX_ENERGY;
  state.time = 0.1;
  state.weather = Math.random() < 0.34 ? "rain" : "sun";
  setRainAmbience(state.weather === "rain");

  if (state.weather === "rain") {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const g = state.ground[y][x];
        if (g === "tilled") state.ground[y][x] = "watered";
        const c = state.crops[y][x];
        if (c) c.watered = true;
      }
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = state.crops[y][x];
      if (!c) continue;
      if (c.watered && c.stage < 3) {
        c.grown += 1;
        c.stage = cropStage(c.grown, CROP_INFO[c.kind].days);
      }
      c.watered = false;
      if (state.ground[y][x] === "watered") state.ground[y][x] = "tilled";
    }
  }
  for (const a of state.animals) {
    if (a.fed) a.ready = true;
    a.fed = false;
  }
  for (const f of state.fish) {
    if (state.day > f.plantedDay) f.ready = true;
  }
  state.quests = rollQuests(state.day);
  const sky = state.weather === "rain" ? "Trời mưa — luống được tưới sẵn." : `Bình minh ngày ${state.day}.`;
  say(sky);
  markDirty();
  flushSave();
}

export function buy(item: "feed" | "fishfood" | CropKind | AnimalKind) {
  if (item === "feed") {
    if (state.gold < 6) return say("Không đủ vàng.");
    state.gold -= 6;
    state.inventory.feed += 3;
    sfx.coin();
    markDirty();
    return;
  }
  if (item === "fishfood") {
    if (state.gold < 8) return say("Không đủ vàng.");
    state.gold -= 8;
    state.inventory.fishfood += 2;
    sfx.coin();
    markDirty();
    return;
  }
  if (item in CROP_INFO) {
    const k = item as CropKind;
    const cost = CROP_INFO[k].seedCost;
    if (state.gold < cost) return say("Không đủ vàng.");
    state.gold -= cost;
    state.inventory[seedKey(k)] += 3;
    sfx.coin();
    markDirty();
    return;
  }
  const kind = item as AnimalKind;
  const info = ANIMAL_INFO[kind];
  const count = state.animals.filter((a) => a.kind === kind).length;
  if (count >= info.max) return say("Chuồng đã đủ.");
  if (state.gold < info.price) return say("Không đủ vàng.");
  const pen = state.pens.find((p) => p.kind === kind);
  if (!pen) return;
  state.gold -= info.price;
  state.animals.push({
    id: state.nextId++,
    kind,
    x: (pen.x + 1 + Math.random() * (pen.w - 2)) * TILE,
    y: (pen.y + 1 + Math.random() * (pen.h - 2)) * TILE,
    facing: 0,
    fed: false,
    ready: false,
    walk: 0,
  });
  sfx.coin();
  say(`Mua ${info.label.toLowerCase()}.`);
  markDirty();
  flushSave();
}

export function sell(item: ItemId) {
  const prices: Partial<Record<ItemId, number>> = {
    carrot: CROP_INFO.carrot.sell,
    tomato: CROP_INFO.tomato.sell,
    rice: CROP_INFO.rice.sell,
    berry: CROP_INFO.berry.sell,
    egg: PRODUCT_INFO.egg.sell,
    milk: PRODUCT_INFO.milk.sell,
    truffle: PRODUCT_INFO.truffle.sell,
    fish: PRODUCT_INFO.fish.sell,
  };
  const price = prices[item];
  if (!price || state.inventory[item] <= 0) return;
  state.inventory[item] -= 1;
  state.gold += price;
  sfx.coin();
  floatText(state.player.x, state.player.y - 28, `+${price}`, "#4a7c59");
  progressQuest("sell");
  markDirty();
}

export function sellAll() {
  const keys: ItemId[] = ["carrot", "tomato", "rice", "berry", "egg", "milk", "truffle", "fish"];
  let n = 0;
  for (const k of keys) {
    while (state.inventory[k] > 0) {
      sell(k);
      n++;
    }
  }
  if (n) say("Đã bán nông sản.");
  else say("Túi trống.");
  flushSave();
}

function updateHint() {
  const { tx, ty } = facingTile();
  const here = tileAt(state.player.x, state.player.y);
  const b = buildingAt(tx, ty) || buildingAt(here.tx, here.ty);
  if (b?.action === "sleep" || (here.tx === 14 && here.ty === 3)) {
    hint = "Ngủ — qua ngày, hồi sức";
    return;
  }
  if (b?.action === "shop") {
    hint = "Tiệm — mua giống, thú, cám";
    return;
  }
  if (inb(tx, ty) && state.crops[ty][tx]?.stage === 3) {
    hint = `Thu hoạch ${CROP_INFO[state.crops[ty][tx]!.kind].label}`;
    return;
  }
  const a = nearestAnimal();
  if (a?.ready) {
    hint = `Thu ${PRODUCT_INFO[ANIMAL_INFO[a.kind].product].label.toLowerCase()}`;
    return;
  }
  if (a && !a.fed) {
    hint = `Cho ${ANIMAL_INFO[a.kind].label.toLowerCase()} ăn`;
    return;
  }
  if (nearPond() && state.fish.some((f) => f.ready)) {
    hint = "Bắt cá";
    return;
  }
  if (nearPond()) {
    hint = "Cho cá ăn";
    return;
  }
  if (inb(tx, ty) && (state.ground[ty][tx] === "tilled" || state.ground[ty][tx] === "watered") && !state.crops[ty][tx]) {
    hint = "Gieo hạt";
    return;
  }
  if (state.time > 0.86) {
    hint = "Trời tối — về nhà ngủ";
    return;
  }
  hint = "";
}

function held(keys: Set<string>, code: string) {
  if (injectKeys) return injectKeys.has(code);
  return keys.has(code);
}

export function step(dt: number, keys: Set<string>, stick?: { x: number; y: number }) {
  const cap = Math.min(dt, 0.1);
  toastT = Math.max(0, toastT - cap);
  trauma = Math.max(0, trauma - cap * 1.6);

  if (sleeping) {
    sleepFade += cap * 1.3;
    if (sleepFade >= 1 && sleepFade < 1.5) {
      finishSleep();
      sleepFade = 1.5;
    }
    if (sleepFade >= 2.4) {
      sleeping = false;
      sleepFade = 0;
    }
    return;
  }

  if (paused) return;

  state.time = (state.time + cap / 260) % 1;
  if (state.time > 0.88) {
    nightDrain += cap;
    if (nightDrain > 9) {
      nightDrain = 0;
      if (state.energy > 8) state.energy -= 1;
    }
  } else {
    nightDrain = 0;
  }

  let ax = 0;
  let ay = 0;
  if (held(keys, "KeyA") || held(keys, "ArrowLeft")) ax -= 1;
  if (held(keys, "KeyD") || held(keys, "ArrowRight")) ax += 1;
  if (held(keys, "KeyW") || held(keys, "ArrowUp")) ay -= 1;
  if (held(keys, "KeyS") || held(keys, "ArrowDown")) ay += 1;
  if (stick) {
    ax += stick.x;
    ay += stick.y;
  }
  const mag = Math.hypot(ax, ay);
  if (mag > 1) {
    ax /= mag;
    ay /= mag;
  }

  const p = state.player;
  p.vx = ax * PLAYER_SPEED;
  p.vy = ay * PLAYER_SPEED;
  if (mag > 0.15) {
    if (Math.abs(ax) > Math.abs(ay)) p.dir = ax < 0 ? 1 : 2;
    else p.dir = ay < 0 ? 3 : 0;
    p.walk += cap * 7;
    lastStep += cap;
    if (lastStep > 0.32) {
      lastStep = 0;
      sfx.step();
      particles.push({
        x: p.x + (Math.random() * 8 - 4),
        y: p.y + 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -8,
        life: 0.35,
        max: 0.35,
        color: "rgba(90,70,40,0.35)",
        size: 2.2,
      });
    }
  } else {
    p.walk = 0;
    lastStep = 0;
  }

  const nx = p.x + p.vx * cap;
  const ny = p.y + p.vy * cap;
  if (!blockedAt(nx, p.y) && !blockedAt(nx, p.y - PLAYER_RADIUS * 0.4) && !blockedAt(nx, p.y + 4)) p.x = nx;
  if (!blockedAt(p.x, ny) && !blockedAt(p.x - 6, ny) && !blockedAt(p.x + 6, ny)) p.y = ny;
  p.x = Math.max(TILE, Math.min(COLS * TILE - TILE, p.x));
  p.y = Math.max(TILE, Math.min(ROWS * TILE - TILE, p.y));

  for (const a of state.animals) {
    const pen = state.pens.find((pn) => pn.kind === a.kind);
    if (!pen) continue;
    a.walk += cap * 2;
    const t = a.id * 1.7 + performance.now() / 1000;
    const wx = (pen.x + 0.7 + (0.5 + 0.4 * Math.sin(t * 0.6)) * (pen.w - 1.4)) * TILE;
    const wy = (pen.y + 0.7 + (0.5 + 0.4 * Math.cos(t * 0.5)) * (pen.h - 1.4)) * TILE;
    a.x += (wx - a.x) * (1 - Math.exp(-1.4 * cap));
    a.y += (wy - a.y) * (1 - Math.exp(-1.4 * cap));
    a.facing = wx < a.x - 2 ? 1 : wx > a.x + 2 ? 2 : a.facing;
  }

  const pond = state.pond;
  for (const f of state.fish) {
    f.angle += f.turn * cap;
    f.x += Math.cos(f.angle) * 18 * cap;
    f.y += Math.sin(f.angle) * 14 * cap;
    const minx = (pond.x + 0.4) * TILE;
    const maxx = (pond.x + pond.w - 0.4) * TILE;
    const miny = (pond.y + 0.4) * TILE;
    const maxy = (pond.y + pond.h - 0.4) * TILE;
    if (f.x < minx || f.x > maxx) {
      f.angle = Math.PI - f.angle;
      f.x = Math.max(minx, Math.min(maxx, f.x));
    }
    if (f.y < miny || f.y > maxy) {
      f.angle = -f.angle;
      f.y = Math.max(miny, Math.min(maxy, f.y));
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    q.life -= cap;
    q.x += q.vx * cap;
    q.y += q.vy * cap;
    q.vy += 40 * cap;
    if (q.life <= 0) particles.splice(i, 1);
  }

  saveAcc += cap;
  if (saveAcc > 8) {
    saveAcc = 0;
    flushSave();
  }

  updateHint();
}

export function boot(fromSave: GameState | null) {
  state = fromSave ?? createWorld();
  particles.length = 0;
  toast = "";
  toastT = 0;
  sleeping = false;
  sleepFade = 0;
  paused = false;
  dirty = false;
  setRainAmbience(state.weather === "rain");
}

export function markHelpSeen() {
  state.sawHelp = true;
  markDirty();
  flushSave();
}

export function persistNow() {
  markDirty();
  flushSave();
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushSave();
  });
  window.addEventListener("pagehide", () => flushSave());
}

export { timeOfDay };
