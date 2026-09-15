import Portrait from "@/components/Portrait";
import ThemeToggle from "@/components/ThemeToggle";
import ThreadsBackdrop from "@/components/ThreadsBackdrop";
import {
  about,
  experience,
  inProgress,
  interests,
  links,
  misc,
  news,
  profile,
  projects,
  publications,
  talks,
  type Person,
} from "@/lib/content";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return null;
  const external = href.startsWith("http");
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  );
}

function Authors({ people }: { people: Person[] }) {
  return (
    <p className="authors">
      {people.map((a, i) => (
        <span key={a.name}>
          {a.me ? <strong>{a.name}</strong> : a.href ? <Ext href={a.href}>{a.name}</Ext> : a.name}
          {i < people.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

function initials(org: string) {
  return org
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Home() {
  const contact = [
    { label: "email", href: `mailto:${links.email}` },
    { label: "linkedin", href: links.linkedin },
    { label: "github", href: links.github },
    { label: "résumé", href: links.resume },
  ].filter((l) => l.href);

  return (
    <>
      <header className="hero">
        <ThreadsBackdrop />
        <ThemeToggle />
        <div className="hero-inner">
          <Portrait alt={`Portrait of ${profile.name}`} />
          <div className="hero-text">
            <p className="eyebrow">{profile.role}</p>
            <h1>
              Isabella <em>Beltran</em> Shapland
            </h1>
            <p className="lede">
              I work on {profile.focus[0]}, {profile.focus[1]}, and {profile.focus[2]}. Lately that means
              teaching vision-language models to keep looking at the image.
            </p>
            <p className="seeking">{profile.seeking}</p>
            <nav className="contact" aria-label="Contact">
              {contact.map((l) => (
                <Ext key={l.label} href={l.href}>
                  {l.label}
                </Ext>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="column">
        <section aria-labelledby="about">
          <h2 id="about">about</h2>
          {about.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        <section aria-labelledby="interests">
          <h2 id="interests">research interests</h2>
          <ul className="interests">
            {interests.map((it) => (
              <li key={it.title}>
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="news">
          <h2 id="news">news</h2>
          <ul className="news">
            {news.map((n) => (
              <li key={n.text}>
                <span className="date">{n.date}</span>
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="research">
          <h2 id="research">research</h2>
          <ol className="pubs">
            {publications.map((pub) => (
              <li key={pub.title} className="pub">
                <h3>{pub.title}</h3>
                <Authors people={pub.authors} />
                <p className="venue">{pub.venue}</p>
                <p>{pub.summary}</p>
                <ul className="chips">
                  {pub.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <p className="pub-links">
                  {pub.links.map((l) =>
                    l.href ? (
                      <Ext key={l.label} href={l.href}>
                        [{l.label}]
                      </Ext>
                    ) : (
                      <span key={l.label} className="muted">
                        [{l.label} coming soon]
                      </span>
                    ),
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="in-progress">
          <h2 id="in-progress">work in progress</h2>
          <p className="section-note">Independent interpretability projects on AI safety and model behavior. These are ongoing, so I describe the questions and methods here, not results.</p>
          <ul className="notes">
            {inProgress.map((n) => (
              <li key={n.title}>
                <h3>{n.title}</h3>
                <p>{n.text}</p>
                <ul className="chips">
                  {n.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="experience">
          <h2 id="experience">experience</h2>
          <ol className="roles">
            {experience.map((r) => (
              <li key={r.org}>
                <div className="logo" aria-hidden="true">
                  {r.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logo} alt="" />
                  ) : (
                    <span>{initials(r.org)}</span>
                  )}
                </div>
                <div>
                  <div className="role-head">
                    <h3>{r.org}</h3>
                    <span className="date">{r.dates}</span>
                  </div>
                  <p className="venue">
                    {r.role} · {r.place}
                  </p>
                  <ul className="points">
                    {r.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                  {r.link?.href && (
                    <p className="pub-links">
                      <Ext href={r.link.href}>[{r.link.label}]</Ext>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="projects">
          <h2 id="projects">projects</h2>
          <ul className="projects">
            {projects.map((p) => (
              <li key={p.name}>
                <h3>{p.href ? <Ext href={p.href}>{p.name}</Ext> : p.name}</h3>
                <p className="venue">{p.tag}</p>
                <p>{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="talks">
          <h2 id="talks">talks</h2>
          <ul className="talks">
            {talks.map((t) => (
              <li key={t.title} className="talk">
                <a href={t.href} target="_blank" rel="noreferrer" className="talk-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.image} alt={t.imageAlt} loading="lazy" />
                </a>
                <div>
                  <h3>
                    <Ext href={t.href}>{t.title}</Ext>
                  </h3>
                  <p className="venue">
                    {t.host} · {t.date}
                  </p>
                  <p>{t.text}</p>
                  <p className="pub-links">
                    <Ext href={t.href}>[linkedin post]</Ext>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="misc">
          <h2 id="misc">misc</h2>
          <ul className="points">
            {misc.map((m) => (
              <li key={m.text}>
                {m.text}{" "}
                {m.link && <Ext href={m.link.href}>[{m.link.label}]</Ext>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="column footer">
        <p>
          Say hello at <a href={`mailto:${links.email}`}>{links.email}</a>.
        </p>
        <p className="muted">Built with Next.js and three.js · updated September 2026</p>
      </footer>
    </>
  );
}
