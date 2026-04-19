"use client";

import { useState, useRef } from "react";
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

type RarityVisual = {
  name: string;
  glow: string;
  scan: string;
  badge: string;
};

const RARITY_VISUALS: Record<string, RarityVisual> = {
  common: {
    name: "Standard",
    glow: "shadow-black/70",
    scan: "before:hidden",
    badge: "from-white/30 to-white/5",
  },
  uncommon: {
    name: "Uncommon",
    glow: "shadow-[#22c55e]/25",
    scan: "before:opacity-20",
    badge: "from-emerald-300/30 to-cyan-200/10",
  },
  rare: {
    name: "Rare",
    glow: "shadow-[#38bdf8]/35",
    scan: "before:opacity-30",
    badge: "from-sky-300/35 to-sky-500/10",
  },
  holo: {
    name: "Holo",
    glow: "shadow-[#d8b4fe]/45",
    scan: "before:opacity-45",
    badge: "from-fuchsia-200/45 to-blue-200/15",
  },
  legendary: {
    name: "Legendary",
    glow: "shadow-[#fef08a]/55",
    scan: "before:opacity-60",
    badge: "from-amber-200/60 to-yellow-300/20",
  },
};

export default function PokemonCardComponent({ card }: { card: PokemonCard }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const typeColors = TYPE_COLORS[card.type];
  const rarityStyle = RARITY_STYLES[card.rarity];
  const rarityVisual = RARITY_VISUALS[card.rarity];

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
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

  return (
    <div className="perspective-[1000px]">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        className={`group relative w-[330px] rounded-[1.25rem] overflow-hidden ${rarityStyle} ${auraClass} ${rarityStyle} transition-transform duration-250 ease-out cursor-pointer`}
        style={{
          transform: isHovering
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
            : "rotateX(0) rotateY(0) scale(1)",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className={`absolute inset-[3px] rounded-[1.1rem] border ${typeColors.border} ${rarityVisual.glow} pointer-events-none z-30 transition-opacity duration-500 ${isHovering ? "opacity-100" : "opacity-70"} ${isHovering ? "shadow-[0_0_36px]" : "shadow-[0_0_18px]"}`}
        />
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.08) 30%, transparent 34%, rgba(255,255,255,0.05) 68%, transparent 72%)",
            transform: `translateX(${isHovering ? tilt.y * 0.75 : 0}px)`,
            opacity: isHovering ? 0.8 : 0.45,
            mixBlendMode: "screen",
          }}
        />

        {/* Holo shimmer pulse */}
        {(card.rarity === "holo" || card.rarity === "legendary") && (
          <div
            className="absolute inset-0 z-20 pointer-events-none rounded-[1.25rem] bg-gradient-to-br from-transparent via-white/15 to-transparent transition-opacity duration-700"
            style={{
              opacity: isHovering ? 0.45 : 0.16,
              transform: `translateX(${isHovering ? tilt.y * 2.5 : 0}px) rotate(${isHovering ? 4 : 0}deg)`,
            }}
          />
        )}

        {/* Card shell */}
        <div
          className={`relative z-10 border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-950/95 p-[11px]`}
        >
          <div className="relative overflow-hidden rounded-[0.95rem] border border-white/10">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent 49%,rgba(255,255,255,0.04) 50%,transparent 51%)] bg-[length:16px_100%]" />
          </div>

          {/* Card body */}
          <div className="relative">
            {/* === TOP: Repo name + HP === */}
            <div className={`rounded-t-lg bg-gradient-to-r ${typeColors.gradient} px-3 py-2 border-b border-black/25`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-black text-white/90 shrink-0">Lv.{card.level}</span>
                  <div className="leading-none">
                    <h2 className={`text-[15px] font-black ${typeColors.text} tracking-tight truncate`}>
                      {card.repoName}
                    </h2>
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

            {/* === IMAGE: Owner avatar as battle render === */}
            <div className="relative h-40 mt-1 mb-1 mx-2 overflow-hidden rounded-sm border-4 bg-slate-950">
              <div className={`absolute inset-0 bg-gradient-to-b ${typeColors.gradient} opacity-25 mix-blend-screen`} />
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50" />
              <img
                src={card.ownerAvatar}
                alt={card.repoName}
                className="relative z-0 w-full h-full object-cover opacity-80 scale-105"
              />
              <div className="absolute top-2 left-2 z-10 rounded-full border border-white/35 px-2 py-0.5 bg-black/45 backdrop-blur-sm">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/80">
                  {rarityVisual.name}
                </span>
              </div>
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <span className={`text-white text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${rarityVisual.badge} uppercase tracking-[0.18em] shadow`}> 
                  {card.rarity}
                </span>
                <span className={`${typeColors.badge} text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide`}>
                  {card.type}
                </span>
              </div>
              <div className="absolute bottom-2 left-2 z-20 flex gap-1">
                <span className="bg-black/65 text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-[0.14em]">
                  {card.language}
                </span>
              </div>
              <div className="absolute bottom-2 right-2 z-20 text-xs tracking-tight text-white/80 bg-black/65 px-2 py-0.5 rounded-full border border-white/20">
                {card.rarity === "legendary" ? "★★★" : card.rarity === "holo" ? "★★" : card.rarity === "rare" ? "★" : ""}
              </div>
            </div>

            {/* === DESCRIPTION === */}
            <div className="mx-2 mb-1">
              <p className="text-[9px] text-white/75 leading-tight line-clamp-2 italic">
                {card.description}
              </p>
            </div>

            {/* === MOVES === */}
            <div className="mx-2 space-y-1">
              {card.moves.map((move, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 border border-white/15 bg-black/45"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: move.energyCost }).map((_, j) => (
                      <span key={j} className="text-xs">{TYPE_COLORS[move.type].energy}</span>
                    ))}
                  </div>
                  <span className="flex-1 text-sm font-bold text-white/90 truncate">{move.name}</span>
                  <span className="text-sm font-black text-yellow-200">{move.damage}</span>
                </div>
              ))}
            </div>

            {/* === STATS === */}
            <div className="mx-2 mt-2 rounded-lg p-2 space-y-1 bg-white/[0.03] border border-white/20">
              <StatBar label="Attack" value={card.attack} color="bg-rose-400/90" />
              <StatBar label="Defense" value={card.defense} color="bg-sky-400/90" />
              <StatBar label="Sp. Atk" value={card.spAttack} color="bg-violet-400/90" />
              <StatBar label="Sp. Def" value={card.spDefense} color="bg-emerald-400/90" />
              <StatBar label="Speed" value={card.speed} color="bg-amber-300/90" />
            </div>

            {/* === WEAKNESS / RESISTANCE / POWER === */}
            <div className="mx-2 mt-2 flex items-center justify-between text-[9px] border-t border-white/20 pt-1.5">
              <div className="text-center">
                <p className="font-bold text-white/70 uppercase tracking-[0.18em]">Weak</p>
                <span className={`${TYPE_COLORS[card.weakness].badge} text-white text-[8px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5`}>
                  {TYPE_COLORS[card.weakness].energy} {card.weakness}
                </span>
              </div>
              <div className="text-center">
                <p className="font-bold text-white/70 uppercase tracking-[0.18em]">Resist</p>
                <span className={`${TYPE_COLORS[card.resistance].badge} text-white text-[8px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5`}>
                  {TYPE_COLORS[card.resistance].energy} {card.resistance}
                </span>
              </div>
              <div className="text-center">
                <p className="font-bold text-white/70 uppercase tracking-[0.18em]">Power</p>
                <span className="text-sm font-black text-amber-200">{card.totalPower}</span>
              </div>
            </div>

            {/* === FLAVOR TEXT === */}
            <div className="mx-2 mt-2 mb-1">
              <p className="text-[8px] text-white/65 italic leading-tight px-1 border-l-2 border-white/30">
                {card.flavorText}
              </p>
            </div>

            {/* === FOOTER === */}
            <div className="flex items-center justify-between px-2 pb-1 text-[7px] text-white/65">
              <span>GITDEX #{card.repoName.length * 7 + card.hp}</span>
              <span>Battle Unit &copy;{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
