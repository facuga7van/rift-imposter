import type { Metadata } from "next";
import { OnlineGame } from "@/components/online/OnlineGame";
import { OnlineGuide } from "@/components/online/OnlineGuide";
import { dict } from "@/lib/i18n";
import { buildOnlineMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOnlineMetadata("es");

export default function Jugar() {
  return (
    <>
      <h1 className="srOnly">Rift Impostor — {dict("es").online.headline}</h1>
      <OnlineGame lang="es" />
      <OnlineGuide lang="es" />
    </>
  );
}
