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

## 2026-09-24 tactile-room refinement

Mode: Standard redesign within the established woodland direction. The user requested more skeuomorphism, pets and intuitive guidance. Preserve the real audio graph, account boundaries, canonical subpath, original palette and bilingual behavior.

Bounded brief: newcomers should be able to choose an atmosphere without understanding hertz, start deliberately at their existing volume, and learn what the selected band means. The primary action stays listening. Miso (cat) and Maple (dog) provide optional silent companionship. They are original integer-grid SVGs, never an audio layer.

Design delta: walnut cabinet joinery, brass fasteners and plaque, enamel control plate, a physical turntable/tonearm, recessed frequency glass, ridged slider caps, mechanically shaded switches, deeper record-shelf edges and a parchment field guide. Material depth communicates which parts are controls, labels and supporting notes. No new UI/animation dependency.

Flow: choose an intention or record; press Start listening; adjust ambience and duration. Playback moves ahead of precision tuning. A user-opened three-step tour explains headphones, low volume, ambience-only mode, pause/stop and saving. The contextual band note follows the actual selected frequency; the five-band field guide explains associations and limits, with primary research links.

Responsive delta: desktop retains console/ambience columns; narrow screens use a compact two-row intention selector, stacked ambience, smaller sprites with >=44px pet targets and a one-column field guide. The pets retain names and keyboard-operable greeting buttons. Greetings have polite status text, no sound, and short non-looping motion. A persistent room-motion control, reduced-motion preference and hidden-tab rules govern decoration; none touches the audio engine.

Reproducibility: scripts/generate-pets.mjs and scripts/generate-art.mjs; public/art/manifest.json includes both pets under the original CC0 declaration. Research mapping: docs/listening-guide-evidence.md. Rendered QA and actual results are recorded in docs/evidence.md after verification.

Independent refinement review: made the selected-record confirmation link directly to the player on small screens, scoped motion suppression to room/pets/record rotation, honored system reduced motion with an explicit static label, and replaced anonymous reference numbers with author/year links. Root screenshot review additionally repaired the inherited tablet grid rule that overlapped the inset frequency display. The new intent controls include their visible wording in their accessible names.
