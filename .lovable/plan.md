# Hourly sitemap and cleaner film presentation

## Changes
- Set every sitemap entry to the valid `hourly` update frequency.
- Remove generated “today” dates from the sitemap because they are not real page-specific update dates.
- Keep the XML plain; the browser’s “no style information” notice is normal and does not affect indexing.
- Reduce upcoming cards on the home page to clickable poster artwork, title, genre, and status.
- Open each upcoming film’s existing detail page when its image is clicked; keep the synopsis and support controls there.
- Replace “Follow for free” with “Support with any amount” on upcoming-film detail pages.
- Let supporters enter a valid USD amount and complete the existing secure Pesapal payment flow.
- Verify the paid support amount against the Pesapal transaction before confirming success.
- Show complete film artwork without cropping in home, film-list, upcoming, related-film, and film-detail holders.

## Verification
- Confirm `/sitemap.xml` has `hourly`, contains no artificial `<lastmod>` values, and still escapes film URLs correctly.
- Confirm upcoming home cards hide synopsis and payment controls, while clicking a poster opens its details.
- Confirm a custom support amount reaches the payment window and invalid amounts are rejected.
- Check desktop and mobile film artwork for cropping and layout stability.
