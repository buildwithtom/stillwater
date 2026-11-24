import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/ibm-plex-sans/wght.css'
import '@fontsource-variable/baskervville/wght.css'
import '@fontsource-variable/baskervville/wght-italic.css'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
