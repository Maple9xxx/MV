export type Ground = "grass" | "dirt" | "tilled" | "watered" | "path" | "water";
export type Dir = 0 | 1 | 2 | 3;
export type CropKind = "carrot" | "tomato" | "rice" | "berry";
export type AnimalKind = "chicken" | "cow" | "pig";
export type ToolId = "hoe" | "water" | "carrot" | "tomato" | "rice" | "berry" | "feed" | "fishfood";
export type Weather = "sun" | "rain";
export type ItemId =
  | CropKind
  | "egg"
  | "milk"
  | "truffle"
  | "fish"
  | "feed"
  | "fishfood"
  | "carrotSeed"
  | "tomatoSeed"
  | "riceSeed"
  | "berrySeed";

export type BuildingKind = "house" | "coop" | "barn" | "pigsty" | "shop" | "tree";
export type InteractAction = "sleep" | "shop" | "pond";
export type QuestKind = "harvest" | "feed" | "fish" | "water" | "plant" | "sell";

export interface CropCell {
  kind: CropKind;
  stage: number;
  watered: boolean;
  grown: number;
}

export interface Animal {
  id: number;
  kind: AnimalKind;
  x: number;
  y: number;
  facing: Dir;
  fed: boolean;
  ready: boolean;
  walk: number;
}

export interface PondFish {
  id: number;
  x: number;
  y: number;
  angle: number;
  turn: number;
  ready: boolean;
  plantedDay: number;
}

export interface Building {
  id: string;
  kind: BuildingKind;
  tx: number;
  ty: number;
  tw: number;
  th: number;
  action?: InteractAction;
}

export interface Pen {
  kind: AnimalKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Quest {
  id: string;
  kind: QuestKind;
  item?: CropKind;
  label: string;
  need: number;
  have: number;
  gold: number;
  claimed: boolean;
}

export interface GameState {
  version: number;
  day: number;
  gold: number;
  energy: number;
  time: number;
  weather: Weather;
  player: {
    x: number;
    y: number;
    dir: Dir;
    walk: number;
    vx: number;
    vy: number;
  };
  ground: Ground[][];
  blocked: boolean[][];
  crops: (CropCell | null)[][];
  animals: Animal[];
  fish: PondFish[];
  inventory: Record<ItemId, number>;
  tool: ToolId;
  buildings: Building[];
  pens: Pen[];
  pond: { x: number; y: number; w: number; h: number };
  trees: { x: number; y: number }[];
  fences: { x: number; y: number }[];
  lilies: { x: number; y: number }[];
  quests: Quest[];
  nextId: number;
  sawHelp: boolean;
}

export interface SaveBlob {
  version: number;
  day: number;
  gold: number;
  energy: number;
  time: number;
  weather?: Weather;
  player: GameState["player"];
  ground: Ground[][];
  crops: (CropCell | null)[][];
  animals: Animal[];
  fish: PondFish[];
  inventory: Record<ItemId, number>;
  tool: ToolId;
  quests?: Quest[];
  nextId: number;
  sawHelp: boolean;
}
