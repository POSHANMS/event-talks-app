# ⚡ BigQuery Release Pulse

A premium, real-time developer stream and caching dashboard for Google Cloud BigQuery release notes. It parses the official Atom/XML feed, splits bulky daily updates into granular, categorized sections, and allows developers to search, filter, and share updates on X/Twitter.

---

## ✨ Features

- **🔄 Real-time Feed Parsing**: Automatically fetches and processes the official BigQuery Release Notes XML feed.
- **🎯 Granular Segmentation**: Splits bulk daily logs into individual updates categorized as:
  - `Features`
  - `Changes`
  - `Deprecations`
  - `Known Issues`
  - `Announcements`
- **⚡ High-Performance Caching**: Implements a server-side cache (5-minute TTL) to minimize external requests and guarantee fast load times, with support for manual cache eviction (`?refresh=true`).
- **🔍 Instant Live Search & Filter**: Real-time client-side search across release titles and text, plus categorized tab filtering.
- **🐦 Built-in X (Twitter) Share Composer**: Click any card to preview and format a tweet with pre-populated tags and release links.
- **🎨 Premium Dark UI**: Visually stunning dashboard built with glassmorphism, custom SVG logos with gradients, smooth transitions, skeleton loaders, and Lucide icons.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask, `xml.etree.ElementTree` (XML parsing)
- **Frontend**: HTML5 (Semantic), Vanilla CSS (Custom Design System with variables), JavaScript (Vanilla ES6)
- **Icons**: Lucide Icons
- **Fonts**: Google Fonts (Inter & Outfit)

---

## 📂 Project Structure

```text
├── static/
│   ├── app.js       # Frontend app logic, search/filter handlers, tweet composer
│   └── style.css    # Premium CSS design system, variables, dark theme, and animations
├── templates/
│   └── index.html   # Main dashboard markup (SEO-optimized, semantic HTML)
├── app.py           # Flask server, feed parsing, endpoint definition, caching layer
├── .gitignore       # Pre-configured Python and environment exclusions
├── requirements.txt # Python project dependencies
└── README.md        # Documentation
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have Python 3.8+ installed on your system.

### 1. Clone & Set Up Directory

```bash
cd "C:\Windows\System32\agy-cli-projects"
```

### 2. Create Virtual Environment

Create and activate a virtual environment to manage dependencies:

```bash
# Create virtual environment
python -m venv venv

# Activate on Windows (cmd)
venv\Scripts\activate

# Activate on Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Activate on macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

Start the Flask development server:

```bash
python app.py
```

The application will be running at **`http://127.0.0.1:5000`**.

---

## 🔌 API Documentation

### Get Release Notes
*   **Endpoint**: `/api/releases`
*   **Method**: `GET`
*   **Query Parameters**:
    *   `refresh` (optional): Set to `true` to bypass the cache and fetch fresh release notes.
*   **Response Format**:
    ```json
    {
      "success": true,
      "releases": [
        {
          "date": "June 18, 2026",
          "updated": "2026-06-18T12:00:00Z",
          "link": "https://cloud.google.com/bigquery/docs/release-notes",
          "sections": [
            {
              "id": "June_18__2026_0",
              "type": "Feature",
              "html": "<p>BigQuery search index supports new text columns...</p>",
              "text": "BigQuery search index supports new text columns...",
              "link": "https://cloud.google.com/bigquery/docs/release-notes"
            }
          ]
        }
      ],
      "last_updated": 1729424567.89,
      "is_cached": true
    }
    ```

---

## 🛡️ License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

*Disclaimer: This tool is an unofficial developer community utility and is not affiliated with, authorized, or endorsed by Google LLC.*
