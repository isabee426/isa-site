"use client";

import { useMemo, useState } from "react";

/*
  Interactive version of FT-GRPO's tie-constrained advantage (paper §2–3.2).

  Rewards follow the paper: r = s + ηm with a binary verifier s and η = 0.1, so every
  well-formatted response scores 1.1 (correct) or 0.1 (wrong).
    Vanilla (Eq. 1):      A⁰ = (r − mean) / (std + ε)
    Partial tie (Eq. 4):  A = A⁰ + αΔ(ρ/(K−1) − ½), α = 0.5, ρ = ascending probe rank in the tie
    Full tie (Eq. 5):     A = β(f − mean f) / max(std f, τ), τ = 0.01
  Probe scores below are illustrative, modeled on the paper's case studies.
*/

type Response = { id: string; correct: boolean; probe: number; note: string };

const ETA = 0.1;
const ALPHA = 0.5;
const TAU = 0.01;
const EPS = 1e-6;
const DOMAIN = 2; // advantage axis runs from −2 to +2
const TICKS = [-2, -1, 0, 1, 2];

const GROUPS: Record<"partial" | "full", { label: string; responses: Response[] }> = {
  partial: {
    label: "Partially tied group",
    responses: [
      { id: "R1", correct: true, probe: 0.75, note: "Reads both graphs, then commits" },
      { id: "R2", correct: false, probe: 0.84, note: "Clean steps, but assumes the wrong height" },
      { id: "R3", correct: true, probe: 0.36, note: "Right answer after ~2,700 tokens of “Wait…”" },
      { id: "R4", correct: true, probe: 0.62, note: "Checks the setup once, then answers" },
      { id: "R5", correct: false, probe: 0.38, note: "Misreads the graph and loops" },
      { id: "R6", correct: true, probe: 0.81, note: "Grounded and concise" },
      { id: "R7", correct: false, probe: 0.21, note: "Repeats itself, then guesses" },
      { id: "R8", correct: true, probe: 0.55, note: "Long but steady derivation" },
    ],
  },
  full: {
    label: "Fully tied group",
    responses: [
      { id: "R1", correct: false, probe: 0.83, note: "Steady steps, misreads one label" },
      { id: "R2", correct: false, probe: 0.31, note: "Loops on the same check" },
      { id: "R3", correct: false, probe: 0.55, note: "Partly grounded, picks the wrong option" },
      { id: "R4", correct: false, probe: 0.18, note: "Loops, then answers at the token limit" },
      { id: "R5", correct: false, probe: 0.64, note: "Reads the chart, slips on arithmetic" },
      { id: "R6", correct: false, probe: 0.47, note: "Hedges between two options" },
      { id: "R7", correct: false, probe: 0.29, note: "Repeats “let me check again”" },
      { id: "R8", correct: false, probe: 0.72, note: "Describes the image, answers wrong" },
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

// β is the batch mean of |A⁰| over non-tied groups; the partially tied group stands in for the batch.
const BETA = mean(vanillaAdvantages(GROUPS.partial.responses).map(Math.abs));

const fmt = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}`;
const pct = (x: number) => ((x + DOMAIN) / (2 * DOMAIN)) * 100;

const CAPTIONS = {
  partial: {
    vanilla:
      "Vanilla GRPO: the five correct answers share one advantage and the three wrong ones share another, so a looping answer is reinforced exactly as much as a grounded one.",
    ft: "FT-GRPO ranks each tie by probe score. The looping correct answer drops to the bottom of the correct group and the grounded wrong answer rises to the top of the wrong group, but every correct answer still outranks every wrong one.",
  },
  full: {
    vanilla:
      "Every response is wrong, so every advantage is zero and this prompt contributes no gradient. In training, 34.4% of groups looked like this.",
    ft: "FT-GRPO recovers a zero-sum signal from the probe alone, scaled to the batch's usual advantage size, so the policy still learns to prefer grounded attempts.",
  },
};

export default function TieBreakFigure() {
  const [groupKey, setGroupKey] = useState<"partial" | "full">("partial");
  const [method, setMethod] = useState<"vanilla" | "ft">("vanilla");
  const [preview, setPreview] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const effective = preview && method === "vanilla" ? "ft" : method;
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
      <div className="tb-controls">
        <div className="tb-seg" role="group" aria-label="Group type">
          {(["partial", "full"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={groupKey === k} onClick={() => setGroupKey(k)}>
              {GROUPS[k].label}
            </button>
          ))}
        </div>
        <div className="tb-seg" role="group" aria-label="Advantage estimator">
          <button type="button" aria-pressed={effective === "vanilla"} onClick={() => { setMethod("vanilla"); setPreview(false); }}>
            Vanilla GRPO
          </button>
          <button type="button" aria-pressed={effective === "ft"} onClick={() => setMethod("ft")}>
            FT-GRPO
          </button>
        </div>
      </div>

      <div className="tb-legend">
        {nCorrect > 0 && <span><i className="tb-key tb-key-correct" aria-hidden="true" />✓ correct</span>}
        {nCorrect < rows.length && <span><i className="tb-key tb-key-wrong" aria-hidden="true" />✗ wrong</span>}
        {showBoundary && (
          <span><i className="tb-key tb-key-line" aria-hidden="true" />reward boundary, never crossed</span>
        )}
        <span className="tb-hint">{method === "vanilla" ? "Hover the chart or tap FT-GRPO" : "Advantage per response"}</span>
      </div>

      <div className="tb-head" aria-hidden="true">
        <span>Response</span>
        <span className="tb-probe">Probe</span>
        <span className="tb-axis">
          {TICKS.map((t) => (
            <span
              key={t}
              className={t === -DOMAIN ? "tb-tick-start" : t === DOMAIN ? "tb-tick-end" : undefined}
              style={{ left: `${pct(t)}%` }}
            >
              {t === 0 ? "0" : fmt(t).replace(".00", "")}
            </span>
          ))}
        </span>
      </div>

      <div
        className="tb-plot"
        onPointerEnter={(e) => e.pointerType === "mouse" && setPreview(true)}
        onPointerLeave={() => {
          setPreview(false);
          setHovered(null);
        }}
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
              <span className="tb-probe">{r.probe.toFixed(2)}</span>
              <span className="tb-track">
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
            <strong>{fmt(effective === "ft" ? hoveredRow.ft : hoveredRow.a0)}</strong> advantage
            {effective === "ft" && <span> (vanilla {fmt(hoveredRow.a0)})</span>}
            <span className="tb-tip-meta">
              {hoveredRow.correct ? "Correct" : "Wrong"} · probe {hoveredRow.probe.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <figcaption>
        <p>{CAPTIONS[groupKey][effective]}</p>
        <p className="tb-fine">
          Illustrative group of 8 rollouts. Rewards follow the paper (correct 1.1, wrong 0.1), probe scores are
          made up but modeled on its case studies, and advantages are computed with Eq. 1, 4, and 5 (α = 0.5).
        </p>
      </figcaption>

      <details className="tb-table">
        <summary>View as table</summary>
        <div className="tb-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Response</th>
                <th scope="col">Answer</th>
                <th scope="col">Probe</th>
                <th scope="col">Vanilla A</th>
                <th scope="col">FT-GRPO A</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.note}</td>
                  <td>{r.correct ? "✓ correct" : "✗ wrong"}</td>
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
