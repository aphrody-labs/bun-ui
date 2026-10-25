#!/usr/bin/env bun
// Markdown report generator: bun tools/fm-bench/report.ts <results.json> [--out report.md]

import { parseArgs } from "node:util";
import type { Metric, ResultsDocument } from "./schema.ts";

function fmt(m: Metric, v: number): string {
  if (!Number.isFinite(v)) return "n/a";
  switch (m.unit) {
    case "ms": return `${v.toFixed(0)} ms`;
    case "bytes": return `${(v / (1 << 20)).toFixed(1)} MiB`;
    case "MB/s": return `${v.toFixed(1)} MB/s`;
    case "fps": return `${v.toFixed(1)} fps`;
    default: return String(v);
  }
}

export function renderReport(doc: ResultsDocument): string {
  const h = doc.host;
  const lines = [
    `# fm-bench results`,
    "",
    `Generated ${doc.generatedAt} on ${h.os}${h.build ? ` (build ${h.build})` : ""}, ${h.cpu}, ${h.logicalCpus} logical CPUs, ${(h.ramBytes / 2 ** 30).toFixed(1)} GiB RAM, ${h.runtime}.`,
    "",
  ];
  for (const r of doc.results) {
    lines.push(
      `## ${r.app} / ${r.scenario} (${r.platform})`,
      "",
      `Dataset \`${r.dataset.profile}\` (${r.dataset.files.toLocaleString("en-US")} files, ${(r.dataset.bytes / 2 ** 20).toFixed(1)} MiB, seed ${r.dataset.seed}); ${r.runs} runs; ${r.cache} cache.`,
      "",
      "| Metric | Median | Min | Max | p90 | Runs | Source |",
      "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
    );
    for (const m of r.metrics) {
      lines.push(`| ${m.name} | ${fmt(m, m.median)} | ${fmt(m, m.min)} | ${fmt(m, m.max)} | ${fmt(m, m.p90)} | ${m.values.length} | ${m.source} |`);
    }
    lines.push("");
    if (r.errors.length) lines.push("Errors:", "", ...r.errors.map((e) => `- ${e}`), "");
    if (r.notes.length) lines.push("Notes:", "", ...r.notes.map((n) => `- ${n}`), "");
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({ args: Bun.argv.slice(2), allowPositionals: true, options: { out: { type: "string" } } });
  if (!positionals[0]) {
    console.error("usage: report.ts <results.json> [--out report.md]");
    process.exit(2);
  }
  const md = renderReport((await Bun.file(positionals[0]).json()) as ResultsDocument);
  if (values.out) await Bun.write(values.out, md + "\n");
  else console.log(md);
}
