# Unified landing page and room header

Branch: `feature/unified-game-entry`, based on `main` at `4d2a191`. The original safety, mobile layout, lobby routing and temporary-image cleanup changes already exist in this main baseline. Nothing is pushed or deployed.

## Changes

- Home now offers Host a new game (no name needed) and a name/room-code join form.
- The separate `/join` page and its stylesheet are removed. Old `/join` URLs now reach the existing not-found screen; there is no compatibility redirect.
- `useGameEntry` owns request/loading/error/navigation state and prevents duplicate submissions or simultaneous host/join requests. `joinGame` validates/normalizes join inputs and stores the server-assigned player identity. Existing API helpers continue issuing/storing host and player session credentials; authentication and backend limits are unchanged.
- Host invitation text points to the home page.
- Landing styling takes its yellow/blue/red/green palette, bold outlines and burst/diamond motifs from the existing Honji logo. The landing keeps the existing PNG logo; the thinner room header uses a new colored text wordmark SVG.
- A shared header appears on host/player room pages, including lobby, drawing, scoring and results. Logo is left; room code is centered independently of logo width. The right side contains Quit on host results only. The logo links home; navigating away during a round can discard an unsaved canvas.
- Room page heights account for the header; duplicated lobby/results room-code headings are removed.

## Local review

This branch is already checked out in `/Users/hyunki/Desktop/honji-pictionary`. For full gameplay run `npm run api` and use the URL it reports. For the UI preview, run `npm run ui`; its API requests proxy to localhost:3000, so keep the API server running too. Existing `.env.local` remains ignored and unchanged.

1. Open home with an empty name and click Host a new game: it should create a room, preserve the host session and navigate to the host lobby.
2. From another browser/device, enter a name and the room code on home and join. Test lowercase codes, empty fields, a 15-character name, a nonexistent code and a full room. Confirm clear errors and no duplicate player when clicking twice rapidly.
3. Draw/save an avatar, reload the lobby, start a round, submit a drawing and view results. This verifies the refactor preserves identity and session credentials.
4. Follow the host's invitation: it should point to home, not `/join`. Visiting `/join` should show the existing not-found page.
5. Check the header on `/host/CODE`, `/room/CODE/lobby`, `/room/CODE` and both results pages. Room code must remain horizontally centered; logo should return home. Check expired rooms still show their existing error state.
6. At 320px, 375px, 768px and desktop widths, check the landing form, focus rings, header alignment and viewport fitting. Check touch controls and the on-screen keyboard; all fields and errors must remain reachable. Desktop/mobile host player layouts from main should remain intact.

## Verification

Run `npm run build`, the API type check documented in the review index, `node --test tests/*/regression.cjs tests/game-entry/header.cjs`, and lint the changed TS/TSX files. New tests verify join input normalization, server-assigned identity storage, failure behavior, host-without-name markup and header routing. Existing service tests still use mocks; a live multiplayer check remains necessary.

Browser access was blocked because the computer-use security-policy check was unavailable. No visual screenshot inspection or browser interaction test was completed; the responsive checks above remain manual. The UI preview was started locally for review.

## Follow-up: shared theme and viewport layouts

Two more commits extend this branch:

- Slim header: a new text-only colored wordmark, a 52px header (48px on mobile), centered room code, and the existing host Quit action moved into the header. Quit still calls the authenticated room API before returning home; pending requests disable the button, and failures show an alert beside the header. It is available even when results are empty, loading or failed.
- Shared theme/layout: dotted yellow background with blue/green bursts and a cream stripe, cream panels, bold outlines, green badges and colored buttons across waiting, drawing, scoring, results, error and not-found screens. Winner cards use a yellow comic panel instead of the old oversized frame.

Pages occupy the available dynamic viewport rather than expanding from a minimum height. Square drawing canvases shrink with the available height; short landscape screens place controls beside them. The 500×500 backing canvas and drawing coordinate conversion are unchanged, so CSS resizing does not clear artwork or alter exported resolution. Nested loading indicators no longer reserve another full screen.

Host results keep all three podium entries visible: a winner and two runners-up, with a stacked two-tier arrangement on narrow portrait screens. Player results keep the winner fixed and let only the other players' results panel scroll. On mobile that scrolling panel moves below the winner; the winner remains outside it. It is keyboard focusable. Nonessential home copy is omitted on very short portrait viewports to keep entry controls available.

### Manual checks for these changes

1. Check home at 320×568, 375×667, 390×844, 768×1024, 1366×768 and 1920×1080, plus 667×375 and 844×390 landscape. Confirm no page scroll and that Host, both join fields and Join remain visible. Trigger an invalid-room error. Open the phone keyboard and switch between fields.
2. Create a room, join with up to ten players, and check the host waiting and drawing views at the same sizes. Lobby avatars remain hidden on mobile, with player count shown; drawing players use two columns on narrow screens. Long names should ellipsize in the host roster.
3. Draw near every canvas edge, Undo, Clear, save an avatar and submit a drawing. Rotate/resize while drawing: the strokes should persist and the pointer should align with the displayed canvas. Confirm prompt, timer and controls remain visible. Check a long prompt and a submission error.
4. During scoring and after submitting, confirm the loading panel stays inside the current page without adding height. Visit an expired room and an unknown route to check themed error states.
5. With three or more submissions, inspect host results in portrait and landscape: names, rank, images, scores and notes must fit without page scroll. Check the player winner remains visible while scrolling the other-results panel with nine runners-up. Tab into that panel and use arrow/Page Down keys. Very long scoring notes are a manual review edge case.
6. On host results, Quit should appear inside the header, with code still centered. Confirm it closes the room and returns home. Test a failed request: it should keep the page open and show an alert. No Quit button should appear in player headers.

Build and all 19 regression checks passed. Changed TS/TSX lint has no errors; JoinRoom retains its pre-existing `submitDrawing` effect dependency warning. Browser security-policy verification remains unavailable, so visual, touch and live multiplayer checks above are not claimed as completed. No backend, auth or image-retention changes were made.

### Logo refinement

The header now clips the actual original logo lettering into a self-contained SVG, retaining its custom shapes and yellow/cream/blue/red/green fills rather than approximating them with a font. The explosion frame is omitted and the dark background between the letters is transparent. The SVG asset was rendered locally and inspected. Home uses a larger logo with a small overlap behind the headline; the headline has a white outline to preserve legibility without increasing the card height. Recheck home at short portrait/landscape sizes with an error showing, and check header logo clarity and room-code centering. Full page browser inspection remains unavailable.
