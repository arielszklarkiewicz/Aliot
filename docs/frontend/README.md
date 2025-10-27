Frontend Architecture (React + TypeScript)

Tech stack
- React 18 + TypeScript
- React Router v6
- React Query (TanStack) for server state
- Formik + Yup for forms & validation
- MUI (Material UI) for component library
- Axios for HTTP, with auth interceptor

Routing
- /login
- /donations
  - list with filters (donor, currency, minian, concept, destination, date range)
  - actions: create, edit, delete
- /donations/new
- /donations/:id/edit
- /payments
  - list with filters (donor, currency, collector, date range)
  - actions: create, edit, delete
- /payments/new
- /payments/:id/edit
- /donors (optional): list/edit donors

Layout
- AppShell: top bar (user menu, logout), side nav (routes)
- ProtectedRoute: redirects to /login if not authenticated

State
- AuthContext: token, user, roles; persisted in localStorage
- React Query caches: donors, donations, payments, lookups, autocomplete
- Form state via Formik per form component

API client
- axios instance with baseURL (env), Authorization header, error interceptor mapping to UI toasts

Main components
- LoginPage: email/password; calls POST /api/auth/login
- DonationsPage: table with server-side pagination + filters
- DonationForm:
  - donor: autocomplete select (search donors by name)
  - currency: select (pesos, dollars)
  - date: date picker (default today)
  - perasha: autocomplete free text (GET /api/autocomplete/perashot?q=)
  - minian: select (Ashkenazi, Sefaradi, Netz)
  - concept: select (Cohen, Levi, 3rd, 4th, 5th, 6th, Mosif, Mashlim)
  - destination: select (Yeshiva, Ashkenazi Minian, Other + conditionally show destinationOther)
  - comment: multiline text
- PaymentsPage: table with server-side pagination + filters
- PaymentForm:
  - donor: autocomplete select
  - currency: select
  - date: date picker
  - concept: text field (required)
  - collector: autocomplete free text (GET /api/autocomplete/collectors?q=)
  - comment: multiline
- DonorSelect: shared component with debounced search against /api/donors?q=
- AutoCompleteText: wraps MUI Autocomplete with async loading and debounce
- FiltersBar: reusable filters with controlled inputs and apply/reset

Validation (Yup)
- DonationForm: donorId required; currency required; donationDate required; minian required; concept required; destination required; destinationOther required when destination === 'Other'; perasha optional length<=200; comment length<=1000
- PaymentForm: donorId required; currency required; paymentDate required; concept required (<=200); collector optional (<=200)

Accessibility & i18n
- Use MUI components with aria labels
- Keep text strings centralized for future i18n

Error handling
- Show inline validation; toast on API errors; 401 triggers logout and redirect

Performance
- Debounce autocomplete (300ms)
- Use keepPreviousData for tables; page size defaults to 20

Testing
- Unit tests for form validation schemas
- Component tests for critical forms with React Testing Library
