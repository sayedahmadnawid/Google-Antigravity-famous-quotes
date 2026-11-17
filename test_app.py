import pytest
from app import app, QUOTES


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_index_page(client):
    """Test that the homepage loads successfully."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"Famous Quotes" in response.data
    assert b"100 curated insights" in response.data


def test_quotes_count_is_exactly_100(client):
    """Test that the dataset contains exactly 100 quotes."""
    assert len(QUOTES) == 100
    response = client.get("/api/quotes")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 100
    assert len(data["quotes"]) == 100


def test_quotes_structure(client):
    """Test that every quote contains valid required fields."""
    response = client.get("/api/quotes")
    data = response.get_json()
    for q in data["quotes"]:
        assert "id" in q and isinstance(q["id"], int)
        assert "quote" in q and len(q["quote"].strip()) > 0
        assert "author" in q and len(q["author"].strip()) > 0
        assert "category" in q and len(q["category"].strip()) > 0


def test_random_quote(client):
    """Test that random quote endpoint returns a valid quote."""
    response = client.get("/api/quotes/random")
    assert response.status_code == 200
    data = response.get_json()
    assert "id" in data
    assert "quote" in data
    assert "author" in data
    assert "category" in data
    assert 1 <= data["id"] <= 100


def test_filter_by_category(client):
    """Test filtering quotes by category."""
    response = client.get("/api/quotes?category=Science")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] > 0
    for q in data["quotes"]:
        assert q["category"].lower() == "science"


def test_filter_by_category_case_insensitive(client):
    """Test that category filtering is case-insensitive."""
    res_upper = client.get("/api/quotes?category=PHILOSOPHY")
    res_lower = client.get("/api/quotes?category=philosophy")
    assert res_upper.get_json()["total"] == res_lower.get_json()["total"]
    assert res_upper.get_json()["total"] > 0


def test_filter_by_author(client):
    """Test searching/filtering quotes by author name."""
    response = client.get("/api/quotes?author=Einstein")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] >= 5
    for q in data["quotes"]:
        assert "einstein" in q["author"].lower()


def test_free_text_search(client):
    """Test searching by keyword in quotes or author."""
    response = client.get("/api/quotes?q=curiosity")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] >= 1
    for q in data["quotes"]:
        assert "curiosity" in q["quote"].lower() or "curiosity" in q["author"].lower()


def test_random_quote_with_filters(client):
    """Test random quote filtered by category."""
    response = client.get("/api/quotes/random?category=Humor")
    assert response.status_code == 200
    data = response.get_json()
    assert data["category"] == "Humor"


def test_random_quote_not_found(client):
    """Test random quote returns 404 when no quotes match."""
    response = client.get("/api/quotes/random?category=NonExistentCategory12345")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data


def test_get_categories(client):
    """Test categories endpoint."""
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 8
    cat_names = [c["name"] for c in data["categories"]]
    assert "Inspiration" in cat_names
    assert "Science" in cat_names
    assert "Philosophy" in cat_names
    # Check sum of category counts equals 100
    total_count = sum(c["count"] for c in data["categories"])
    assert total_count == 100


def test_get_authors(client):
    """Test authors endpoint."""
    response = client.get("/api/authors")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] > 50
    # Check that authors are sorted alphabetically
    author_names = [a["name"] for a in data["authors"]]
    assert author_names == sorted(author_names, key=lambda s: s.lower())


def test_export_quotes_csv(client):
    """Test exporting quotes to CSV."""
    response = client.get("/api/quotes/export")
    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    assert "attachment; filename=famous_quotes.csv" in response.headers.get("Content-Disposition", "")
    lines = response.get_data(as_text=True).strip().splitlines()
    assert lines[0] == "ID,Quote,Author,Category"
    assert len(lines) == 101  # Header + 100 quotes


def test_export_quotes_csv_filtered(client):
    """Test exporting filtered quotes to CSV."""
    response = client.get("/api/quotes/export?category=Science")
    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    lines = response.get_data(as_text=True).strip().splitlines()
    assert lines[0] == "ID,Quote,Author,Category"
    assert len(lines) > 1
    for line in lines[1:]:
        assert line.endswith(",Science")

