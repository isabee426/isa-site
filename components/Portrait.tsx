"use client";

import { useEffect, useRef, useState } from "react";

// Until public/isa.jpg exists this shows a monogram instead of a broken image.
export default function Portrait({ alt }: { alt: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // The image can fail before React hydrates, in which case onError never fires.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <figure className="portrait">
      <div className="portrait-arch">
        {failed ? (
          <span className="portrait-fallback">IBS</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={img} src="/isa.jpg" alt={alt} onError={() => setFailed(true)} />
        )}
      </div>
    </figure>
  );
}
