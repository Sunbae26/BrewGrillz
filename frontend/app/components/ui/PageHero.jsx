import { useRef } from "react";
import { useReveals } from "../../motion/effects";
import { Flame } from "./ui";

// Big page header used by Book a Table, Bar, Our Place, Events and the legal pages.
export default function PageHero({ eyebrow, title, accent, script, tone = "red", children, image }) {
  const root = useRef(null);
  useReveals(root, [title]);
  return (
    <header className={`phero phero--${tone} ${image ? "phero--image" : ""}`} ref={root}>
      {image && (
        <div className="phero__media" aria-hidden="true">
          <img src={image.xs} srcSet={`${image.xs} 520w, ${image.sm} 900w, ${image.src} 1800w`} sizes="100vw" alt="" fetchPriority="high" decoding="async" />
        </div>
      )}
      <div className="phero__fx" aria-hidden="true" />
      <div className="container phero__inner">
        <span className="eyebrow" data-reveal>{eyebrow}</span>
        <h1 className="display phero__title" data-split>
          {title} {accent && <span className={tone === "lime" ? "neon neon--lime" : "text-red"}>{accent}</span>}
        </h1>
        {script && <span className="script phero__script" data-reveal="0.1">{script}</span>}
        <div className="phero__body" data-reveal="0.15">{children}</div>
      </div>
      <Flame className="phero__flame" />
    </header>
  );
}
