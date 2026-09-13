import { useEffect, useRef } from "react";
import { loadAssets, type FarmAssets } from "@/lib/game/assets";
import { COLS, ROWS, TILE, TOOLS } from "@/lib/game/constants";
import {
  cycleTool,
  getGame,
  interact,
  interactTile,
  setInjectedKeys,
  setTool,
  step,
} from "@/lib/game/game";
import { createCamera, renderFarm } from "@/lib/game/renderer";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
    };
  }
}

type Stick = { x: number; y: number; active: boolean; id: number | null };

export function FarmCanvas({
  stick,
  running,
  onHud,
  onReady,
}: {
  stick: React.MutableRefObject<Stick>;
  running: boolean;
  onHud: () => void;
  onReady?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<FarmAssets | null>(null);
  const keysRef = useRef(new Set<string>());
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    if (!running) {
      keysRef.current.clear();
      setInjectedKeys([]);
    }
  }, [running]);

  useEffect(() => {
    let dead = false;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const cam = createCamera();

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const keys = keysRef.current;
    const onDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (!runningRef.current) return;
      keys.add(e.code);
      if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
        interact();
      }
      if (e.code === "Tab") {
        e.preventDefault();
        cycleTool(e.shiftKey ? -1 : 1);
      }
      const num = e.code.match(/^Digit([1-8])$/);
      if (num) setTool(TOOLS[Number(num[1]) - 1]);
    };
    const onUp = (e: KeyboardEvent) => keys.delete(e.code);
    const clear = () => keys.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);

    window.__controlsTest = {
      getYaw: () => {
        const p = getGame().player;
        if (Math.hypot(p.vx, p.vy) < 4) {
          const map = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
          return map[p.dir];
        }
        return Math.atan2(-p.vx, -p.vy);
      },
      getSpeed: () => {
        const p = getGame().player;
        return Math.hypot(p.vx, p.vy);
      },
      setKeys: (codes) => setInjectedKeys(codes),
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onClick = (e: MouseEvent) => {
      if (!runningRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const p = getGame().player;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const viewX = Math.max(0, Math.min(COLS * TILE - viewW, p.x - viewW / 2));
      const viewY = Math.max(0, Math.min(ROWS * TILE - viewH, p.y - 8 - viewH / 2));
      const wx = viewX + ((e.clientX - rect.left) / rect.width) * viewW;
      const wy = viewY + ((e.clientY - rect.top) / rect.height) * viewH;
      interactTile(Math.floor(wx / TILE), Math.floor(wy / TILE));
    };
    canvas.addEventListener("pointerdown", onClick);

    const loop = (now: number) => {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (runningRef.current && assetsRef.current) {
        step(dt, keys, stick.current.active ? stick.current : undefined);
      }
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#3d7a4a";
      ctx.fillRect(0, 0, cssW, cssH);
      if (assetsRef.current) renderFarm(ctx, assetsRef.current, cam, cssW, cssH, now, dt);
      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        onHud();
      }
      raf = requestAnimationFrame(loop);
    };

    void loadAssets()
      .then((a) => {
        if (dead) return;
        assetsRef.current = a;
        raf = requestAnimationFrame(loop);
        onHud();
        onReady?.();
      })
      .catch(() => {
        onReady?.();
      });

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      canvas.removeEventListener("pointerdown", onClick);
      delete window.__controlsTest;
    };
  }, [onHud, onReady, stick]);

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
