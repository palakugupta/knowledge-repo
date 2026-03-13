# Code Structure & Standards Review
## Knowledge Repo (FastAPI + React)

**Review Date:** March 13, 2026  
**Developer:** Palak  
**Purpose:** Internal code quality assessment and compliance review.

---

## 1. Backend (Python/FastAPI) Structure

### 1.1 Project Architecture
**Pattern Used:** Layered Architecture (simplified)
*   **API Layer:** [backend/main.py](backend/main.py) (Monolithic FastAPI app)
*   **Models Layer:** [backend/models.py](backend/models.py) (SQLAlchemy models)
*   **Service Layer:** [backend/ingest.py](backend/ingest.py) (LLM and file processing logic)
*   **Database Layer:** [backend/database.py](backend/database.py) (Connection management)

**Structure Quality:** ⚠️ Moderate. 
The backend has a clear separation of core concerns (models vs. logic), but the [main.py](backend/main.py) file is becoming too large (300+ lines). It should be split into multiple modules using FastAPI `APIRouter`.

### 1.2 Python Coding Standards
**PEP 8 Compliance Review:**
*   **✅ Import Organization:** Follows group-based imports (FastAPI, SQLAlchemy, then local).
*   **✅ Type Hints:** Excellent use of Pydantic models and type annotations in route handlers.
*   **⚠️ Naming Conventions:** Mostly adheres to `snake_case`, but background task management uses a global dictionary `graph_build_status` which is not thread-safe.

**Issues Found:**
1.  **Missing Configuration Files:** No `pyproject.toml`, `.flake8`, or `requirements.txt` found.
2.  **Hardcoded Database URL:** `sqlite:///./knowledge.db` is hardcoded in [database.py](database.py). 
3.  **Basic Error Handling:** Still using broad `except Exception` blocks in background tasks ([main.py](main.py#L320)).
4.  **No Testing:** No `tests/` directory found in the backend.

---

## 2. Frontend (React/JavaScript) Structure

### 2.1 Project Architecture
**Framework:** React 19.0.0 with Vite

**Structure:**
```
frontend/
├── src/
│   ├── api/           # Centralized fetch calls
│   ├── components/    # UI Components (monolithic styling)
│   ├── App.jsx        # Component-based "routing"
│   └── main.jsx       # Entry point
```

### 2.2 React Standards
*   **Modern React:** ✅ Uses React 19, functional components, and hooks (`useState`, `useEffect`, `useRef`).
*   **File Naming:** ✅ Components use `PascalCase.jsx`.
*   **Prop Types:** ❌ Missing PropTypes or TypeScript.

**Issues Found:**
1.  **Inline Styling:** Extensive use of CSS-in-JS objects within component files (e.g., [RepoList.jsx](RepoList.jsx)). This makes components large and harder to read.
2.  **Manual Routing:** Uses state-driven routing in [App.jsx](App.jsx) (`if (screen === ...)`). Should use `react-router-dom`.
3.  **Magic Strings:** API base URL is hardcoded in [api/repos.js](api/repos.js) as `http://localhost:8000`.
4.  **No Error Boundaries:** Component crashes are not handled gracefully.

---

## 3. Score Card Comparison

| Metric | Score | This Project | Analysis |
|--------|-------|--------------|----------|
| **Architecture** | 7/10 | 7.5/10 | Good use of FastAPI models/schemas, but route modularization needed. |
| **Linting/Config** | 4/10 | 2/10 | Almost zero configuration files present. |
| **Error Handling** | 6/10 | 5/10 | Uses FastAPI exceptions correctly, but broad `try/except` in logic. |
| **Testing** | 6/10 | 0/10 | **CRITICAL:** Total lack of automated tests. |
| **Documentation** | 6/10 | 3/10 | No docstrings in core ingestion logic. |
| **Type Safety** | 3/10 | 8/10 | Superior use of Pydantic and type hints in Backend. |
| **Total** | **/60** | **25.5 / 60** | **42.5%** |

---

## 4. Compliance Checklist

### Required Configuration Files
*   **Backend:**
    *   [ ] `pyproject.toml`
    *   [ ] `.env.example`
    *   [ ] `requirements.txt`
*   **Frontend:**
    *   [ ] `.prettierrc`
    *   [ ] `jsconfig.json`

### Standards Compliance Matrix
| Standard | Backend | Frontend | Priority |
|----------|---------|----------|----------|
| Pinned Dependencies | ❌ | ✅ | Medium |
| Linting Configured | ❌ | ⚠️ (ESLint default) | High |
| Tests Present | ❌ | ❌ | High |
| Env Management | ❌ | ❌ | High |
| Proper Routing | N/A | ❌ | Medium |

---

## 5. Recommendations for Improvement

### Immediate (High Priority):
1.  **Dependency Tracking:** Create a `requirements.txt` for the backend.
2.  **Environment Variables:** Move `GROQ_API_KEY` and `DATABASE_URL` to a `.env` file.
3.  **Add API Routing:** Break [main.py](backend/main.py) into smaller routers (`repos.py`, `accounts.py`).

### Short-term (Medium Priority):
1.  **Implement Testing:** Add `pytest` for backend and `Vitest` for frontend.
2.  **Standardize Styling:** Extract inline styles into CSS Modules or Tailwind.
3.  **Type Safety:** Add PropTypes to React components or migrate to TypeScript.

### Long-term (Low Priority):
1.  **Database Migrations:** Set up Alembic.
2.  **Production Readiness:** Configure a WSGI/ASGI server (Gunicorn/Uvicorn) with configuration files.

---

**Overall Assessment:**
A functional and promising prototype with strong Backend type-safety, but it **lacks the professional engineering infrastructure** (testing, linting, env management) needed for a production-grade application.
