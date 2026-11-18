import Hero from '../components/home/Hero'
import MainEvent from '../components/home/MainEvent'
import PickYourFire from '../components/home/PickYourFire'
import Platters from '../components/home/Platters'
import BarTeaser from '../components/home/BarTeaser'
import Vibes from '../components/home/Vibes'
import { Rewards, Xcape, Social, Visit } from '../components/home/Extras'
import InfoStrip from '../components/home/InfoStrip'
import SlotPick from '../components/home/SlotPick'
import { site } from '../config/site'
import { seo, restaurantSchema } from "../lib/seo.js";

const hero = site.heroPoster

// Only the home page preloads the hero photo (the same file the hero shows at each screen size).
export const links = () => [
  { rel: 'preload', as: 'image', href: hero.src, imageSrcSet: `${hero.xs} 520w, ${hero.sm} 900w, ${hero.src} 1800w`, imageSizes: '100vw', fetchPriority: 'high' },
]

export const meta = () =>
  seo({
    title: "BrewGrillz Singapore — Steaks, Pizza, Pasta & Craft Beer in Bugis",
    description: "BrewGrillz is a grill & craft bar on Rochor Road, Bugis. Flame-grilled steaks, BBQ ribs, sharing platters, Italian pizza and pasta, Brewerkz craft beer and cocktails. Open daily 10am–11pm.",
    path: "/",
    schema: restaurantSchema,
  });

export default function Home() {
  return (
    <>
      <Hero />
      <InfoStrip />
      <MainEvent />
      <SlotPick />
      <PickYourFire />
      <Platters />
      <BarTeaser />
      <Vibes />
      <Rewards />
      <Xcape />
      <Social />
      <Visit />
    </>
  )
}
