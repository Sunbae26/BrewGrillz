// The canonical menu lives in client/src/data/menu.json (one file for the website, the seed and the API fallback).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const MENU_JSON = path.resolve(here, '../../../client/src/data/menu.json')
export const loadMenuJson = () => JSON.parse(fs.readFileSync(MENU_JSON, 'utf8'))
