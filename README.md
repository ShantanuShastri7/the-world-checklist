# 🌍 The World Checklist

> *A beautiful personal travel journal — every place, every story, every memory.*

A fully static web app you can host for free on GitHub Pages. No backend, no database — just HTML, CSS, JavaScript, and a JSON file you control.

---

## ✨ Features

- **Country cards** that expand to reveal all visited places
- **Place detail modal** — photo, date, location, journal entry, tags
- **Interactive dark map** (Leaflet + OpenStreetMap) with custom markers
- **Add Place** form — fill in details, download updated JSON, commit to GitHub
- **Google Takeout Importer** — bulk import from your Google Maps history with country/search filtering so you only keep what you want
- **Search & tag filters** across all places
- **Fully responsive** — works on mobile and desktop

---

## 🚀 Deploy to GitHub Pages

### 1. Fork / Clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/the-world-checklist.git
cd the-world-checklist
```

### 2. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose **`main`** branch, **`/ (root)`** folder
4. Click **Save**

Your site will be live at `https://YOUR_USERNAME.github.io/the-world-checklist/` within a few minutes.

---

## 📝 Adding Places

### Option A — Manual Form (recommended for new places)

1. Open the app and click **✈️ Add Place** in the sidebar
2. Fill in the details (country, place name, coordinates, date, photo, journal entry)
3. Click **Save & Download JSON** — this downloads an updated `places.json`
4. Replace `data/places.json` in your repo with the downloaded file
5. Commit and push:

```bash
git add data/places.json
git commit -m "Add: Eiffel Tower, Paris 🗼"
git push
```

6. If you uploaded a local photo, also copy it to `data/images/` and update the `image` field in the JSON.

### Option B — Google Takeout Import (bulk import past history)

1. Go to [takeout.google.com](https://takeout.google.com) → select **Location History (Timeline)** only → export as JSON
2. Unzip the download and find a file from the `Semantic Location History` folder (e.g. `2024_JANUARY.json`) or `Records.json`
3. In the app, click **📥 Import from Google** in the sidebar
4. Upload the file, review and filter places (by country, search, etc.), confirm the import
5. The updated `places.json` downloads automatically — commit it to GitHub

---

## 🗂 Project Structure

```
/
├── index.html          # App shell
├── style.css           # Design system & all styles
├── app.js              # All app logic
├── data/
│   ├── places.json     # Your travel data (edit this!)
│   └── images/         # Place photos (optional)
└── README.md
```

---

## 🗺 Data Format (`data/places.json`)

```json
{
  "countries": [
    {
      "id": "france",
      "name": "France",
      "flag": "🇫🇷",
      "coverImage": "https://...",
      "places": [
        {
          "id": "france-eiffel-tower",
          "name": "Eiffel Tower",
          "location": "48.8584° N, 2.2945° E",
          "address": "Champ de Mars, Paris, France",
          "lat": 48.8584,
          "lng": 2.2945,
          "visitedAt": "2024-06-15T18:30:00",
          "image": "https://...",
          "description": "Watched the sunset from the second floor. Absolutely magical.",
          "tags": ["architecture", "romantic", "culture"]
        }
      ]
    }
  ]
}
```

---

## 🛠 Run Locally

```bash
# Using Python
python3 -m http.server 8080

# Using Node
npx serve .

# Using VS Code
# Install "Live Server" extension → right click index.html → Open with Live Server
```

> ⚠️ Must be served via HTTP (not opened as a file) because the app fetches `data/places.json`.

---

## 📸 Photo Tips

- **External URLs**: Use Unsplash, your own GitHub raw URLs, or any public image host
- **Local photos**: Place images in `data/images/` and reference them as `"data/images/photo.jpg"`
- Recommended size: **800×600px** or larger, JPEG/WebP

---

## 🤝 Credits

- Maps: [Leaflet.js](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) + [Carto dark tiles](https://carto.com/)
- Fonts: [Outfit](https://fonts.google.com/specimen/Outfit) + [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) via Google Fonts
- Design: Custom dark glassmorphism system
