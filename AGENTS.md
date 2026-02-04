# Agent Guidelines for Fund NAV Estimation Project

This document provides guidelines for AI agents working on this full-stack fund tracking application.

---

## Commands

### Frontend (TypeScript + React)
```bash
cd frontend
npm run dev              # Start dev server on port 5173
npm run build            # Build for production
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

### Backend (Python + FastAPI)
```bash
cd backend
pixi run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing Commands (Recommended Setup)

**Backend Tests (pytest):**
```bash
cd backend
pixi run pytest tests/test_funds.py -v                # Run single file
pixi run pytest tests/test_funds.py::test_get_fund    # Run single test
pixi run pytest -v                                    # Verbose output
```

**Frontend Tests (vitest):**
```bash
cd frontend
npm test -- funds.test.ts                      # Run specific file
npm test -- -t "addFund"                       # Run by name
npm test -- --run                               # CI mode
```

### Linting & Formatting

**Python (ruff + black):**
```bash
cd backend
ruff check . && black .                         # Lint and format
ruff check --fix .                               # Auto-fix linting
```

**TypeScript (ESLint):**
```bash
cd frontend
npm run lint && npm run lint -- --fix           # Run and auto-fix
```

---

## Code Style Guidelines

### Python
- Imports: stdlib → third-party → local (blank lines between groups)
- Types: Use 3.11 syntax `str | None`, `list[dict[str, Any]]`
- Async: SQLAlchemy 2.0 patterns with `select()`, `AsyncSessionLocal()`
- Pydantic: v2 syntax - `model_dump()`, `model_validate()`
- FastAPI: Dependency injection `Depends(get_db)`, `HTTPException`, `Query()`
- DB: Use indexes, `back_populates`, `cascade`, `datetime.utcnow`
- Naming: `PascalCase` classes, `snake_case` functions, `UPPER_SNAKE_CASE` constants

```python
# Example async pattern
async with AsyncSessionLocal() as db:
    query = select(FundModel).where(FundModel.code == code)
    result = await db.execute(query)
    fund = result.scalar_one_or_none()
    db.add(fund)
    await db.commit()
```

### TypeScript/React
- Imports: `import type { Fund }`, group React → third-party → local
- Components: Functional with hooks, typed interfaces, destructured props
- Zustand: `create<T>()` with typed state interface, async actions
- Types: Centralized in `src/types/index.ts`, use `interface` for objects
- APIs: Centralized client, typed functions per resource
- Naming: `PascalCase` components/types, `camelCase` functions/variables

```typescript
// Example Zustand store
interface FundState {
  funds: Fund[];
  fetchFunds: () => Promise<void>;
}
export const useFundStore = create<FundState>((set) => ({...}));
```

---

## Project Structure

**Backend:** `app/main.py` (entry), `config.py` (settings), `api/` (endpoints/websocket), `core/` (business logic), `models/` (SQLAlchemy), `schemas/` (Pydantic), `db/` (session), `tasks/` (APScheduler)

**Frontend:** `src/api/` (clients), `components/` (React), `pages/`, `store/` (Zustand), `types/index.ts`, `main.tsx`

---

## Testing Guidelines

**Backend (pytest):** Tests in `backend/tests/test_*.py`, use `async def test_...()`, `unittest.mock` for APIs, fixtures for DB

**Frontend (vitest):** Tests in `*.test.ts` or `src/tests/`, use `describe`/`test`, `vi.fn()` for mocks

---

## Important Notes

- SQLite dev DB: `backend/fund.db`, frontend proxies to `http://localhost:8000`
- WebSocket: `/ws/realtime/{fund_code}` for real-time NAV
- Background: APScheduler (30 min NAV sync, 60 sec alert checks)
- External: Tiantian Fund API, efinance library
- UI: Chinese locale `zhCN`, trading hours 9:30-15:00 Beijing time
