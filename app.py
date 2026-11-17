import json
import os
import random
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Load quotes dataset once on startup
DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "quotes.json")


def load_quotes():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


QUOTES = load_quotes()


def filter_quotes(author=None, category=None, search_term=None):
    """Filter quotes based on author, category, and free-text search."""
    results = QUOTES

    if category:
        category_clean = category.strip().lower()
        results = [
            q for q in results
            if q.get("category", "").strip().lower() == category_clean
        ]

    if author:
        author_clean = author.strip().lower()
        results = [
            q for q in results
            if author_clean in q.get("author", "").strip().lower()
        ]

    if search_term:
        term_clean = search_term.strip().lower()
        results = [
            q for q in results
            if term_clean in q.get("quote", "").lower()
            or term_clean in q.get("author", "").lower()
        ]

    return results


@app.route("/")
def index():
    """Serve the main single-page application."""
    return render_template("index.html")


@app.route("/api/quotes", methods=["GET"])
def get_quotes():
    """Return all quotes matching optional query filters."""
    author = request.args.get("author")
    category = request.args.get("category")
    search_term = request.args.get("q")

    matched = filter_quotes(author=author, category=category, search_term=search_term)
    return jsonify({
        "total": len(matched),
        "quotes": matched
    })


@app.route("/api/quotes/random", methods=["GET"])
def get_random_quote():
    """Return a single random quote, optionally filtered by category or author."""
    author = request.args.get("author")
    category = request.args.get("category")
    search_term = request.args.get("q")

    pool = filter_quotes(author=author, category=category, search_term=search_term)
    if not pool:
        return jsonify({
            "error": "No quotes found matching the specified criteria."
        }), 404

    return jsonify(random.choice(pool))


@app.route("/api/categories", methods=["GET"])
def get_categories():
    """Return list of distinct categories and their quote counts."""
    category_counts = {}
    for q in QUOTES:
        cat = q.get("category", "General")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    categories = [
        {"name": cat, "count": count}
        for cat, count in sorted(category_counts.items(), key=lambda x: x[0].lower())
    ]
    return jsonify({
        "total": len(categories),
        "categories": categories
    })


@app.route("/api/authors", methods=["GET"])
def get_authors():
    """Return an alphabetical list of distinct authors and their quote counts."""
    author_counts = {}
    for q in QUOTES:
        author = q.get("author", "Unknown")
        author_counts[author] = author_counts.get(author, 0) + 1

    authors = [
        {"name": author, "count": count}
        for author, count in sorted(author_counts.items(), key=lambda x: x[0].lower())
    ]
    return jsonify({
        "total": len(authors),
        "authors": authors
    })


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Endpoint not found"}), 404
    return render_template("index.html"), 404


if __name__ == "__main__":
    # Standard development server port
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
