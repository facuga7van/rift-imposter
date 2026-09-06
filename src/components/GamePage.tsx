import { Game } from "@/components/Game";
import { CHAMPIONS } from "@/data/champions";
import { dict, type Lang } from "@/lib/i18n";
import styles from "@/components/game.module.css";

/** El juego (cliente) mas las reglas, que se renderizan en el server: es lo que
 *  indexa Google y lo que le da sentido a la pagina a alguien que cae de una
 *  busqueda y todavia no toco nada.
 *
 *  El bloque de reglas va DEBAJO del juego y siempre visible: no es un modal ni
 *  un acordeon, es contenido de pagina. */
export function GamePage({ lang }: { lang: Lang }) {
  const t = dict(lang);

  return (
    <>
      {/* El unico h1 del documento. Va oculto porque el titular a la vista
          cambia con la fase del juego, y el h1 no puede ir y venir: tiene que
          estar en el HTML estatico que ve el buscador, siempre igual. */}
      <h1 className="srOnly">Rift Impostor — {t.meta.tagline}</h1>

      <Game lang={lang} />

      <section className={styles.rules} id="rules">
        <div className={styles.rulesBlock}>
          <h2>{t.rules.heading}</h2>
          <p>{t.rules.intro(CHAMPIONS.length)}</p>
        </div>

        <div className={styles.rulesBlock}>
          <h3>{t.rules.stepsHeading}</h3>
          <ol className={styles.steps}>
            {t.rules.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className={styles.rulesBlock}>
          <h3>{t.rules.hintHeading}</h3>
          <p>{t.rules.hint}</p>
          <div className={styles.difficulty}>
            <div className={styles.difficultyCard}>
              <span className={styles.difficultyLabel}>{t.rules.hintOnLabel}</span>
              <span className={styles.difficultyText}>{t.rules.hintOnText}</span>
            </div>
            <div className={styles.difficultyCard}>
              <span className={styles.difficultyLabel}>{t.rules.hintOffLabel}</span>
              <span className={styles.difficultyText}>{t.rules.hintOffText}</span>
            </div>
          </div>
        </div>

        <div className={styles.rulesBlock}>
          <h3>{t.rules.scoringHeading}</h3>
          <table className={styles.scoreTable}>
            <thead>
              <tr>
                {t.rules.scoringCols.map((col) => (
                  <th key={col} scope="col">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rules.scoringRows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.rulesBlock}>
          <h3>{t.rules.tipHeading}</h3>
          <p className={styles.tipBox}>{t.rules.tip}</p>
        </div>

        <div className={styles.rulesBlock}>
          <h3>{t.rules.sourceHeading}</h3>
          <p className={styles.legal}>{t.rules.source}</p>
        </div>

        {/* La barra superior es sticky dentro del juego, no de la pagina: al
            llegar hasta aca ya no esta. Sin esto la unica vuelta es scrollear
            todo el bloque a mano. */}
        <a className={styles.backToGame} href="#top">
          ↑ {t.scores.back}
        </a>
      </section>
    </>
  );
}
