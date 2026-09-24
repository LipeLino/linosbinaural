# Design direction

Create / Studio: an original pixel woodland listening room. The fixed brief requires fidelity to a listening desk, ambience panel, dusk window and open record shelf. Proof slices resolve craft and usability rather than unrelated concept directions.

A quiet, personal room for people who want to listen while working or unwinding. The mixer is the main object. Walnut, parchment labels, moss accents and a dusk-blue window establish the place. Right-side lamplight defines highlights. One-unit pixel shapes remain crisp, with real semantic text and controls above decoration.

References (concepts only; no source pixels reused):

- https://www.stardewvalley.net/media/ — deliberate clusters and warm/cool environmental contrast. No characters, recognizable buildings, interface or compositions copied.
- https://imissmycafe.com/ — individually controlled sounds make a place personal. Imagery and composition are original here.
- https://www.audio-technica.co.jp/product/AT-LP70X — physical record, tonearm and transport metaphors; no logo or industrial-design copy.
- Open record-shop shelving — sleeves stand above a visible front edge, with partly revealed vinyl on hover/focus.

Palette: walnut #79563e, parchment #dcc9a0, moss #a6bb7e, dusk #304657, amber #d9b773. Day theme changes surfaces and text roles while reusing artwork. Pixelify Sans only on short headings/readouts; locally hosted Nunito supports body copy and Portuguese accents.

Responsive contract: side-by-side console/ambience on desktop, stacked on mobile; explicit numeric alternatives to sliders, touch shelf scrolling bounded inside page, native dialogs. Motion only for selected layers or actual playback; no beat-synchronized flashing. Reduced motion and hidden tabs stop decorations.

Source: scripts/generate-art.mjs and src/components/PixelIcon.tsx. Manifest: public/art/manifest.json (CC0 original construction). No generated draft promoted without browser inspection.

Proof: artifacts/proof-desktop.png and proof-mobile.png inspected. The desktop revealed excessive scene height; reduce scene to 180px before secondary-page expansion to keep actions near the initial viewport. Final screenshots supersede these proof images.
