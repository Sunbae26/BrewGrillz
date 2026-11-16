// Build-time pre-rendering: turns each route into real HTML so text + images show
// before any JavaScript has loaded (much faster on phones, and better for Google).
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import App from './App'

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  )
}
