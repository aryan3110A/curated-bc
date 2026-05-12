# CuratedCounter API

The `api` package is the backend service for CuratedCounter. It exposes authentication, public content, admin CRUD, media uploads, taxonomy data, AI helper endpoints, and visit-tracking logic for the frontend application.

## Backend responsibilities

This package is responsible for all server-side concerns:

- validating HTTP requests with Zod
- enforcing authentication and role-based access control
- reading and writing PostgreSQL data through Prisma
- issuing and rotating JWT-based access and refresh tokens
- persisting refresh tokens for revocation and session rotation
- generating unique slugs and normalized blog content
- calculating reading time for blogs
- tracking both total views and unique visitors for blog pages
- handling media uploads to Firebase Storage when configured
- returning fallback placeholder media references when Firebase is unavailable
- generating AI-assisted editorial content and SEO content when OpenAI is configured
- returning stable fallback content when optional services are unavailable

## Runtime architecture

### High-level request flow

1. `src/server.ts` starts the HTTP listener.
2. `src/app.ts` constructs the Express app and installs security, logging, parsers, `/health`, feature routes, and terminal middleware.
3. `src/routes/index.ts` mounts feature routers under `/api`.
4. Each feature module is split into route/controller/service/schema layers, and blogs also use a repository layer.
5. Prisma persists or reads application data using the schema defined in `prisma/schema.prisma`.

### Layering pattern

- `*.routes.ts`: declares endpoint paths and middleware order
- `*.controller.ts`: translates Express requests and responses
- `*.service.ts`: contains business rules and orchestration
- `*.schema.ts`: contains Zod validation definitions
- `blog.repository.ts`: isolates Prisma query shapes for the blog domain

### Security model

- `helmet` sets hardened response headers.
- `cors` only allows the configured frontend origin.
- `express-rate-limit` throttles requests.
- JWT access and refresh tokens use different secrets and TTLs.
- Refresh tokens are stored in PostgreSQL for revocation and rotation.
- Auth middleware reads the access token from either the `Authorization` header or the auth cookie.
- Production cookies use `Secure` plus `SameSite=None` so deployed cross-site frontend-to-API auth works.

### Logging model

- The app uses `pino` and `pino-http`.
- Development logging uses `pino-pretty` for readable terminal output.
- Request logs serialize only compact request and response fields rather than giant header dumps.
- Production still keeps structured logs suitable for cloud hosts.

## Current persistence model

The API uses PostgreSQL through Prisma with the following main models:

- `User`: authenticated admin/editor accounts
- `RefreshToken`: stored refresh-token sessions
- `Blog`: core editorial content and metadata
- `BlogVisit`: per-blog visitor records used to derive unique visitor counts
- `Product`: affiliate-style product recommendations attached to a blog
- `Category`: primary content grouping
- `Tag`: many-to-many topical labels

### Important blog fields

- `slug`: unique public blog identifier used by the frontend route `/blog/[slug]`
- `content`: the HTML body stored in PostgreSQL
- `readingTime`: estimated from content length
- `views`: total page visits counted by the visit endpoint
- `uniqueViews`: unique visitors derived from `BlogVisit`
- `pinterestUrl`: still exists in the schema for compatibility with older data, but the current admin publish flow no longer asks the editor to provide it

## Package root reference

| Path                                                         | Purpose                                                                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `.env`                                                       | Local backend runtime configuration and secrets. Not for source control.                                         |
| `.env.example`                                               | Safe template for required backend environment variables.                                                        |
| `.gitignore`                                                 | Backend-local ignore rules for env files, build output, local secrets, and caches.                               |
| `package.json`                                               | Backend scripts, runtime dependencies, and build-time dependencies required for cloud deploys.                   |
| `tsconfig.json`                                              | Main backend TypeScript configuration. It is self-contained so Render can build `api` as its own root directory. |
| `tsconfig.build.json`                                        | Build-only TypeScript config that emits compiled JavaScript into `dist/`.                                        |
| `README.md`                                                  | This backend reference document.                                                                                 |
| `prisma/`                                                    | Prisma schema and seed scripts.                                                                                  |
| `src/`                                                       | Backend source code.                                                                                             |
| `dist/`                                                      | Compiled backend output. The runtime entrypoint is `dist/src/server.js`.                                         |
| `node_modules/`                                              | Installed dependencies. Generated locally or by the deploy platform.                                             |
| `aiblogwriter-57c0f-firebase-adminsdk-fbsvc-64b789e922.json` | Local Firebase service-account key file. Secret material, not for version control.                               |
| `urated-2714b-firebase-adminsdk-fbsvc-03161401b8.json`       | Older local Firebase key file. Secret material and not part of the active architecture.                          |

## Prisma folder reference

| Path                   | Purpose                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` | Prisma schema defining datasource, enums, models, relations, and indexes.                                  |
| `prisma/seed.ts`       | Seed script that creates the initial admin user, starter taxonomies, sample content, and starter products. |

## Source tree reference

### `src/`

| Path            | Purpose                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server.ts` | Backend process entrypoint. Imports the app, reads the port, and starts listening.                                                                                |
| `src/app.ts`    | Express composition root. Installs CORS, helmet, rate limiting, request logging, JSON/body parsing, `/health`, `/api`, 404 handling, and terminal error handling. |

### `src/config/`

| Path                     | Purpose                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/config/db.ts`       | Creates and exports the Prisma client instance used across services.                                         |
| `src/config/env.ts`      | Loads `.env` values through `dotenv`, validates them with Zod, and exposes typed runtime config.             |
| `src/config/firebase.ts` | Initializes Firebase Admin and returns the configured storage bucket or `null` when Firebase is unavailable. |
| `src/config/logger.ts`   | Configures the shared Pino logger. Uses pretty logging in development and structured logging in production.  |

### `src/middleware/`

| Path                                     | Purpose                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/middleware/auth.middleware.ts`      | Reads the access token from header or cookie, validates it, and attaches the current user to `req.user`. |
| `src/middleware/error.middleware.ts`     | Converts application, Zod, and Prisma errors into consistent JSON API responses.                         |
| `src/middleware/not-found.middleware.ts` | Returns a standard JSON 404 for unknown routes.                                                          |
| `src/middleware/role.middleware.ts`      | Restricts routes to allowed roles such as `ADMIN` and `EDITOR`.                                          |
| `src/middleware/validate.middleware.ts`  | Runs request pieces through Zod schemas before controllers execute.                                      |

### `src/routes/`

| Path                  | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `src/routes/index.ts` | Aggregates and mounts all feature routers under `/api`. |

### `src/types/`

| Path                     | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `src/types/express.d.ts` | Extends Express request types with the authenticated user shape. |

### `src/utils/`

| Path                         | Purpose                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `src/utils/app-error.ts`     | Custom error type carrying message and HTTP status code.                 |
| `src/utils/async-handler.ts` | Wrapper for forwarding async controller errors into Express middleware.  |
| `src/utils/content.ts`       | HTML sanitization and reading-time helper functions for blog content.    |
| `src/utils/duration.ts`      | Converts values like `15m` and `7d` into milliseconds.                   |
| `src/utils/jwt.ts`           | Signs and verifies access and refresh tokens and enforces payload shape. |
| `src/utils/pagination.ts`    | Shared helpers for pagination metadata.                                  |
| `src/utils/password.ts`      | Password hashing and comparison built on bcrypt.                         |
| `src/utils/slug.ts`          | Slug normalization helper used by blogs and taxonomies.                  |

### `src/modules/ai/`

| Path                              | Purpose                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/modules/ai/ai.controller.ts` | Handles AI request/response shaping.                                                       |
| `src/modules/ai/ai.routes.ts`     | Registers AI endpoints under the module router.                                            |
| `src/modules/ai/ai.schema.ts`     | Defines Zod validation for AI requests.                                                    |
| `src/modules/ai/ai.service.ts`    | Calls OpenAI or returns deterministic fallback text for blog, SEO, and caption generation. |

### `src/modules/auth/`

| Path                                  | Purpose                                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/modules/auth/auth.constants.ts`  | Declares auth cookie names.                                                                                      |
| `src/modules/auth/auth.controller.ts` | Sets and clears auth cookies and serves login, refresh, logout, and profile endpoints.                           |
| `src/modules/auth/auth.routes.ts`     | Declares auth routes and validation middleware.                                                                  |
| `src/modules/auth/auth.schema.ts`     | Defines auth request validation rules.                                                                           |
| `src/modules/auth/auth.service.ts`    | Verifies credentials, issues token pairs, rotates refresh tokens, revokes sessions, and loads current user data. |

### `src/modules/blogs/`

| Path                                   | Purpose                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/blogs/blog.controller.ts` | Exposes public list/detail responses plus protected admin blog operations.                                                                          |
| `src/modules/blogs/blog.repository.ts` | Centralizes Prisma blog queries, admin summary queries, related-blog lookups, slug searches, and visit tracking writes.                             |
| `src/modules/blogs/blog.routes.ts`     | Declares public blog endpoints, admin CRUD routes, and the blog visit tracking endpoint.                                                            |
| `src/modules/blogs/blog.schema.ts`     | Validates blog payloads, list query params, slug params, and visit tracking input.                                                                  |
| `src/modules/blogs/blog.service.ts`    | Orchestrates slug generation, content sanitization, reading-time estimation, relation updates, list/detail logic, and visit tracking orchestration. |

### `src/modules/categories/`

| Path                                            | Purpose                                                |
| ----------------------------------------------- | ------------------------------------------------------ |
| `src/modules/categories/category.controller.ts` | Handles category HTTP responses.                       |
| `src/modules/categories/category.routes.ts`     | Declares category routes.                              |
| `src/modules/categories/category.schema.ts`     | Validates category input shapes.                       |
| `src/modules/categories/category.service.ts`    | Applies category business logic and persistence rules. |

### `src/modules/products/`

| Path                                         | Purpose                                 |
| -------------------------------------------- | --------------------------------------- |
| `src/modules/products/product.controller.ts` | Handles product-related HTTP responses. |
| `src/modules/products/product.routes.ts`     | Declares product routes.                |
| `src/modules/products/product.schema.ts`     | Validates product payloads.             |
| `src/modules/products/product.service.ts`    | Encapsulates product business logic.    |

### `src/modules/tags/`

| Path                                 | Purpose                                           |
| ------------------------------------ | ------------------------------------------------- |
| `src/modules/tags/tag.controller.ts` | Handles tag HTTP responses.                       |
| `src/modules/tags/tag.routes.ts`     | Declares tag routes.                              |
| `src/modules/tags/tag.schema.ts`     | Validates tag payloads.                           |
| `src/modules/tags/tag.service.ts`    | Applies tag business logic and persistence rules. |

### `src/modules/uploads/`

| Path                                       | Purpose                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `src/modules/uploads/upload.controller.ts` | Validates uploaded files and returns storage metadata.                                 |
| `src/modules/uploads/upload.routes.ts`     | Registers upload routes and multipart middleware.                                      |
| `src/modules/uploads/upload.service.ts`    | Writes images to Firebase Storage when available or returns placeholder URLs when not. |

## Detailed request lifecycles

### Authentication lifecycle

1. `POST /api/auth/login` accepts credentials.
2. Validation runs through `auth.schema.ts`.
3. `auth.service.ts` loads the user, verifies the bcrypt password, issues tokens, and stores the refresh token row in PostgreSQL.
4. `auth.controller.ts` sets the `cc_access_token` and `cc_refresh_token` cookies.
5. `GET /api/auth/me` uses `auth.middleware.ts` to read the access token and resolve the current user.
6. `POST /api/auth/refresh` uses the refresh-token cookie to rotate the stored token and set a fresh pair of cookies.

### Blog create and update lifecycle

1. The admin form submits a structured blog payload.
2. `blog.schema.ts` validates all fields, including nested products.
3. `blog.service.ts` sanitizes the HTML body, estimates reading time, computes a unique slug, and resolves category/tag relations.
4. `blog.repository.ts` writes the result through Prisma.
5. The saved entity is returned to the frontend, which uses the final slug to build the public blog URL.

### Blog read lifecycle

1. Public list and detail endpoints are mounted in `blog.routes.ts`.
2. List endpoints filter by page, page size, search, category, and sort mode.
3. Detail endpoints load the blog by slug and return related blogs.
4. Detail reads no longer increment views directly during the server-side fetch; visit counting is handled by the explicit visit endpoint.

### Visit tracking lifecycle

1. The frontend detail page sends `POST /api/blogs/:slug/visit` with a generated browser-side visitor id.
2. `blog.service.ts` loads the blog and delegates to `blog.repository.ts`.
3. The repository inserts a new `BlogVisit` row when this visitor has not been seen for that blog before.
4. `views` always increments.
5. `uniqueViews` increments only when the visitor is new for that blog.

### Upload lifecycle

1. The frontend sends multipart data with the desired target folder.
2. Multer parses the file.
3. `upload.service.ts` uploads the buffer to Firebase Storage when a bucket is configured.
4. The backend returns a public Google Storage URL.
5. If Firebase is missing, the backend returns a `placeholder://...` URL instead of failing the authoring flow.

### AI lifecycle

1. The frontend calls an AI helper endpoint.
2. Validation occurs through `ai.schema.ts`.
3. `ai.service.ts` either calls OpenAI or returns deterministic fallback content.
4. The frontend inserts the returned content into the blog form or SEO fields.

## Environment variable reference

Loaded and validated by `src/config/env.ts`:

- `NODE_ENV`: runtime environment
- `PORT`: backend port
- `CLIENT_URL`: exact allowed frontend origin for CORS and deployed cookie flow
- `DATABASE_URL`: Prisma database connection string
- `DIRECT_URL`: optional direct connection string for Prisma operations
- `JWT_ACCESS_SECRET`: secret for access tokens
- `JWT_REFRESH_SECRET`: secret for refresh tokens
- `ACCESS_TOKEN_TTL`: access token lifetime
- `REFRESH_TOKEN_TTL`: refresh token lifetime
- `COOKIE_DOMAIN`: optional cookie domain for deployments that need it
- `OPENAI_API_KEY`: enables live OpenAI generation
- `OPENAI_MODEL`: selected OpenAI model name
- `FIREBASE_PROJECT_ID`: Firebase project id
- `FIREBASE_CLIENT_EMAIL`: Firebase service-account email
- `FIREBASE_PRIVATE_KEY`: Firebase service-account private key
- `FIREBASE_STORAGE_BUCKET`: Firebase Storage bucket name
- `LOG_LEVEL`: Pino log level
- `ADMIN_EMAIL`: seed admin email
- `ADMIN_PASSWORD`: seed admin password

## Build, runtime, and deployment commands

| Command                   | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `npm run dev`             | Starts the backend in watch mode with `tsx`.         |
| `npm run typecheck`       | Runs TypeScript without emitting files.              |
| `npm run build`           | Compiles TypeScript into `dist/`.                    |
| `npm start`               | Runs the compiled backend from `dist/src/server.js`. |
| `npm run prisma:generate` | Regenerates the Prisma client.                       |
| `npm run prisma:push`     | Pushes the schema to the connected database.         |
| `npm run prisma:migrate`  | Runs Prisma migrations where supported.              |
| `npm run seed`            | Executes the seed script.                            |
| `npm run db:setup`        | Pushes the schema and runs the seed script.          |

## Deployment notes

### Render

- Root Directory: `api`
- Build Command: `npm install; npm run build`
- Start Command: `npm start`
- The package and tsconfig are self-contained so Render can build `api` without accessing parent workspace files.

### Cross-site auth in production

- Production cookies use `Secure` and `SameSite=None`.
- `CLIENT_URL` must exactly match the deployed frontend origin.
- Leave `COOKIE_DOMAIN` blank unless you explicitly need a custom shared cookie domain.

## Latest implemented backend changes

- Self-contained `tsconfig.json` for single-service cloud builds.
- Backend start script fixed to point to `dist/src/server.js`.
- Build-time type packages are available to cloud builds.
- Compact readable request logging in development.
- Unique visitor tracking via `BlogVisit` and `uniqueViews`.
- Cross-site deployed cookie fix for Render and Vercel auth.
- Firebase project wiring updated to the active bucket configuration.
  | `npm run seed` | Seeds the database. |
  | `npm run db:setup` | Pushes the schema and then seeds the database. |

## Relationship to the rest of the monorepo

- The backend is consumed by `web` through `NEXT_PUBLIC_API_URL`.
- It is the only package that talks directly to PostgreSQL, Firebase Admin, and OpenAI.
- It serves both public content pages and authenticated admin workflows.
