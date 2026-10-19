"use client";

import { useState } from "react";

/*
  Two real test-time booklets from the TrainLoop pipeline, read from the annotated trace pool
  (reasoning_labeler/traces). Grids are each step's uncrop output and boxes are its crop regions.
    Matches: 0d3d703e_v11_analysis_batch_diverse2_20251128_203310.json. The steps are the model's own
      text, verbatim, and each picture does exactly what its step says. Steps with no matching cells are
      skipped, as in the pipeline.
    Drifts:  ddf7fa4f_v10_analysis_batch_verify_fixes_20251119_213035.json. The steps state the real rule
      (shortened here), but every picture breaks its step. The run's final create step,
      which just writes out the answer grid, is left out.
*/

type Box = [number, number, number, number];
type Page = { label: string; text?: string; grid: string[]; boxes?: Box[]; status?: { ok: boolean; text: string } };

const CLEAN_STEPS: Record<number, string> = {
  2: "IF a cell's color is 1 THEN change color to 5.",
  3: "IF a cell's color is 5 THEN change color to 1.",
  4: "IF a cell's color is 2 THEN change color to 6.",
  5: "IF a cell's color is 6 THEN change color to 2.",
  6: "IF a cell's color is 3 THEN change color to 4.",
  7: "IF a cell's color is 4 THEN change color to 3.",
  8: "IF a cell's color is 8 THEN change color to 9.",
  9: "IF a cell's color is 9 THEN change color to 8.",
};

const CLEAN: { name: string; input: string[]; pages: { step: number; box: Box; grid: string[] }[] }[] = [
  { name: "Ex 1", input: ["586", "586", "586"], pages: [
    { step: 3, box: [0, 0, 2, 0], grid: ["186", "186", "186"] },
    { step: 5, box: [0, 2, 2, 2], grid: ["182", "182", "182"] },
    { step: 8, box: [0, 1, 2, 1], grid: ["192", "192", "192"] },
  ] },
  { name: "Ex 2", input: ["238", "238", "238"], pages: [
    { step: 4, box: [0, 0, 2, 0], grid: ["638", "638", "638"] },
    { step: 6, box: [0, 1, 2, 1], grid: ["648", "648", "648"] },
    { step: 8, box: [0, 2, 2, 2], grid: ["649", "649", "649"] },
  ] },
  { name: "Ex 3", input: ["942", "942", "942"], pages: [
    { step: 4, box: [0, 2, 2, 2], grid: ["946", "946", "946"] },
    { step: 7, box: [0, 1, 2, 1], grid: ["936", "936", "936"] },
    { step: 9, box: [0, 0, 2, 0], grid: ["836", "836", "836"] },
  ] },
  { name: "Ex 4", input: ["312", "312", "312"], pages: [
    { step: 2, box: [0, 1, 2, 1], grid: ["352", "352", "352"] },
    { step: 4, box: [0, 2, 2, 2], grid: ["356", "356", "356"] },
    { step: 6, box: [0, 0, 2, 0], grid: ["456", "456", "456"] },
  ] },
  { name: "Test", input: ["813", "813", "813"], pages: [
    { step: 2, box: [0, 1, 2, 1], grid: ["853", "853", "853"] },
    { step: 6, box: [0, 2, 2, 2], grid: ["854", "854", "854"] },
    { step: 8, box: [0, 0, 2, 0], grid: ["954", "954", "954"] },
  ] },
];

const DOTS: Box[] = [[0, 0, 0, 0], [0, 4, 0, 4], [0, 8, 0, 8]];
const REGIONS: Box[] = [[2, 2, 5, 6], [2, 8, 8, 9], [7, 0, 8, 3]];

const DRIFT: Page[] = [
  { label: "Test input", grid: ["3000600090", "0000000000", "0055555055", "0055555055", "0055555055", "0055555055", "0000000055", "5555000055", "5555000055", "0000000000"] },
  {
    label: "Step 1",
    text: "IF a single pixel in the top row is not color 0 THEN never change it.",
    boxes: DOTS,
    status: { ok: false, text: "Changes those pixels" },
    grid: ["2000100020", "0000000000", "0055555055", "0055555055", "0055555055", "0055555055", "0000000055", "5555000055", "5555000055", "0000000000"],
  },
  {
    label: "Step 2",
    text: "IF a pixel in the top row is not color 0 THEN record its column and color.",
    boxes: DOTS,
    status: { ok: false, text: "Draws a new cell" },
    grid: ["3000200090", "0000000090", "0055555055", "0055555055", "0055555055", "0055555055", "0000000055", "5555000055", "5555000055", "0000000000"],
  },
  {
    label: "Step 3",
    text: "IF cells form a connected region of color 5 THEN find its column span.",
    boxes: REGIONS,
    status: { ok: false, text: "Recolors the regions" },
    grid: ["3000200090", "0000000090", "0011111011", "0011111011", "0011111011", "0011111011", "0000000011", "1111000011", "1111000011", "0000000000"],
  },
  {
    label: "Step 4",
    text: "IF exactly one top-row pixel is inside a region's column span THEN recolor the region to that pixel's color.",
    boxes: REGIONS,
    status: { ok: false, text: "One region, wrong color" },
    grid: ["3000200090", "0000000090", "0033333011", "0033333011", "0033333011", "0033333011", "0000000011", "1111000011", "1111000011", "0000000000"],
  },
];

function cleanPages(i: number): Page[] {
  const ex = CLEAN[i];
  const last = ex.pages.length - 1;
  return [
    { label: ex.name === "Test" ? "Test input" : "Input", grid: ex.input },
    ...ex.pages.map((p, k) => ({
      label: `Step ${p.step} of 10`,
      text: CLEAN_STEPS[p.step],
      grid: p.grid,
      boxes: [p.box],
      status: k === last ? { ok: true, text: "Matches the answer" } : undefined,
    })),
  ];
}

// Standard ARC palette, 0–9.
const ARC = ["#000000", "#0074d9", "#ff4136", "#2ecc40", "#ffdc00", "#aaaaaa", "#f012be", "#ff851b", "#7fdbff", "#870c25"];

function StepText({ text }: { text: string }) {
  // Each standalone digit in a step is a color; show its swatch next to it.
  return (
    <p className="bk-text">
      {text.split(/\b(\d)\b/).map((part, i) =>
        i % 2 ? (
          <span key={i} className="bk-chip">
            <i style={{ background: ARC[+part] }} aria-hidden="true" />
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function Grid({ grid, boxes }: { grid: string[]; boxes?: Box[] }) {
  const n = grid.length;
  const m = grid[0].length;
  return (
    <div className="bk-grid" style={{ gridTemplateColumns: `repeat(${m}, 1fr)`, aspectRatio: `${m} / ${n}` }}>
      {grid.flatMap((row, r) => [...row].map((c, k) => <i key={`${r}-${k}`} style={{ background: ARC[+c] }} />))}
      {boxes?.map((b, i) => (
        <span
          key={i}
          className="bk-box"
          aria-hidden="true"
          style={{
            top: `${(b[0] / n) * 100}%`,
            left: `${(b[1] / m) * 100}%`,
            height: `${((b[2] - b[0] + 1) / n) * 100}%`,
            width: `${((b[3] - b[1] + 1) / m) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

export default function BookletFigure() {
  const [tab, setTab] = useState<"clean" | "drift">("clean");
  const [example, setExample] = useState(CLEAN.length - 1);
  const [page, setPage] = useState(0);

  const pages = tab === "clean" ? cleanPages(example) : DRIFT;
  const p = pages[page];
  const go = (d: number) => setPage((x) => Math.min(pages.length - 1, Math.max(0, x + d)));

  return (
    <figure className="bk" aria-label="Example booklets from the ARC-AGI pipeline">
      <p className="fig-lede">
        Two example booklets: one where the visuals match the text steps, and one where the model understands the
        puzzle's reasoning but can't execute it visually.
      </p>

      <div className="bk-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "clean"} onClick={() => { setTab("clean"); setPage(0); }}>
          Steps and visuals match
        </button>
        <button type="button" role="tab" aria-selected={tab === "drift"} onClick={() => { setTab("drift"); setPage(0); }}>
          Visuals drift
        </button>
      </div>

      {tab === "clean" && (
        <div className="tb-seg bk-examples" role="group" aria-label="Input">
          {CLEAN.map((ex, i) => (
            <button key={ex.name} type="button" aria-pressed={example === i} onClick={() => { setExample(i); setPage(0); }}>
              {ex.name}
            </button>
          ))}
        </div>
      )}

      <div
        className="bk-book"
        tabIndex={0}
        aria-roledescription="booklet"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <div key={`${tab}-${example}-${page}`} className="bk-spread">
          <div className="bk-leaf bk-leaf-text">
            <span className="bk-label">{p.label}</span>
            {p.text && <StepText text={p.text} />}
            {p.status && (
              <span className={p.status.ok ? "bk-ok" : "bk-bad"}>
                {p.status.ok ? "✓" : "✗"} {p.status.text}
              </span>
            )}
          </div>
          <div className="bk-leaf bk-leaf-grid">
            <Grid grid={p.grid} boxes={p.boxes} />
          </div>
        </div>
      </div>

      <div className="bk-nav">
        <button type="button" onClick={() => go(-1)} disabled={page === 0} aria-label="Previous page">
          ‹
        </button>
        <span aria-live="polite">
          {page + 1} / {pages.length}
        </span>
        <button type="button" onClick={() => go(1)} disabled={page === pages.length - 1} aria-label="Next page">
          ›
        </button>
      </div>
    </figure>
  );
}
