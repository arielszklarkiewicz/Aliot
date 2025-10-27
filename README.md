# Donaciones & Pagos — Solution Outline

This repository currently contains the complete solution outline for a future web application to manage Donations and Payments with the following stack:
- Backend: .NET (C#)
- Frontend: React
- Hosting: Render.com (API + Static Site + Managed PostgreSQL)

The app handles two main entities: Donations and Payments.

This document includes:
1) Database schema with tables, fields, relationships, indexes, constraints.
2) Backend architecture: API endpoints, authentication, services, DTOs, validation.
3) Frontend architecture: React components, forms, autocomplete, state mgmt, routing.
4) Deployment setup for Render.com (including database hosting).
5) Best-practices suggestions (validation, security, roles, audit logs).

See also:
- docs/db/schema.sql (DDL)
- docs/api/openapi.yaml (OpenAPI 3.0)
- docs/frontend/README.md (component tree, state, UX)
- docs/deployment/README.md (Render.com setup) and docs/deployment/render.yaml (IaC)

---

1. Database Schema (Overview)

Engine: PostgreSQL (Managed on Render.com)

Core tables
- donors: All people/entities that donate or make payments.
- donations: A donation record with donor, currency, perasha, minian, concept, destination, date, comment.
- payments: A payment record with donor, currency, collector, concept, date, comment.
- lookups: minian types, donation concepts, destinations, currencies — implemented via enums and constrained text values.
- autocomplete_terms: free-text terms used for autocomplete (perasha, collector), tracked with usage counts.
- audit_logs: audit trail of create/update/delete actions.
- users, roles, user_roles: application authentication/authorization (JWT-backed)

Entity highlights
- Currency: pesos, dollars (enum constraint)
- Minian: Ashkenazi, Sefaradi, Netz (enum constraint)
- Donation Concept: Cohen, Levi, 3rd, 4th, 5th, 6th, Mosif, Mashlim (enum constraint)
- Destination: Yeshiva, Ashkenazi Minian, {others} (enum with an “Other” + other_text column)
- Perasha and Collector: free text with autocomplete suggestions learned from prior entries

Indexes
- donors(name), donations(donor_id, donation_date), payments(donor_id, payment_date)
- GIN trigram indexes for perasha, collector for fast autocomplete

See full DDL in docs/db/schema.sql.

---

2. Backend Architecture (.NET)

Tech
- .NET 8 Web API
- ASP.NET Core Minimal APIs or Controllers (Controllers recommended for clarity)
- EF Core 8 for data access (Npgsql provider)
- FluentValidation for DTO validation
- JWT Bearer Auth (ASP.NET Core Authentication)
- Serilog for logging
- Swashbuckle for Swagger UI

Layers
- Domain: Entities + Enums
- Infrastructure: EF Core DbContext, Migrations, Repositories
- Application: Services (business logic), DTOs, Validation
- API: Controllers, Mapping (AutoMapper), Auth

Key Endpoints (see docs/api/openapi.yaml)
- Auth: POST /api/auth/login, GET /api/auth/me
- Donors: CRUD, search by name (autocomplete)
- Donations: CRUD, list by filters (date range, donor, currency, minian, concept, destination), export CSV
- Payments: CRUD, list by filters (date range, donor, currency, collector), export CSV
- Autocomplete: GET /api/autocomplete/perashot?q=, GET /api/autocomplete/collectors?q=
- Lookups: GET for static lists (minian, concepts, destinations, currencies)

Validation
- Required fields enforced via FluentValidation and data annotations
- Enum values validated against allowed sets
- Free-text lengths limited and normalized (trim, collapse whitespace)
- Dates required; default timezone behavior documented

Authentication & Authorization
- JWT Bearer with HS256
- Roles: Admin, Staff, ReadOnly
- Policies for Create/Edit/Delete operations

Error Handling
- Problem Details (RFC 7807) standardized errors
- Global exception middleware

Audit
- Save audit log entries on create/update/delete with user_id, table, record_id, diff snapshot

---

3. Frontend Architecture (React)

Tech
- React 18 + TypeScript
- React Router for routing
- React Query (TanStack Query) for data fetching/cache
- Formik + Yup for forms & validation
- MUI (Material UI) for UI components

Routes
- /login
- /donations (list, filters)
- /donations/new, /donations/:id/edit
- /payments (list, filters)
- /payments/new, /payments/:id/edit
- /donors (list, edit) (optional initially)
- /reports/exports (optional)

Key Components
- DonationForm: donor selector, currency select, date picker, perasha autocomplete, minian select, concept select, destination select (+ other text), comment
- PaymentForm: donor selector, currency select, date picker, concept text, collector autocomplete, comment
- Autocomplete components backed by API endpoints with debounced queries and caching

State Management
- Server state via React Query (queries + mutations)
- Local form state via Formik
- Auth state via React Context + localStorage for token

See docs/frontend/README.md for more details.

---

4. Deployment on Render.com

Services
- PostgreSQL (Managed Render PostgreSQL)
- Web Service (API): .NET 8 Docker or Build Command
- Static Site (Frontend): React build output served as static site

Config
- Environment variables: Connection string, JWT settings, CorsAllowedOrigins
- Health checks: /healthz
- render.yaml included under docs/deployment for Infrastructure-as-Code

CI/CD
- On push to main, Render auto-deploys services

---

5. Best Practices
- Input validation on both client and server
- Enum constraints in DB to prevent invalid data
- Principle of least privilege with roles
- Audit logs for all data mutations
- Rate limiting on autocomplete endpoints
- Secure headers and CORS configuration
- Backup & retention for PostgreSQL
- Observability: structured logging, correlation IDs

---

Next Steps (implementation not yet committed)
- Initialize .NET Web API project and EF Core models/migrations per schema
- Initialize React app with the component structure and add auth + forms
- Hook up Render.com services using docs/deployment/render.yaml
