"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Estado persistido en localStorage.
 *
 * Ojo con el detalle importante: el primer render SIEMPRE devuelve el valor
 * inicial, nunca lo guardado. En el server localStorage no existe, asi que si
 * leyeramos durante el render el HTML del server y el del cliente no
 * coincidirian y React tiraria un error de hidratacion. Por eso leemos recien
 * en el efecto, y exponemos `hydrated` para que la UI sepa cuando confiar.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // JSON corrupto o storage bloqueado (modo incognito estricto, iOS con
      // cookies off). Seguimos con el valor inicial: el juego funciona igual,
      // solo que no recuerda nada.
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return; // no pisar lo guardado con el inicial
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage lleno o bloqueado: no rompemos la partida en curso.
    }
  }, [key, value, hydrated]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return { value, setValue, reset, hydrated } as const;
}
