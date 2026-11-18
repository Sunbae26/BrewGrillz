import { useRef } from "react";
import { useReveals } from "../../motion/effects";
import { LEGAL_UPDATED } from "../../config/legal";
import { site } from "../../config/site";

export default function LegalPage({ doc, eyebrow }) {
  const root = useRef(null);
  useReveals(root);
  return (
    <section className="legal" ref={root}>
      <div className="container legal__wrap">
        <header className="legal__head">
          <span className="eyebrow" data-reveal>{eyebrow}</span>
          <h1 className="display legal__title" data-split>{doc.title}</h1>
          <p className="legal__updated" data-reveal>Last updated {LEGAL_UPDATED}</p>
          <p className="lead" data-reveal="0.1">{doc.intro}</p>
        </header>
        <nav className="legal__toc" aria-label="On this page">
          {doc.sections.map((s, i) => (
            <a key={s.heading} href={`#s${i}`}>{s.heading}</a>
          ))}
        </nav>
        <div className="legal__body">
          {doc.sections.map((s, i) => (
            <section key={s.heading} id={`s${i}`} className="legal__section">
              <h2 className="legal__h">{s.heading}</h2>
              {s.body?.map((p) => <p key={p}>{p}</p>)}
              {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
            </section>
          ))}
          <p className="legal__contact">Questions? Email <a href={`mailto:${site.email}`}>{site.email}</a> or call <a href={site.phoneHref}>{site.phone}</a>.</p>
        </div>
      </div>
    </section>
  );
}
