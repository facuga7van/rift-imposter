import type { CSSProperties } from "react";

/**
 * Le pasa a CSS el largo del texto para que el titular se dimensione solo.
 *
 * Los nombres van de "Zed" a "Nunu & Willump" y de "Ana" a un jugador con 16
 * caracteres. Ningun tamaño fijo sirve para los dos, y partir una palabra a la
 * mitad ("FIDDLESTICK / S") queda peor que achicarla. La cuenta la hace CSS con
 * unidades de container; aca solo viaja el dato que CSS no puede medir.
 */
export function fitLen(text: string): CSSProperties {
  return { "--len": [...text].length } as CSSProperties;
}
