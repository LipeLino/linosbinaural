import { writeFile, mkdir } from "node:fs/promises";
await mkdir("public/art", { recursive: true });
const r = (x, y, w, h, c) =>
  `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" fill="${c}"/>`;
const p = (d, c) => `<path d="${d}" fill="${c}"/>`;
const svg = (w, h, s) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${s}</svg>`;
const tree = (x, y, c) =>
  `<g transform="translate(${x} ${y})">${p("M10 0h4v4h4v4h4v4h4v4H0v-4h4V8h4V4h2Z", c)}${r(11, 14, 3, 9, "#4b4840")}${p("M10 8h5v3h4v3h5v4H2v-4h4v-3h4Z", c)}</g>`;
function landscape(w, h, kind = "moon") {
  let s =
    r(0, 0, w, h, kind === "cafe" ? "#c69468" : "#304657") +
    r(0, h * 0.45, w, h * 0.55, "#4f686c");
  s += p(
    `M0 ${Math.round(h * 0.55)}H${Math.round(w * 0.13)}V${Math.round(h * 0.48)}H${Math.round(w * 0.25)}V${Math.round(h * 0.39)}H${Math.round(w * 0.38)}V${Math.round(h * 0.31)}H${Math.round(w * 0.47)}V${Math.round(h * 0.4)}H${Math.round(w * 0.56)}V${Math.round(h * 0.32)}H${Math.round(w * 0.67)}V${Math.round(h * 0.43)}H${Math.round(w * 0.78)}V${Math.round(h * 0.49)}H${w}V${h}H0Z`,
    "#6c8584",
  );
  s +=
    r(w * 0.7, h * 0.14, 14, 14, "#efdbb0") +
    r(w * 0.7 - 3, h * 0.14 + 3, 20, 8, "#efdbb0");
  for (let i = 0; i < 12; i++)
    s += r(
      (i * 37 + 13) % w,
      8 + ((i * 17) % Math.floor(h * 0.3)),
      1,
      1,
      "#b3bdae",
    );
  s += r(0, h * 0.8, w, h * 0.2, kind === "shore" ? "#769a9c" : "#2b4541");
  if (kind === "shore")
    for (let i = 0; i < 6; i++)
      s += r(
        (i * 21) % w,
        h * 0.8 + i * 3,
        w * 0.45,
        1,
        i % 2 ? "#b7c5ab" : "#8faeaa",
      );
  else
    for (let i = 0; i < Math.ceil(w / 23); i++)
      s += tree(
        i * 23 - 5,
        Math.floor(h * 0.53) + (i % 3) * 5,
        i % 2 ? "#304b40" : "#283f37",
      );
  return s;
}
let room = r(0, 0, 512, 176, "#444637");
for (let i = 0; i < 512; i += 32)
  room += r(i, 0, 1, 176, "#393f33") + r(i + 1, 0, 1, 176, "#4c4d3c");
room +=
  r(176, 13, 163, 126, "#282c27") +
  r(180, 17, 155, 118, "#9b7450") +
  r(184, 21, 147, 110, "#4c392e");
room += '<g transform="translate(188 25)">' + landscape(139, 102) + "</g>";
room +=
  r(251, 21, 5, 110, "#7e6146") +
  r(184, 74, 147, 4, "#7e6146") +
  r(173, 133, 169, 5, "#b18a5b") +
  r(177, 138, 161, 4, "#624a38");
room +=
  r(21, 35, 128, 5, "#a5784e") +
  r(24, 40, 122, 4, "#342e28") +
  r(29, 44, 5, 7, "#796042") +
  r(132, 44, 5, 7, "#796042");
const books = [
  "#be805b",
  "#8c9568",
  "#ceb480",
  "#617d76",
  "#b49668",
  "#72534b",
];
for (let i = 0; i < 9; i++) {
  const x = 30 + i * 9,
    y = 15 + (i % 3) * 2;
  room +=
    r(x, y, 7, 35 - y, books[i % 6]) +
    r(x + 1, y + 3, 5, 1, "#d3be91") +
    r(x + 2, 30, 3, 2, "#3d4235");
}
room +=
  r(124, 23, 17, 12, "#8a9b75") +
  r(126, 25, 13, 8, "#c7bb90") +
  r(36, 97, 111, 5, "#a5784e") +
  r(39, 102, 105, 5, "#342e28");
for (let i = 0; i < 5; i++)
  room +=
    r(46 + i * 16, 67 + (i % 2) * 3, 15, 30 - (i % 2) * 3, books[(i + 2) % 6]) +
    r(49 + i * 16, 72 + (i % 2) * 3, 9, 12, "#445649") +
    r(48 + i * 16, 90, 11, 2, "#ddc699");
room +=
  r(420, 77, 4, 72, "#b29665") +
  r(409, 148, 28, 4, "#bb9967") +
  r(404, 151, 38, 3, "#252e27") +
  p("M409 61h26v4h4v5h4v6h4v5h-50v-5h4v-6h4v-5h4Z", "#ddba74") +
  r(400, 78, 44, 4, "#f2d492") +
  r(410, 61, 24, 3, "#f2d492");
room +=
  r(465, 127, 20, 22, "#b27657") +
  r(462, 124, 26, 5, "#ca9870") +
  r(468, 132, 14, 2, "#d4a474") +
  r(474, 96, 3, 29, "#799462") +
  p(
    "M474 105h-7v-4h-7V89h5v4h6v5h3ZM477 111h7v-5h7V94h-5v4h-6v6h-3ZM474 119h-7v-4h-8v-9h7v4h5v4h3Z",
    "#8b9d65",
  );
room += r(0, 153, 512, 5, "#bd8b5c") + r(0, 158, 512, 18, "#74513c");
for (let x = 0; x < 512; x += 67)
  room += r(x, 165, 46, 1, "#956646") + r(x + 23, 173, 31, 1, "#503e30");
room +=
  r(116, 141, 17, 12, "#d7c899") +
  r(133, 143, 5, 7, "#d7c899") +
  r(134, 145, 2, 3, "#444637") +
  r(118, 139, 13, 3, "#6e5b43") +
  r(111, 153, 29, 2, "#d7c899") +
  p("M347 148h19l4 2 4-2h20v7h-47Z", "#dfc89b") +
  r(369, 150, 2, 5, "#ae956d");
await writeFile("public/art/listening-room.svg", svg(512, 176, room));
for (const kind of ["moon", "shore", "cafe", "lantern", "forest"]) {
  let s = landscape(96, 96, kind);
  if (kind === "moon") {
    s +=
      r(7, 11, 4, 65, "#a87851") +
      r(85, 11, 4, 65, "#a87851") +
      r(7, 11, 82, 4, "#b18d65") +
      r(7, 73, 82, 4, "#b18d65") +
      r(46, 14, 3, 59, "#a87851");
    for (let i = 0; i < 14; i++)
      s += r(14 + ((i * 11) % 66), 20 + ((i * 13) % 43), 1, 5, "#789597");
  }
  if (kind === "cafe")
    s +=
      r(0, 68, 96, 28, "#a16d4d") +
      r(5, 10, 86, 4, "#775645") +
      r(45, 10, 4, 55, "#775645") +
      r(5, 63, 86, 5, "#d7b585") +
      r(29, 67, 26, 18, "#eee0b6") +
      r(55, 69, 8, 12, "#eee0b6") +
      r(57, 72, 3, 6, "#a16d4d") +
      r(32, 65, 20, 4, "#705247") +
      r(23, 85, 42, 3, "#cfb582") +
      r(38, 53, 2, 7, "#eccea0") +
      r(44, 48, 2, 8, "#eccea0");
  if (kind === "lantern")
    s +=
      r(0, 68, 96, 28, "#6b5140") +
      r(21, 81, 57, 4, "#caba90") +
      r(27, 74, 45, 7, "#ebd7a3") +
      r(46, 30, 4, 40, "#b7a172") +
      r(35, 68, 26, 4, "#b7a172") +
      p("M37 25h22v5h5v8h5v5H27v-5h5v-8h5Z", "#e2bd77") +
      r(30, 43, 36, 3, "#f4d999");
  if (kind === "forest")
    s +=
      p("M30 64v-6h6v-6h6v-6h6v-6h6v6h6v6h6v6h6v6Z", "#88654b") +
      r(34, 64, 35, 23, "#b68a5b") +
      r(39, 68, 9, 10, "#edd299") +
      r(55, 69, 9, 18, "#574c39") +
      r(32, 87, 40, 4, "#294037");
  s +=
    r(0, 0, 96, 3, "#e9d0a0") +
    r(0, 93, 96, 3, "#e9d0a0") +
    r(0, 0, 3, 96, "#e9d0a0") +
    r(93, 0, 3, 96, "#e9d0a0");
  await writeFile("public/art/cover-" + kind + ".svg", svg(96, 96, s));
}
await writeFile(
  "public/art/mark.svg",
  svg(
    24,
    24,
    r(3, 3, 18, 18, "#d0b684") +
      r(1, 6, 22, 12, "#d0b684") +
      r(6, 6, 12, 12, "#3a4b3d") +
      r(9, 3, 6, 3, "#3a4b3d") +
      r(4, 11, 4, 9, "#3a4b3d") +
      r(16, 11, 4, 9, "#3a4b3d") +
      r(10, 10, 4, 4, "#deb274"),
  ),
);
await writeFile(
  "public/art/manifest.json",
  JSON.stringify(
    {
      version: 1,
      creator: "Lino’s Binaural project",
      method: "Original procedural pixel artwork; scripts/generate-art.mjs",
      license: "CC0-1.0",
      grid: "Integer rectangles and stepped paths",
      assets: [
        "listening-room.svg",
        "mark.svg",
        ...["moon", "shore", "cafe", "lantern", "forest"].map(
          (x) => "cover-" + x + ".svg",
        ),
      ],
    },
    null,
    2,
  ),
);
console.log("Generated room, five sleeves, mark and manifest.");
