# Rebuild the upcoming projects section

## Changes
- Recreate the reference as a three-column “Upcoming Projects” showcase with each poster, genre line, full story, support message, and four support choices.
- Use the exact supplied copy for The Silence We Flee, The Modern Road, and John Bullock.
- Make each support choice open a ready-to-send email identifying the film and chosen support level; “Follow for free” requests film updates.
- Keep the three upcoming posters bundled with the site, convert them to lightweight AVIF files, load them eagerly, and remove unnecessary background re-downloading.
- Restore the home-page movie strip on phones to three compact cards across in one row, with remaining films available by sideways swipe.

## Layout
- Desktop: three equal edge-to-edge project columns matching the supplied reference, with aligned posters, copy, separators, and support controls.
- Mobile: one upcoming project at a time in a swipeable row so its details remain readable.

## Technical details
- Keep upcoming films managed by the existing dashboard; match the requested support copy by each film slug without introducing mock gallery or movie records.
- Use semantic site colors and existing typography while matching the reference’s proportions and hierarchy.
- Respect reduced-motion settings and preserve current page behavior outside these two sections.

## Verification
- Check desktop and phone layouts in the running site.
- Confirm all three posters load successfully and the support links contain the correct film and support level.
- Confirm the phone movie strip shows three compact cards before horizontal scrolling.
