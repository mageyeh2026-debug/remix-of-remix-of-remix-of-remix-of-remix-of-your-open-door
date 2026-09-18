# Remove blocking loading screen

## Changes
- Show every public page immediately using the latest cached content while live Firebase content updates in place.
- Stop waiting for every image to download or decode before rendering.
- Remove the circular loading animation from page and checkout waiting states without changing payment behavior.

## Technical details
- Make the content hook non-blocking and remove image-preload gating.
- Remove page-level loading guards and unused loading-screen imports.
- Keep normal browser image loading and the required asynchronous Whop checkout setup.

## Verification
- Open the films and gallery pages and confirm content appears immediately.
- Open a paid film and confirm checkout still initializes and payment controls render.
