import LegalPage from "../components/ui/LegalPage";
import { privacy } from "../config/legal";

export const meta = () => [
  { title: "Privacy Policy | BrewGrillz Singapore" },
  { name: "description", content: "How BrewGrillz collects, uses and protects your personal data under Singapore's PDPA." },
];

export default function Privacy() {
  return <LegalPage doc={privacy} eyebrow="The small print" />;
}
