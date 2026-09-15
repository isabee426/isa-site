"use client";

import dynamic from "next/dynamic";

// WebGL only exists in the browser, so skip server rendering for the canvas.
const AttentionThreads = dynamic(() => import("./AttentionThreads"), { ssr: false });

export default function ThreadsBackdrop() {
  return <AttentionThreads />;
}
