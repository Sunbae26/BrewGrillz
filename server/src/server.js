import { createApp } from './app.js'
import { env, warnMissing } from './lib/env.js'

warnMissing()
const app = createApp()
app.listen(env.PORT, () => console.log(`🔥 BrewGrillz API on http://localhost:${env.PORT}`))
