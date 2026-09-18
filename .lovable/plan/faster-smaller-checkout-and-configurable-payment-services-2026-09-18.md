# Faster, smaller checkout and configurable payment services

## Checkout speed and mobile layout
- Load the Whop checkout control with the watch page instead of waiting for the payment method to be selected, while keeping a compact ready-state button during session creation.
- On phones, hide the “Payment details” heading and the long one-time-payment paragraph.
- Keep Mobile Money, Card, and PayPal in one compact three-column row and tighten the header, summary, spacing, and button so the entire payment panel fits a normal phone screen without internal scrolling.
- Preserve the existing desktop checkout layout.

## Accurate payment logos
- Replace the hand-drawn text approximations with bundled official brand artwork for MTN MoMo, Airtel Money, Visa, Mastercard, and PayPal.
- Size the marks consistently inside the three phone payment choices without stretching or clipping them.

## Clear Mobile Money errors
- Detect `LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED` anywhere in the payment service response, including nested status responses.
- Show: “You have insufficient balance on your Mobile Money account. Deposit money on your Mobile Money account and try again.”
- Keep technical provider messages hidden from customers while preserving the current fallback for other failures.

## Site-only Mobile Money history
- Filter the admin Mobile Money table and its collected/withdrawn totals to references created by this website (`MAGEYE-…` and `MAGEYE-WD-…`).
- Continue using the provider’s live wallet balance, but exclude unrelated provider-account activity from this site’s transaction counts and lists.

## Admin backend settings
- Add a Payment & Upload settings panel in `/admin` for the Mobile Money backend URL and upload backend URL.
- Save these values with the existing site settings and use them for new payments, wallet refreshes, withdrawals, and uploads.
- Validate both as secure Railway URLs before use and retain the current URLs as defaults, preventing arbitrary server destinations.

## Verification
- Check the checkout at 393×852 and confirm it fits without scrolling, all three methods remain in one row, and Whop reaches a usable button state promptly.
- Test the provider error mapping with a representative response without sending money.
- Confirm the admin table excludes non-Mageye references and the saved backend settings survive a reload.
- Run the project’s automated checks after the changes.
