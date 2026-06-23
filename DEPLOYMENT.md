# Deployment

## Vercel Hobby

Ten branch jest przygotowany pod jeden projekt Vercel:

- Django + DRF działa jako Python Function
- React builduje się w `frontend/build`
- Django serwuje SPA shell oraz `/api/` z tego samego hosta
- baza docelowa to PostgreSQL przez `DATABASE_URL`
- migracje uruchamiamy ręcznie z lokalnej maszyny

### 1. Wymagane zmienne środowiskowe w Vercel

Minimum dla preview/test:

```bash
DJANGO_SECRET_KEY=...
DEBUG=False
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
ALLOWED_HOSTS=jumar-produkcja-test.vercel.app
CORS_ALLOWED_ORIGINS=https://jumar-produkcja-test.vercel.app
CSRF_TRUSTED_ORIGINS=https://jumar-produkcja-test.vercel.app
TIME_ZONE=Europe/Warsaw
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
DEPLOY_CONSOLE_LOG_LEVEL=WARNING
```

Uwagi:

- `VERCEL_URL` i `VERCEL` są dostarczane automatycznie przez Vercel.
- `REACT_APP_API_BASE_URL` nie musi być ustawione. Produkcyjny fallback to `/api/`.
- Stare zmienne `MYSQL_*` są opcjonalnym fallbackiem lokalnym i nie są wymagane na Vercel.

### 2. Baza danych na Vercel

Najbezpieczniejszy wariant dla tego repo:

- Vercel Marketplace -> Neon PostgreSQL
- do aplikacji trafia jeden `DATABASE_URL`
- nie robimy migracji danych z obecnego MySQL, tylko świeżą bazę testową

To jest sensowniejsze niż trzymanie MySQL obok Vercel, bo:

- Vercel nie daje zarządzanego MySQL jako natywnego domyślnego storage
- `DATABASE_URL` upraszcza konfigurację Django i preview deployments
- Postgres z Neon jest standardowym wariantem wspieranym w ekosystemie Vercel

### 3. Build na Vercel

Repo zawiera:

- `api/index.py` jako entrypoint Python Function
- `vercel.json` z limitem `maxDuration: 300` dla Hobby
- build command, który:
  - instaluje frontend dependencies
  - buduje React
  - uruchamia `collectstatic`

### 4. Migracje

Migracje wykonujemy ręcznie po ustawieniu `DATABASE_URL`:

```bash
python manage.py migrate --settings=jumar.settings_deployment
```

Jeśli tworzysz superusera:

```bash
python manage.py createsuperuser --settings=jumar.settings_deployment
```

### 5. Lokalna walidacja przed deployem

Backend:

```bash
.venv/bin/python manage.py check --deploy --settings=jumar.settings_deployment
.venv/bin/python manage.py test
```

Frontend:

```bash
cd frontend
npm test -- --watchAll=false
npm run build
```

### 6. Linkowanie i deploy

Przykładowy flow przez CLI:

```bash
vercel link
vercel pull --yes --environment=preview
vercel deploy
```

Po walidacji preview można przejść na produkcyjny deploy:

```bash
vercel --prod
```

### 7. Ograniczenia tego wariantu

- Vercel Hobby ma limit 300 sekund na function execution.
- System plików w runtime jest efemeryczny, więc logi plikowe i trwałe uploady nie powinny tam trafiać.
- Jeśli w przyszłości pojawią się ciężkie joby lub większe uploady, trzeba to wydzielić poza standardowy request cycle.

## AWS / klasyczny serwer

Stary wariant z Gunicorn + własnym hostem nadal jest możliwy, ale nie jest już domyślnym targetem tego branchu.

Minimalny flow:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd frontend
npm ci
npm run build
cd ..

python manage.py migrate --settings=jumar.settings_deployment
python manage.py collectstatic --noinput --settings=jumar.settings_deployment
gunicorn jumar.wsgi:application
```

## Notes

- Django/WhiteNoise może serwować zbudowany frontend, jeśli `frontend/build` istnieje.
- `frontend/src/api/client.js` używa `/api/` w production, więc frontend i backend mogą działać pod jednym hostem.
- `.env` i `frontend/.env` muszą pozostać poza gitem.
