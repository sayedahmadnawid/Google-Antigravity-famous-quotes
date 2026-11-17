# 100 Famous Quotes Web Application

A lightweight, modern web application built with **Python Flask**, **plain vanilla JavaScript**, **HTML5**, and **CSS3** to explore 100 well-known quotes with random quote generation, author search, and category filtering.

---

## ✨ Features

- **100 Curated Famous Quotes**: Thoughtfully compiled dataset spanning 8 categories: *Inspiration*, *Wisdom*, *Philosophy*, *Science*, *Leadership*, *Humor*, *Life*, and *Literature*.
- **Random Quote Generator**: One-click generation of a random quote with smooth fade animations and custom category color accents.
- **Author Search**: Filter quotes by typing in any author's name or selecting from the alphabetical author dropdown.
- **Category Filter**: Filter instantly by clicking on category pill buttons (*Inspiration*, *Science*, *Philosophy*, etc.).
- **Live Search**: Instant keyword search matching both quote content and author names.
- **Copy to Clipboard**: Quick copy button on the hero quote and every individual quote card with a confirmation toast.
- **Share to X (Twitter)**: Share your favorite quotes in one click.
- **Zero Heavy Frontend Frameworks**: Built using plain vanilla modern JavaScript (no React, no Vue, no jQuery).
- **Responsive Design**: Mobile-friendly layout with modern dark aesthetic and typography.

---

## 📁 Project Structure

```
famous-quotes/
├── data/
│   └── quotes.json            # 100 curated quotes (id, quote, author, category)
├── static/
│   ├── css/
│   │   └── style.css          # Modern dark styling, responsive grid & animations
│   └── js/
│       └── app.js             # Vanilla JS: API calls, filtering, DOM rendering & toast
├── templates/
│   └── index.html             # Semantic HTML5 single-page application
├── app.py                     # Flask backend & REST API endpoints
├── test_app.py                # Unit test suite (12 tests)
├── requirements.txt           # Python dependencies (Flask, pytest)
└── README.md                  # Documentation & setup guide
```

---

## 🚀 Quickstart

### 1. Prerequisites
- Python 3.9+ installed

### 2. Setup Virtual Environment & Install Dependencies
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS / Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python app.py
```

The application will start at:
👉 **`http://localhost:5000`**

Open this URL in your web browser to view and interact with the application.

---

## 🧪 Running Automated Tests

Run the test suite using `pytest`:

```bash
pytest -v
```

All 12 unit tests verify:
- Homepage rendering (200 OK)
- Dataset integrity (exactly 100 quotes, valid schema)
- Random quote generation (overall & filtered)
- Author search and substring matching
- Category filtering (case-insensitive)
- Free-text search across quotes and authors
- Proper 404 responses for non-matching queries
- Category and author aggregation endpoints

---

## 📡 REST API Reference

| Endpoint | Method | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/quotes` | `GET` | `author`, `category`, `q` | Returns array of quotes matching filters. |
| `/api/quotes/random` | `GET` | `author`, `category`, `q` | Returns a single random quote matching filters. |
| `/api/categories` | `GET` | None | Returns distinct categories with quote counts. |
| `/api/authors` | `GET` | None | Returns distinct authors in alphabetical order. |

### Example API Requests

#### Get a random quote
```bash
curl http://localhost:5000/api/quotes/random
```
```json
{
  "id": 1,
  "quote": "The only way to do great work is to love what you do.",
  "author": "Steve Jobs",
  "category": "Inspiration"
}
```

#### Get quotes by category
```bash
curl http://localhost:5000/api/quotes?category=Philosophy
```

#### Search by author
```bash
curl http://localhost:5000/api/quotes?author=Einstein
```

#### Free-text search
```bash
curl http://localhost:5000/api/quotes?q=imagination
```
