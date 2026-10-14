# Design

Use shared Tailwind tokens and primitives in `packages/ui`. Put reusable UX
patterns there and keep feature-specific composites with their feature. Prefer
native elements with the correct meaning. Every control needs an associated
label, a visible focus state and useful loading, empty and error feedback.
Preserve keyboard navigation, the skip link and usability on narrow screens.
Product screens should not expose infrastructure vocabulary.

## Forms and feedback

Keep labels, help and validation errors associated with unique field IDs.
Place field errors beside the field and submission errors within the form;
avoid repeating the same error in a toast. Preserve entered values during
submission and disable duplicate actions. Do not promise email delivery when
only a request was accepted.

Auth forms use a readable single column and controls at least 44px high.
Password visibility must work by keyboard. Strength feedback is advisory and
must not change password acceptance. Keep password tokens out of metadata and
URLs. Auth pages remain noindex and no-referrer.

## Public page metadata

The current dashboard and auth flows use `privateHead` and remain noindex and
no-referrer. When adding a public page intended for discovery or sharing, give it
an explicit public metadata policy instead of reusing `privateHead`. Render its
localized title, description, canonical URL and Open Graph metadata in server
HTML. Include `og:title`, `og:type`, `og:image` and `og:url`, plus description,
site name and locale where applicable. Use absolute URLs for canonical and social
images, and exclude tokens, private data and transient query parameters. Override
the root's private indexing policy explicitly for indexable public pages.

## Localization

Every visible string, including mapped provider errors and status messages,
belongs to the active catalog. Use locale-aware plurals. Localize public paths,
HTML language, metadata and email action links together. Preserve the current
locale in links; the public URL is the SSR source of truth.

## Data views

Use a semantic table with headings and a caption. On narrow screens, make the
table's named region scrollable and keyboard-accessible. Announce pagination
state, disable unavailable or pending actions, and keep loaded rows visible
when retrying an error. Search stays editable while a request is pending; show
when its typed filter has not yet been applied.
