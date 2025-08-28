import React from 'react'
import ReactDOM from 'react-dom/client'
import { IonApp, setupIonicReact } from '@ionic/react'
import App from './App'

// Ionic core & basic CSS
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'

setupIonicReact()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IonApp>
      <App />
    </IonApp>
  </React.StrictMode>
)
