import { useCallback, useEffect, useRef, useState } from "react";
import {
  Backpack,
  Bone,
  Carrot,
  Cherry,
  CloudRain,
  Coins,
  Droplets,
  Fish,
  Grape,
  HelpCircle,
  Pause,
  ShoppingBag,
  Shovel,
  Sun,
  Volume2,
  VolumeX,
  Wheat,
} from "lucide-react";
import {
  ANIMAL_INFO,
  CROP_INFO,
  MAX_ENERGY,
  PRODUCT_INFO,
  TOOL_LABEL,
  TOOLS,
  clockLabel,
  timeOfDay,
} from "@/lib/game/constants";
import { isMuted, setMuted, sfx, startMusic, unlockAudio } from "@/lib/game/audio";
import {
  boot,
  buy,
  eat,
  getGame,
  getHint,
  getToast,
  interact,
  markHelpSeen,
  persistNow,
  sell,
  sellAll,
  setPaused,
  setTool,
  toolCount,
} from "@/lib/game/game";
import { hasSave, loadGame, saveGame } from "@/lib/game/save";
import { createWorld } from "@/lib/game/world";
import type { AnimalKind, CropKind, ItemId, ToolId } from "@/lib/game/types";
import { FarmCanvas } from "./FarmCanvas";

type Stick = { x: number; y: number; active: boolean; id: number | null };
type Overlay = "none" | "shop" | "help" | "pause" | "bag";

function IconBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={
        "flex size-11 items-center justify-center rounded-md bg-hud text-ink shadow-chip " +
        "transition-transform duration-150 ease-out-soft hover:bg-paper-deep active:scale-[0.98] " +
        (active ? "ring-2 ring-sage" : "")
      }
    >
      {children}
    </button>
  );
}

export function GameApp() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"title" | "play">("title");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [mute, setMuteUi] = useState(false);
  const [tick, setTick] = useState(0);
  const [confirmNew, setConfirmNew] = useState(false);
  const stick = useRef<Stick>({ x: 0, y: 0, active: false, id: null });
  const joyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setSaved(hasSave());
  }, []);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const onReady = useCallback(() => setReady(true), []);

  const openOverlay = useCallback((o: Overlay) => {
    setOverlay(o);
    setPaused(o !== "none");
  }, []);

  useEffect(() => {
    const open = () => openOverlay("shop");
    window.addEventListener("mayvang-shop", open);
    return () => window.removeEventListener("mayvang-shop", open);
  }, [openOverlay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "play") return;
      if (e.code === "Escape") {
        e.preventDefault();
        if (overlay !== "none") openOverlay("none");
        else openOverlay("pause");
      }
      if (e.code === "KeyI" || e.code === "KeyB") {
        e.preventDefault();
        openOverlay(overlay === "bag" ? "none" : "bag");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, openOverlay, phase]);

  const start = (cont: boolean) => {
    setConfirmNew(false);
    unlockAudio();
    startMusic();
    sfx.ui();
    boot(cont && hasSave() ? loadGame() : createWorld());
    setPhase("play");
    openOverlay("none");
    const g = getGame();
    if (!g.sawHelp) openOverlay("help");
    refresh();
  };

  const g = mounted ? getGame() : null;
  const blocked = overlay !== "none";
  void tick;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-sage-dark text-ink">
      <FarmCanvas
        stick={stick}
        running={phase === "play" && !blocked}
        onHud={refresh}
        onReady={onReady}
      />

      {phase === "title" && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-ink/30 p-5 sm:items-center">
          <section className="w-full max-w-md rounded-xl bg-paper p-6 shadow-panel sm:p-8">
            <p className="text-sm font-medium tracking-wide text-sage">Nông trại nhỏ</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Mây Vàng
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
              Xới đất, gieo hạt, chăn gà bò heo, thả cá xuống hồ. Ăn nông sản để hồi sức, ngủ trong nhà để
              qua ngày.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  if (saved && !confirmNew) {
                    setConfirmNew(true);
                    return;
                  }
                  start(false);
                }}
                className="h-12 rounded-lg bg-sage px-5 font-medium text-paper transition-transform duration-150 hover:bg-sage-dark active:scale-[0.98] disabled:opacity-60"
              >
                {!ready
                  ? "Đang mở cổng nông trại…"
                  : confirmNew
                    ? "Ghi đè và vào mới"
                    : "Vào nông trại mới"}
              </button>
              {confirmNew && (
                <p className="text-xs leading-relaxed text-ink-soft">
                  Nông trại đã lưu sẽ bị thay. Bấm lần nữa để xác nhận.
                </p>
              )}
              {saved && (
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => start(true)}
                  className="h-12 rounded-lg bg-paper-deep px-5 font-medium text-ink transition-transform duration-150 hover:bg-mist active:scale-[0.98] disabled:opacity-60"
                >
                  Tiếp tục
                </button>
              )}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-ink-soft">
              WASD hoặc cần điều khiển. E / chạm để làm. I mở túi. 1–8 chọn công cụ. Esc tạm dừng.
            </p>
          </section>
        </div>
      )}

      {phase === "play" && g && (
        <>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
            <div className="pointer-events-auto flex max-w-[72%] flex-col items-start gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-11 items-center gap-2 rounded-lg bg-hud px-3 font-medium tabular-nums shadow-chip">
                  <Coins className="size-4 text-sage" strokeWidth={1.75} />
                  {g.gold}
                </div>
                <div className="flex h-11 min-w-36 items-center gap-2 rounded-lg bg-hud px-3 shadow-chip">
                  <Wheat className="size-4 text-clay" strokeWidth={1.75} />
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-mist">
                    <div className="h-full bg-sage" style={{ width: `${(g.energy / MAX_ENERGY) * 100}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-ink-soft">{g.energy}</span>
                </div>
                <div className="flex h-11 items-center gap-2 rounded-lg bg-hud px-3 text-sm shadow-chip">
                  {g.weather === "rain" ? (
                    <CloudRain className="size-4 text-teal" strokeWidth={1.75} />
                  ) : (
                    <Sun className="size-4 text-clay" strokeWidth={1.75} />
                  )}
                  <span>
                    Ngày {g.day}
                    <span className="ml-2 text-ink-soft">{clockLabel(g.time)}</span>
                    <span className="ml-2 hidden text-ink-soft sm:inline">{timeOfDay(g.time)}</span>
                  </span>
                </div>
              </div>
              {g.quests.length > 0 && (
                <aside className="max-w-52 rounded-lg bg-hud p-3 text-xs shadow-chip">
                  <p className="font-medium text-ink">Việc hôm nay</p>
                  <ul className="mt-1.5 space-y-1 text-ink-soft">
                    {g.quests.map((q) => (
                      <li key={q.id} className={q.claimed ? "text-sage line-through" : ""}>
                        {q.label}{" "}
                        <span className="tabular-nums">
                          {Math.min(q.have, q.need)}/{q.need}
                        </span>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
            <div className="pointer-events-auto flex gap-2">
              <IconBtn
                label={mute ? "Bật tiếng" : "Tắt tiếng"}
                onClick={() => {
                  const v = !isMuted();
                  setMuted(v);
                  setMuteUi(v);
                }}
              >
                {mute ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </IconBtn>
              <IconBtn label="Túi đồ" active={overlay === "bag"} onClick={() => openOverlay(overlay === "bag" ? "none" : "bag")}>
                <Backpack className="size-4" />
              </IconBtn>
              <span className="hidden sm:inline-flex">
                <IconBtn label="Trợ giúp" onClick={() => openOverlay("help")}>
                  <HelpCircle className="size-4" />
                </IconBtn>
              </span>
              <IconBtn label="Tiệm" onClick={() => openOverlay("shop")}>
                <ShoppingBag className="size-4" />
              </IconBtn>
              <IconBtn label="Tạm dừng" active={overlay === "pause"} onClick={() => openOverlay(overlay === "pause" ? "none" : "pause")}>
                <Pause className="size-4" />
              </IconBtn>
            </div>
          </header>

          {getHint() && (
            <div className="pointer-events-none absolute bottom-52 left-1/2 z-10 max-w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-md bg-hud px-3 py-2 text-center text-sm font-medium text-ink shadow-chip sm:bottom-20">
              {getHint()}
            </div>
          )}
          {getToast() && (
            <div className="pointer-events-none absolute top-24 left-1/2 z-10 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-sm text-paper">
              {getToast()}
            </div>
          )}

          <nav className="absolute bottom-36 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-lg bg-hud p-1.5 shadow-chip sm:bottom-4 sm:gap-1.5">
            {TOOLS.map((tool, i) => {
              const n = toolCount(tool);
              return (
                <button
                  key={tool}
                  type="button"
                  aria-label={TOOL_LABEL[tool]}
                  onClick={() => {
                    setTool(tool);
                    refresh();
                  }}
                  className={
                    "relative flex size-11 shrink-0 flex-col items-center justify-center rounded-md text-[10px] font-medium leading-none " +
                    (g.tool === tool ? "bg-sage text-paper" : "text-ink-soft hover:bg-paper-deep")
                  }
                >
                  <span className="tabular-nums opacity-70">{i + 1}</span>
                  <ToolGlyph tool={tool} />
                  {n !== null && (
                    <span className="absolute -top-0.5 -right-0.5 rounded-full bg-clay px-1 text-[9px] leading-4 text-paper tabular-nums">
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div
            ref={joyRef}
            className="absolute bottom-4 left-3 z-10 size-28 touch-none rounded-full bg-hud/80 shadow-chip sm:hidden"
            onPointerDown={(e) => {
              (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
              stick.current.active = true;
              stick.current.id = e.pointerId;
              aimStick(e, joyRef.current, stick.current);
              refresh();
            }}
            onPointerMove={(e) => {
              if (stick.current.id === e.pointerId) {
                aimStick(e, joyRef.current, stick.current);
                refresh();
              }
            }}
            onPointerUp={() => {
              stick.current.active = false;
              stick.current.id = null;
              stick.current.x = 0;
              stick.current.y = 0;
              refresh();
            }}
          >
            <div className="absolute inset-8 rounded-full bg-mist" />
            <div
              className="absolute top-1/2 left-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage"
              style={{
                transform: `translate(calc(-50% + ${stick.current.x * 36}px), calc(-50% + ${stick.current.y * 36}px))`,
              }}
            />
          </div>
          <button
            type="button"
            className="absolute right-3 bottom-4 z-10 flex size-16 items-center justify-center rounded-full bg-clay text-sm font-medium text-paper shadow-md sm:hidden"
            onPointerDown={(e) => {
              e.preventDefault();
              interact();
              refresh();
            }}
          >
            Làm
          </button>
        </>
      )}

      {overlay !== "none" && phase === "play" && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <section className="overlay-panel max-h-[min(86dvh,640px)] w-full max-w-lg overflow-auto rounded-xl bg-paper p-5 shadow-panel">
            {overlay === "shop" && g && (
              <ShopPanel
                onClose={() => {
                  persistNow();
                  openOverlay("none");
                  refresh();
                }}
                onMutate={refresh}
              />
            )}
            {overlay === "bag" && g && (
              <BagPanel
                onClose={() => {
                  persistNow();
                  openOverlay("none");
                }}
                onMutate={refresh}
              />
            )}
            {overlay === "help" && (
              <HelpPanel
                onClose={() => {
                  markHelpSeen();
                  openOverlay("none");
                }}
              />
            )}
            {overlay === "pause" && (
              <PausePanel
                onResume={() => openOverlay("none")}
                onHelp={() => openOverlay("help")}
                onShop={() => openOverlay("shop")}
                onBag={() => openOverlay("bag")}
                onTitle={() => {
                  saveGame(getGame());
                  setPhase("title");
                  setSaved(true);
                  openOverlay("none");
                }}
              />
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function ToolGlyph({ tool }: { tool: ToolId }) {
  const cls = "mt-0.5 size-4";
  if (tool === "hoe") return <Shovel className={cls} strokeWidth={1.75} />;
  if (tool === "water") return <Droplets className={cls} strokeWidth={1.75} />;
  if (tool === "carrot") return <Carrot className={cls} strokeWidth={1.75} />;
  if (tool === "tomato") return <Cherry className={cls} strokeWidth={1.75} />;
  if (tool === "rice") return <Wheat className={cls} strokeWidth={1.75} />;
  if (tool === "berry") return <Grape className={cls} strokeWidth={1.75} />;
  if (tool === "feed") return <Bone className={cls} strokeWidth={1.75} />;
  return <Fish className={cls} strokeWidth={1.75} />;
}

function aimStick(e: React.PointerEvent, el: HTMLDivElement | null, stick: Stick) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let x = (e.clientX - cx) / (r.width / 2);
  let y = (e.clientY - cy) / (r.height / 2);
  const m = Math.hypot(x, y) || 1;
  if (m > 1) {
    x /= m;
    y /= m;
  }
  stick.x = x;
  stick.y = y;
}

function ShopPanel({ onClose, onMutate }: { onClose: () => void; onMutate: () => void }) {
  const g = getGame();
  const sellables: ItemId[] = ["carrot", "tomato", "rice", "berry", "egg", "milk", "truffle", "fish"];
  const labels: Record<string, string> = {
    carrot: CROP_INFO.carrot.label,
    tomato: CROP_INFO.tomato.label,
    rice: CROP_INFO.rice.label,
    berry: CROP_INFO.berry.label,
    egg: PRODUCT_INFO.egg.label,
    milk: PRODUCT_INFO.milk.label,
    truffle: PRODUCT_INFO.truffle.label,
    fish: PRODUCT_INFO.fish.label,
  };
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Tiệm ven đường</h2>
      <p className="mt-1 text-sm text-ink-soft">Vàng đang có: {g.gold}</p>
      <h3 className="mt-5 text-sm font-medium">Mua</h3>
      <ul className="mt-2 space-y-2">
        {(Object.keys(CROP_INFO) as CropKind[]).map((k) => (
          <li key={k} className="flex items-center justify-between gap-3 rounded-md bg-paper-deep px-3 py-2">
            <span className="text-sm">3 hạt {CROP_INFO[k].label.toLowerCase()}</span>
            <button
              type="button"
              className="h-9 rounded-md bg-sage px-3 text-sm text-paper disabled:opacity-40"
              disabled={g.gold < CROP_INFO[k].seedCost}
              onClick={() => {
                buy(k);
                onMutate();
              }}
            >
              {CROP_INFO[k].seedCost}g
            </button>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 rounded-md bg-paper-deep px-3 py-2">
          <span className="text-sm">3 túi cám</span>
          <button
            type="button"
            className="h-9 rounded-md bg-sage px-3 text-sm text-paper disabled:opacity-40"
            disabled={g.gold < 6}
            onClick={() => {
              buy("feed");
              onMutate();
            }}
          >
            6g
          </button>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-md bg-paper-deep px-3 py-2">
          <span className="text-sm">2 thức ăn cá</span>
          <button
            type="button"
            className="h-9 rounded-md bg-sage px-3 text-sm text-paper disabled:opacity-40"
            disabled={g.gold < 8}
            onClick={() => {
              buy("fishfood");
              onMutate();
            }}
          >
            8g
          </button>
        </li>
        {(Object.keys(ANIMAL_INFO) as AnimalKind[]).map((k) => (
          <li key={k} className="flex items-center justify-between gap-3 rounded-md bg-paper-deep px-3 py-2">
            <span className="text-sm">
              {ANIMAL_INFO[k].label} ({g.animals.filter((a) => a.kind === k).length}/{ANIMAL_INFO[k].max})
            </span>
            <button
              type="button"
              className="h-9 rounded-md bg-sage px-3 text-sm text-paper disabled:opacity-40"
              disabled={g.gold < ANIMAL_INFO[k].price}
              onClick={() => {
                buy(k);
                onMutate();
              }}
            >
              {ANIMAL_INFO[k].price}g
            </button>
          </li>
        ))}
      </ul>
      <h3 className="mt-5 text-sm font-medium">Bán</h3>
      <ul className="mt-2 space-y-2">
        {sellables.map((k) => (
          <li key={k} className="flex items-center justify-between gap-3 rounded-md bg-paper-deep px-3 py-2">
            <span className="text-sm">
              {labels[k]} × {g.inventory[k]}
            </span>
            <button
              type="button"
              className="h-9 rounded-md bg-paper px-3 text-sm shadow-chip disabled:opacity-40"
              disabled={g.inventory[k] <= 0}
              onClick={() => {
                sell(k);
                onMutate();
              }}
            >
              Bán 1
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className="h-11 flex-1 rounded-lg bg-clay px-4 text-sm font-medium text-paper"
          onClick={() => {
            sellAll();
            onMutate();
          }}
        >
          Bán hết
        </button>
        <button type="button" className="h-11 flex-1 rounded-lg bg-paper-deep px-4 text-sm font-medium" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  );
}

function BagPanel({ onClose, onMutate }: { onClose: () => void; onMutate: () => void }) {
  const g = getGame();
  const foods = (Object.keys(CROP_INFO) as CropKind[]).filter((k) => g.inventory[k] > 0);
  const seeds: { id: ItemId; label: string }[] = [
    { id: "carrotSeed", label: "Hạt cà rốt" },
    { id: "tomatoSeed", label: "Hạt cà chua" },
    { id: "riceSeed", label: "Hạt lúa" },
    { id: "berrySeed", label: "Hạt dâu" },
  ];
  const goods: { id: ItemId; label: string }[] = [
    { id: "egg", label: PRODUCT_INFO.egg.label },
    { id: "milk", label: PRODUCT_INFO.milk.label },
    { id: "truffle", label: PRODUCT_INFO.truffle.label },
    { id: "fish", label: PRODUCT_INFO.fish.label },
    { id: "feed", label: "Cám" },
    { id: "fishfood", label: "Thức ăn cá" },
  ];
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Túi đồ</h2>
      <p className="mt-1 text-sm text-ink-soft">Ăn nông sản để hồi sức khi còn đang ngoài đồng.</p>
      <h3 className="mt-5 text-sm font-medium">Nông sản</h3>
      {foods.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Chưa có gì để ăn.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {foods.map((k) => (
            <li key={k} className="flex items-center justify-between gap-3 rounded-md bg-paper-deep px-3 py-2">
              <span className="text-sm">
                {CROP_INFO[k].label} × {g.inventory[k]}
                <span className="ml-2 text-ink-soft">+{CROP_INFO[k].energy} sức</span>
              </span>
              <button
                type="button"
                className="h-9 rounded-md bg-sage px-3 text-sm text-paper"
                onClick={() => {
                  eat(k);
                  onMutate();
                }}
              >
                Ăn
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt-5 text-sm font-medium">Hạt giống</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {seeds.map((s) => (
          <li key={s.id} className="rounded-md bg-paper-deep px-3 py-2 text-sm">
            {s.label} <span className="tabular-nums text-ink-soft">×{g.inventory[s.id]}</span>
          </li>
        ))}
      </ul>
      <h3 className="mt-5 text-sm font-medium">Khác</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {goods.map((s) => (
          <li key={s.id} className="rounded-md bg-paper-deep px-3 py-2 text-sm">
            {s.label} <span className="tabular-nums text-ink-soft">×{g.inventory[s.id]}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-6 h-11 w-full rounded-lg bg-sage font-medium text-paper" onClick={onClose}>
        Đóng
      </button>
    </div>
  );
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Cách chơi</h2>
      <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
        <li>Xới ô cỏ bằng cuốc, gieo hạt, tưới mỗi ngày cho đến khi chín.</li>
        <li>Cho gà, bò, heo ăn. Sáng hôm sau thu trứng, sữa, nấm cục.</li>
        <li>Đứng bờ hồ, thả thức ăn cá, qua ngày rồi bắt cá.</li>
        <li>Làm việc hôm nay để nhận vàng. Ăn nông sản trong túi nếu hết sức.</li>
        <li>Bán nông sản ở tiệm. Về nhà ngủ để hồi sức và sang ngày mới. Mưa sẽ tưới sẵn luống.</li>
      </ol>
      <button type="button" className="mt-6 h-11 w-full rounded-lg bg-sage font-medium text-paper" onClick={onClose}>
        Hiểu rồi
      </button>
    </div>
  );
}

function PausePanel({
  onResume,
  onHelp,
  onShop,
  onBag,
  onTitle,
}: {
  onResume: () => void;
  onHelp: () => void;
  onShop: () => void;
  onBag: () => void;
  onTitle: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Tạm dừng</h2>
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" className="h-11 rounded-lg bg-sage font-medium text-paper" onClick={onResume}>
          Tiếp tục
        </button>
        <button type="button" className="h-11 rounded-lg bg-paper-deep font-medium" onClick={onBag}>
          Túi đồ
        </button>
        <button type="button" className="h-11 rounded-lg bg-paper-deep font-medium" onClick={onShop}>
          Tiệm
        </button>
        <button type="button" className="h-11 rounded-lg bg-paper-deep font-medium" onClick={onHelp}>
          Cách chơi
        </button>
        <button type="button" className="h-11 rounded-lg bg-paper-deep font-medium text-ink-soft" onClick={onTitle}>
          Về trang đầu
        </button>
      </div>
    </div>
  );
}
