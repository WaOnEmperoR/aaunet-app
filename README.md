# AAUNet Frontend — Vue 3 + Vite + Tailwind CSS

Breast lesion segmentation inference UI.

## Project Structure

```
aaunet-app/
├── src/
│   ├── components/
│   │   ├── SingleInference.vue   # Single image inference tab
│   │   └── BatchInference.vue    # Batch inference tab
│   ├── api.js                    # Endpoint + file utilities
│   ├── App.vue                   # Root component with tabs
│   ├── main.js                   # App entry point
│   └── main.css                  # Tailwind + global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Setup

```bash
npm install
npm run dev
```

Then open: http://localhost:5173

## Build for Production

```bash
npm run build
```

## Backend CORS Setup (Required)

In your Cloud Run `app.py`:
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

In `requirements.txt`, add: `flask-cors`

Then redeploy: `gcloud run deploy --source .`

## Changing the Endpoint

Edit `src/api.js` and update the ENDPOINT constant.
