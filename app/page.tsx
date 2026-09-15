import Portrait from "@/components/Portrait";
import ThreadsBackdrop from "@/components/ThreadsBackdrop";
import { about, experience, links, news, profile, projects, publications } from "@/lib/content";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return null;
  const external = href.startsWith("http");
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  );
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
                <p className="authors">
                  {pub.authors.map((a, i) => (
                    <span key={a.name}>
                      {a.me ? <strong>{a.name}</strong> : a.name}
                      {i < pub.authors.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
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

        <section aria-labelledby="experience">
          <h2 id="experience">experience</h2>
          <ol className="roles">
            {experience.map((r) => (
              <li key={r.org}>
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
