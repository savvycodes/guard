# Publishing Guide

## Setup

### 1. Configure NPM Token

1. Create an NPM access token at https://www.npmjs.com

   - Click your profile → Access Tokens → Generate New Token
   - Select "Automation" type
   - Copy the token

2. Add to GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Create new secret: `NPM_TOKEN`
   - Paste your token

## Workflow

### Making Changes

1. **Create a feature branch** for your changes
2. **Make your code changes**
3. **Create a changeset** to document the change:
   ```bash
   pnpm changeset
   ```
   - Select which packages changed
   - Choose the semver bump type (major/minor/patch)
   - Write a description of the changes
4. **Commit everything** (code + changeset file)
5. **Push and create a PR**

### Publishing

The publishing process is **fully automated**:

1. **Merge your PR to `main`**

   - GitHub Actions will detect the changeset
   - A "Version Packages" PR will be created automatically
   - This PR updates versions and CHANGELOGs

2. **Review and merge the "Version Packages" PR**
   - GitHub Actions will automatically publish to npm
   - Packages are published with provenance

## Commands

- `pnpm changeset` - Create a new changeset
- `pnpm version` - Apply changesets and update versions (automated in CI)
- `pnpm release` - Build and publish packages (automated in CI)

## Notes

- Always create changesets for user-facing changes
- The root workspace (`@savvycodes/guard`) is not published
- All packages have `publishConfig.access: "public"` for scoped packages
- Repository links are automatically included in package metadata
