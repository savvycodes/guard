# Express Example

This example demonstrates how to use `@savvycodes/guard-express` for type-safe permission checking in an Express application.

## Features

- ✅ Type-safe permission checking with full autocomplete
- ✅ JWT-style permission middleware
- ✅ Multiple permission logic (AND, OR)
- ✅ Custom configuration for OAuth 2.0 scopes
- ✅ Proper error handling

## Setup

Install dependencies:

```bash
pnpm install
```

## Running

Development mode (with hot reload):

```bash
pnpm dev
```

Build and run:

```bash
pnpm build
pnpm start
```

## Testing the API

The server runs on `http://localhost:3000` by default.

### Test with different user types:

**Admin user** (has all permissions):

```bash
curl -H "x-user-type: admin" http://localhost:3000/status
curl -H "x-user-type: admin" http://localhost:3000/admin
curl -H "x-user-type: admin" http://localhost:3000/posts
```

**Editor user** (can write posts):

```bash
curl -H "x-user-type: editor" http://localhost:3000/posts
curl -X POST -H "x-user-type: editor" http://localhost:3000/posts
```

**Regular user** (read-only):

```bash
curl -H "x-user-type: user" http://localhost:3000/posts
curl -X POST -H "x-user-type: user" http://localhost:3000/posts  # Should fail with 403
```

**OAuth user** (space-delimited scopes):

```bash
curl -H "x-user-type: oauth" http://localhost:3000/oauth-posts
```

**Guest user** (no permissions):

```bash
curl http://localhost:3000/status  # Should fail with 403
```

## API Endpoints

- `GET /` - Public endpoint (no auth required)
- `GET /status` - Requires `admin` permission
- `GET /posts` - Requires `posts:read` permission
- `POST /posts` - Requires both `posts:write` AND `posts:create` permissions
- `POST /users` - Requires both `user:read` AND `user:write` permissions
- `GET /admin` - Requires `admin` OR (`user:write` AND `posts:write`)
- `DELETE /posts/:id` - Requires `admin` OR (`posts:write` AND `posts:delete`)
- `GET /oauth-posts` - OAuth scope format example
