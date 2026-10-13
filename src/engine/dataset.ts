import { random, type Tensor } from "./math";
export type Task = "classification" | "regression";
export const labels = ["up", "right", "down", "left"];
export function sample(
  task: Task,
  rng: () => number,
  label?: number,
): { input: Tensor; target: number[] } {
  const pixels = new Array(256).fill(0).map(() => rng() * 0.08),
    cls = label ?? Math.floor(rng() * 4),
    cx = 6 + Math.floor(rng() * 4),
    cy = 6 + Math.floor(rng() * 4);
  if (task === "classification") {
    for (let y = -5; y <= 5; y++)
      for (let x = -4; x <= 4; x++) {
        const on =
          (Math.abs(x) <= 1 && y >= -1 && y <= 5) ||
          (y >= -5 && y <= -1 && Math.abs(x) <= y + 5);
        if (on) {
          let dx = x,
            dy = y;
          for (let i = 0; i < cls; i++) {
            const next = -dy;
            dy = dx;
            dx = next;
          }
          const py = cy + dy,
            px = cx + dx;
          if (px >= 0 && px < 16 && py >= 0 && py < 16)
            pixels[py * 16 + px] = 0.8 + rng() * 0.2;
        }
      }
    return { input: { shape: [16, 16, 1], values: pixels }, target: [cls] };
  }
  const bx = 2 + rng() * 11,
    by = 2 + rng() * 11;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      pixels[y * 16 + x] = Math.min(
        1,
        pixels[y * 16 + x] + Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / 3),
      );
  return {
    input: { shape: [16, 16, 1], values: pixels },
    target: [bx / 15, by / 15],
  };
}
export function dataset(task: Task, seed: number) {
  const rng = random(seed),
    seen = new Set<string>();
  const make = (count: number) => {
    const xs: number[][] = [],
      ys: number[][] = [];
    while (xs.length < count) {
      const s = sample(
          task,
          rng,
          task === "classification" ? xs.length % 4 : undefined,
        ),
        key = s.input.values.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      xs.push(s.input.values);
      ys.push(s.target);
    }
    return { xs, ys };
  };
  return { train: make(512), validation: make(128), test: make(128) };
}
