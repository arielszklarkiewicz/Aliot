# Donaciones & Pagos — Donation and Payment Management System

A web application to manage Donations and Payments built with:
- **Backend**: .NET 9 (C#) with Entity Framework Core
- **Frontend**: React
- **Database**: PostgreSQL with automatic migrations
- **Hosting**: Render.com (API + Static Site + Managed PostgreSQL)

## Quick Start

### Prerequisites
- .NET 9 SDK
- Node.js 18+ (for frontend)
- PostgreSQL (optional for local development)

### Running Locally

**Option 1: With InMemory Database (No Setup)**
```bash
# Backend
cd api/Donaciones.Api
dotnet run

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

**Option 2: With PostgreSQL**
```bash
# Set connection string
export ConnectionStrings__Default="Host=localhost;Database=donaciones;Username=postgres;Password=postgres"

# Backend
cd api/Donaciones.Api
dotnet run  # Migrations apply automatically

# Frontend
cd frontend
npm install
npm start
```

Visit: http://localhost:3000

## Documentation

- **[Database Setup Guide](docs/DATABASE_SETUP.md)** - PostgreSQL configuration, migrations, connection strings
- **[Frontend Render Setup](frontend/RENDER_SETUP.md)** - React production environment configuration
- **[API Environment Variables](api/.env.example)** - Backend configuration template
- **[Original Design Docs](docs/)** - Database schema, API spec, deployment guides

## Architecture Overview

### Database
- **PostgreSQL** with Entity Framework Core
- **Automatic migrations** on application startup
- **Fallback to InMemory** database for development
- Tables: donors, donations, payments, concepts, destinations, collectors

### Backend (.NET 9)
- ASP.NET Core Minimal APIs
- Entity Framework Core for data access
- JWT-based authentication (dummy for now)
- Google OAuth support
- CORS configuration via environment variables

### Frontend (React)
- React 18 with functional components
- Axios for API calls
- React Router for navigation
- Environment-based API URL configuration

## Key Features

- **Donor Management**: Track regular and occasional donors
- **Donations**: Record donations with currency, concept, destination, minian
- **Payments**: Track payments with collector information
- **Autocomplete**: Smart autocomplete for perashot and collectors
- **Admin Tools**: Manage concepts, destinations, and collectors
- **Reports**: Donor balance reports by currency
- **Google Sign-In**: Optional OAuth authentication

## Deployment

### Render.com Setup

1. **Create PostgreSQL Database**
   - Follow instructions in [DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

2. **Deploy Backend API**
   - Set environment variable: `ConnectionStrings__Default` (PostgreSQL URL)
   - Set environment variable: `Cors__AllowedOrigins` (frontend URL)
   - Build command: `dotnet publish -c Release -o out`
   - Start command: `cd out && ./Donaciones.Api`

3. **Deploy Frontend**
   - Follow instructions in [frontend/RENDER_SETUP.md](frontend/RENDER_SETUP.md)
   - Set environment variable: `REACT_APP_API_BASE_URL` (backend API URL)
   - Build command: `npm run build`
   - Publish directory: `build`

## Environment Variables

### Backend (API)
```bash
ConnectionStrings__Default=postgresql://user:pass@host:5432/db  # Required for production
Cors__AllowedOrigins=https://your-frontend.onrender.com        # Required
Google__ClientId=your-google-client-id.apps.googleusercontent.com  # Optional
```

### Frontend
```bash
REACT_APP_API_BASE_URL=https://your-api.onrender.com  # Required for production
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id      # Optional
```

## Development

### Database Migrations

Create new migration:
```bash
cd api/Donaciones.Api
dotnet ef migrations add YourMigrationName
```

View migration SQL:
```bash
dotnet ef migrations script
```

### Testing

Backend:
```bash
cd api/Donaciones.Api
dotnet test
```

Frontend:
```bash
cd frontend
npm test
```

## Project Structure

```
Donaciones/
├── api/
│   └── Donaciones.Api/
│       ├── Data/              # DbContext, migrations
│       ├── Models/            # Entity models
│       ├── Services/          # Business logic
│       └── Program.cs         # API endpoints
├── frontend/
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # React components
│   │   └── pages/            # Page components
│   └── public/
├── docs/                     # Documentation
└── README.md
```

## License

Private project - All rights reserved
