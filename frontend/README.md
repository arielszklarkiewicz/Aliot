Donaciones Frontend - Quickstart

Prerequisites
- Node.js 18+ and npm 9+ installed
- The backend API running locally (ASP.NET Core)

Backend API
- Start the API project first:
  - From the repository root: open the solution in Rider/VS or run:
    - cd api/Donaciones.Api
    - dotnet run
  - By default it listens on http://localhost:5047 (see api/Donaciones.Api/Properties/launchSettings.json)

Configure environment (optional)
- The frontend defaults to http://localhost:5047 for the API.
- If your API runs at a different URL/port, create a .env file in this folder (next to package.json):
  - cp .env.example .env
  - Edit REACT_APP_API_BASE_URL to match your API URL
- Optional: set REACT_APP_GOOGLE_CLIENT_ID if you want to enable Google login button on /login.

Install & run
- cd frontend
- npm install
- npm start
- Open http://localhost:3000 in your browser

Routes
- / -> Home
- /login -> Email/Password login and optional Google login
- /donations -> Simple UI to create and list donations
- /payments -> Simple UI to create and list payments

Troubleshooting
- CORS or 404 calling the API:
  - Ensure the API is running and the port matches REACT_APP_API_BASE_URL (default 5047)
  - Check your console/network tab for the full request URL
- Google login button not visible:
  - Set REACT_APP_GOOGLE_CLIENT_ID in .env and restart npm start
- Port 3000 already in use:
  - Set PORT=3001 in a .env file or free the port and restart
