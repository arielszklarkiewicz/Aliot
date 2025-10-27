Render.com Deployment Guide

Overview
This app deploys as:
- PostgreSQL (Managed by Render)
- Web Service: .NET 8 API
- Static Site: React build output

Prerequisites
- Render account
- GitHub repo connected to Render
- Environment variables set in Render

Services (render.yaml)
- A managed PostgreSQL instance
- A web service for the API
  - Build: dotnet restore/build/publish
  - Start: dotnet Donaciones.Api.dll (or Dockerfile)
  - Health check path: /healthz
- A static site for the React app
  - Build: npm ci && npm run build
  - Publish directory: build

Environment variables (API)
- ASPNETCORE_ENVIRONMENT=Production
- ConnectionStrings__Default=postgres://<user>:<pass>@<host>:5432/<db>?sslmode=Require
- JWT__Issuer=https://donaciones.example
- JWT__Audience=https://donaciones.example
- JWT__SigningKey=use-a-strong-secret
- Cors__AllowedOrigins=https://donaciones-frontend.onrender.com

Environment variables (Frontend)
- REACT_APP_API_BASE_URL=https://donaciones-api.onrender.com

Database initialization
- Use docs/db/schema.sql to initialize (or use EF Core migrations in the implementation phase)
- Ensure pg_trgm extension is enabled

Steps
1) Push repository to GitHub
2) In Render, create new Blueprint from render.yaml (recommended) or add services manually
3) Create a PostgreSQL instance; note the connection string
4) Set API service environment variables (connection string, JWT, CORS)
5) Deploy API service; run migrations/init script
6) Create Static Site service pointing to frontend directory; configure build and publish directory
7) Verify health checks and open the public URLs

Notes
- For private repos, grant Render access
- Configure custom domains and HTTPS if needed
- Set backup schedule for PostgreSQL
