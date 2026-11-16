import { Routes, Route, useLocation } from 'react-router-dom'
import SmoothScroll from './motion/SmoothScroll'
import MoCoProvider from './motion/MoCoProvider'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Cursor from './components/Cursor'
import Home from './pages/Home'
import Styleguide from './pages/Styleguide'
import Placeholder from './pages/Placeholder'

const soon = [
  { path: '/menu', title: 'The Menu', sprint: 2, blurb: 'Every steak, pizza, pasta and pint — with photos, filters and MoCo zoom. Firing up in Sprint 2.' },
  { path: '/order', title: 'Order Online', sprint: 3, blurb: 'Cart, checkout and secure online payment for pickup or delivery. Coming in Sprint 3.' },
  { path: '/reserve', title: 'Book a Table', sprint: 4, blurb: 'Pick a date, time and crew size. Until then, WhatsApp us on +65 8770 2077.' },
  { path: '/bar', title: 'The Bar', sprint: 4, blurb: 'Brewerkz taps, buckets, cocktails, wines and premium spirits — the full neon treatment.' },
  { path: '/our-place', title: 'Our Place', sprint: 4, blurb: 'The room, the music, the story. Stylish, cosy and a little bit rustic.' },
  { path: '/events', title: 'Events', sprint: 4, blurb: 'Celebrations, parties and nights out at BrewGrillz.' },
  { path: '/rewards', title: 'Rewards Club', sprint: 5, blurb: 'Sign up, earn points on every bill and redeem for the good stuff.' },
  { path: '/privacy', title: 'Privacy', sprint: 4, blurb: 'Our PDPA privacy policy.' },
  { path: '/terms', title: 'Terms', sprint: 4, blurb: 'Terms of use and refund & cancellation policy.' },
]

function Shell() {
  const location = useLocation()
  return (
    <MoCoProvider>
      <Navbar />
      <main className="page">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/styleguide" element={<Styleguide />} />
          {soon.map((p) => (
            <Route key={p.path} path={p.path} element={<Placeholder {...p} />} />
          ))}
          <Route path="*" element={<Placeholder notFound title="Over-grilled" blurb="This page got left on the grill a little too long. Let’s get you back to the good stuff." />} />
        </Routes>
        <Footer />
      </main>
      <Cursor />
      <div className="grain" aria-hidden="true" />
    </MoCoProvider>
  )
}

export default function App() {
  return (
    <SmoothScroll>
      <Shell />
    </SmoothScroll>
  )
}
