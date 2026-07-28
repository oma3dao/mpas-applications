# Changelog — firebase

Record manual review decisions and regenerations here.

## 0.1.0

- Captured and governed all 19 tools from Firebase CLI 15.24.0.
- Classified project/app creation, Android SHA registration, workspace
  initialization, environment changes, authentication changes, and deployment
  as high impact.
- Classified deployment-status inspection and other read-only operations as
  medium impact.
- Added adapter-side Firebase token substitution; no credential value is
  included in the package.
