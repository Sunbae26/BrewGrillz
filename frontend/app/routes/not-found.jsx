import Placeholder from "../components/ui/Placeholder";

export const meta = () => [{ title: "Page not found | BrewGrillz Singapore" }, { name: "robots", content: "noindex" }];

export default function NotFound() {
  return (
    <Placeholder
      notFound
      title="Over-grilled"
      blurb="This page got left on the grill a little too long. Let’s get you back to the good stuff."
    />
  );
}
