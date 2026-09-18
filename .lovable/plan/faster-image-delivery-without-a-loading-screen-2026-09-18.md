# Faster image delivery without a loading screen

## Changes
- Keep every page visible immediately with no loading animation.
- Start warming image URLs in the browser as soon as the latest site content arrives.
- Prioritize first-screen images and defer off-screen gallery/media images so they do not compete for bandwidth.
- Add early connections for the image and data hosts used by the site.

## Cloudflare compatibility
- Preserve the existing Cloudflare-targeted TanStack build configuration.
- Check server code for unsupported runtime features and verify the production build.

## Verification
- Confirm the films and gallery pages render immediately with no loading overlay.
- Confirm first-screen images are requested with high priority and off-screen images load progressively.
- Confirm the production build completes for the Cloudflare target.
