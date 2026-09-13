import { COLS, DIR_VEC, PALETTE, ROWS, TILE, WORLD_H, WORLD_W } from "./constants";
import { getGame, getSleepFade, getTrauma, particles } from "./game";
import type { FarmAssets } from "./assets";
import type { BuildingKind, Dir, Ground } from "./types";

const DIR_NAME = ["down", "left", "right", "up"] as const;

export type Camera = { x: number; y: number };

export function createCamera(): Camera {
  const g = getGame();
  return { x: g.player.x, y: g.player.y };
}

export function updateCamera(cam: Camera, dt: number, w: number, h: number) {
  const g = getGame();
  const lookX = g.player.vx * 0.18;
  const lookY = g.player.vy * 0.18;
  const k = 1 - Math.exp(-5.5 * dt);
  cam.x += (g.player.x + lookX - cam.x) * k;
  cam.y += (g.player.y - 8 + lookY - cam.y) * k;
  const trauma = getTrauma();
  const shake = trauma * trauma;
  const ox = (Math.random() * 2 - 1) * 10 * shake;
  const oy = (Math.random() * 2 - 1) * 10 * shake;
  const viewX = Math.max(0, Math.min(WORLD_W - w, cam.x - w / 2)) + ox;
  const viewY = Math.max(0, Math.min(WORLD_H - h, cam.y - h / 2)) + oy;
  return { viewX, viewY };
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tx: number,
  ty: number,
  now: number,
  kind: Ground,
) {
  const sw = img.width;
  const sh = img.height;
  const maxX = Math.max(1, sw - TILE);
  const maxY = Math.max(1, sh - TILE);
  let sx = ((tx * 47) % maxX + maxX) % maxX;
  let sy = ((ty * 29) % maxY + maxY) % maxY;
  if (kind === "water") {
    sx = (sx + Math.floor(Math.sin(now / 700 + ty * 0.45) * 10) + maxX) % maxX;
    sy = (sy + Math.floor(Math.cos(now / 920 + tx * 0.35) * 8) + maxY) % maxY;
  }
  ctx.drawImage(img, sx, sy, TILE, TILE, tx * TILE, ty * TILE, TILE, TILE);
}

function spriteFrame(frames: HTMLImageElement[], t: number) {
  const i = Math.floor(t) % frames.length;
  return frames[(i + frames.length) % frames.length];
}

function drawFeet(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(img, x - w / 2, y - h, w, h);
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.fillStyle = "rgba(44,36,25,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function buildingImg(a: FarmAssets, kind: BuildingKind) {
  if (kind === "house") return a.house;
  if (kind === "barn") return a.barn;
  if (kind === "coop") return a.coop;
  if (kind === "pigsty") return a.pigsty;
  if (kind === "shop") return a.shop;
  return a.tree;
}

function buildingSize(kind: BuildingKind, tw: number, th: number) {
  const baseW = tw * TILE;
  const baseH = th * TILE;
  if (kind === "house") return { w: baseW + 24, h: baseH + 70 };
  if (kind === "barn") return { w: baseW + 16, h: baseH + 50 };
  if (kind === "tree") return { w: 70, h: 96 };
  return { w: baseW + 8, h: baseH + 36 };
}

export function renderFarm(
  ctx: CanvasRenderingContext2D,
  assets: FarmAssets,
  cam: Camera,
  w: number,
  h: number,
  now: number,
  dt = 1 / 60,
) {
  const g = getGame();
  const { viewX, viewY } = updateCamera(cam, dt, w, h);
  ctx.save();
  ctx.translate(-viewX, -viewY);

  const t0x = Math.max(0, Math.floor(viewX / TILE) - 1);
  const t0y = Math.max(0, Math.floor(viewY / TILE) - 1);
  const t1x = Math.min(COLS, Math.ceil((viewX + w) / TILE) + 1);
  const t1y = Math.min(ROWS, Math.ceil((viewY + h) / TILE) + 1);

  for (let ty = t0y; ty < t1y; ty++) {
    for (let tx = t0x; tx < t1x; tx++) {
      const ground = g.ground[ty][tx];
      drawTile(ctx, assets.tiles[ground], tx, ty, now, ground);
    }
  }

  const { tx: fx, ty: fy } = {
    tx: Math.floor(g.player.x / TILE) + DIR_VEC[g.player.dir].x,
    ty: Math.floor(g.player.y / TILE) + DIR_VEC[g.player.dir].y,
  };
  if (fx >= 0 && fy >= 0 && fx < COLS && fy < ROWS) {
    ctx.fillStyle = "rgba(74,124,89,0.2)";
    ctx.fillRect(fx * TILE + 4, fy * TILE + 4, TILE - 8, TILE - 8);
    ctx.strokeStyle = "rgba(74,124,89,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(fx * TILE + 4, fy * TILE + 4, TILE - 8, TILE - 8);
  }

  for (const f of g.fences) {
    ctx.drawImage(assets.fence, f.x * TILE + 10, f.y * TILE + 4, 28, 40);
  }

  for (let ty = t0y; ty < t1y; ty++) {
    for (let tx = t0x; tx < t1x; tx++) {
      const c = g.crops[ty][tx];
      if (!c) continue;
      const img = assets.crops[c.kind][Math.min(3, c.stage)];
      const bob = c.stage >= 2 ? Math.sin(now / 500 + tx) * 1.5 : 0;
      ctx.drawImage(img, tx * TILE + 4, ty * TILE - 10 + bob, TILE - 8, TILE + 8);
      if (c.stage < 3 && c.watered) {
        ctx.fillStyle = "rgba(61,122,140,0.45)";
        ctx.beginPath();
        ctx.arc(tx * TILE + 10, ty * TILE + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (c.stage === 3) {
        const spark = 0.35 + 0.65 * Math.abs(Math.sin(now / 280 + tx * 1.7 + ty));
        ctx.fillStyle = `rgba(196,163,90,${spark})`;
        ctx.beginPath();
        ctx.arc(tx * TILE + 38, ty * TILE + 8, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (const lily of g.lilies) {
    const bob = Math.sin(now / 900 + lily.x * 0.01) * 1.5;
    ctx.drawImage(assets.lily, lily.x - 20, lily.y - 12 + bob, 40, 28);
  }

  type Sortable = { y: number; draw: () => void };
  const list: Sortable[] = [];

  for (const tr of g.trees) {
    const x = tr.x * TILE + TILE / 2;
    const y = tr.y * TILE + TILE - 4;
    list.push({
      y,
      draw: () => drawFeet(ctx, assets.tree, x, y, 72, 96),
    });
  }

  for (const b of g.buildings) {
    const img = buildingImg(assets, b.kind);
    const size = buildingSize(b.kind, b.tw, b.th);
    const cx = (b.tx + b.tw / 2) * TILE;
    const by = (b.ty + b.th) * TILE;
    list.push({
      y: by - 6,
      draw: () => drawFeet(ctx, img, cx, by + 4, size.w, size.h),
    });
  }

  for (const a of g.animals) {
    const frames = a.kind === "chicken" ? assets.chicken : a.kind === "cow" ? assets.cow : assets.pig;
    const img = spriteFrame(frames, a.walk * 2);
    const scale = a.kind === "cow" ? 1.35 : a.kind === "pig" ? 1.15 : 0.9;
    const w0 = 42 * scale;
    const h0 = 48 * scale;
    list.push({
      y: a.y,
      draw: () => {
        ctx.save();
        drawShadow(ctx, a.x, a.y, w0 * 0.28, 4);
        if (a.facing === 1) {
          ctx.translate(a.x, a.y);
          ctx.scale(-1, 1);
          drawFeet(ctx, img, 0, 0, w0, h0);
        } else {
          drawFeet(ctx, img, a.x, a.y, w0, h0);
        }
        ctx.restore();
        if (a.ready) {
          ctx.fillStyle = PALETTE.cream;
          ctx.strokeStyle = PALETTE.ink;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(a.x, a.y - h0 - 6, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (!a.fed) {
          ctx.fillStyle = "rgba(184,92,56,0.9)";
          ctx.beginPath();
          ctx.arc(a.x, a.y - h0 - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }

  for (const f of g.fish) {
    list.push({
      y: f.y,
      draw: () => {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        const s = f.ready ? 1 : 0.7;
        ctx.globalAlpha = 0.92;
        ctx.drawImage(assets.fish, -22 * s, -12 * s, 44 * s, 24 * s);
        ctx.restore();
      },
    });
  }

  list.push({
    y: g.player.y,
    draw: () => {
      const name = DIR_NAME[g.player.dir as Dir];
      const moving = Math.hypot(g.player.vx, g.player.vy) > 8;
      const fi = moving ? Math.floor(g.player.walk) % 4 : 0;
      const img = assets.player[name][fi];
      drawShadow(ctx, g.player.x, g.player.y + 2, 11, 5);
      drawFeet(ctx, img, g.player.x, g.player.y + 2, 40, 56);
    },
  });

  list.sort((a, b) => a.y - b.y);
  for (const s of list) s.draw();

  for (const p of particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.text) {
      ctx.font = "600 13px 'Be Vietnam Pro', sans-serif";
      ctx.fillStyle = p.color;
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const t = g.time;
  let overlay = "rgba(0,0,0,0)";
  if (t < 0.12) overlay = `rgba(255, 186, 120, ${0.16 * (1 - t / 0.12)})`;
  else if (t > 0.72) {
    const u = (t - 0.72) / 0.28;
    overlay = `rgba(28, 32, 72, ${0.08 + u * 0.28})`;
  }
  ctx.fillStyle = overlay;
  ctx.fillRect(viewX, viewY, w, h);

  if (g.weather === "rain") {
    ctx.fillStyle = "rgba(36, 52, 72, 0.14)";
    ctx.fillRect(viewX, viewY, w, h);
    ctx.strokeStyle = "rgba(230, 236, 242, 0.38)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      const rx = viewX + ((i * 73 + now * 0.35) % (w + 30)) - 10;
      const ry = viewY + ((i * 41 + now * 0.85) % (h + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 3.5, ry + 12);
      ctx.stroke();
    }
  }

  if (t > 0.82 && g.weather !== "rain") {
    ctx.fillStyle = "rgba(255, 220, 140, 0.7)";
    for (let i = 0; i < 18; i++) {
      const fx = ((i * 137.3) % WORLD_W) + Math.sin(now / 700 + i) * 8;
      const fy = ((i * 89.1) % WORLD_H) + Math.cos(now / 900 + i) * 6;
      if (fx < viewX - 8 || fy < viewY - 8 || fx > viewX + w + 8 || fy > viewY + h + 8) continue;
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(now / 400 + i));
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const fade = getSleepFade();
  if (fade > 0) {
    const a = fade < 1 ? fade : fade < 1.6 ? 1 : Math.max(0, 1 - (fade - 1.6) / 0.8);
    ctx.fillStyle = `rgba(20, 16, 12, ${a})`;
    ctx.fillRect(viewX, viewY, w, h);
  }

  ctx.restore();
}
