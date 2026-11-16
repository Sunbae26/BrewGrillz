import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/anton/400.css'
import '@fontsource/rye/400.css'
import '@fontsource/permanent-marker/400.css'
import '@fontsource-variable/manrope'
import './motion/gsap'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/home.css'
import './styles/pages.css'
import App from './App'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
// Pre-rendered pages (production build) are hydrated when the HTML matches this URL;
// otherwise (dev mode, 404s, host fallbacks) we render from scratch.
const here = location.pathname.replace(/\/+$/, '') || '/'
if (container.firstElementChild && container.dataset.route === here) hydrateRoot(container, app)
else {
  container.textContent = ''
  createRoot(container).render(app)
}
