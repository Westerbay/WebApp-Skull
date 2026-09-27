# Design

Use the shared Tailwind tokens and primitives in `packages/ui`. Keep labels and
errors associated with unique field IDs. Show async loading states and preserve
keyboard navigation, the skip link and usability on narrow screens. Product
screens must not expose infrastructure vocabulary.

## Authentication

Compromised-password submission errors ask the user to choose another password.
Reset rejection and server failure messages also request a new reset link.

Use a readable single column, explicit labels and controls at least 44px high.
Validation errors stay by the field; submission errors stay in the form. Email
acceptance does not promise delivery. A root Sonner announces signout and reset
success; do not show the same error both inline and in a toast. Disable actions
while submitting without losing entered values.

Forms remain disabled until hydration and declare `method="post"`, preventing
early native submissions from exposing passwords in URLs. The header observes
the Better Auth session store independently from query cache invalidation.
Passwords have a keyboard-accessible visibility button. Help shows the minimum;
maximum length appears as an error. Signup/reset use an advisory native `meter`
inside `figure` with a `figcaption`; visual segments are decorative.

## Localization

Every visible string belongs to the active Paraglide catalogs, including mapped
provider errors. Use locale-aware plurals. English code identifiers and internal
route paths remain stable in every project profile. Localize public URL paths,
HTML language, metadata and email action links consistently. In a multilingual
project, links preserve the current locale and URL is the SSR source of truth.
Auth routes remain noindex and no-referrer. Do not include tokens in metadata.

## User table

Use a native HTML table with headings and caption. Only its named scrollable
`section` overflows horizontally on mobile; it is keyboard-accessible. Previous
and Next announce the current page and disable unavailable or pending actions.
Errors keep loaded rows and offer Retry. Loading and empty states are explicit.
The labelled search field stays responsive while its request waits 300 ms.
A localized status announces the waiting state; pagination/retry are disabled
until the applied filter catches up. Search remains editable during requests.

The feature separates orchestration, columns, rendering, navigation and feedback.
Handlers and render callbacks are named before JSX/options. Nested functions use
`const fn = () => {}`. Form values use `z.input` from their validation schemas.
Props use explicit interfaces or native library types instead of `ComponentProps`,
`Pick`, `Partial`, `Omit`, `ReturnType`. Use `if` for complex choices and ternaries
only for simple values. Toaster CSS variables belong in the shared stylesheet.

Use native elements with the correct meaning; purely visual wrappers can remain
`div`. Shared UI patterns belong in `packages/ui`; feature-specific components
stay with their feature. Do not split a component merely by tag or line count.
