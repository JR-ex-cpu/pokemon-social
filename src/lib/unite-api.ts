import snapshotJson from "./roster-snapshot.json";

export type ApiSource = "live" | "snapshot";

export type UniteBuild = {
  name: string;
  lane: string;
  held: string[];
  battle: string;
  upgrade: string[];
  explanation: string;
};

export type UniteSkill = {
  name: string;
  ability: string;
  description: string;
};

export type UniteMon = {
  name: string;
  tier: string;
  tierChange: string;
  solo: string;
  damage: string;
  role: string;
  range: string;
  difficulty: string;
  notes: string;
  updated: string;
  builds: UniteBuild[];
  skills: UniteSkill[];
};

const TIER_RANK: Record<string, number> = {
  S: 0,
  "A+": 1,
  A: 2,
  "B+": 3,
  B: 4,
  C: 5,
  D: 6,
  F: 7,
  TBD: 9,
};

export const ROLE_LABEL: Record<string, string> = {
  Attacker: "Ataque",
  Speedster: "Velocidad",
  Defender: "Defensa",
  Supporter: "Apoyo",
  "All-Rounder": "Equilibrado",
};

export const SNAPSHOT = snapshotJson as UniteMon[];

type RawMon = {
  name?: string;
  display_name?: string;
  tier?: string;
  tier_change?: string;
  soloQtier?: string;
  damage_type?: string;
  notes?: string;
  last_updated?: string;
  tags?: { role?: string; range?: string; difficulty?: string };
  builds?: Array<{
    name?: string;
    lane?: string;
    held_items?: string[];
    battle_item?: string;
    upgrade?: string[];
    explanation?: string;
  }>;
  skills?: Array<{ name?: string; ability?: string; description?: string }>;
};

function clip(value: unknown, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function mapMon(mon: RawMon): UniteMon {
  return {
    name: mon.display_name || mon.name || "—",
    tier: mon.tier || "TBD",
    tierChange: mon.tier_change || "",
    solo: mon.soloQtier || "",
    damage: mon.damage_type || "",
    role: mon.tags?.role || "",
    range: mon.tags?.range || "",
    difficulty: mon.tags?.difficulty || "",
    notes: clip(mon.notes, 280),
    updated: mon.last_updated || "",
    builds: (mon.builds ?? []).slice(0, 2).map((build) => ({
      name: build.name || "Build",
      lane: build.lane || "",
      held: (build.held_items ?? []).filter(Boolean).slice(0, 3),
      battle: build.battle_item || "",
      upgrade: (build.upgrade ?? []).filter(Boolean).slice(0, 3),
      explanation: clip(build.explanation, 220),
    })),
    skills: (mon.skills ?? []).slice(0, 4).map((skill) => ({
      name: skill.name || "Movimiento",
      ability: skill.ability || "",
      description: clip(skill.description, 180),
    })),
  };
}

export async function loadRoster(source: ApiSource = "live"): Promise<UniteMon[]> {
  if (source === "snapshot") return SNAPSHOT;
  const response = await fetch("https://unite-db.com/pokemon.json");
  if (!response.ok) {
    throw new Error("Unite DB no respondió. Reintenta en un momento.");
  }
  const data = (await response.json()) as RawMon[];
  return data.map(mapMon).sort((a, b) => a.name.localeCompare(b.name));
}

export function bestOfRole(roster: UniteMon[], role: string): UniteMon | undefined {
  return roster
    .filter((mon) => mon.role === role && mon.tier !== "TBD")
    .sort((a, b) => (TIER_RANK[a.tier] ?? 8) - (TIER_RANK[b.tier] ?? 8) || a.name.localeCompare(b.name))[0];
}

export function tierRank(tier: string): number {
  return TIER_RANK[tier] ?? 8;
}
