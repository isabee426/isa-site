// All site copy lives here. Pulled from experience-bank.md — edit this file, not the components.

// TODO(Isa): paste the real URLs. Empty strings are hidden on the site, so nothing renders broken.
export const links = {
  email: "isabshapland@gmail.com",
  linkedin: "https://www.linkedin.com/in/isabella-shapland/",
  github: "https://github.com/isabee426",
  resume: "/Resume-Isabella-Shapland.pdf",
  trainloopPaper: "/arc-agi-execution-bottleneck.pdf",
  intelArticle:
    "https://medium.com/@oarevalo/improve-battery-life-and-performance-using-the-intel-battery-life-diagnostics-tool-86689f0f6a9f",
  ftGrpoPreprint: "/breaking-the-loop.pdf",
};

export const profile = {
  name: "Isabella Beltran Shapland",
  short: "Isa",
  role: "Mechanistic ML Researcher",
  affiliation: "UC Santa Cruz",
  focus: ["RL alignment", "visual reasoning", "model reliability"],
};

export const about = [
  "I study how to make imperfect signals from inside a model safe to use. My current work puts visual-attention probes into GRPO rewards for vision-language models, with constraints that let the probe break ties but never override correctness.",
  "I did my B.S. in Computer Science at UC Santa Cruz (2022–2026), where I pitched and first-authored a research project in Dr. Yuyin Zhou's lab. Before that I worked on explainable ARC-AGI reasoning at TrainLoop (YC W25) and on on-device LLM tooling at Intel.",
];

export const news = [
  { date: "Aug 2026", text: "Submitted my first-author paper on attention probes in GRPO rewards to ACL Rolling Review." },
  { date: "Jun 2026", text: "Finished my B.S. in Computer Science at UC Santa Cruz." },
  { date: "2025", text: "BrowseIQ won AgentHacks 2025." },
];

export type Publication = {
  title: string;
  authors: { name: string; me?: boolean }[];
  venue: string;
  summary: string;
  highlights: string[];
  links: { label: string; href: string }[];
};

export const publications: Publication[] = [
  {
    title: "Break the Loop with Good Attention: Visual-Attention-Based Probes in GRPO Rewards to Mitigate Repetition Collapse",
    authors: [{ name: "Isabella Beltran Shapland", me: true }, { name: "Hardy Chen" }, { name: "Yuyin Zhou" }],
    venue: "Under review at ACL Rolling Review, 2026",
    summary:
      "Reasoning VLMs trained with GRPO can fall into repetition collapse when their attention drifts off the image. A frozen probe on visual attention (0.796 AUROC) is used only to break reward ties, never to override task correctness. It also recovers a learning signal from fully tied groups, where vanilla GRPO gives no gradient at all.",
    highlights: ["+3.4 in-domain accuracy", "+6.3 on MathVision", "~⅓ less repetition", "Qwen3-VL-8B, full fine-tune"],
    links: [{ label: "pdf", href: links.ftGrpoPreprint }],
  },
  {
    title: "ARC-AGI v2: Explainable Reasoning Traces for GPT-5-Nano; The Execution Bottleneck",
    authors: [{ name: "Isabella Beltran Shapland", me: true }, { name: "Jackson Stokes" }],
    venue: "TrainLoop research report, 2025",
    summary:
      "GPT-5-nano solves ARC-AGI v2 puzzles by writing illustrated instruction booklets made of IF-THEN steps. Its reasoning was fully correct on 45.5% of 33 human-annotated puzzles, compared with 0.9% raw benchmark accuracy. Execution then failed in 93.8% of those cases, so the bottleneck is visual execution, not reasoning.",
    highlights: ["45.5% correct reasoning", "93.8% execution failure", "failure-mode taxonomy"],
    links: [{ label: "pdf", href: links.trainloopPaper }],
  },
];

export type Role = {
  org: string;
  role: string;
  place: string;
  dates: string;
  points: string[];
  link?: { label: string; href: string };
};

export const experience: Role[] = [
  {
    org: "UC Santa Cruz",
    role: "First-Author ML Researcher · Dr. Yuyin Zhou's lab",
    place: "Santa Cruz, CA",
    dates: "Jan 2026 – Present",
    points: [
      "Pitched the project in office hours, then built all of it: the Verl training setup, RL configs, data ingestion, controls, and multi-arm ablations on 8×A100 and 2×H200.",
      "Designed the tie-only injection method and showed why simply adding the probe to the reward degrades response quality.",
    ],
  },
  {
    org: "TrainLoop (YC W25)",
    role: "ML Research Intern",
    place: "San Francisco, CA",
    dates: "Sept 2025 – Dec 2025",
    points: [
      "Built a 6-stage pipeline that turns multimodal puzzle-solving into auditable reasoning booklets with a crop-transform-uncrop image loop.",
      "Designed the annotation schema and failure-mode taxonomy that made reasoning and execution measurable separately.",
    ],
    link: { label: "paper", href: links.trainloopPaper },
  },
  {
    org: "Intel",
    role: "ML Software Engineering Intern",
    place: "Santa Clara, CA",
    dates: "May 2025 – Sept 2025",
    points: [
      "Built a Haystack RAG pipeline (LLaMA-3.2) that pulls CPU anomalies from large JSON system logs, plus a deterministic Python validator to catch hallucinations.",
      "Wrote Intel's first internal benchmarks for local model hosting on integrated GPUs (Ollama, SYCL).",
    ],
    link: { label: "BLDT v3.0 write-up", href: links.intelArticle },
  },
  {
    org: "ACM at UCSC",
    role: "ML Researcher",
    place: "Santa Cruz, CA",
    dates: "Sept 2023 – June 2024",
    points: [
      "Tested BERT against gradient-based Universal Trigger Token attacks and developed a new robustness measure from the results.",
      "Ran the attack simulations in parallel across GPU nodes with Kubernetes and PyTorch.",
    ],
  },
];

export const projects = [
  {
    name: "BrowseIQ",
    tag: "Winner, AgentHacks 2025",
    text: "An autonomous browser agent that analyzes browsing behavior with an LLM in real time and turns it into visual dashboards.",
    href: "https://devpost.com/software/browseiq",
  },
  {
    name: "Classified",
    tag: "UCSC Hack Day",
    text: "A red-team/blue-team privacy auditor. Tool-calling LLMs pivot through layered OSINT sources and map a person's exposed footprint on a live canvas.",
    href: "https://devpost.com/software/classified-a-privacy-auditor",
  },
  {
    name: "100-class few-shot classification",
    tag: "Computer vision",
    text: "About 10 images per class, handled with ConvNeXt V2, differential learning-rate unfreezing, and 30-crop test-time augmentation.",
    href: "",
  },
  {
    name: "C++ emulator",
    tag: "Senior capstone",
    text: "Custom memory management and CPU cycle timing that run hex instruction files and render playable games.",
    href: "",
  },
];
