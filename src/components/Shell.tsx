import type { ReactNode } from "react";
import { otherLang, pathFor, type Dict, type Lang } from "@/lib/i18n";
import styles from "./game.module.css";

type Props = {
  t: Dict;
  lang: Lang;
  /** Botones y links propios de cada modo. El cambio de idioma lo agrega Shell. */
  nav: ReactNode;
  /** Por defecto, la portada del otro idioma. El modo online conserva `?c=`. */
  langHref?: string;
  /** Durante el reparto local la barra desaparece: es el momento en que la
   *  pantalla no tiene que invitar a tocar nada mas. */
  hideTopbar?: boolean;
  context: string | null;
  progress?: number | null;
  children: ReactNode;
};

/** Marco comun de los dos modos: rail de escritorio, barra, banda de contexto y main. */
export function Shell({
  t,
  lang,
  nav,
  langHref,
  hideTopbar = false,
  context,
  progress = null,
  children,
}: Props) {
  const other = otherLang(lang);

  return (
    <div className={styles.page} id="top">
      {/* Adorno de escritorio, no navegacion: nada de lo que dice existe solo
          aca, asi que no entra en el arbol de accesibilidad. */}
      <aside className={styles.rail} aria-hidden="true">
        <span className={`${styles.railMark} display`}>Rift Impostor</span>
        <p className={styles.railLede}>{t.meta.tagline}</p>
        <p className={`${styles.railMeta} mono`}>{t.meta.railMeta}</p>
      </aside>

      <div className={styles.app}>
        {!hideTopbar && (
          <header className={styles.topbar}>
            <span className={styles.wordmark}>
              <span className={styles.wordmarkFull}>Rift Impostor</span>
              <span className={styles.wordmarkShort}>Rift</span>
            </span>
            <nav className={styles.nav}>
              {nav}
              {/* Ancla comun, NO next/link, y a proposito.
                  Los dos idiomas viven en root layouts distintos ((en) y (es)),
                  asi que Next hace navegacion dura entre ellos igual: el <Link>
                  no ahorra nada y encima dispara un prefetch RSC que en
                  `output: export` pide una ruta que no existe (404 en Vercel, y
                  peor en nginx: 200 devolviendo el index). Un <a> es identico
                  para SEO. */}
              <a
                className={`${styles.langBtn} mono`}
                href={langHref ?? pathFor(other)}
                hrefLang={other}
                aria-label={t.nav.switchTo}
              >
                {t.nav.switchShort}
              </a>
            </nav>
          </header>
        )}

        {context && (
          <div className={styles.context}>
            <span className={styles.contextLabel}>{context}</span>
            {progress !== null && (
              <div className={styles.progress} aria-hidden="true">
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* `main` envuelve cuerpo + dock porque los dos son la pantalla activa.
            El dock es sticky adentro suyo, que llega hasta el piso. */}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
