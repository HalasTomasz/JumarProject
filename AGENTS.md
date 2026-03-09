# Repository Guidelines

## Project Structure & Module Organization
This repository is a Django + React project.

- `jumar/`: Django project config (`settings.py`, `urls.py`, middleware).
- `events/`: Main backend app (models, views, serializers, forms, migrations, templates, API routes).
- `frontend/`: React client (pages, components, hooks, API client).
- `assets/`: Static source assets collected into `staticfiles/`.
- `scripts/`: Utility scripts (for example Excel validation and order data generation).
- `manage.py`: Main entry point for backend management commands.

## Build, Test, and Development Commands
- Backend setup: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Run backend: `python manage.py runserver`
- Apply DB migrations: `python manage.py migrate`
- Create migrations: `python manage.py makemigrations`
- Backend tests: `python manage.py test`
- Frontend setup: `cd frontend && npm install`
- Run frontend dev server: `npm start` (from `frontend/`, default `http://localhost:3000`)
- Frontend tests: `npm test -- --watchAll=false`
- Frontend production build: `npm run build`

## Coding Style & Naming Conventions
- Python: follow PEP 8, 4-space indentation, `snake_case` for functions/variables/modules.
- Django models: preserve existing field naming conventions when touching legacy schema (for example `NrZp`, `Data`).
- React: component/page files use `PascalCase` (for example `OrdersPage.js`), hooks use `useX` naming (for example `useAuth.js`).
- Keep backend logic in app modules (`events/views`, `events/forms`, `events/serializers`) rather than large monolithic files.

## Testing Guidelines
- Backend: use Django `TestCase`; add tests near app code (`events/tests.py` or `events/tests/` package).
- Frontend: Jest + React Testing Library (`*.test.js` in `frontend/src`).
- Add/update tests for every behavior change; focus on API contracts, form validation, and route-level UI behavior.

## Commit & Pull Request Guidelines
- Existing history uses short, one-line commit subjects (`New`, `Upgrade`, `Project End`). Keep subject lines concise, imperative, and specific (avoid placeholders like `abc`).
- PRs should include:
  - What changed and why.
  - Any migration/env impacts.
  - Test evidence (`python manage.py test`, `npm test`) and screenshots for UI changes.

## Security & Configuration Tips
- Store secrets in `.env`; required keys include `DJANGO_SECRET_KEY`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_PORT`.
- Do not commit credentials, local DB dumps, or generated log artifacts.
