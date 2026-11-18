# @savvycodes/guard-react

## 0.0.2

### Patch Changes

- 3ef25f2: - guard-core: drop the `lodash` dependency. The ESM build imported `lodash/every` without a file extension, which Node's ESM resolver rejects (`ERR_MODULE_NOT_FOUND`). Malformed (non-array) permission groups now deny access instead of throwing.
  - guard-core: document and test composing roles by spreading another role, e.g. `defineRole([...user, "user:write"])`.
  - guard-react: support React 19 (`react: ^18.0.0 || ^19.0.0`).
- Updated dependencies [3ef25f2]
  - @savvycodes/guard-core@0.0.2
