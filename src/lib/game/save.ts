import { SAVE_KEY, SAVE_VERSION } from "./constants";
import type { CropCell, GameState, SaveBlob } from "./types";
import { createWorld, emptyInventory, restoreWorld, starterQuests } from "./world";

function toBlob(s: GameState): SaveBlob {
  return {
    version: SAVE_VERSION,
    day: s.day,
    gold: s.gold,
    energy: s.energy,
    time: s.time,
    weather: s.weather,
    player: s.player,
    ground: s.ground,
    crops: s.crops,
    animals: s.animals,
    fish: s.fish,
    inventory: s.inventory,
    tool: s.tool,
    quests: s.quests,
    nextId: s.nextId,
    sawHelp: s.sawHelp,
  };
}

function migrate(raw: SaveBlob): SaveBlob {
  const s: SaveBlob = { ...raw };
  if (!s.version) s.version = 1;
  if (s.version < 2) {
    s.weather = s.weather ?? "sun";
    s.quests = s.quests?.length ? s.quests : starterQuests();
    s.crops = s.crops.map((row) =>
      row.map((c) => {
        if (!c) return null;
        const cell = c as CropCell;
        return { ...cell, grown: cell.grown ?? cell.stage ?? 0 };
      }),
    );
    s.version = 2;
  }
  return s;
}

export function saveGame(s: GameState) {
  try {
    const blob = JSON.stringify(toBlob(s));
    localStorage.setItem(SAVE_KEY + ":bak", localStorage.getItem(SAVE_KEY) ?? "");
    localStorage.setItem(SAVE_KEY, blob);
  } catch {
    /* private mode / quota */
  }
}

export function hasSave() {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createWorld();
    const parsed = migrate(JSON.parse(raw) as SaveBlob);
    const world = restoreWorld({
      version: parsed.version,
      day: parsed.day,
      gold: parsed.gold,
      energy: parsed.energy,
      time: parsed.time,
      weather: parsed.weather ?? "sun",
      player: parsed.player,
      ground: parsed.ground,
      crops: parsed.crops,
      animals: parsed.animals,
      fish: parsed.fish,
      inventory: { ...emptyInventory(), ...parsed.inventory },
      tool: parsed.tool,
      quests: parsed.quests,
      nextId: parsed.nextId,
      sawHelp: parsed.sawHelp,
    });
    return world;
  } catch {
    return createWorld();
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
