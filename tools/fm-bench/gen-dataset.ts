#!/usr/bin/env bun
// Deterministic dataset generator for the file-manager benchmark.
//
//   bun tools/fm-bench/gen-dataset.ts --target <dir> --profile flat-10k [--seed 1] [--force]
//   bun tools/fm-bench/gen-dataset.ts --target <dir> --profile all
//   bun tools/fm-bench/gen-dataset.ts --target <dir> --clean
//
// Each profile is written to <target>/<profile>/ and described by
// <target>/<profile>.manifest.json (kept outside the measured folder so it
// never shows up in an item count). Same seed + profile => byte-identical tree.

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { logUniform, mulberry32, pick } from "./lib/prng.ts";
import { encodePng } from "./lib/png.ts";

export type ProfileName = "flat-10k" | "flat-100k" | "tree-100k" | "images-2k" | "copy-5g";
export const PROFILES: Record<ProfileName, string> = {
  "flat-10k": "10,000 mixed files in one folder (open/scroll/search/RSS scenarios)",
  "flat-100k": "100,000 mixed files in one folder (large-folder listing scenario)",
  "tree-100k": "100,000 entries across nested folders, including a 64-level deep chain",
  "images-2k": "2,000 real PNG images 320x240..1920x1080 (thumbnail scenario)",
  "copy-5g": "5 GiB: 4 x 1 GiB files + 1,024 x 1 MiB files (copy throughput scenario)",
};

const EXTENSIONS = [
  "txt", "md", "json", "ts", "rs", "c", "h", "log", "csv", "xml",
  "pdf", "docx", "zip", "bin", "dat", "html", "css", "toml", "yaml", "ini",
] as const;
const WORDS = [
  "alpha", "bravo", "report", "invoice", "draft", "final", "notes", "build", "asset", "backup",
  "photo", "scan", "project", "readme", "config", "export", "import", "cache", "sample", "data",
] as const;

const NOISE_BYTES = 1 << 20;

interface Manifest {
  schema: "fm-bench.dataset/v1";
  profile: ProfileName;
  description: string;
  seed: number;
  root: string;
  files: number;
  directories: number;
  bytes: number;
  maxDepth: number;
  searchNeedle: string;
  searchExpectedMatches: number;
  generatedAt: string;
  generationMs: number;
}

class Writer {
  files = 0;
  directories = 0;
  bytes = 0;
  maxDepth = 0;
  needleMatches = 0;
  constructor(
    readonly root: string,
    readonly noise: Uint8Array,
    readonly needle: string,
  ) {}

  async dir(rel: string, depth: number) {
    await mkdir(join(this.root, rel), { recursive: true });
    this.directories++;
    this.maxDepth = Math.max(this.maxDepth, depth);
  }

  /** Unique-per-file payload: header + a slice of the seeded noise block. */
  payload(index: number, size: number): Uint8Array {
    const out = new Uint8Array(size);
    const header = new TextEncoder().encode(`fm-bench#${index}\n`);
    out.set(header.subarray(0, size), 0);
    let off = Math.min(header.length, size);
    let src = (index * 7919) % NOISE_BYTES;
    while (off < size) {
      const n = Math.min(size - off, NOISE_BYTES - src);
      out.set(this.noise.subarray(src, src + n), off);
      off += n;
      src = 0;
    }
    return out;
  }

  async file(rel: string, data: Uint8Array, depth: number) {
    await Bun.write(join(this.root, rel), data);
    this.files++;
    this.bytes += data.length;
    this.maxDepth = Math.max(this.maxDepth, depth);
    if (rel.toLowerCase().includes(this.needle)) this.needleMatches++;
  }
}

function fileName(rand: () => number, index: number, needle: string): string {
  // 1 in 100 names carries the search needle, so search scenarios have a known answer.
  const tag = index % 100 === 42 ? `-${needle}` : "";
  return `${pick(rand, WORDS)}-${pick(rand, WORDS)}-${String(index).padStart(6, "0")}${tag}.${pick(rand, EXTENSIONS)}`;
}

function mixedSize(rand: () => number): number {
  // 5% empty, otherwise log-uniform 16 B .. 64 KiB (median ~1 KiB, like real home folders).
  return rand() < 0.05 ? 0 : logUniform(rand, 16, 64 * 1024);
}

async function flat(w: Writer, rand: () => number, count: number) {
  for (let i = 0; i < count; i++) {
    await w.file(fileName(rand, i, w.needle), w.payload(i, mixedSize(rand)), 1);
  }
}

async function tree(w: Writer, rand: () => number, total: number) {
  // A 64-level deep chain first (path-length and breadcrumb stress), then a bushy tree.
  let chain = "";
  let entries = 0;
  for (let d = 1; d <= 64; d++) {
    chain = join(chain, `d${String(d).padStart(2, "0")}`);
    await w.dir(chain, d);
    await w.file(join(chain, `leaf-${d}.txt`), w.payload(entries, 64), d + 1);
    entries += 2;
  }
  const dirs: { rel: string; depth: number }[] = [];
  for (let top = 0; top < 50; top++) {
    const rel = `branch-${String(top).padStart(2, "0")}`;
    await w.dir(rel, 1);
    entries++;
    dirs.push({ rel, depth: 1 });
  }
  let i = 0;
  while (entries < total) {
    const parent = dirs[Math.floor(rand() * dirs.length)]!;
    if (rand() < 0.05 && parent.depth < 12) {
      const rel = join(parent.rel, `dir-${i}`);
      await w.dir(rel, parent.depth + 1);
      dirs.push({ rel, depth: parent.depth + 1 });
    } else {
      await w.file(join(parent.rel, fileName(rand, i, w.needle)), w.payload(i, mixedSize(rand)), parent.depth + 1);
    }
    entries++;
    i++;
  }
}

async function images(w: Writer, rand: () => number, count: number) {
  const sizes = [
    [320, 240], [640, 480], [800, 600], [1024, 768], [1280, 720], [1920, 1080],
  ] as const;
  for (let i = 0; i < count; i++) {
    const [width, height] = pick(rand, sizes);
    const seed = Math.floor(rand() * 0xffffff);
    await w.file(`img-${String(i).padStart(4, "0")}.png`, encodePng(width, height, seed), 1);
  }
}

async function copySet(w: Writer) {
  const GiB = 1 << 30;
  const MiB = 1 << 20;
  // Large files are streamed in 8 MiB blocks to keep generator RSS bounded.
  for (let i = 0; i < 4; i++) {
    const path = join(w.root, `large-${i}.bin`);
    const sink = Bun.file(path).writer({ highWaterMark: 8 * MiB });
    for (let off = 0; off < GiB; off += 8 * MiB) sink.write(w.payload(i * 131 + off / MiB, 8 * MiB));
    await sink.end();
    w.files++;
    w.bytes += GiB;
  }
  for (let i = 0; i < 1024; i++) await w.file(join("small", `chunk-${String(i).padStart(4, "0")}.bin`), w.payload(10_000 + i, MiB), 2);
  w.directories++;
}

export async function generate(target: string, profile: ProfileName, seed = 1, force = false): Promise<Manifest> {
  const root = join(target, profile);
  const manifestPath = join(target, `${profile}.manifest.json`);
  const existing = Bun.file(manifestPath);
  if (!force && (await existing.exists())) {
    const m = (await existing.json()) as Manifest;
    if (m.seed === seed) return m;
  }
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });

  const rand = mulberry32(seed ^ Bun.hash.crc32(profile));
  const noiseRand = mulberry32(seed * 2654435761);
  const noise = new Uint8Array(NOISE_BYTES);
  for (let i = 0; i < NOISE_BYTES; i++) noise[i] = (noiseRand() * 256) | 0;
  const needle = "zebra";
  const w = new Writer(root, noise, needle);
  const t0 = Bun.nanoseconds();

  switch (profile) {
    case "flat-10k": await flat(w, rand, 10_000); break;
    case "flat-100k": await flat(w, rand, 100_000); break;
    case "tree-100k": await tree(w, rand, 100_000); break;
    case "images-2k": await images(w, rand, 2_000); break;
    case "copy-5g": await copySet(w); break;
  }

  const manifest: Manifest = {
    schema: "fm-bench.dataset/v1",
    profile,
    description: PROFILES[profile],
    seed,
    root,
    files: w.files,
    directories: w.directories,
    bytes: w.bytes,
    maxDepth: w.maxDepth,
    searchNeedle: needle,
    searchExpectedMatches: w.needleMatches,
    generatedAt: new Date().toISOString(),
    generationMs: Math.round((Bun.nanoseconds() - t0) / 1e6),
  };
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

if (import.meta.main) {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      target: { type: "string" },
      profile: { type: "string", default: "flat-10k" },
      seed: { type: "string", default: "1" },
      force: { type: "boolean", default: false },
      clean: { type: "boolean", default: false },
    },
  });
  if (!values.target) {
    console.error(`usage: gen-dataset.ts --target <dir> --profile <${Object.keys(PROFILES).join("|")}|all> [--seed N] [--force] [--clean]`);
    process.exit(2);
  }
  if (values.clean) {
    await rm(values.target, { recursive: true, force: true });
    console.log(`removed ${values.target}`);
    process.exit(0);
  }
  const names = values.profile === "all" ? (Object.keys(PROFILES) as ProfileName[]) : [values.profile as ProfileName];
  for (const name of names) {
    if (!(name in PROFILES)) throw new Error(`unknown profile ${name}`);
    const m = await generate(values.target, name, Number(values.seed), values.force);
    console.log(JSON.stringify(m));
  }
}
