# Shubh Lakshmi Properties

A responsive React and Express application with MongoDB persistence through Mongoose. Property searches, filters, authentication, and contact submissions use the REST API and MongoDB; the client does not substitute mock APIs or browser storage for server data.

The public pages are Home, Properties, Login/Sign up, and Contact. The admin panel manages approved listings and their optional gallery/specifications. No fictional properties are created at startup.

## Requirements and setup

- Node.js **22.13 or later**
- npm
- MongoDB Atlas or a reachable MongoDB instance

```powershell
npm install
```

Set `MONGODB_URI` in the single runtime config file, `server/.env`, to your MongoDB Atlas connection string with database path `shub_laxmi_properties`. Do not commit `server/.env` or its credentials.

Start the application:

```powershell
npm run dev
```

Vite runs at `http://localhost:5173` and the API at `http://localhost:3001`. The API connects to MongoDB and ensures the schemas' indexes before accepting requests. If MongoDB is unavailable or the URI is missing/invalid, startup fails instead of silently falling back to another database.

## Configuration

`server/.env` accepts:

| Variable | Default | Description |
| --- | --- | --- |
| `MONGODB_URI` | Required | MongoDB connection string; keep credentials in environment variables |
| `PORT` | `3001` | API and production web-server port |
| `NODE_ENV` | `development` | Use `production` to serve the built client |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed browser origins |
| `SESSION_TTL_DAYS` | `7` | Session lifetime, 1–30 days |
| `COOKIE_SECURE` | `false` | Set `true` when deployed over HTTPS |
| `ADMIN_EMAILS` | `admin@shubhlakshmi.com` | Comma-separated list of admin accounts allowed to access `/admin` |
| `ADMIN_PASSWORD` | `Admin@12345` | Initial admin account password for local development; change it before deployment |
| `SEED_OWNER_EMAIL` | Not set | Existing account that owns explicitly seeded sample listings |

## Commands

```powershell
npm run dev       # Run API and Vite together
npm run test      # Exercise API routes against a temporary MongoDB instance
npm run build     # Build the production React client
npm run db:init   # Connect to MongoDB and create collections/indexes
npm run db:seed   # Explicitly add/update clearly labelled sample listings
npm start         # Start the API; with NODE_ENV=production it serves client/dist
```

`db:seed` requires `SEED_OWNER_EMAIL` to identify an existing account and creates sample listings marked as `source: "sample"` and visibly labelled “Sample data.” The descriptions state they are illustrative, not offers. Seeding is opt-in and idempotent; normal startup creates no sample records. For example:

```powershell
$env:SEED_OWNER_EMAIL = "you@example.com"
npm run db:seed
```

The API tests use `mongodb-memory-server`; its first run downloads a MongoDB server binary, which is cached for later runs.

For a single-process production deployment, build the client first, configure `server/.env` with `NODE_ENV=production`, `COOKIE_SECURE=true`, `MONGODB_URI`, and your public origin, then run `npm start`.

## API

All routes are prefixed with `/api`. JSON errors use `{ "error": "...", "details": [...] }`; validation details identify the invalid field. Authentication cookies are HTTP-only and same-site. The API allows requests only from configured origins when an Origin header is present.

### Public endpoints

| Method and path | Description |
| --- | --- |
| `GET /health` | MongoDB connectivity check |
| `GET /properties` | List/search/filter with pagination |
| `GET /properties/:id` | Read a property |
| `POST /contacts` | Validate and store a contact submission, optionally linked to a property |
| `POST /auth/register` | Create an account and sign in |
| `POST /auth/login` | Sign in |
| `GET /auth/me` | Read the current session's user (`{ "user": null }` when signed out) |
| `POST /auth/logout` | Revoke the current session |

`GET /properties` accepts `type` (`plot`, `house`, `rental`, `commercial`), `status` (`available`, `sold`, `rented`), `minPrice`, `maxPrice`, `location` (case-insensitive substring), `featured` (`true`/`false`), `source` (`real`/`sample`), `page` (default `1`), and `limit` (default `12`, maximum `50`). The response is `{ "data": [...], "pagination": { "page", "limit", "total", "totalPages" } }`.

### Authenticated property management

`POST /properties`, `PATCH /properties/:id`, and `DELETE /properties/:id` require a signed-in account. Each listing is owned by its creator; other users cannot modify or delete it.

Property creation requires `title`, `type`, `status`, `price`, `location`, and `description`; `imageUrl`, `imageUrls`, `featured`, and the optional property specifications (bedrooms, bathrooms, area, parking, floor, address, coordinates, highlights, amenities, facilities, additional details, and verified nearby locations) may also be supplied. `PATCH` accepts any non-empty subset of those fields. Only records in the properties collection are public; pending property requests remain private until an administrator approves them. Creation returns `201` and `{ "data": property }`; updates return `{ "data": property }`; deletion returns `204`.

### Authentication and contact request bodies

```json
{ "name": "Your Name", "email": "you@example.com", "password": "at-least-10-characters" }
```

Use the same email/password fields for login. Passwords are stored as salted scrypt hashes; session tokens are random, stored only as SHA-256 hashes, and revoked on logout.

```json
{ "name": "Your Name", "email": "you@example.com", "phone": "optional", "message": "At least 10 characters", "propertyId": "optional MongoDB property ID" }
```

Contact submissions are stored with an initial `new` status. When `propertyId` is supplied, the API verifies that the public property exists and stores its reference and title with the enquiry. Property detail pages use `/properties/:id`, fetch the published listing from the API, and show gallery photos, specifications and map/contact actions only when corresponding listing data is available. Nearby locations are shown only when their `verified` field is true. No contact phone numbers or real property records are fabricated from the masked/empty screenshots.

## MongoDB collections

Mongoose creates and validates these collections and their indexes:

- `users`: unique lowercase email, name, salted password hash and salt, creation timestamp
- `sessions`: user reference, unique token hash, expiration date, TTL cleanup index, and user lookup index
- `properties`: user-owner reference, constrained type/status/price, location/content, optional gallery and property specifications, real/sample source, timestamps, and indexes for filtering, owners, featured listings, and sample-seed keys
- `contacts`: validated visitor message, optional property reference/title, submission status, timestamps, and indexes for chronological/status lookup

Property filters and pagination run as MongoDB queries, with a matching count query. Mongoose schema validation is enabled for creates and updates. Duplicate keys return `409`, invalid values return `400`, and MongoDB connectivity failures return `503`/fail startup. The database is never seeded with fictional listings unless `db:seed` is explicitly run.

The previous local SQLite files, if present, are left untouched as local artifacts; the API no longer reads or writes SQLite and does not migrate those records automatically. Back up/export any records you need before retiring those files.

## Reference inventory

The supplied ZIP was inspected recursively (all 19 images):

- **Home / desktop:** `web/home/main.jpeg` is the full page; `button.jpg` shows the hero/search/WhatsApp area; the remaining category captures show card hover/focus borders.
- **Properties / desktop:** `web/properteis/Screenshot_...172927...jpeg` is the full page; `button.jpg` and `button_.jpg` show the open status and type dropdowns.
- **Login and Contact / desktop:** each has a full-page capture, including the login card, contact information, message form, and footer.
- **Responsive:** `web/reponsive/` contains mobile Home, Properties, Login, Contact, category-card, hero type-menu, and filter-menu captures.

The shared component inventory is the contact strip, sticky logo/navigation (with touch menu), hero search, WhatsApp invitation, property-type cards, featured-property cards, property filters/listings/pagination, login/sign-up form, contact-information panel, contact form, CTA, and three-column footer. The listing screenshots capture a loading state rather than confirmed properties. Design tokens and responsive layouts follow those references; masked phone numbers stay masked.
# shub_laxhmi_property_123
# shub_laxhmi_property_123
