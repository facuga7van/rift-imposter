import type { Metadata } from "next";
import { OnlineGame } from "@/components/online/OnlineGame";
import { OnlineGuide } from "@/components/online/OnlineGuide";
import { dict } from "@/lib/i18n";
import { buildOnlineMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildOnlineMetadata("en");

export default function Play() {
  return (
    <>
      {/* El unico h1, estatico, igual que en la portada. */}
      <h1 className="srOnly">Rift Impostor — {dict("en").online.headline}</h1>
      <OnlineGame lang="en" />
      <OnlineGuide lang="en" />
    </>
  );
}
