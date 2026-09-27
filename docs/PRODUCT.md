# Product

## Capabilities

Create an account with a name, email and password; verify the address through
an email link; sign in and view the account dashboard; sign out; request another
verification link or reset a password.

The dashboard shows a sample user table with names, emails and verification
status in pages of 20. Next loads another page; Previous returns to cached data.
Search matches part of a name or email without case sensitivity. A 300 ms pause
in typing applies the filter and returns to page one; clearing it restores the
unfiltered list. Search is limited to 100 characters; SQL wildcards are literal.
Passwords can be shown or hidden. Signup and reset show an advisory strength
meter that does not change acceptance rules.

## Rules

New passwords are checked against Have I Been Pwned in staging/production.
Compromised passwords are refused; existing signin passwords are not checked.
After a reset check rejects a password or fails, request a new reset link.

- Verification is required before signin and access to private routes.
- Signup and verification do not automatically sign in.
- Passwords contain 8–128 characters and are not transformed.
- Verification links expire after 24 hours; reset links after one hour.
- A successful reset revokes sessions and requires signin again.
- Sessions last seven days and can renew after one day.
- Email requests do not disclose whether an account exists. Acceptance does
  not guarantee delivery; users can request another link.
- Better Auth allows five sensitive requests per minute per network address
  and endpoint, with a general limit of 100.
- Nest allows 120 requests per minute per peer and endpoint; `/api/me` allows 30. Health probes remain available.
- Any signed-in user with a verified address can read the sample user list,
  including emails. There is no administrator role.
- English is the source default. French projects have French screens, emails,
  documentation and public paths while retaining English code identifiers.
- Multilingual projects select locale from the public URL. Auth action links
  preserve that locale; the API endpoints remain untranslated.

## Limits

No additional business domain, roles, OAuth, MFA, file storage, durable jobs or
mandatory external email provider is defined.

## Optional shared quotas

Valkey can share the existing Nest quotas across API instances. Without it,
quotas remain process-local. A failed shared quota check returns 503. Better
Auth limits remain in PostgreSQL; health probes remain exempt.
