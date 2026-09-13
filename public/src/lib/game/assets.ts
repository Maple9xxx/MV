import type { CropKind, Ground } from "./types";

export type FarmAssets = {
  tiles: Record<Ground, HTMLImageElement>;
  player: Record<"down" | "left" | "right" | "up", HTMLImageElement[]>;
  chicken: HTMLImageElement[];
  cow: HTMLImageElement[];
  pig: HTMLImageElement[];
  crops: Record<CropKind, HTMLImageElement[]>;
  house: HTMLImageElement;
  barn: HTMLImageElement;
  coop: HTMLImageElement;
  pigsty: HTMLImageElement;
  shop: HTMLImageElement;
  tree: HTMLImageElement;
  fence: HTMLImageElement;
  lily: HTMLImageElement;
  fish: HTMLImageElement;
};

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

async function many(urls: string[]) {
  return Promise.all(urls.map(load));
}

/** Vite's configured base path (e.g. "/" at a domain root, "./" or
 * "/repo-name/" under a subpath). Prefixing every asset URL with this
 * keeps sprite loading correct no matter where the built site is served
 * from, instead of assuming the app always sits at the server root. */
const BASE = import.meta.env.BASE_URL;

export async function loadAssets(): Promise<FarmAssets> {
  const tileNames: Ground[] = ["grass", "dirt", "tilled", "watered", "path", "water"];
  const tileImgs = await many(tileNames.map((n) => `${BASE}game/tiles/${n}.png`));
  const tiles = Object.fromEntries(tileNames.map((n, i) => [n, tileImgs[i]])) as FarmAssets["tiles"];

  const frames = (folder: string, names: string[]) =>
    many(names.map((n) => `${BASE}game/sprites/${folder}/${n}.png`));

  const [down, left, right, up, chicken, cow, pig] = await Promise.all([
    frames("player", ["down-1", "down-2", "down-3", "down-4"]),
    frames("player", ["left-1", "left-2", "left-3", "left-4"]),
    frames("player", ["right-1", "right-2", "right-3", "right-4"]),
    frames("player", ["up-1", "up-2", "up-3", "up-4"]),
    frames("chicken", ["idle-1", "idle-2", "idle-3", "idle-4"]),
    frames("cow", ["idle-1", "idle-2", "idle-3", "idle-4"]),
    frames("pig", ["idle-1", "idle-2", "idle-3", "idle-4"]),
  ]);

  const cropKinds: CropKind[] = ["carrot", "tomato", "rice", "berry"];
  const cropEntries = await Promise.all(
    cropKinds.map(async (k) => {
      const imgs = await many([0, 1, 2, 3].map((s) => `${BASE}game/sprites/crops/${k}/stage-${s}.png`));
      return [k, imgs] as const;
    }),
  );

  const [house, barn, coop, pigsty, shop, tree, fence, lily, fish] = await Promise.all([
    load(`${BASE}game/sprites/house/prop.png`),
    load(`${BASE}game/sprites/barn/prop.png`),
    load(`${BASE}game/sprites/coop/prop.png`),
    load(`${BASE}game/sprites/pigsty/prop.png`),
    load(`${BASE}game/sprites/shop/prop.png`),
    load(`${BASE}game/sprites/tree/prop.png`),
    load(`${BASE}game/sprites/fence/prop.png`),
    load(`${BASE}game/sprites/lily/prop.png`),
    load(`${BASE}game/sprites/fish/idle-1.png`),
  ]);

  return {
    tiles,
    player: { down, left, right, up },
    chicken,
    cow,
    pig,
    crops: Object.fromEntries(cropEntries) as FarmAssets["crops"],
    house,
    barn,
    coop,
    pigsty,
    shop,
    tree,
    fence,
    lily,
    fish,
  };
}
