// Writes dist/<route>/index.html for every route using the SSR bundle.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const { render } = await import(path.join(root, 'dist-ssr/entry-server.js'))
let template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

// Preload the two above-the-fold fonts (headline + body) so the hero text paints in its real font straight away
const assets = fs.readdirSync(path.join(dist, 'assets'))
const pick = (re) => assets.find((f) => re.test(f))
const fonts = [pick(/^anton-latin-400-normal-.*\.woff2$/), pick(/^manrope-latin-wght-normal-.*\.woff2$/)].filter(Boolean)
const preloads = fonts.map((f) => `<link rel="preload" as="font" type="font/woff2" href="/assets/${f}" crossorigin />`).join('\n    ')
template = template.replace('</head>', `    ${preloads}\n  </head>`)

const routes = ['/', '/styleguide', '/menu', '/order', '/track', '/reserve', '/bar', '/our-place', '/events', '/rewards', '/privacy', '/terms']
for (const url of routes) {
  const html = template.replace('<div id="root"><!--app-html--></div>', `<div id="root" data-route="${url}">${render(url)}</div>`)
  if (url === '/') {
    fs.writeFileSync(path.join(dist, 'index.html'), html)
  } else {
    // both /menu.html and /menu/index.html, so any static host serves the right page for "/menu"
    fs.writeFileSync(path.join(dist, `${url.slice(1)}.html`), html)
    fs.mkdirSync(path.join(dist, url.slice(1)), { recursive: true })
    fs.writeFileSync(path.join(dist, url.slice(1), 'index.html'), html)
  }
  console.log('prerendered', url)
}
// 404 page for unknown URLs (the client renders the "Over-grilled" page)
fs.writeFileSync(path.join(dist, '404.html'), template.replace('<!--app-html-->', ''))
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
