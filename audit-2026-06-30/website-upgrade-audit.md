# HM Huamei Website Upgrade Audit

Date: 2026-06-30
Source: local site served from `/Users/qu/Documents/Huamei-官网/`
Mode: combined UX, visual design, and accessibility review

## Audit Scope

This audit reviews the main visitor path:

1. Arrive on the homepage.
2. Understand the service categories.
3. Inspect housing, vehicle, health, love-health, and selected-service areas.
4. Find a next step to contact Mei Teacher's team.
5. Check mobile navigation and first-screen behavior.

The output is evidence-based from the screenshots in `screenshots/`.

## Screenshot Evidence

- `screenshots/01-home-desktop-hero.png` - homepage desktop hero
- `screenshots/02-home-desktop-services.png` - homepage service pillars
- `screenshots/03-home-desktop-housing.png` - homepage housing section
- `screenshots/04-home-desktop-contact.png` - homepage contact section
- `screenshots/05-home-desktop-wechat-modal.png` - WeChat modal
- `screenshots/06-vehicle-desktop-hero.png` - vehicle page hero
- `screenshots/07-health-desktop-hero.png` - health page hero
- `screenshots/08-love-health-desktop-consult.png` - love-health consult form
- `screenshots/09-selected-desktop-list.png` - selected-services page
- `screenshots/10-home-mobile-hero.png` - homepage mobile hero
- `screenshots/11-home-mobile-menu.png` - homepage mobile menu open

## Step Review

1. Homepage desktop hero - healthy
   - Strong human trust signal: a real, calm Mei Teacher portrait anchors the page well.
   - The primary CTA is visible and clear.
   - Risk: the English headline "For every family thing that matters" feels unnatural and may weaken perceived professionalism.

2. Homepage service pillars - mostly healthy
   - The four-pillar structure is clear and visually premium.
   - Housing, vehicle, health, and love-health are easy to scan.
   - Risk: cards are visually large; on common laptop height, the service labels are partly below the fold. The user sees the section but not the full decision content.

3. Housing section - mostly healthy
   - The numeric proof points, `60+` cities and `150+` communities, are useful.
   - The section has a strong emotional promise.
   - Risk: the user still needs an early "Am I eligible?", "What documents do I need?", and "What happens after I contact you?" path before scrolling deeply.

4. Contact section - healthy, but interaction needs cleanup
   - WeChat, SMS, and office are clear.
   - The WeChat card is visually prominent, which matches likely user behavior.
   - Risk: the WeChat card is a clickable `div`, not a semantic button or link. Keyboard and screen-reader users may not get the same affordance.

5. WeChat modal - mostly healthy
   - QR code, WeChat ID, and copy action are all easy to understand.
   - Risk: the modal needs stronger accessibility structure: `aria-modal`, labelled dialog text, initial focus, focus trap, and reliable focus return.
   - Risk: "打开微信" may not work on desktop, so the modal should set expectation by platform.

6. Vehicle page hero - visually healthy, content-light above the fold
   - The image and title are polished and consistent with the homepage.
   - Risk: the hero does not surface the fastest decision-making info: subsidy types, approximate ranges, main eligibility criteria, documents, and service fee/process.

7. Health page hero - visually healthy, content-light above the fold
   - Consistent design language helps users recognize this as part of the same service system.
   - Risk: "health care" is broad. Users need quick separation between HHS, IHSS, Medicare, Medi-Cal, qualification review, and daily care.

8. Love Health consult form - mixed
   - The form design is careful, specific, and reassuring.
   - Risk: the submit button is disabled and marked "Coming Soon"; this can make the offer feel unfinished. The fallback WeChat path is present but should be promoted as the primary action until the form works.

9. Selected-services page - needs public-readiness pass
   - The positioning is valuable: curated local services can build trust and ecosystem value.
   - Risk: several provider buttons use `href="#"`, and several phone links are placeholder numbers like `+16260000000` or `+19090000000`. This page should not be treated as production-ready until links are real.

10. Homepage mobile hero - mixed
   - Brand and primary CTA remain visible.
   - Risk: the portrait crop pushes Mei Teacher's face to the right edge. Text and CTA overlap visually busy photo areas, reducing readability and polish.
   - Risk: the second CTA is low-contrast in the screenshot.

11. Homepage mobile menu - mostly healthy
   - Menu options are clear and large enough to tap.
   - Risk: the menu overlays the hero and leaves partial hero text visible underneath, creating visual clutter. It should feel like a deliberate drawer/sheet state.
   - Risk: menu button state should expose `aria-expanded`, and focus should move predictably while the menu is open.

## Strengths

- The site already has a clear emotional brand: warm, local, careful, family-centered.
- Real portrait photography and office/location cues create more trust than generic stock imagery.
- The design system is consistent across pages: walnut/bone/sage palette, serif display type, pill CTAs, and large lifestyle imagery.
- The contact path is intentionally simple: WeChat, SMS, office.
- The site has good raw material for an upgrade: images, page structure, service categories, QR code, favicon, canonical URLs, and Open Graph metadata.

## UX Risks

- Positioning is split. The title and homepage emphasize low-income housing, but the nav and content also include vehicle subsidies, health care, love-health, and selected services. The next version should clarify whether Huamei is a housing expert with adjacent services, or a broader Chinese-family benefit/service center.
- Conversion is inconsistent. Some pages send users back to homepage contact, love-health has a disabled form, and selected-services includes placeholder links. The next version should define one reliable primary conversion system.
- Service pages are visually strong but answer practical questions too late. Users need eligibility, documents, timeline, cost/fee, official-disclaimer, and what Huamei handles vs. what the user handles.
- The homepage first-screen English copy should be rewritten. Current wording feels less polished than the visual design.
- "Selected" is promising but risky while links and phone numbers are incomplete.

## Accessibility Risks

- Several interactive service cards are implemented as `div onclick`, which can block keyboard users and weaken screen-reader clarity.
- Vehicle modals use `role="dialog"` but do not expose full modal behavior such as `aria-modal`, unique labels on every dialog, focus trap, Escape handling plus focus return.
- The mobile menu needs `aria-expanded`, a clearer modal/drawer state, and focus behavior.
- Display typography uses negative letter spacing and very large type. It looks premium, but some Chinese/English mixed lines become harder to read, especially on mobile.
- Disabled form submission on love-health needs a stronger accessible fallback. A disabled primary button should not be the main apparent action if the real action is WeChat.
- Placeholder `href="#"` links and placeholder phone links create confusing keyboard/navigation behavior.

## Upgrade Opportunities

1. Clarify the brand promise
   - Option A: "加州华人家庭福利与安居服务中心"
   - Option B: "以住房申请为核心，延伸车辆补贴、健康福利与家庭服务"
   - The chosen promise should drive nav, homepage hero, and service-page hierarchy.

2. Create one conversion system
   - Primary CTA: WeChat consultation.
   - Secondary CTA: SMS.
   - Optional form: only show as active when it works.
   - Track CTA clicks separately for WeChat, SMS, office map, and service-specific consultation.

3. Upgrade service page templates
   - Each service page should include: who qualifies, what Huamei helps with, required documents, expected timeline, cost/fee note, official disclaimer, FAQ, and contact CTA.
   - Vehicle and health pages should turn modal-only details into visible page sections.

4. Improve mobile first
   - Use a mobile-specific hero crop or background-position.
   - Tighten first-screen text and button layout.
   - Make mobile menu a clean sheet/drawer with no distracting underlying text.

5. Make selected-services production-ready
   - Replace placeholder phone numbers and `href="#"`.
   - Add category filters only if there are enough businesses.
   - Add "推荐标准" and disclaimer near the top so the page feels credible rather than promotional.

6. Accessibility foundation pass
   - Convert clickable `div` cards into buttons or links.
   - Add modal focus management.
   - Add `aria-expanded` to menus and FAQs.
   - Ensure visible focus states.
   - Review contrast for overlay text and low-opacity labels.

7. Maintainability pass
   - Shared CSS, tokens, nav, footer, modal behavior, float CTA, and card styles are duplicated across multiple HTML files.
   - A small static-site generator or shared partial build step would reduce future drift without requiring a full framework.

## Recommended Roadmap

### Phase 1 - Trust and conversion cleanup

- Rewrite homepage hero copy.
- Remove or finish placeholder links/phone numbers on selected-services.
- Make WeChat/SMS the consistent conversion path.
- Fix disabled love-health form state by promoting WeChat as the primary action until the form works.
- Convert obvious clickable `div` elements to semantic controls.

### Phase 2 - Service-page content upgrade

- Add eligibility, documents, process, timeline, and FAQ sections.
- Make vehicle and health pages answer "Do I qualify?" within the first two screens.
- Add clearer compliance language: official programs, no guarantee, final approval by agencies.

### Phase 3 - Mobile polish

- Re-crop homepage mobile hero.
- Simplify mobile CTA layout.
- Convert mobile menu into a cleaner drawer/sheet.
- Check all key pages at 390px and 430px widths.

### Phase 4 - System and growth

- Extract repeated nav/footer/modal/CTA CSS and JS.
- Add analytics events for conversion actions.
- Add structured local-business/contact data.
- Consider a lightweight content-driven setup for service cards and provider listings.

## Evidence Limits

- This audit used local screenshots and source inspection only.
- It did not verify real production analytics, actual user behavior, SEO search-console data, or official policy accuracy.
- It did not perform a full WCAG audit with screen-reader testing.
- It did not submit forms or contact external services.
