# Deployment

## Backend

1. Create the backend environment file from `.env.example` and fill in real values.
2. Install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Run deployment checks:

```bash
python manage.py check --deploy --settings=jumar.settings_deployment
```

4. Apply migrations and collect static files:

```bash
python manage.py migrate --settings=jumar.settings_deployment
python manage.py collectstatic --noinput --settings=jumar.settings_deployment
```

5. Start the backend with Gunicorn:

```bash
gunicorn -c gunicorn.conf.py jumar.wsgi:application
```

`jumar.wsgi` now defaults to `jumar.settings_deployment`, so missing `DJANGO_SETTINGS_MODULE` no longer falls back to the permissive base settings.

## Frontend

1. Create the frontend environment file from `frontend/.env.example`.
2. Install dependencies and build:

```bash
cd frontend
npm ci
npm run build
```

`REACT_APP_USE_MOCK_API` now defaults to `false`. Mock mode is only enabled when you explicitly set it to `true`.

Once `frontend/build` exists, Django serves the SPA shell and WhiteNoise serves the built frontend assets together with Django static files.

## AWS

Recommended baseline:

- EC2 for the app process
- RDS MySQL for the database
- ALB or Nginx as the reverse proxy
- ACM for TLS
- Route 53 for DNS

Minimum AWS-specific environment values:

- `DEBUG=False`
- `ALLOWED_HOSTS=your-domain.com,www.your-domain.com`
- `CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com`
- `CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com`
- `MYSQL_HOST=<your-rds-endpoint>`
- `MYSQL_PORT=3306`

EC2 flow:

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
gunicorn -c gunicorn.conf.py jumar.wsgi:application
```

## Notes

- The default setup can serve the built SPA from Django/WhiteNoise once `frontend/build` is present.
- If you prefer, you can still serve `frontend/build` from your reverse proxy or a separate static host.
- Serve Django static files from `staticfiles/` after `collectstatic`.
- Keep `.env` and `frontend/.env` out of git.
