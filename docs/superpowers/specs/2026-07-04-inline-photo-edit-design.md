# Inline photo edit on image detail page

## Problem

Admin can edit caption/tags/location/status/delete only from `/admin`. When
browsing `/image/[slug]` as admin, there's no way to edit that photo without
leaving the page and hunting for it in the admin photo list.

## Goal

Let an authenticated admin edit (or delete) the photo they're currently
viewing on `/image/[slug]`, without leaving the page.

## Design

### Auth detection

`PhotoDetail` (`src/components/PhotoDetail.tsx`) fetches
`GET /api/admin/status` on mount (same call the admin page already makes).
If `authed`, render an edit affordance; if not, render nothing extra (no
change for anonymous visitors).

### Entry point

A small pencil icon appears next to:
- Desktop/landscape sidebar: next to the "Frame 001/030" counter line
  (`src/components/PhotoDetail.tsx:647-651`).
- Mobile bottom sheet: next to the drag handle
  (`src/components/PhotoDetail.tsx:956-958`).

Both icons toggle the same `editing` boolean state — there is one photo, one
edit session, just two responsive containers showing it.

### Edit mode

Clicking the pencil swaps the metadata display block (caption/where/camera/
tags section, `PhotoDetail.tsx:653-760` desktop and `:966-1054` mobile) for
the existing `EditForm` component (`src/components/admin/EditForm.tsx`),
unmodified — it already takes `{ photo, onSaved, onDeleted }` and needs no
extraction or rework. Only one `EditForm` instance renders at a time,
positioned in whichever container (aside or sheet) is currently visible for
the viewport — controlled by the same responsive CSS classes already used
elsewhere in the file (`landscape:hidden lg:hidden` / `hidden landscape:flex
lg:flex`).

A close ("cancel") affordance exits edit mode without saving (sets
`editing` back to `false`).

### Save

`EditForm`'s existing `onSaved` callback: call `router.refresh()` (Next.js
App Router — re-runs the server component's `getDetail()` fetch, so
`photo` prop and all derived display values such as `locationLine`,
`flag`, `cameraSpecs` update from real DB state) then `setEditing(false)`.

No optimistic client-side state duplication — every display value in
`PhotoDetail` is already derived fresh from the `photo` prop each render, so
refreshing the server data is sufficient and avoids re-deriving those values
by hand.

### Delete

`EditForm`'s existing `onDeleted` callback: `router.push("/")` — back to the
gallery grid, since the photo (and this page) no longer exists.

### No backend changes

`PATCH /api/admin/photos/[id]` and `DELETE /api/admin/photos/[id]`
(`src/app/api/admin/photos/[id]/route.ts`) already support every field
`EditForm` edits (caption, tags, location, `published` 0/1/2) and already
check `isAuthed()` server-side, so a logged-out user hitting the API
directly still gets rejected regardless of client UI state.

### Status semantics (confirmed, unchanged)

- `published = 0` (Draft): hidden from gallery/search, reachable only via
  direct URL.
- `published = 1` (Public): shown in gallery grid + search.
- `published = 2` (Tag-only): reachable only via tag page or direct link,
  not in the main gallery grid.

This matches existing behavior in `serialize.ts` — no schema or query
changes needed.

## Out of scope

- Bulk actions from the image page (already exists on `/admin` only).
- Comment moderation UI on the image page (already visible read-only via
  the existing comments section; `EditForm`'s comment-delete list is
  included since it's part of the unmodified component, but not a
  requirement — a bonus that comes for free).
- Any change to `published` value semantics or the DB schema.
