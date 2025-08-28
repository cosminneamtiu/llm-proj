import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonFooter,
  IonItem, IonInput, IonButton, IonList, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonBadge
} from '@ionic/react'
import { book, sparkles, send } from 'ionicons/icons'
import React, { useEffect, useState } from 'react'

type ChatTurn = { role: 'user' | 'assistant', content: string }

export default function App() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ChatTurn[]>([
    { role: 'assistant', content: 'Hi! Tell me what you are in the mood for (e.g., friendship and magic, war stories, desert politics)…' }
  ])

  async function ask() {
    if (!query.trim()) return
    setHistory(h => [...h, { role: 'user', content: query }])
    setLoading(true)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      const msg = data?.message || 'Sorry, no answer.'
      setHistory(h => [...h, { role: 'assistant', content: msg }])
    } catch (e: any) {
      setHistory(h => [...h, { role: 'assistant', content: 'Error contacting server.' }])
    } finally {
      setQuery('')
      setLoading(false)
    }
  }

  useEffect(() => {
    // Ensure backend is seeded
    fetch('/api/seed').catch(() => {})
  }, [])

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <IonIcon icon={book} />
              Smart Librarian
              <IonBadge color="tertiary" style={{ marginLeft: 8 }}>RAG + Tool</IonBadge>
            </span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonList lines="none">
          {history.map((t, i) => (
            <IonCard key={i} color={t.role === 'assistant' ? 'light' : undefined}
              style={{ borderRadius: 16, boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}>
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IonIcon icon={t.role === 'assistant' ? sparkles : send} />
                  {t.role === 'assistant' ? 'Smart Librarian' : 'You'}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent style={{ whiteSpace: 'pre-wrap' }}>{t.content}</IonCardContent>
            </IonCard>
          ))}
        </IonList>
      </IonContent>

      <IonFooter className="ion-padding">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
          <IonItem fill="outline" style={{ borderRadius: 14, overflow: 'hidden' }}>
            <IonInput
              placeholder="e.g., friendship and magic"
              value={query}
              onIonChange={(e) => setQuery(e.detail.value!)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask() }}
            />
          </IonItem>
          <IonButton onClick={ask} disabled={loading} size="default">
            <IonIcon slot="start" icon={send} />
            {loading ? 'Thinking…' : 'Send'}
          </IonButton>
        </div>
      </IonFooter>
    </IonPage>
  )
}
