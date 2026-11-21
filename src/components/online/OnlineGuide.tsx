import { dict, type Lang } from "@/lib/i18n";
import styles from "@/components/game.module.css";

/** Texto indexable bajo la UI de la sala. Server component: no depende de JS. */
export function OnlineGuide({ lang }: { lang: Lang }) {
  const t = dict(lang).online;
  return (
    <section className={styles.rules}>
      <div className={styles.rulesBlock}>
        <h2>{t.guideHeading}</h2>
        <ol className={styles.steps}>
          {t.guideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{t.guideFree}</p>
      </div>
    </section>
  );
}
