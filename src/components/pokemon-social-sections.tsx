import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  EMBLEM_SETS,
  FEATURED_BUILDS,
  OBJECT_ITEMS,
  POKEMON_DATA,
  RANDOM_RULES,
  buildRandomBuild,
  getRandomUniquePokemon,
  makeBuildName,
  type PokemonEntry,
} from "@/data/pokemon-social";

type SavedBuild = {
  id: string;
  name: string;
  pokemon: string;
  lane: string;
  route: string;
  items: string[];
  battleItem: string;
  createdAt: number;
};

type RandomChallenge = {
  pokemon: string;
  role: string;
  lane: string;
  rule: string;
};

const LOCAL_BUILD_KEY = "pokemon-social-saved-builds";
const LOCAL_TODAY_KEY = "pokemon-social-today-challenge";

const navItems = [
  { label: "Inicio", href: "/" },
  { label: "Meta", href: "/#meta" },
  { label: "Builds", href: "/builds" },
  { label: "Pokémon", href: "/#pokemon" },
  { label: "Objetos", href: "/#objetos" },
  { label: "Emblemas", href: "/#emblemas" },
  { label: "Mis builds", href: "/#mis-builds" },
  { label: "Retos", href: "/retos" },
];

function useSavedBuilds() {
  const [builds, setBuilds] = useState<SavedBuild[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(LOCAL_BUILD_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SavedBuild[];
      setBuilds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBuilds([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_BUILD_KEY, JSON.stringify(builds));
  }, [builds]);

  return { builds, setBuilds };
}

function randomChallengeFrom(previousPokemon?: string): RandomChallenge {
  const pokemon = getRandomUniquePokemon(previousPokemon);
  const entry = POKEMON_DATA.find((item) => item.name === pokemon) ?? POKEMON_DATA[0];
  return {
    pokemon,
    role: entry.role,
    lane: entry.build.lane,
    rule: RANDOM_RULES[Math.floor(Math.random() * RANDOM_RULES.length)],
  };
}

function useTodayChallenge() {
  const [challenge, setChallenge] = useState<RandomChallenge | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(LOCAL_TODAY_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RandomChallenge;
        if (parsed?.pokemon) {
          setChallenge(parsed);
          return;
        }
      } catch {
        // ignore invalid stored value
      }
    }
    const next = randomChallengeFrom();
    setChallenge(next);
    window.localStorage.setItem(LOCAL_TODAY_KEY, JSON.stringify(next));
  }, []);

  const refresh = () => {
    setChallenge((prev) => {
      const next = randomChallengeFrom(prev?.pokemon);
      window.localStorage.setItem(LOCAL_TODAY_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { challenge, refresh };
}

function getPokemonByName(name: string) {
  return POKEMON_DATA.find((entry) => entry.name === name) ?? POKEMON_DATA[0];
}

function buildIntroStats() {
  const roles = ["Ataque", "Velocidad", "Equilibrado", "Defensa", "Apoyo"];
  return roles.map((role) => ({
    label: role,
    count: POKEMON_DATA.filter((entry) => entry.role === role).length,
    accent: role === "Ataque" ? "#3ee0c5" : role === "Velocidad" ? "#e8c872" : "#8ab4ff",
  }));
}

export function PokemonCommunityLayout({ activePage = "home" }: { activePage?: "home" | "builds" | "retos" }) {
  const { builds, setBuilds } = useSavedBuilds();
  const { challenge, refresh } = useTodayChallenge();
  const [randomPokemon, setRandomPokemon] = useState<string>(POKEMON_DATA[0].name);
  const [randomBuild, setRandomBuild] = useState<ReturnType<typeof buildRandomBuild> | null>(null);
  const [filters, setFilters] = useState({ search: "", role: "Todos", lane: "Todos", tier: "Todos" });
  const [creator, setCreator] = useState({ pokemon: POKEMON_DATA[0].name, route: "Superior", items: ["Capa de presión", "Bastón de energía", "Botas de velocidad"], battleItem: "Piedra de presión", lane: "Superior", name: "Mi build" });

  useEffect(() => {
    const nextPokemon = getRandomUniquePokemon();
    setRandomPokemon(nextPokemon);
    setRandomBuild(buildRandomBuild(nextPokemon));
  }, []);

  const filteredBuilds = useMemo(() => {
    const needle = filters.search.toLowerCase();
    return FEATURED_BUILDS.filter((build) => {
      const matchName = !needle || build.name.toLowerCase().includes(needle) || build.pokemon.toLowerCase().includes(needle);
      const matchRole = filters.role === "Todos" || build.role === filters.role;
      return matchName && matchRole;
    });
  }, [filters]);

  const premiumList = useMemo(() => {
    const byRole: Record<string, PokemonEntry[]> = { Ataque: [], Velocidad: [], Equilibrado: [], Defensa: [], Apoyo: [] };
    POKEMON_DATA.forEach((entry) => byRole[entry.role].push(entry));
    return byRole;
  }, []);

  const saveBuild = () => {
    const nextBuild: SavedBuild = {
      id: crypto.randomUUID(),
      name: creator.name.trim() || `${creator.pokemon} ${creator.route}`,
      pokemon: creator.pokemon,
      lane: creator.lane,
      route: creator.route,
      items: creator.items,
      battleItem: creator.battleItem,
      createdAt: Date.now(),
    };

    setBuilds((current) => [nextBuild, ...current]);
  };

  const duplicateBuild = (build: SavedBuild) => {
    const clone: SavedBuild = {
      ...build,
      id: crypto.randomUUID(),
      name: `${build.name} copia`,
      createdAt: Date.now(),
    };
    setBuilds((current) => [clone, ...current]);
  };

  const deleteBuild = (id: string) => {
    setBuilds((current) => current.filter((item) => item.id !== id));
  };

  const randomizePokemon = () => {
    setRandomPokemon((prev) => {
      const next = getRandomUniquePokemon(prev);
      setRandomBuild(buildRandomBuild(next));
      return next;
    });
  };

  const randomizeBuild = () => {
    const next = getRandomUniquePokemon(randomBuild?.pokemon);
    setRandomBuild(buildRandomBuild(next));
    setRandomPokemon(next);
  };

  const previewBuild = randomBuild ?? buildRandomBuild(randomPokemon);

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#07111f]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#3ee0c5] text-lg font-black text-slate-950">PS</span>
            <div>
              <span className="block text-[10px] font-bold tracking-[0.24em] text-[#e8c872] uppercase">Fan-made</span>
              <span className="text-xl font-bold tracking-wide">Pokémon Social</span>
            </div>
          </Link>

          <nav className="hidden flex-wrap items-center gap-2 text-sm lg:flex">
            {navItems.map((item) => (
              <Link key={item.label} to={item.href} className={`rounded-full px-3 py-2 ${activePage === "home" && item.href === "/" ? "bg-[#3ee0c5] text-slate-950" : "text-slate-200 hover:bg-slate-800"}`}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/retos" className="rounded-full border border-[#3ee0c5] px-4 py-2 text-sm font-semibold text-[#3ee0c5] hover:bg-[#3ee0c5]/10">Retos</Link>
            <Link to="/builds" className="rounded-full bg-[#e8c872] px-4 py-2 text-sm font-bold text-slate-950">Builds</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="grid gap-4 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4 shadow-2xl shadow-slate-950/30 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.32em] text-[#3ee0c5] uppercase">Meta general</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Guía fan-made para Pokémon UNITE</h1>
            </div>
            <div className="rounded-full border border-[#e8c872] bg-[#e8c872]/10 px-4 py-2 text-sm font-semibold text-[#e8c872]">Fan-made, no afiliado</div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {buildIntroStats().map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{stat.label}</div>
                <div className="mt-3 text-3xl font-black" style={{ color: stat.accent }}>{stat.count}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="meta" className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold tracking-[0.22em] text-[#3ee0c5] uppercase">Navegación</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {navItems.map((item) => (
                <li key={item.label}><Link to={item.href} className="hover:text-[#3ee0c5]">{item.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold tracking-[0.22em] text-[#e8c872] uppercase">Builds</p>
            <p className="mt-2 text-sm text-slate-300">Sección nueva con buscador, filtros, tier list por rol y 6 builds destacados.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold tracking-[0.22em] text-[#3ee0c5] uppercase">Retos</p>
            <p className="mt-2 text-sm text-slate-300">Pokémon al azar, build al azar y el reto de hoy con regla distinta y guardable.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold tracking-[0.22em] text-[#e8c872] uppercase">Mis builds</p>
            <p className="mt-2 text-sm text-slate-300">Creador local con guardado en localStorage, duplicado y borrado.</p>
          </div>
        </section>

        <section id="builds" className="mt-10 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.28em] text-[#3ee0c5] uppercase">Builds</p>
              <h2 className="mt-2 text-3xl font-black">Línea de builds</h2>
            </div>
            <Link to="/builds" className="rounded-full border border-[#3ee0c5] px-4 py-2 text-sm font-semibold text-[#3ee0c5] hover:bg-[#3ee0c5]/10">Abrir página completa</Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Buscar set" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-100 outline-none ring-0" />
            <select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-100">
              <option value="Todos">Todos los roles</option>
              <option value="Ataque">Ataque</option>
              <option value="Velocidad">Velocidad</option>
              <option value="Equilibrado">Equilibrado</option>
              <option value="Defensa">Defensa</option>
              <option value="Apoyo">Apoyo</option>
            </select>
            <select value={filters.lane} onChange={(e) => setFilters((prev) => ({ ...prev, lane: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-100">
              <option value="Todos">Todos los carriles</option>
              <option value="Superior">Superior</option>
              <option value="Central">Central</option>
              <option value="Inferior">Inferior</option>
            </select>
            <select value={filters.tier} onChange={(e) => setFilters((prev) => ({ ...prev, tier: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-100">
              <option value="Todos">Todos los tiers</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredBuilds.map((build) => (
              <article key={build.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-[0.2em] text-[#e8c872] uppercase">{build.role}</p>
                    <h3 className="mt-1 text-xl font-bold">{build.name}</h3>
                  </div>
                  <span className="rounded-full border border-[#3ee0c5] px-2 py-1 text-xs font-bold text-[#3ee0c5]">{build.pokemon}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {build.items.map((item) => <span key={`${build.name}-${item}`} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">{item}</span>)}
                </div>
                <div className="mt-4 text-sm text-slate-300">Objeto de batalla: <span className="font-semibold text-[#e8c872]">{build.battleItem}</span></div>
              </article>
            ))}
          </div>
        </section>

        <section id="pokemon" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.28em] text-[#3ee0c5] uppercase">Pokémon</p>
              <h2 className="mt-2 text-3xl font-black">Ficha completa</h2>
            </div>
            <Link to="/builds" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">Ver fichas</Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POKEMON_DATA.map((entry) => (
              <article key={entry.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold tracking-[0.18em] text-[#3ee0c5] uppercase">{entry.role}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-[#e8c872]">{entry.tier}</span>
                </div>
                <h3 className="mt-3 text-2xl font-black">{entry.name}</h3>
                <p className="mt-1 text-sm text-slate-300">Carriles: {entry.lanes.join(" / ")}</p>
                <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                  {[entry.offensive, entry.resistance, entry.mobility, entry.annotation, entry.support].map((value, idx) => (
                    <div key={`${entry.name}-${idx}`} className="rounded-lg bg-slate-800 px-1 py-2">
                      <div className="font-bold text-[#3ee0c5]">{value}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="objetos" className="mt-10 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4 md:p-6">
          <p className="text-xs font-bold tracking-[0.28em] text-[#e8c872] uppercase">Objetos</p>
          <h2 className="mt-2 text-3xl font-black">Equipados y de batalla</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {OBJECT_ITEMS.map((item) => (
              <article key={item.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">{item.name}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#3ee0c5]">{item.type}</span>
                </div>
                <p className="mt-3 text-sm text-slate-300"><span className="font-semibold text-[#e8c872]">Estadística principal:</span> {item.stat}</p>
                <p className="mt-3 text-sm text-slate-300"><span className="font-semibold text-[#3ee0c5]">Para quién sirve:</span> {item.use}</p>
                <p className="mt-2 text-sm text-slate-400">Cuando no usarlo: {item.noUse}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="emblemas" className="mt-10 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4 md:p-6">
          <p className="text-xs font-bold tracking-[0.28em] text-[#3ee0c5] uppercase">Emblemas</p>
          <h2 className="mt-2 text-3xl font-black">Qué hace cada color</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {EMBLEM_SETS.map((set) => (
              <article key={set.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="text-lg font-bold capitalize">{set.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {set.colors.map((color) => (
                    <span key={`${set.name}-${color}`} className="rounded-full border border-slate-700 px-2 py-1 text-xs capitalize text-slate-200">{color}</span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-300">{set.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="mis-builds" className="mt-10 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4 md:p-6">
          <p className="text-xs font-bold tracking-[0.28em] text-[#e8c872] uppercase">Mis builds</p>
          <h2 className="mt-2 text-3xl font-black">Creador local</h2>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Pokémon
                  <select value={creator.pokemon} onChange={(e) => setCreator((prev) => ({ ...prev, pokemon: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    {POKEMON_DATA.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  Ruta
                  <select value={creator.route} onChange={(e) => setCreator((prev) => ({ ...prev, route: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <option value="Superior">Superior</option>
                    <option value="Central">Central</option>
                    <option value="Inferior">Inferior</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Objetos
                  <input value={creator.items[0]} onChange={(e) => setCreator((prev) => ({ ...prev, items: [e.target.value, prev.items[1], prev.items[2]] }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                </label>
                <label className="text-sm text-slate-300">
                  Objeto de batalla
                  <input value={creator.battleItem} onChange={(e) => setCreator((prev) => ({ ...prev, battleItem: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Item 2
                  <input value={creator.items[1]} onChange={(e) => setCreator((prev) => ({ ...prev, items: [prev.items[0], e.target.value, prev.items[2]] }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                </label>
                <label className="text-sm text-slate-300">
                  Item 3
                  <input value={creator.items[2]} onChange={(e) => setCreator((prev) => ({ ...prev, items: [prev.items[0], prev.items[1], e.target.value] }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
                </label>
              </div>

              <label className="text-sm text-slate-300">
                Nombre del build
                <input value={creator.name} onChange={(e) => setCreator((prev) => ({ ...prev, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              </label>

              <div className="flex gap-3">
                <button onClick={saveBuild} className="rounded-full bg-[#3ee0c5] px-4 py-2 text-sm font-bold text-slate-950">Guardar</button>
                <button onClick={() => setCreator((prev) => ({ ...prev, name: `${prev.pokemon} set`, route: prev.route, battleItem: prev.battleItem }))} className="rounded-full border border-slate-700 px-4 py-2 text-sm">Vista previa</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-bold tracking-[0.2em] text-[#3ee0c5] uppercase">Vista previa</p>
              <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xl font-black">{creator.name || "Mi build"}</p>
                <p className="mt-2 text-sm text-slate-300">{creator.pokemon} · {creator.route} · {creator.lane}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {creator.items.map((item) => <span key={`${item}-${creator.name}`} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">{item}</span>)}
                </div>
                <p className="mt-3 text-sm text-[#e8c872]">Objeto de batalla: {creator.battleItem}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {builds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-center text-slate-300">Aún no guardas builds</div>
            ) : (
              builds.map((build) => (
                <div key={build.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xl font-black">{build.name}</p>
                    <p className="text-sm text-slate-300">{build.pokemon} · {build.route} · {build.lane}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {build.items.map((item) => <span key={`${build.id}-${item}`} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">{item}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => duplicateBuild(build)} className="rounded-full border border-slate-700 px-3 py-2 text-sm">Duplicar</button>
                    <button onClick={() => deleteBuild(build.id)} className="rounded-full border border-red-500/50 px-3 py-2 text-sm text-red-300">Borrar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section id="retos" className="mt-10 rounded-[28px] border border-slate-800 bg-slate-950/60 p-4 md:p-6">
          <p className="text-xs font-bold tracking-[0.28em] text-[#3ee0c5] uppercase">Retos</p>
          <h2 className="mt-2 text-3xl font-black">Reto aleatorio</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm font-bold text-[#e8c872]">Pokémon al azar</p>
              <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Elegido</p>
                <h3 className="mt-2 text-3xl font-black">{randomPokemon}</h3>
                <p className="mt-2 text-sm text-slate-300">Rol: {getPokemonByName(randomPokemon).role}</p>
                <p className="mt-1 text-sm text-slate-300">Carril sugerido: {getPokemonByName(randomPokemon).build.lane}</p>
                <p className="mt-4 text-sm text-[#3ee0c5]">Reto: {RANDOM_RULES[Math.floor(Math.random() * RANDOM_RULES.length)]}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={randomizePokemon} className="rounded-full bg-[#3ee0c5] px-4 py-2 text-sm font-bold text-slate-950">Otro Pokémon</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm font-bold text-[#e8c872]">Build al azar</p>
              <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Build</p>
                <h3 className="mt-2 text-2xl font-black">{previewBuild.name}</h3>
                <p className="mt-2 text-sm text-slate-300">{previewBuild.pokemon} · {previewBuild.role}</p>
                <p className="mt-2 text-sm text-slate-300">Ruta: {previewBuild.route}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewBuild.items.map((item) => <span key={`${previewBuild.name}-${item}`} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">{item}</span>)}
                </div>
                <p className="mt-3 text-sm text-[#e8c872]">Objeto de batalla: {previewBuild.battleItem}</p>
                <p className="mt-2 text-sm text-slate-300">Emblemas: {previewBuild.emblemSet}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={randomizeBuild} className="rounded-full bg-[#3ee0c5] px-4 py-2 text-sm font-bold text-slate-950">Otro build</button>
                <button onClick={() => { const next = { ...previewBuild, id: crypto.randomUUID(), createdAt: Date.now() }; setBuilds((current) => [next as unknown as SavedBuild, ...current]); }} className="rounded-full border border-slate-700 px-4 py-2 text-sm">Guardar</button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#e8c872]/50 bg-[#e8c872]/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.24em] text-[#e8c872] uppercase">Reto de hoy</p>
                <h3 className="mt-2 text-2xl font-black">{challenge ? `${challenge.pokemon} + ${challenge.rule}` : "Preparando"}</h3>
              </div>
              <button onClick={refresh} className="rounded-full border border-[#e8c872] px-4 py-2 text-sm font-semibold text-[#e8c872]">Nuevo reto</button>
            </div>
            <p className="mt-3 text-sm text-slate-200">Reto de práctica, no es un modo oficial</p>
            {challenge ? <div className="mt-3 text-sm text-slate-300">Rol: {challenge.role} · Carril sugerido: {challenge.lane} · Regla: {challenge.rule}</div> : null}
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-800 py-6 text-center text-sm text-slate-400">Fan-made, no afiliado</footer>
      </main>
    </div>
  );
}

export function PokemonCommunityHomeAddons() {
  return <PokemonCommunityLayout activePage="home" />;
}

export function PokemonCommunityBuildsPage() {
  return <PokemonCommunityLayout activePage="builds" />;
}

export function PokemonCommunityRetosPage() {
  return <PokemonCommunityLayout activePage="retos" />;
}
