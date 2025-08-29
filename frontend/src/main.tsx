import React from 'react'
import ReactDOM from 'react-dom/client'
import { IonApp, setupIonicReact } from '@ionic/react'
import App from './App'

// Ionic core & basic CSS
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'

// System UI font stack for Apple-ish look
const systemStyle = document.createElement('style')
systemStyle.innerHTML = `
  :root, body, ion-app {
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
                 "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    letter-spacing: .01px;
  }
`
document.head.appendChild(systemStyle)

setupIonicReact()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IonApp>
      <App />
    </IonApp>
  </React.StrictMode>
)
