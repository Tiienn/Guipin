# Guipin

A cinematic, responsive one-page tea website with a real-time Three.js bottle carousel, a scroll-controlled bottle turn, and a pouring scene. Based on the supplied Guipin bottle photos and video references.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. For a production build, run `npm run build`; the deployable static site is in `dist/`. Use `npm run preview` to preview that build.

## Experience

- Switch between Jasmine and Aged citrus with carousel arrows, the flavour selector, arrow keys, or a horizontal swipe on the scene. The bottles, page colours, and flavour descriptions change together.
- Scroll through four chapters: choose a flavour, explore its botanicals, turn the bottle to read its details, and pour. Chapter navigation jumps directly to each moment.
- The bottle turns a full 360 degrees before uncapping, tilting, and pouring into a glass. Scrolling backwards reverses the sequence.
- Switch flavours in any chapter without losing your scroll position.
- Switch between iced and warm tea; the warm version replaces ice with steam.
- Expand FAQs at the end of the page.
- Mobile navigation, keyboard focus, reduced-motion support, and a product-photo fallback when WebGL is unavailable.
- The 3D scene stops rendering while outside the viewport or while the tab is hidden.

## Ordering

- Each 500 ml bottle costs **Rs 100 (MUR)**.
- Order Now adds the selected flavour to the cart. Customers can add both flavours, adjust quantities, remove bottles, and review a product subtotal.
- Cart quantities persist in local storage. Customer name, contact, and notes stay in memory and are not stored locally.
- Review and Confirm prepare an order request. The customer then sends it via WhatsApp to **+230 5811 9569**, or opens an email to **guipinmru@gmail.com**. These are prefilled links; the website cannot verify whether the message was sent or accepted.
- Delivery, availability, and payment are arranged with Guipin. There is no payment gateway, backend order database, or automatic merchant confirmation.
- Edit prices and contact destinations in `src/order-config.js`.

## Edit

- `src/main.jsx`: content and interactions.
- `src/order-drawer.jsx` and `src/order.css`: cart, customer details, review, confirmation, and sharing.
- `src/cart.js`: cart validation, quantities, persistence, and totals.
- `src/flavours.js`: flavour names, descriptions, and theme colours.
- `src/story-motion.js`: chapter positions and bottle turn choreography.
- `src/styles.css`: responsive layout and visual design.
- `src/tea-scene.js`: bottle and glass geometry, studio lighting, detailed ice, and animation.
- `src/optics.js`: refraction, depth-dependent amber absorption, and optical materials.
- `src/product-label.js`: bottle label textures.
- `src/pour-physics.js`: gravity-driven stream path and flow narrowing.
- `src/liquid-geometry.js`: liquid geometry that maintains contact with the glass floor at every fill level.
- `public/images`: supplied product photographs.

The bottle is a procedural recreation of the supplied packaging. The front artwork follows the photographed Chinese label, gold manufacturer marks, vertical nutrition column, and flavour colours; the back panel contains the Guipin story details. The label is redrawn artwork, not a pixel-exact extraction of the photographed print. The pour is a visual simulation, not a fluid-physics solver. No external 3D model or video download is required.

The scene uses separate render buffers for refraction through the ice and glass, with a shared backdrop texture that matches the page. Bottle condensation uses transparent, refracting water beads, fine moisture on the exposed PET, and sparse elongated droplets on the label. Droplets on the far side are hidden rather than showing through the bottle. Long studio reflections and warm scattered light give the bottle and tea depth.

The glass has thin walls and a heavier optical base. Ice has irregular melted edges, cloudy centres, and tiny trapped bubbles. The amber stream spills over the lower edge of the bottle lip, follows the tilted opening before curving down under gravity, narrows as it accelerates, and produces surface waves and small clear splashes. Ice settles into the glass and floats as it fills. Continuous motion is disabled with reduced-motion preferences.

Run the cart, stream geometry, liquid geometry, and scroll choreography checks with `node --test tests/*.test.js`.

Product statements about ingredients, zero sugar, and zero calories come from the supplied brief and are not independently verified. The page avoids therapeutic promises about immunity, digestion, or diabetes. Confirm final nutrition and packaging text against the actual product before publication.

The cart and order-request flow work as a static site; no customer information is sent until the customer uses WhatsApp or their email app. Google Fonts supplies Barlow Condensed and DM Sans, with local sans-serif fallbacks.

If deploying with Vercel, upgrading the installed CLI is strongly recommended for compatibility: `npm i -g vercel@latest`.
