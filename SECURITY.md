# Security policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. If that option is unavailable, contact the maintainer privately through their GitHub profile. Do not include a live access token, student data, or workspace identifiers in a public issue.

## Credential exposure

If a Canvas token is exposed, revoke or rotate it in Canvas immediately, replace it in `.env`, and run `ntn workers env push` to update the deployed Worker. Rewriting Git history does not make an exposed credential safe to reuse.

## Supported versions

Security fixes are applied to the latest version on the default branch.
