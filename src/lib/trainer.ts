export type Trainer = {
  name: string;
  code: string;
  favorite: string;
};

const KEY = "pokesocial-trainer";

export function readTrainer(): Trainer | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Trainer>;
    if (!data.name || !data.favorite) return null;
    return { name: data.name, code: data.code ?? "", favorite: data.favorite };
  } catch {
    return null;
  }
}

export function writeTrainer(trainer: Trainer): void {
  localStorage.setItem(KEY, JSON.stringify(trainer));
}

export function clearTrainer(): void {
  localStorage.removeItem(KEY);
}
