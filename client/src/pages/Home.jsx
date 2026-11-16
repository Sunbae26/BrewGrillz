import Hero from '../sections/home/Hero'
import MainEvent from '../sections/home/MainEvent'
import PickYourFire from '../sections/home/PickYourFire'
import Platters from '../sections/home/Platters'
import BarTeaser from '../sections/home/BarTeaser'
import Vibes from '../sections/home/Vibes'
import { Rewards, Xcape, Social, Visit } from '../sections/home/Extras'
import InfoStrip from '../sections/home/InfoStrip'
import SlotPick from '../sections/home/SlotPick'

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
