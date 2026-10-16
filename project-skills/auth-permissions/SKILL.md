# Auth And Permissions

## Canonical roles

The application uses four authenticated roles: `admin`, `building_owner`, `building_manager`, and `store_owner`. Guest access is public and is not a login role.

## Frontend rules

- Keep the session in `src/auth/store.ts` with the token under `auth:token`.
- Call `/api/auth/me` on startup when a token exists. Axios adds the bearer token and clears the session on `401`.
- Protect route groups with `ProtectedRoute`; do not use a free role switch or `demoRole` localStorage value.
- Use the authenticated user id for owner/store-owner requests. Never hardcode an owner id in a page.
- Show only navigation items allowed for the current role. A `403` page handles a direct link to another role's route.

## Mock API rules

- Every protected handler must authenticate first and return `{ code, message }` on `401`, `403`, `404`, `409`, or plan-limit errors.
- Tenant resources must be filtered by `tenantId` from the authenticated user, never by a client-supplied tenant id alone.
- Guest reads only active buildings, active tenants, and published floors. Writes require an authenticated role and an active tenant subscription.
- `admin` can manage `/api/admin/*` but cannot read tenant map data through ordinary building/floor endpoints.
- `building_owner` can manage its tenant, staff, buildings, and subscription.
- `building_manager` can manage map resources and stores in its tenant, but not staff or subscription.
- `store_owner` can read and update only stores whose `ownerUserId` equals the authenticated user id. It cannot create, delete, move, or reassign stores.

## Mock credentials

Demo accounts use password `Demo@123`. Passwords exist only in mock seed data and are never returned by an API response.
