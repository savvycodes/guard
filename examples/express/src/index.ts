/**
 * Express example demonstrating @savvycodes/guard-express with type-safe permissions
 * 
 * This example shows:
 * - Type-safe permission checking with definePermissions
 * - check/can/cannot middleware methods
 * - Different permission logic (AND, OR)
 * - Custom configuration
 * - Error handling
 * - OAuth 2.0 scope format
 * - .unless() conditional middleware (skip auth for specific routes/methods/conditions)
 */

import express from 'express';
import { createGuard, definePermissions } from '@savvycodes/guard-core';
import { createGuard as createExpressGuard, PermissionDeniedError } from '@savvycodes/guard-express';

const app = express();

// Middleware
app.use(express.json());

// Define permissions for different roles with full type safety
const adminPerms = definePermissions([
    'admin',
    'user:read',
    'user:write',
    'posts:read',
    'posts:write',
    'posts:create',
    'posts:delete'
]);

const editorPerms = definePermissions([
    'posts:write',
    'posts:create',
    'posts:read',
    'user:read'
]);

const userPerms = definePermissions([
    'user:read',
    'posts:read'
]);

// Create guard from core
const guard = createGuard(adminPerms, editorPerms, userPerms);

// Create Express middleware with full type safety
const { check, can, cannot } = createExpressGuard(guard);

// Create OAuth guard with custom scope property
const oauthGuard = createExpressGuard(guard, {
    permissionsProperty: 'scope'
});

// Middleware to simulate JWT authentication
// In real apps, use express-jwt or similar
app.use((req, _res, next) => {
    // Simulate different users based on header
    const userType = req.headers['x-user-type'] as string;

    switch (userType) {
        case 'admin':
            (req as any).user = {
                id: 1,
                username: 'admin',
                permissions: ['admin', 'user:read', 'user:write', 'posts:read', 'posts:write', 'posts:create']
            };
            break;
        case 'editor':
            (req as any).user = {
                id: 2,
                username: 'editor',
                permissions: ['posts:write', 'posts:create', 'posts:read', 'user:read']
            };
            break;
        case 'user':
            (req as any).user = {
                id: 3,
                username: 'user',
                permissions: ['user:read', 'posts:read']
            };
            break;
        case 'oauth':
            // OAuth 2.0 scope format (space-delimited)
            (req as any).user = {
                id: 4,
                username: 'oauth-user',
                scope: 'user:read posts:read posts:write'
            };
            break;
        default:
            (req as any).user = {
                id: 5,
                username: 'guest',
                permissions: []
            };
    }

    next();
});

// ============================================================================
// Routes
// ============================================================================

// Public endpoint (no auth required)
app.get('/', (_req, res) => {
    res.json({
        message: 'Welcome to the Guard Express API',
        endpoints: {
            'GET /': 'Public endpoint',
            'GET /status': 'Requires admin permission',
            'GET /posts': 'Requires posts:read permission',
            'POST /posts': 'Requires posts:write AND posts:create',
            'POST /users': 'Requires user:read AND user:write',
            'GET /admin': 'Requires admin OR (user:write AND posts:write)',
            'DELETE /posts/:id': 'Requires admin OR (posts:write AND posts:delete)',
            'GET /oauth-posts': 'OAuth scope format example',
            'GET /profile': 'Using can() middleware',
            'GET /upgrade': 'Using cannot() middleware (inverse logic)',
            'GET /api/public': 'Public API - skipped via .unless()',
            'GET /api/health': 'Health check - skipped via .unless()',
            'GET /api/data': 'Protected API - requires user:read',
        }
    });
});

// Single permission required - type-safe with autocomplete!
app.get('/status', check('admin'), (_req, res) => {
    res.json({
        status: 'ok',
        message: 'You have admin access'
    });
});

// Simple permission check
app.get('/posts', check('posts:read'), (req, res) => {
    const user = (req as any).user;

    const posts = [
        { id: 1, title: 'First Post', content: 'Lorem ipsum...' },
        { id: 2, title: 'Second Post', content: 'Dolor sit amet...' }
    ];

    // Check if user can write posts using the guard directly
    const userPerms = user?.permissions || [];
    const canWrite = guard.can(userPerms, 'posts:write');
    const canDelete = guard.can(userPerms, 'posts:delete');

    res.json({
        posts,
        capabilities: {
            canWrite,
            canDelete,
            canRead: true
        },
        user: {
            username: user.username,
            permissions: userPerms
        }
    });
});

// Multiple permissions required (AND logic)
app.post('/posts', check(['posts:write', 'posts:create']), (req, res) => {
    const user = (req as any).user;
    res.json({
        message: 'Post created successfully',
        note: 'Requires posts:write AND posts:create',
        post: {
            id: 3,
            title: req.body.title || 'New Post',
            author: user.username,
            content: req.body.content || '...'
        }
    });
});

// Multiple permissions required (AND logic)
app.post('/users', check(['user:read', 'user:write']), (_req, res) => {
    res.json({
        message: 'User created',
        note: 'Requires user:read AND user:write'
    });
});

// Multiple permission options (OR logic)
app.get('/admin', check([
    ['admin'],
    ['user:write', 'posts:write']
]), (_req, res) => {
    res.json({
        message: 'Admin dashboard',
        note: 'Requires admin OR (user:write AND posts:write)'
    });
});

// Complex permission logic
app.delete('/posts/:id', check([
    ['admin'],
    ['posts:write', 'posts:delete']
]), (req, res) => {
    res.json({
        message: `Post ${req.params.id} deleted`,
        note: 'Requires admin OR (posts:write AND posts:delete)'
    });
});

// OAuth 2.0 scope format
app.get('/oauth-posts', oauthGuard.check('posts:read'), (_req, res) => {
    res.json({
        posts: [
            { id: 1, title: 'OAuth Post 1' },
            { id: 2, title: 'OAuth Post 2' }
        ],
        message: 'Using OAuth 2.0 scope format (space-delimited)'
    });
});

// Using can middleware (alias for check)
app.get('/profile', can('user:read'), (req, res) => {
    const user = (req as any).user;
    res.json({
        message: 'User profile',
        user: {
            id: user.id,
            username: user.username,
            permissions: user.permissions || []
        }
    });
});

// Using cannot middleware (inverse logic)
app.get('/upgrade', cannot('admin'), (_req, res) => {
    res.json({
        message: 'Upgrade to premium!',
        note: 'This route is only accessible to users without admin permission'
    });
});

// ============================================================================
// Using .unless() for Conditional Middleware
// ============================================================================

// Apply permission check to all /api/* routes except /api/public and /api/health
app.use('/api', check('user:read').unless({
    path: ['/api/public', '/api/health']
}));

// API endpoints - these benefit from the unless middleware
app.get('/api/public', (_req, res) => {
    res.json({
        message: 'Public API endpoint - no auth required',
        note: 'This route skips permission checks via .unless({ path })'
    });
});

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'healthy',
        note: 'Health check endpoint - skipped via .unless({ path })'
    });
});

app.get('/api/data', (_req, res) => {
    res.json({
        message: 'Protected API data',
        note: 'This requires user:read permission (not skipped by unless)',
        data: [1, 2, 3, 4, 5]
    });
});

// ============================================================================
// Error Handling
// ============================================================================

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof PermissionDeniedError || err.code === 'permission_denied') {
        res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have sufficient permissions to access this resource',
            code: err.code
        });
    } else {
        console.error('Error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message || 'An unexpected error occurred'
        });
    }
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
