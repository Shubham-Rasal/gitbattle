"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { PokemonCard } from "@/types/card";
import { TYPE_COLORS, RARITY_STYLES } from "@/lib/type-colors";

function StatBar({ label, value, max = 255, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 text-[10px] text-gray-200">
      <span className="w-16 text-right font-semibold uppercase tracking-[0.18em] text-white/80">{label}</span>
      <span className="w-8 text-right font-black">{value}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden border border-white/20">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_14px] ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type RarityVisual = { glow: string };

const RARITY_VISUALS: Record<string, RarityVisual> = {
  common: { glow: "shadow-black/70" },
  uncommon: { glow: "shadow-[#22c55e]/25" },
  rare: { glow: "shadow-[#38bdf8]/35" },
  holo: { glow: "shadow-[#d8b4fe]/45" },
  legendary: { glow: "shadow-[#fef08a]/55" },
};

type HeroVars = { dx: number; dy: number; s: number; tw: number };

export default function PokemonCardComponent({
  card,
  variant = "default",
}: {
  card: PokemonCard;
  variant?: "default" | "landing";
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [heroVars, setHeroVars] = useState<HeroVars | null>(null);
  const [placeholderHeight, setPlaceholderHeight] = useState<number | undefined>();
  const cardRef = useRef<HTMLDivElement>(null);

  const typeColors = TYPE_COLORS[card.type];
  const rarityStyle = RARITY_STYLES[card.rarity];
  const rarityVisual = RARITY_VISUALS[card.rarity];

  const closeExpanded = useCallback(() => {
    setExpanded(false);
    setHeroVars(null);
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeExpanded();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, closeExpanded]);

  function handleExpand() {
    const el = cardRef.current;
    if (!el || expanded) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = Math.min(vw - 24, 400);
    const dx = r.left + r.width / 2 - vw / 2;
    const dy = r.top + r.height / 2 - vh / 2;
    const s = r.width / tw;
    setPlaceholderHeight(el.offsetHeight);
    setHeroVars({ dx, dy, s, tw });
    setExpanded(true);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (expanded) return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (y - 0.5) * -20,
      y: (x - 0.5) * 20,
    });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
    setIsHovering(false);
  }

  const auraClass =
    card.rarity === "holo" || card.rarity === "legendary"
      ? "before:absolute before:inset-0 before:rounded-[1.25rem] before:bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.45),rgba(255,255,255,0)_55%)] before:opacity-0 before:transition-opacity before:duration-500 before:pointer-events-none before:z-0 "
      : "before:absolute before:inset-0 before:rounded-[1.25rem] before:bg-[linear-gradient(110deg,rgba(255,255,255,0.20),rgba(255,255,255,0)_45%,rgba(255,255,255,0.22))] before:opacity-10 before:transition-opacity before:duration-700 before:pointer-events-none before:z-0";

  const cardSurfaceStyle: CSSProperties =
    expanded && heroVars
      ? {
          width: heroVars.tw,
          transformStyle: "preserve-3d",
          isolation: "isolate",
          ["--hero-dx" as string]: `${heroVars.dx}px`,
          ["--hero-dy" as string]: `${heroVars.dy}px`,
          ["--hero-s" as string]: String(heroVars.s),
        }
      : {
          transform: isHovering
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
            : "rotateX(0) rotateY(0) scale(1)",
          transformStyle: "preserve-3d",
        };

  const cardFace = (
    <>
      {expanded ? (
        <div
          className="pointer-events-none absolute inset-0 z-[38] overflow-hidden rounded-[1.25rem] animate-card-shine-sweep"
          style={{
            background:
              "linear-gradient(118deg, transparent 44%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.22) 53%, transparent 59%)",
          }}
        />
      ) : null}
      <div
        className={`absolute inset-[3px] rounded-[1.1rem] border ${typeColors.border} ${rarityVisual.glow} pointer-events-none z-30 transition-opacity duration-500 ${isHovering || expanded ? "opacity-100" : "opacity-70"} ${isHovering || expanded ? "shadow-[0_0_36px]" : "shadow-[0_0_18px]"}`}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.08) 30%, transparent 34%, rgba(255,255,255,0.05) 68%, transparent 72%)",
          transform: `translateX(${!expanded && isHovering ? tilt.y * 0.75 : 0}px)`,
          opacity: expanded ? 0.28 : isHovering ? 0.8 : 0.45,
          mixBlendMode: expanded ? "normal" : "screen",
        }}
      />

      {(card.rarity === "holo" || card.rarity === "legendary") && (
        <div
          className="absolute inset-0 z-20 pointer-events-none rounded-[1.25rem] bg-gradient-to-br from-transparent via-white/15 to-transparent transition-opacity duration-700"
          style={{
            opacity: expanded ? 0.5 : isHovering ? 0.45 : 0.16,
            transform: `translateX(${!expanded && isHovering ? tilt.y * 2.5 : 0}px) rotate(${!expanded && isHovering ? 4 : 0}deg)`,
          }}
        />
      )}

      <div
        className={`relative z-10 border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-950/95 p-[11px]`}
      >
        <div className="relative overflow-hidden rounded-[0.95rem] border border-white/10">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent 49%,rgba(255,255,255,0.04) 50%,transparent 51%)] bg-[length:16px_100%]" />
        </div>

        <div className="relative">
          <div className={`rounded-t-lg bg-gradient-to-r ${typeColors.gradient} px-3 py-2 border-b border-black/25`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-black text-white/90 shrink-0">Lv.{card.level}</span>
                <div className="leading-none">
                  <h2 className={`text-[15px] font-black ${typeColors.text} tracking-tight truncate`}>{card.repoName}</h2>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-black/80">HP</span>
                <span className={`text-2xl font-black ${typeColors.text}`}>{card.hp}</span>
                <span className="text-sm">{typeColors.energy}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <img src={card.ownerAvatar} alt={card.ownerName} className="w-3.5 h-3.5 rounded-full border border-white/40" />
              <p className="text-[9px] text-black/70 truncate">
                {card.title} · @{card.ownerName}
              </p>
            </div>
          </div>

          <div className="relative h-40 mt-1 mb-1 mx-2 overflow-hidden rounded-sm border-4 bg-slate-950">
            <div className={`absolute inset-0 bg-gradient-to-b ${typeColors.gradient} opacity-25 mix-blend-screen`} />
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50" />
            <img
              src={card.ownerAvatar}
              alt={card.repoName}
              className="relative z-0 w-full h-full object-cover opacity-80 scale-105"
            />
          </div>

          <div className="mx-2 mb-1">
            <p className="text-[9px] text-white/75 leading-tight line-clamp-2 italic">{card.description}</p>
          </div>

          <div className="mx-2 space-y-1">
            {card.moves.map((move, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 border border-white/15 bg-black/45"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: move.energyCost }).map((_, j) => (
                    <span key={j} className="text-xs">
                      {TYPE_COLORS[move.type].energy}
                    </span>
                  ))}
                </div>
                <span className="flex-1 text-sm font-bold text-white/90 truncate">{move.name}</span>
                <span className="text-sm font-black text-yellow-200">{move.damage}</span>
              </div>
            ))}
          </div>

          <div className="mx-2 mt-2 rounded-lg p-2 space-y-1 bg-white/[0.03] border border-white/20">
            <StatBar label="Attack" value={card.attack} color="bg-rose-400/90" />
            <StatBar label="Defense" value={card.defense} color="bg-sky-400/90" />
            <StatBar label="Sp. Atk" value={card.spAttack} color="bg-violet-400/90" />
            <StatBar label="Sp. Def" value={card.spDefense} color="bg-emerald-400/90" />
            <StatBar label="Speed" value={card.speed} color="bg-amber-300/90" />
          </div>

          <div className="mx-2 mt-2 flex items-center justify-between text-[9px] border-t border-white/20 pt-1.5">
            <div className="text-center">
              <p className="font-bold text-white/70 uppercase tracking-[0.18em]">Weak</p>
              <span
                className={`${TYPE_COLORS[card.weakness].badge} text-white text-[8px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5`}
              >
                {TYPE_COLORS[card.weakness].energy} {card.weakness}
              </span>
            </div>
            <div className="text-center">
              <p className="font-bold text-white/70 uppercase tracking-[0.18em]">Resist</p>
              <span
                className={`${TYPE_COLORS[card.resistance].badge} text-white text-[8px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5`}
              >
                {TYPE_COLORS[card.resistance].energy} {card.resistance}
              </span>
            </div>
            <div className="text-center">
              <p className="font-bold text-white/70 uppercase tracking-[0.18em]">Power</p>
              <span className="text-sm font-black text-amber-200">{card.totalPower}</span>
            </div>
          </div>

          {variant !== "landing" ? (
            <div className="mx-2 mt-2 mb-1">
              <p className="text-[8px] text-white/65 italic leading-tight px-1 border-l-2 border-white/30">{card.flavorText}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between px-2 pb-1 text-[7px] text-white/65">
            <span>GITDEX #{card.repoName.length * 7 + card.hp}</span>
            <span>Battle Unit &copy;{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </>
  );

  const expandedLayer =
    expanded && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close card"
              className="fixed inset-0 z-[90] cursor-zoom-out border-0 bg-black/72 p-0 backdrop-blur-[2px] animate-backdrop-in"
              onClick={closeExpanded}
            />
            <div
              role="dialog"
              aria-modal
              aria-label={`${card.repoName} card`}
              tabIndex={0}
              className={`group rounded-[1.25rem] overflow-hidden ${rarityStyle} ${auraClass} ${rarityStyle} fixed left-1/2 top-1/2 z-[100] w-[min(calc(100vw-1.5rem),400px)] max-w-[min(calc(100vw-1.5rem),400px)] animate-card-hero-enter cursor-default outline-none`}
              style={cardSurfaceStyle}
            >
              {cardFace}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className="w-full max-w-[330px] shrink-0"
        style={{ minHeight: expanded && placeholderHeight ? placeholderHeight : undefined }}
      >
        {!expanded ? (
          <div className="perspective-[1000px] w-full">
            <div
              ref={cardRef}
              role="button"
              aria-label={`Open ${card.repoName} card`}
              tabIndex={0}
              onClick={() => {
                if (!expanded) handleExpand();
              }}
              onKeyDown={(e) => {
                if (!expanded && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleExpand();
                }
              }}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => {
                if (!expanded) setIsHovering(true);
              }}
              onMouseLeave={handleMouseLeave}
              className={`group rounded-[1.25rem] overflow-hidden ${rarityStyle} ${auraClass} ${rarityStyle} relative w-full max-w-[330px] transition-transform duration-250 ease-out cursor-pointer`}
              style={cardSurfaceStyle}
            >
              {cardFace}
            </div>
          </div>
        ) : null}
      </div>
      {expandedLayer}
    </>
  );
}
