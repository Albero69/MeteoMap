# MeteoMap

## Stakeholder

Applicazione interattiva di visualizzazione meteorologica su mappa geografica in tempo reale.

## Fasi del processo

### Analisi dei requisiti

#### Funzionali
L'applicazione deve:
- Visualizzare una mappa interattiva con localizzazione geografica precisa
- Integrare dati meteorologici in tempo reale per ogni locazione
- Mostrare informazioni dettagliate su temperatura, precipitazioni e condizioni atmosferiche
- Permettere il geocoding e la ricerca di luoghi tramite indirizzo o coordinate
- Visualizzare icone e marker specifici per diverse condizioni meteo (sole, pioggia, temperature alte/basse)
- Consentire l'interazione con la mappa (zoom, pan, click su marcatori)
- Gestire il recupero e la memorizzazione dei dati meteo tramite PocketBase
- Visualizzare una legenda interattiva per interpretare i simboli meteo

#### Non funzionali
- L'interfaccia deve essere intuitiva e responsive, utilizzabile da dispositivi desktop e mobile
- La mappa deve caricarsi rapidamente con tiles da OpenStreetMap
- L'aggiornamento dei dati meteorologici deve avvenire in tempo reale
- Il sistema deve supportare ricerche di coordinate mediante Nominatim
- Buone performance anche con multipli marcatori sulla mappa

#### Di dominio
L'applicazione segue il paradigma di **web mapping** con integrazione di dati meteorologici:
- Georeferenziazione precisa tramite latitude/longitude
- Visualizzazione tematica su base cartografica
- Consultazione dati meteo per punti di interesse geografici

#### Di vincolo
- Sviluppo con HTML, CSS, JavaScript (ES6+)
- Utilizzo esclusivo di servizi open-source/gratuiti
- Architettura client-server locale (PocketBase in localhost)
- No librerie a pagamento

#### Analisi della concorrenza
Progetti simili come OpenWeatherMap, Windy e WeatherAPI offrono funzionalità premium a pagamento. MeteoMap si differenzia per essere completamente open-source e auto-hosted.

#### Analisi di fattibilità
Progetto altamente fattibile: sfrutta API pubbliche gratuite (Open-Meteo, Nominatim, OpenStreetMap), librerie consolidate (Leaflet, PocketBase) e non richiede infrastrutture complesse.

---

### Progettazione

#### Architettura

```
┌─────────────────────────────────────────────┐
│         Interfaccia Utente (Frontend)       │
│  HTML5 + CSS3 + JavaScript (Leaflet.js)    │
└──────────────┬──────────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
      v                 v
┌──────────────┐  ┌─────────────────┐
│  Leaflet Map │  │   PocketBase    │
│  + Markers   │  │  (Dati Locali)  │
└──────────────┘  └─────────────────┘
      │                 │
      └────────┬────────┘
               │
      ┌────────┴────────────────────┐
      │                             │
      v                             v
┌──────────────────┐    ┌─────────────────┐
│  Open-Meteo API  │    │ Nominatim/OSM   │
│  (Meteo in tempo │    │ (Geocoding &    │
│   reale)         │    │  Info Luoghi)   │
└──────────────────┘    └─────────────────┘
```

#### Componenti principali

1. **Interfaccia Utente (UI)**: 
   - Mappa interattiva (Leaflet.js)
   - Markers e icons meteorologiche
   - Legenda esplicativa
   - Popup informativi
   - Controlli di zoom e navigazione
   - Barra di ricerca per geocoding

2. **Logica Applicativa**: 
   - Gestione dei marker
   - Fetching dati da Open-Meteo
   - Geocoding tramite Nominatim
   - Formattazione e visualizzazione dati meteo

3. **Persistenza Dati**: 
   - PocketBase per memorizzazione locale
   - Cache dati meteo per prestazioni
   - Storico delle ricerche

4. **Mappe e Geodati**: 
   - Tile layer OpenStreetMap
   - Georeferenziazione precisà
   - Coordinate geografiche (lat/lng)

#### Flusso di dati

**Ricerca di un luogo:**
```
Utente digita indirizzo/coordinate
          ↓
Nominatim API (geocoding)
          ↓
Ottieni lat/lng
          ↓
Visualizza su mappa
          ↓
Richiedi dati meteo a Open-Meteo
          ↓
Ricevi temperatura, condizioni, precipitazioni
          ↓
Salva in PocketBase
          ↓
Visualizza marker con icona appropriata
```

**Struttura dei dati meteorologici:**

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | String | Identificatore univoco (UUID) |
| location_name | String | Nome del luogo (da Nominatim) |
| latitude | Number | Latitudine geografica |
| longitude | Number | Longitudine geografica |
| temperature | Number | Temperatura in °C |
| weather_code | Integer | Codice condizione meteo (WMO) |
| precipitation | Number | Precipitazioni in mm |
| weather_condition | String | Descrizione condizione (soleggiato, pioggia, ecc.) |
| icon_type | String | Tipo di icona (sun, rain, high, low) |
| timestamp | DateTime | Data/ora dell'ultimo aggiornamento |
| country | String | Paese della località |

---

### Implementazione

#### 1. Frontend: Leaflet.js e HTML

**Inizializzazione mappa:**
```javascript
const map = L.map("map").setView([45.42, 10.08], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors',
}).addTo(map);
```

**Definizione icone meteorologiche:**
```javascript
const icons = {
  sun: L.icon({
    iconUrl: "sun.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
  rain: L.icon({
    iconUrl: "rain.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
  high: L.icon({
    iconUrl: "hight.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
  low: L.icon({
    iconUrl: "low.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
};
```

**Legenda interattiva:**
```javascript
const legenda = L.control({ position: "bottomright" });
legenda.onAdd = function (map) {
  const div = L.DomUtil.create("div", "legend");
  div.innerHTML = `
    <h4>Legenda Meteo</h4>
    <p><img src="sun.png" alt="Sole"> Soleggiato</p>
    <p><img src="rain.png" alt="Pioggia"> Pioggia</p>
    <p><img src="hight.png" alt="Temperatura Alta"> Temp. Alta (>25°C)</p>
    <p><img src="low.png" alt="Temperatura Bassa"> Temp. Bassa (<5°C)</p>
  `;
  return div;
};
legenda.addTo(map);
```

#### 2. Integrazione API Open-Meteo

**Fetch dati meteorologici:**
```javascript
async function getMeteoData(latitude, longitude) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,precipitation`
  );
  const data = await response.json();
  return data.current;
}
```

#### 3. Geocoding con Nominatim

**Ricerca indirizzo:**
```javascript
async function geocodeLocation(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${query}&format=json`
  );
  const data = await response.json();
  return data[0]; // {lat, lon, display_name}
}
```

#### 4. Persistenza dati con PocketBase

**Connessione e salvataggio:**
```javascript
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

async function saveWeatherData(locationData) {
  const record = await pb.collection("weather").create({
    location_name: locationData.name,
    latitude: locationData.lat,
    longitude: locationData.lng,
    temperature: locationData.temp,
    weather_condition: locationData.condition,
    icon_type: locationData.icon,
    timestamp: new Date(),
  });
  return record;
}
```

#### 5. CSS Responsive Design

```css
#map {
  height: 100vh;
  width: 100%;
}

.legend {
  background: white;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .search-bar {
    width: 90%;
    margin: 10px auto;
  }
}
```

---

### Verifica e validazione

#### Test funzionali
-  Caricamento mappa e tile layer OpenStreetMap
-  Ricerca geografica tramite Nominatim (indirizzi e coordinate)
-  Fetch dati meteo da Open-Meteo con coordinate corrette
-  Visualizzazione marker con icone appropriate
-  Popup informativi al click su marker
-  Persistenza dati su PocketBase
-  Legenda visibile e interpretabile

#### Test non funzionali
-  Mappa responsive su mobile e desktop
-  Caricamento tile layer <2 secondi
-  Aggiornamento meteo <1 secondo
-  Supporto zoom 1-19
-  Gestione errori API

#### Test di usabilità
-  Navigazione intuitiva con zoom/pan
-  Ricerca località semplice e veloce
-  Icone meteo facilmente riconoscibili
-  Legenda chiara e non invasiva

---

### Distribuzione

- **Repository**: GitHub
- **Hosting**: localhost (PocketBase) / vercel/netlify (frontend)
- **Deployment**: Docker container (opzionale)

---

### Manutenzione ed evoluzione

#### Futuri sviluppi

1. **Previsioni estese**: Integrare previsioni meteo multi-day da Open-Meteo
2. **Filtri avanzati**: Filtrare marker per tipo di meteo, range di temperatura
3. **Storico**: Visualizzare andamento temperatura nel tempo
4. **Allerte meteo**: Notifiche per fenomeni estremi
5. **Multi-lingua**: Supporto lingue diverse per nomi luoghi
6. **Heatmap**: Visualizzazione graduale temperatura su area geografica
7. **Autenticazione**: Sistema login per dati personalizzati


---

## Stack Tecnologico

### Frontend
- **Leaflet.js** – Libreria mapping interattiva con tile layer OpenStreetMap
- **HTML5 / CSS3** – Struttura e styling responsivo
- **JavaScript ES6+** – Logica applicativa e event handling

### Backend / Dati
- **PocketBase** – Database locale e API REST self-hosted
- **Open-Meteo API** – Dati meteorologici real-time gratuiti
- **Nominatim / OpenStreetMap** – Geocoding e informazioni geografiche

### Mappe
- **OpenStreetMap** – Tile layer e base cartografica
- **Dati geografici © OpenStreetMap contributors** – Mappa vettoriale

### Build & Deploy
- **Vite** – Build tool moderno
- **npm** – Gestione dipendenze

---

## Crediti e Attributioni

- **Leaflet.js** – Libreria mapping: https://leafletjs.com/
- **Open-Meteo** – API meteorologica: https://open-meteo.com/
- **Nominatim** – Geocoding: https://nominatim.org/
- **OpenStreetMap** – Mappe vettoriali: https://www.openstreetmap.org/
  - *Dati geografici © OpenStreetMap contributors* – [ODbL License](https://opendatacommons.org/licenses/odbl/)
- **PocketBase** – Database self-hosted: https://pocketbase.io/
