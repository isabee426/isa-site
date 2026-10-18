"use client";

import { useMemo, useState } from "react";

/*
  Interactive version of FT-GRPO's tie-constrained advantage (paper §2–3.2).

  Rewards follow the paper: r = s + ηm with a binary verifier s and η = 0.1, so every
  well-formatted response scores 1.1 (correct) or 0.1 (wrong).
    Vanilla (Eq. 3):      A⁰ = (r − mean) / (std + ε)
    Partial tie (Eq. 8):  A = A⁰ + αΔ(ρ/(K−1) − ½), α = 0.5, ρ = ascending probe rank in the tie
    Full tie (Eq. 9):     A = β(f − mean f) / max(std f, τ), τ = 0.01

  Both groups are real: 8 rollouts each from Qwen3-VL-8B-Thinking before RL (the probe-collection
  set), on prompts from the probe's held-out split, scored by the frozen paper probe. Correctness is
  the content label. Picked by grpo-families/scripts/_widget_real_group.py (math idx 782, mcq idx 852).
*/

type Response = { id: string; correct: boolean; probe: number; note: string };

const ETA = 0.1;
const ALPHA = 0.5;
const TAU = 0.01;
const EPS = 1e-6;
const DOMAIN = 2.5; // advantage axis runs from −2.5 to +2.5
const TICKS = [-2, -1, 0, 1, 2];

const GROUPS: Record<"partial" | "full", { label: string; question: string; responses: Response[] }> = {
  partial: {
    label: "Some right, some wrong",
    question: "Read a graph of y = −6·log₄(x − 1) + a that passes through (5, −3), and find the function.",
    responses: [
      { id: "R1", correct: true, probe: 0.351, note: "Right, but 1,300 words of doubting the graph" },
      { id: "R2", correct: true, probe: 0.697, note: "Plugs in (5, −3), solves, answers" },
      { id: "R3", correct: false, probe: 0.808, note: "Short and confident, but reads (5, 3)" },
      { id: "R4", correct: true, probe: 0.799, note: "Reads (5, −3), solves, checks once" },
      { id: "R5", correct: true, probe: 0.277, note: "Right after ~2,000 words and 41 “wait”s" },
      { id: "R6", correct: true, probe: 0.822, note: "Reads (5, −3), solves, verifies" },
      { id: "R7", correct: false, probe: 0.659, note: "Reads (5, 3); a check fails, keeps it anyway" },
      { id: "R8", correct: true, probe: 0.448, note: "Right, after 21 “wait”s" },
    ],
  },
  full: {
    label: "All wrong",
    question: "An inscribed-angle question on a circle diagram, multiple choice. No answer gets it right.",
    responses: [
      { id: "R1", correct: false, probe: 0.648, note: "Applies the theorem, then guesses" },
      { id: "R2", correct: false, probe: 0.528, note: "60 “wait”s, then the same guess" },
      { id: "R3", correct: false, probe: 0.627, note: "Gets m/2, then assumes m = 120°" },
      { id: "R4", correct: false, probe: 0.482, note: "~2,500 words, 75 “wait”s, switches answer" },
      { id: "R5", correct: false, probe: 0.512, note: "Long detour, same guess" },
      { id: "R6", correct: false, probe: 0.642, note: "Gets m/2, then assumes m = 120°" },
      { id: "R7", correct: false, probe: 0.525, note: "Collapses into garbled text, then answers" },
      { id: "R8", correct: false, probe: 0.726, note: "Shortest, fewest loops, same wrong guess" },
    ],
  },
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const std = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

function vanillaAdvantages(rs: Response[]) {
  const rewards = rs.map((r) => (r.correct ? 1 : 0) + ETA);
  const m = mean(rewards);
  const s = std(rewards);
  return rewards.map((r) => (r - m) / (s + EPS));
}

function ftAdvantages(rs: Response[], a0: number[], beta: number) {
  const levels = [...new Set(a0.map((a) => a.toFixed(9)))].map(Number);

  // Fully tied: vanilla gives zero everywhere, so the probe alone supplies a zero-sum signal.
  if (levels.length === 1) {
    const f = rs.map((r) => r.probe);
    const fm = mean(f);
    const fs = Math.max(std(f), TAU);
    return f.map((x) => (beta * (x - fm)) / fs);
  }

  const out = [...a0];
  for (const level of levels) {
    const members = a0.map((a, i) => i).filter((i) => Math.abs(a0[i] - level) < 1e-9);
    const k = members.length;
    if (k < 2) continue;
    const gap = Math.min(...levels.filter((l) => l !== level).map((l) => Math.abs(l - level)));
    const ranked = [...members].sort((i, j) => rs[i].probe - rs[j].probe);
    ranked.forEach((i, rho) => {
      out[i] = a0[i] + ALPHA * gap * (rho / (k - 1) - 0.5);
    });
  }
  return out;
}

// β is the batch mean of |A⁰| over non-tied groups: here, over the 19 non-tied held-out groups
// in the same collection (from _widget_real_group.py).
const BETA = 0.763;

const fmt = (x: number) => (Math.abs(x) < 0.005 ? "0.00" : `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}`);
const pct = (x: number) => ((x + DOMAIN) / (2 * DOMAIN)) * 100;

const CAPTIONS = {
  partial: {
    vanilla:
      "Plain GRPO only knows right or wrong. All six right answers get the same push, so the one that took ~2,000 words and 41 “wait”s is rewarded exactly as much as the 214-word one.",
    ft: "FT-GRPO breaks those ties using attention on the image. Right answers that kept looking at the image move up and the loopy ones move down, but every right answer stays above every wrong one, even the wrong answer the probe scored 0.81.",
  },
  full: {
    vanilla:
      "Every answer is wrong, so they all score the same and the model learns nothing from this question. Before training, 34.4% of question groups were fully tied like this (all right or all wrong).",
    ft: "FT-GRPO still finds a signal: the short answer the probe scored highest gets pushed up, and the 2,500-word answer with 75 “wait”s gets pushed down hardest.",
  },
};

export default function TieBreakFigure() {
  const [groupKey, setGroupKey] = useState<"partial" | "full">("partial");
  const [method, setMethod] = useState<"vanilla" | "ft">("vanilla");
  const [hovered, setHovered] = useState<string | null>(null);

  const effective = method;
  const group = GROUPS[groupKey];

  const rows = useMemo(() => {
    const a0 = vanillaAdvantages(group.responses);
    const ft = ftAdvantages(group.responses, a0, BETA);
    return group.responses.map((r, i) => ({ ...r, a0: a0[i], ft: ft[i] }));
  }, [group]);

  const order = useMemo(() => {
    const value = (r: (typeof rows)[number]) => (effective === "ft" ? r.ft : r.a0);
    // Ties keep sampling order, so vanilla shows the tied blocks exactly as they were drawn.
    return [...rows].sort((a, b) => value(b) - value(a) || a.id.localeCompare(b.id)).map((r) => r.id);
  }, [rows, effective]);

  const nCorrect = rows.filter((r) => r.correct).length;
  const showBoundary = nCorrect > 0 && nCorrect < rows.length;
  const hoveredRow = rows.find((r) => r.id === hovered);

  return (
    <figure className="tb" aria-label="Interactive figure: how FT-GRPO breaks reward ties">
      <p className="tb-intro">
        A model answers the same question 8 times. Training then pushes each answer
        <strong> right (do more of this)</strong> or <strong>left (do less)</strong>. Bar length is how hard.
      </p>

      <div className="tb-controls">
        <div className="tb-seg" role="group" aria-label="Group type">
          {(["partial", "full"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={groupKey === k} onClick={() => setGroupKey(k)}>
              {GROUPS[k].label}
            </button>
          ))}
        </div>
        <div className="tb-seg" role="group" aria-label="Advantage estimator">
          <button type="button" aria-pressed={effective === "vanilla"} onClick={() => setMethod("vanilla")}>
            Before (GRPO)
          </button>
          <button type="button" aria-pressed={effective === "ft"} onClick={() => setMethod("ft")}>
            After (FT-GRPO)
          </button>
        </div>
      </div>

      <p className="tb-fine">Question: {group.question}</p>

      <div className="tb-legend">
        {nCorrect > 0 && <span><i className="tb-key tb-key-correct" aria-hidden="true" />✓ right</span>}
        {nCorrect < rows.length && <span><i className="tb-key tb-key-wrong" aria-hidden="true" />✗ wrong</span>}
        {showBoundary && (
          <span><i className="tb-key tb-key-line" aria-hidden="true" />right answers always stay above wrong ones</span>
        )}
        <span className="tb-hint">
          {method === "ft"
            ? "Hover a row for the numbers"
            : groupKey === "full"
              ? "Every push is 0. Click After"
              : "Click After to see what changes"}
        </span>
      </div>

      <div className="tb-head" aria-hidden="true">
        <span>Answer</span>
        <span className="tb-probe" title="Probe score: how much the answer kept attending to the image (0 to 1)">
          Looks at image
        </span>
        <span className="tb-axis">
          <span className="tb-axis-l">← do less</span>
          <span className="tb-axis-r">do more →</span>
        </span>
      </div>

      <div
        className="tb-plot"
        onPointerLeave={() => setHovered(null)}
      >
        <div className="tb-grid" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t} className={t === 0 ? "tb-zero" : undefined} style={{ left: `${pct(t)}%` }} />
          ))}
        </div>

        {showBoundary && (
          <div className="tb-boundary" style={{ transform: `translateY(calc(var(--tb-row) * ${nCorrect}))` }} aria-hidden="true" />
        )}

        {rows.map((r) => {
          const value = effective === "ft" ? r.ft : r.a0;
          const rank = order.indexOf(r.id);
          const left = pct(Math.min(0, value));
          const width = (Math.abs(value) / (2 * DOMAIN)) * 100;
          return (
            <div
              key={r.id}
              className="tb-row"
              data-hovered={hovered === r.id}
              style={{ transform: `translateY(calc(var(--tb-row) * ${rank}))` }}
              tabIndex={0}
              aria-label={`${r.correct ? "Correct" : "Wrong"}: ${r.note}. Probe ${r.probe.toFixed(2)}. Advantage ${fmt(value)}.`}
              onPointerEnter={() => setHovered(r.id)}
              onFocus={() => setHovered(r.id)}
              onBlur={() => setHovered(null)}
            >
              <span className="tb-mark" aria-hidden="true">{r.correct ? "✓" : "✗"}</span>
              <span className="tb-note">{r.note}</span>
              <span className="tb-probe">
                <span className="tb-meter" aria-hidden="true"><i style={{ width: `${r.probe * 100}%` }} /></span>
              </span>
              <span className="tb-track">
                {Math.abs(value) < 1e-9 && <span className="tb-zero-dot" aria-hidden="true" />}
                <span
                  className={`tb-bar ${r.correct ? "tb-bar-correct" : "tb-bar-wrong"} ${value >= 0 ? "tb-pos" : "tb-neg"}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </span>
            </div>
          );
        })}

        {hoveredRow && (
          <div
            className="tb-tip"
            role="status"
            style={{
              // below the row near the top, above it near the bottom so it never covers the caption
              transform:
                order.indexOf(hoveredRow.id) >= 5
                  ? `translateY(calc(var(--tb-row) * ${order.indexOf(hoveredRow.id)})) translateY(calc(-100% - 4px))`
                  : `translateY(calc(var(--tb-row) * ${order.indexOf(hoveredRow.id) + 1}))`,
            }}
          >
            <strong>{fmt(effective === "ft" ? hoveredRow.ft : hoveredRow.a0)}</strong> push
            {effective === "ft" && <span> (was {fmt(hoveredRow.a0)})</span>}
            <span className="tb-tip-meta">
              {hoveredRow.correct ? "Right" : "Wrong"} · looks at image {hoveredRow.probe.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <figcaption>
        <p>{CAPTIONS[groupKey][effective]}</p>
        <p className="tb-fine">
          The "push" is GRPO's advantage. These are real answers from Qwen3-VL-8B-Thinking before RL, on questions
          the probe never trained on, with the frozen probe's real scores; the pushes use the paper's formulas
          (Eq. 3, 8, 9; α = 0.5).
        </p>
      </figcaption>

      <details className="tb-table">
        <summary>View as table</summary>
        <div className="tb-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Answer</th>
                <th scope="col">Result</th>
                <th scope="col">Looks at image</th>
                <th scope="col">Push before</th>
                <th scope="col">Push after</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.note}</td>
                  <td>{r.correct ? "✓ right" : "✗ wrong"}</td>
                  <td>{r.probe.toFixed(2)}</td>
                  <td>{fmt(r.a0)}</td>
                  <td>{fmt(r.ft)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
