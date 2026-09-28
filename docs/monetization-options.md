# Monetization options

Reviewed on 2026-09-28. Fees and availability can change; verify the provider dashboard before launch.

## Recommendation

Use **Ko-fi Free** as the first external tip jar. Opt out of Standard/Contributor fees so one-time tips carry 0% Ko-fi platform fee; PayPal or Stripe processing still applies. Ko-fi supports BRL, sends payments directly to the connected processor, and lets supporters tip without creating an account. This matches a free listening room better than a membership platform.

Add a second **Mercado Pago payment link or Pix option** only if Brazilian visitors become a meaningful share of supporters. It offers a familiar local payment path but is less convenient for international visitors.

Use **Patreon** later only if Lino's Binaural develops recurring benefits, regular releases, exclusive posts, or an actual community program.

| Option | Current published cost model | Fit |
| --- | --- | --- |
| [Ko-fi Free](https://help.ko-fi.com/hc/en-us/articles/360002506494-Does-Ko-fi-take-a-fee) | 0% platform fee on one-time tips after opting out of Standard; processor fees apply. BRL is supported. | Best first choice for a simple optional tip. |
| [Buy Me a Coffee](https://help.buymeacoffee.com/en/articles/8105744-how-to-calculate-charges-on-your-payment) | 5% platform fee plus Stripe processing and payout fees. [Brazil payouts are supported](https://help.buymeacoffee.com/en/articles/6258038-supported-countries-for-payouts-on-buy-me-a-coffee). | Simple and polished, but materially more expensive than Ko-fi for one-time tips. |
| [Patreon](https://support.patreon.com/hc/en-us/articles/11111747095181-Creator-fees-overview) | New creator pages use a 10% platform plan plus processing, conversion, taxes, and payout fees. | Strong for memberships and community; poor value for a plain tip jar. |
| [Mercado Pago / Pix](https://www.mercadopago.com.br/developers/pt/docs/sales-processing/payment-methods) | Transaction fees depend on payment method and settlement choice. | Strong Brazilian option; adds operational and international-UX tradeoffs. |

For v1, use a normal external HTTPS link with `rel="noopener noreferrer"`. Do not embed provider JavaScript or accept webhooks. Update Privacy and Support with the selected provider and the actual data flow before publishing the link.

## Advertising

The codebase already has a disabled, self-hosted direct-sponsor placement. Enabling one static sponsor creative is the easiest route: roughly a few hours once the creative, destination, commercial hosting, and disclosure are approved. It can remain cookie-free and requires no ad-network script.

Google AdSense code integration is also small, usually half a day for one manual responsive unit. The operational work is larger:

1. Upgrade or migrate commercial hosting.
2. Create AdSense and submit the whole `mateuslino.com` site for review. Google says review usually takes a few days and can take 2–4 weeks.
3. Coordinate root-level `ads.txt` on `mateuslino.com`; a file under the Lino subpath is insufficient.
4. Add a Google-certified or compatible consent flow where required, update Privacy, and delay ad storage/request behavior until the consent signal is valid.
5. Expand CSP only for the exact approved Google hosts.
6. Use one manual ad unit below the record shelf or frequency guide, avoiding overlays, anchors, vignettes, and automatic placement that would damage the room.
7. Re-run accessibility, mobile, performance, layout-shift, request, and privacy checks.

Google supports [manual ad units or Auto ads](https://support.google.com/adsense/answer/7037624?hl=en). Manual units are the better visual fit here. [Site approval](https://support.google.com/adsense/answer/7584263?hl=en) is required before ads serve, and Google's [CMP guidance](https://support.google.com/adsense/answer/7670013?hl=en) applies to EEA, UK, and Swiss visitors where consent is required.

Ads work by letting the network fill an eligible page slot from its advertising demand; revenue depends on impressions, clicks, visitor geography, advertiser demand, consent state, fill rate, and policy compliance. Low traffic usually produces modest income, so begin with tips and measure audience size before accepting the privacy and design cost of an ad network.

The current deployment reports Vercel Hobby. Vercel states that [Hobby is for personal, non-commercial use](https://vercel.com/docs/plans/hobby). Do not activate tips, sponsorships, or AdSense until that hosting constraint is resolved.
