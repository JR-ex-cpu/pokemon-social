import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Search, Trash2, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { artworkUrl, downloadNameplate, portraitUrl } from "@/lib/artwork";
import { deleteClip, listClips, readDuration, relinkClip, saveClip, type SavedClip } from "@/lib/clips-db";
import { COPY, LANGS, isLang, type Copy, type Lang } from "@/lib/i18n";
import { clearTrainer, readTrainer, writeTrainer, type Trainer } from "@/lib/trainer";
import {
  SNAPSHOT,
  loadRoster,
  tierRank,
  type ApiSource,
  type UniteMon,
} from "@/lib/unite-api";

const MAX_SECONDS = 30;
const MAX_BYTES = 28 * 1024 * 1024;
const LINK_KEY = "pokesocial-links";
const LANG_KEY = "pokesocial-lang";
const API_KEY = "pokesocial-api";

const STARTER_BASE = [
  { id: "gol", src: "/plays/gol.mp4", poster: "/plays/gol.jpg", pokemon: "Pikachu" },
  { id: "carrera", src: "/plays/carrera.mp4", poster: "/plays/carrera.jpg", pokemon: "Zeraora" },
  { id: "objetivo", src: "/plays/objetivo.mp4", poster: "/plays/objetivo.jpg", pokemon: "Snorlax" },
] as const;

const ROLES = ["Attacker", "Speedster", "All-Rounder", "Defender", "Supporter"] as const;

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-ink px-3 text-sm text-cream outline-none";

function Portrait({ name, className }: { name: string; className?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [name]);
  const remote = artworkUrl(name);
  const src = step === 0 ? portraitUrl(name) : remote;
  if (!src || step > 1) {
    return (
      <span className={`grid place-items-center bg-ink font-display text-2xl text-gold ${className ?? ""}`}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={`object-contain ${className ?? ""}`}
      onError={() => setStep((value) => value + 1)}
    />
  );
}

export function PlaysHome() {
  const [lang, setLang] = useState<Lang>("es");
  const [source, setSource] = useState<ApiSource>("live");
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [dialog, setDialog] = useState<null | "register" | "upload" | "account">(null);
  const [pendingUpload, setPendingUpload] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = COPY[lang];

  const rosterQuery = useQuery({
    queryKey: ["unite-roster", source],
    queryFn: () => loadRoster(source),
    placeholderData: SNAPSHOT,
    staleTime: 1000 * 60 * 30,
  });
  const roster = rosterQuery.data ?? SNAPSHOT;

  const [selectedId, setSelectedId] = useState<string>(STARTER_BASE[0].id);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<SavedClip[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlsRef = useRef<Record<string, string>>({});
  const [role, setRole] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [pokemonName, setPokemonName] = useState("Pikachu");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [regError, setRegError] = useState("");
  const [regName, setRegName] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regFav, setRegFav] = useState("Pikachu");
  const [saving, setSaving] = useState(false);
  const [pngNote, setPngNote] = useState("");

  useEffect(() => {
    const storedLang = localStorage.getItem(LANG_KEY);
    if (storedLang && isLang(storedLang)) setLang(storedLang);
    const storedApi = localStorage.getItem(API_KEY);
    if (storedApi === "live" || storedApi === "snapshot") setSource(storedApi);
    const storedTrainer = readTrainer();
    if (storedTrainer) {
      setTrainer(storedTrainer);
      setRegFav(storedTrainer.favorite);
    }
    try {
      const raw = localStorage.getItem(LINK_KEY);
      if (raw) setLinks(JSON.parse(raw) as Record<string, string>);
    } catch {
      /* ignore broken links */
    }
    let alive = true;
    listClips()
      .then((rows) => {
        if (!alive) return;
        const next: Record<string, string> = {};
        for (const row of rows) next[row.id] = URL.createObjectURL(row.blob);
        urlsRef.current = next;
        setUrls(next);
        setUploads(rows);
      })
      .catch(() => {
        if (alive) setFormError(" ");
      });
    return () => {
      alive = false;
      for (const url of Object.values(urlsRef.current)) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(API_KEY, source);
  }, [source]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (dialog && !el.open) el.showModal();
    if (!dialog && el.open) el.close();
  }, [dialog]);

  const starters = useMemo(
    () =>
      STARTER_BASE.map((clip) => ({
        ...clip,
        title: clip.id === "gol" ? t.titleGol : clip.id === "carrera" ? t.titleRun : t.titleObj,
        blurb: clip.id === "gol" ? t.blurbGol : clip.id === "carrera" ? t.blurbRun : t.blurbObj,
      })),
    [t],
  );

  const selectedUpload = uploads.find((clip) => clip.id === selectedId);
  const selectedStarter = starters.find((clip) => clip.id === selectedId);
  const linkedName =
    links[selectedId] || selectedUpload?.pokemonName || selectedStarter?.pokemon || "";
  const linked = roster.find((mon) => mon.name === linkedName);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return roster
      .filter((mon) => role === "Todos" || mon.role === role)
      .filter((mon) => !needle || mon.name.toLowerCase().includes(needle))
      .sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.name.localeCompare(b.name));
  }, [roster, role, search]);

  const metaRow = useMemo(
    () =>
      roster
        .filter((mon) => mon.tier === "S" || mon.tier === "A+")
        .sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.name.localeCompare(b.name)),
    [roster],
  );

  const videoSrc = selectedUpload ? urls[selectedUpload.id] : selectedStarter?.src;
  const videoTitle = selectedUpload?.title ?? selectedStarter?.title ?? "Play";
  const videoBlurb = selectedUpload?.note || selectedStarter?.blurb || "";

  function persistLinks(next: Record<string, string>) {
    setLinks(next);
    localStorage.setItem(LINK_KEY, JSON.stringify(next));
  }

  async function bindMon(mon: UniteMon) {
    persistLinks({ ...links, [selectedId]: mon.name });
    if (selectedUpload) {
      await relinkClip(selectedUpload.id, mon.name);
      setUploads((rows) =>
        rows.map((row) => (row.id === selectedUpload.id ? { ...row, pokemonName: mon.name } : row)),
      );
    }
    setPokemonName(mon.name);
    setRegFav(mon.name);
  }

  function openSend() {
    setFormError("");
    setPngNote("");
    if (!trainer) {
      setPendingUpload(true);
      setDialog("register");
      return;
    }
    setDialog("upload");
  }

  function onRegister(event: FormEvent) {
    event.preventDefault();
    const name = regName.trim();
    const code = regCode.trim().toUpperCase();
    if (name.length < 2 || name.length > 18) {
      setRegError(t.nameError);
      return;
    }
    if (code && !/^[A-Z0-9]{4,16}$/.test(code)) {
      setRegError(t.codeError);
      return;
    }
    if (!roster.some((mon) => mon.name === regFav)) {
      setRegError(t.favError);
      return;
    }
    const next = { name, code, favorite: regFav };
    writeTrainer(next);
    setTrainer(next);
    setRegError("");
    setDialog(pendingUpload ? "upload" : null);
    setPendingUpload(false);
  }

  function signOut() {
    clearTrainer();
    setTrainer(null);
    setDialog(null);
  }

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!trainer) {
      setPendingUpload(true);
      setDialog("register");
      return;
    }
    if (!file) {
      setFormError(t.pickVideo);
      return;
    }
    if (!file.type.startsWith("video/")) {
      setFormError(t.typeError);
      return;
    }
    if (file.size > MAX_BYTES) {
      setFormError(t.sizeError);
      return;
    }
    if (!roster.some((mon) => mon.name === pokemonName)) {
      setFormError(t.monError);
      return;
    }
    setSaving(true);
    try {
      const duration = await readDuration(file);
      if (Number.isFinite(duration) && duration > MAX_SECONDS + 0.4) {
        setFormError(t.timeError);
        return;
      }
      const clip: SavedClip = {
        id: crypto.randomUUID(),
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        pokemonName,
        trainerName: trainer.name,
        note: note.trim(),
        createdAt: Date.now(),
        mime: file.type,
        blob: file,
      };
      await saveClip(clip);
      const url = URL.createObjectURL(file);
      urlsRef.current = { ...urlsRef.current, [clip.id]: url };
      setUrls(urlsRef.current);
      setUploads((rows) => [clip, ...rows]);
      setSelectedId(clip.id);
      setTitle("");
      setNote("");
      setFile(null);
      setFileKey((value) => value + 1);
      setDialog(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function removeUpload(id: string) {
    await deleteClip(id);
    const url = urlsRef.current[id];
    if (url) URL.revokeObjectURL(url);
    const nextUrls = { ...urlsRef.current };
    delete nextUrls[id];
    urlsRef.current = nextUrls;
    setUrls(nextUrls);
    setUploads((rows) => rows.filter((row) => row.id !== id));
    if (selectedId === id) setSelectedId(STARTER_BASE[0].id);
  }

  async function savePng(name: string) {
    await downloadNameplate(name);
    setPngNote(t.pngDone);
  }

  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="sticky top-0 z-20 border-b border-line bg-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold font-display text-xl text-gold-ink">
              PS
            </span>
            <span>
              <span className="block text-xs font-semibold tracking-widest text-gold uppercase">
                {t.kicker}
              </span>
              <span className="block font-display text-3xl leading-none">Pokémon Social</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openSend}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-gold-ink"
            >
              <Upload className="size-4" aria-hidden="true" />
              {t.send}
            </button>
            <button
              type="button"
              onClick={() => setDialog(trainer ? "account" : "register")}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold"
            >
              {trainer ? (
                <Portrait name={trainer.favorite} className="size-7" />
              ) : (
                <UserRound className="size-4" aria-hidden="true" />
              )}
              {trainer ? trainer.name : t.join}
            </button>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-3 px-4 pb-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-mist">
            {t.lang}
            <select
              value={lang}
              onChange={(event) => {
                if (isLang(event.target.value)) setLang(event.target.value);
              }}
              className={fieldClass}
            >
              {LANGS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-mist">
            {t.api}
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as ApiSource)}
              className={fieldClass}
            >
              <option value="live">{t.apiLive}</option>
              <option value="snapshot">{t.apiSnap}</option>
            </select>
          </label>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr)_20rem]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-card border border-line bg-panel">
            {videoSrc ? (
              <video
                key={videoSrc}
                className="aspect-video w-full bg-ink"
                src={videoSrc}
                poster={selectedStarter?.poster}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Portrait name={linkedName} className="size-28 rounded-2xl bg-panel sm:size-36" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-widest text-gold uppercase">{t.linked}</p>
              <h1 className="font-display text-5xl leading-none sm:text-6xl">{linkedName}</h1>
              <p className="mt-1 text-sm text-mist">
                {videoTitle}
                {linked
                  ? ` · ${t.roles[linked.role] ?? linked.role} · ${t.tier} ${linked.tier}`
                  : ""}
              </p>
              {videoBlurb ? <p className="mt-1 text-sm text-mist">{videoBlurb}</p> : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="#ficha"
              className="inline-flex h-11 items-center rounded-full bg-gold px-4 text-sm font-semibold text-gold-ink"
            >
              {t.details}
            </a>
            <button
              type="button"
              onClick={() => void savePng(linkedName)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold"
            >
              <Download className="size-4" aria-hidden="true" />
              {t.download}
            </button>
            {selectedUpload ? (
              <button
                type="button"
                onClick={() => void removeUpload(selectedUpload.id)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-mist"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t.remove}
              </button>
            ) : null}
          </div>
          {pngNote ? <p className="mt-2 text-sm text-gold">{pngNote}</p> : null}
          <p className="mt-3 text-sm text-mist">{t.rowHint}</p>
        </div>

        <aside id="ficha" className="rounded-card border border-line bg-panel p-4">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase">{t.details}</p>
          {rosterQuery.isError ? (
            <p className="mt-3 text-sm">
              {t.liveError}
              <button
                type="button"
                onClick={() => void rosterQuery.refetch()}
                className="mt-3 block h-11 rounded-full bg-gold px-4 text-sm font-semibold text-gold-ink"
              >
                {t.retry}
              </button>
            </p>
          ) : null}
          {source === "live" && rosterQuery.isFetching ? (
            <p className="mt-2 text-sm text-mist">{t.liveUpdating}</p>
          ) : null}
          {linked ? (
            <Sheet mon={linked} t={t} onDownload={() => void savePng(linked.name)} />
          ) : (
            <p className="mt-3 text-sm text-mist">{t.sheetWait}</p>
          )}
          <p className="mt-4 text-xs text-mist">{t.apiHelp}</p>
          <p className="mt-1 text-xs text-mist">{t.langHelp}</p>
        </aside>
      </section>

      <Row title={t.rowShort} prevLabel={t.prev} nextLabel={t.next}>
        {starters.map((clip) => (
          <PlayCard
            key={clip.id}
            title={clip.title}
            pokemon={links[clip.id] || clip.pokemon}
            poster={clip.poster}
            active={clip.id === selectedId}
            onClick={() => setSelectedId(clip.id)}
          />
        ))}
      </Row>

      <Row title={t.rowYours} prevLabel={t.prev} nextLabel={t.next}>
        {uploads.length === 0 ? (
          <button
            type="button"
            onClick={openSend}
            className="grid h-40 w-64 shrink-0 place-items-center rounded-card border border-dashed border-line bg-panel px-4 text-center text-sm text-mist"
          >
            {t.emptyYours}
            <span className="mt-2 font-semibold text-gold">{t.sendFirst}</span>
          </button>
        ) : (
          uploads.map((clip) => (
            <PlayCard
              key={clip.id}
              title={clip.title}
              pokemon={clip.pokemonName}
              caption={clip.trainerName}
              active={clip.id === selectedId}
              onClick={() => setSelectedId(clip.id)}
            />
          ))
        )}
      </Row>

      <Row title={t.rowMeta} prevLabel={t.prev} nextLabel={t.next}>
        {metaRow.map((mon) => (
          <MonCard
            key={mon.name}
            mon={mon}
            active={mon.name === linkedName}
            roleLabel={t.roles[mon.role] ?? mon.role}
            onClick={() => void bindMon(mon)}
          />
        ))}
      </Row>

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-4xl leading-none">{t.rowAll}</h2>
            <p className="mt-1 text-sm text-mist">
              {t.linkHint} {roster.length} {t.count}.
            </p>
          </div>
          <label className="relative block w-full sm:w-64">
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-mist" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              className="h-11 w-full rounded-full border border-line bg-panel pr-3 pl-10 text-sm outline-none"
            />
          </label>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {["Todos", ...ROLES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRole(item)}
              className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                role === item ? "bg-gold text-gold-ink" : "border border-line text-mist"
              }`}
            >
              {item === "Todos" ? t.all : (t.roles[item] ?? item)}
            </button>
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((mon) => (
            <li key={mon.name}>
              <MonCard
                mon={mon}
                active={mon.name === linkedName}
                roleLabel={t.roles[mon.role] ?? mon.role}
                onClick={() => void bindMon(mon)}
                wide
              />
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-mist">
        {t.footer}{" "}
        <a className="text-gold underline" href="https://unite-db.com" target="_blank" rel="noreferrer">
          Unite DB
        </a>
      </footer>

      <dialog
        ref={dialogRef}
        className="sheet"
        onClose={() => setDialog(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDialog(null);
        }}
      >
        <div
          className="w-full max-w-lg rounded-card border border-line bg-panel p-4"
          onClick={(event) => event.stopPropagation()}
        >
          {dialog === "register" ? (
            <form onSubmit={onRegister} className="grid gap-3">
              <h2 className="font-display text-4xl leading-none">{t.registerTitle}</h2>
              <p className="text-sm text-mist">{pendingUpload ? t.needAccount : t.registerBody}</p>
              <label className="grid gap-1 text-sm">
                {t.fieldName}
                <input value={regName} onChange={(event) => setRegName(event.target.value)} className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm">
                {t.fieldCode}
                <input
                  value={regCode}
                  onChange={(event) => setRegCode(event.target.value)}
                  placeholder="AB12CD34"
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t.fieldFav}
                <select value={regFav} onChange={(event) => setRegFav(event.target.value)} className={fieldClass}>
                  {roster.map((mon) => (
                    <option key={mon.name} value={mon.name}>
                      {mon.name}
                    </option>
                  ))}
                </select>
              </label>
              {regError ? <p className="text-sm text-gold">{regError}</p> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-gold px-4 text-sm font-semibold text-gold-ink"
                >
                  {t.create}
                </button>
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm"
                >
                  {t.close}
                </button>
              </div>
            </form>
          ) : null}

          {dialog === "upload" ? (
            <form onSubmit={(event) => void onUpload(event)} className="grid gap-3">
              <h2 className="font-display text-4xl leading-none">{t.uploadTitle}</h2>
              <p className="text-sm text-mist">{t.uploadBody}</p>
              <label className="grid gap-1 text-sm">
                {t.fieldTitle}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t.fieldMon}
                <select
                  value={pokemonName}
                  onChange={(event) => setPokemonName(event.target.value)}
                  className={fieldClass}
                >
                  {roster.map((mon) => (
                    <option key={mon.name} value={mon.name}>
                      {mon.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                {t.fieldNote}
                <input value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm">
                {t.fieldVideo}
                <input
                  key={fileKey}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="text-sm file:mr-3 file:h-11 file:rounded-full file:border-0 file:bg-gold file:px-4 file:text-sm file:font-semibold file:text-gold-ink"
                />
              </label>
              {formError.trim() ? <p className="text-sm text-gold">{formError}</p> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-gold-ink disabled:opacity-60"
                >
                  <Upload className="size-4" aria-hidden="true" />
                  {saving ? t.uploading : t.publish}
                </button>
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm"
                >
                  {t.close}
                </button>
              </div>
            </form>
          ) : null}

          {dialog === "account" && trainer ? (
            <div className="grid gap-3">
              <h2 className="font-display text-4xl leading-none">{t.account}</h2>
              <div className="flex items-center gap-3">
                <Portrait name={trainer.favorite} className="size-20 rounded-2xl bg-ink" />
                <div>
                  <p className="text-xs font-semibold tracking-widest text-gold uppercase">{t.trainer}</p>
                  <p className="font-display text-4xl leading-none">{trainer.name}</p>
                  <p className="text-sm text-mist">
                    {t.favorite}: {trainer.favorite}
                    {trainer.code ? ` · ${trainer.code}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm"
                >
                  {t.leave}
                </button>
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="inline-flex h-11 items-center rounded-full bg-gold px-4 text-sm font-semibold text-gold-ink"
                >
                  {t.close}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </dialog>
    </main>
  );
}

function Row({
  title,
  prevLabel,
  nextLabel,
  children,
}: {
  title: string;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function scroll(dir: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  }
  return (
    <section className="mx-auto mt-8 max-w-6xl">
      <div className="flex items-center justify-between gap-3 px-4">
        <h2 className="font-display text-4xl leading-none">{title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={prevLabel}
            onClick={() => scroll(-1)}
            className="grid size-11 place-items-center rounded-full border border-line"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            onClick={() => scroll(1)}
            className="grid size-11 place-items-center rounded-full border border-line"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={ref} className="row-scroll mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {children}
      </div>
    </section>
  );
}

function PlayCard({
  title,
  pokemon,
  poster,
  caption,
  active,
  onClick,
}: {
  title: string;
  pokemon: string;
  poster?: string;
  caption?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-52 shrink-0 overflow-hidden rounded-card border text-left ${
        active ? "border-gold" : "border-line"
      }`}
    >
      <span className="relative block aspect-video bg-ink">
        {poster ? <img src={poster} alt="" className="h-full w-full object-cover" /> : null}
        <span className="absolute right-2 bottom-2 left-2 flex items-center gap-2 rounded-xl bg-ink px-2 py-1">
          <Portrait name={pokemon} className="size-8 shrink-0" />
          <span className="truncate text-sm font-semibold">{pokemon}</span>
        </span>
      </span>
      <span className="block bg-panel px-3 py-2">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {caption ? <span className="block truncate text-xs text-mist">{caption}</span> : null}
      </span>
    </button>
  );
}

function MonCard({
  mon,
  active,
  roleLabel,
  onClick,
  wide,
}: {
  mon: UniteMon;
  active: boolean;
  roleLabel: string;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${wide ? "w-full" : "w-36 shrink-0"} overflow-hidden rounded-card border text-left ${
        active ? "border-gold bg-panel" : "border-line bg-panel"
      }`}
    >
      <Portrait name={mon.name} className="h-32 w-full bg-ink" />
      <span className="block px-2 pt-2 text-center font-display text-xl leading-tight">{mon.name}</span>
      <span className="block px-2 pt-1 pb-2 text-center text-xs text-mist">
        <span className="font-semibold text-gold">{mon.tier}</span>
        {" · "}
        {roleLabel}
      </span>
    </button>
  );
}

function Sheet({ mon, t, onDownload }: { mon: UniteMon; t: Copy; onDownload: () => void }) {
  const build = mon.builds[0];
  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <Portrait name={mon.name} className="size-20 rounded-2xl bg-ink" />
        <div className="min-w-0">
          <h2 className="truncate font-display text-4xl leading-none">{mon.name}</h2>
          <p className="mt-1 text-sm text-mist">
            {t.roles[mon.role] ?? mon.role}
            {mon.range ? ` · ${t.range[mon.range] ?? mon.range}` : ""}
            {mon.damage ? ` · ${t.damage[mon.damage] ?? mon.damage}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-gold px-2 py-1 font-semibold text-gold-ink">
          {t.tier} {mon.tier}
        </span>
        {mon.difficulty ? (
          <span className="rounded-full border border-line px-2 py-1 text-mist">
            {t.difficulty[mon.difficulty] ?? mon.difficulty}
          </span>
        ) : null}
        {mon.solo ? (
          <span className="rounded-full border border-line px-2 py-1 text-mist">
            {t.solo} {mon.solo}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onDownload}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold"
      >
        <Download className="size-4" aria-hidden="true" />
        {t.download}
      </button>
      {mon.notes ? <p className="mt-3 text-sm text-mist">{mon.notes}</p> : null}
      <div className="mt-3 rounded-2xl border border-line p-3">
        <p className="text-xs font-semibold tracking-widest text-gold uppercase">{t.build}</p>
        {build ? (
          <>
            <p className="mt-1 font-semibold">
              {build.name}
              {build.lane ? <span className="font-normal text-mist"> · {build.lane}</span> : null}
            </p>
            <p className="mt-1 text-sm">{build.upgrade.join(" / ") || t.noBuild}</p>
            <p className="mt-1 text-xs text-mist">
              {t.held}: {[...build.held, build.battle].filter(Boolean).join(" · ") || "—"}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-mist">{t.noBuild}</p>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold tracking-widest text-gold uppercase">{t.moves}</p>
      <ul className="mt-2 grid gap-2">
        {mon.skills.map((skill) => (
          <li key={`${skill.ability}-${skill.name}`} className="text-sm">
            <span className="font-semibold">{skill.name}</span>
            <span className="text-mist"> · {skill.ability}</span>
          </li>
        ))}
      </ul>
      {mon.updated ? (
        <p className="mt-3 text-xs text-mist">
          {t.updated} {mon.updated}
        </p>
      ) : null}
    </div>
  );
}
