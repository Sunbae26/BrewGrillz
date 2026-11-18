import LegalPage from "../components/ui/LegalPage";
import { privacy } from "../config/legal";
import { seo } from "../lib/seo.js";

export const meta = () =>
  seo({
    title: "Privacy Policy | BrewGrillz Singapore",
    description: "How BrewGrillz collects, uses and protects your personal data under Singapore's PDPA.",
    path: "/privacy",
  });

export default function Privacy() {
  return <LegalPage doc={privacy} eyebrow="The small print" />;
}
