import { writeFile } from "node:fs/promises";
const rect = (x, y, w, h, c) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const path = (d, c) => `<path d="${d}" fill="${c}"/>`;
const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="0 0 64 48" shape-rendering="crispEdges">${body}</svg>`;
// Original silhouettes, made on one integer pixel grid. No third-party sprites.
let cat =
  rect(8, 42, 49, 3, "#282b2580") +
  path("M9 35v-8h4v-6h7v-4h21v4h9v5h5v13h-5v4H16v-3H9Z", "#855536");
cat += path("M14 29v-5h9v-4h15v3h10v5h4v10h-7v3H20v-3h-6Z", "#cd9861");
cat += path("M13 24V10h5v3h4V9h5v4h7V9h5v18h-4v6H19v-4h-6Z", "#e0af74");
cat +=
  rect(15, 13, 3, 6, "#aa795c") +
  rect(34, 13, 3, 6, "#aa795c") +
  rect(24, 13, 4, 5, "#9b6942") +
  rect(29, 13, 3, 5, "#9b6942");
cat +=
  rect(17, 23, 6, 2, "#46382f") +
  rect(30, 23, 6, 2, "#46382f") +
  rect(25, 26, 3, 2, "#8c5a49") +
  rect(22, 29, 9, 2, "#f0cd97");
cat +=
  rect(11, 26, 5, 1, "#f0cd97") +
  rect(36, 26, 5, 1, "#f0cd97") +
  rect(40, 25, 4, 7, "#ac7548");
cat +=
  path("M50 30h6v9h-4v4H28v-4h-5v-4h6v3h19v-3h2Z", "#e4b67c") +
  rect(29, 39, 6, 3, "#ad794e");
let dog =
  rect(5, 42, 54, 3, "#282b2580") +
  path("M8 32v-7h8v-5h21v4h10v7h7v10H13v-4H8Z", "#b78b60");
dog += path("M15 29v-5h17v3h10v6h5v7H20v-3h-5Z", "#e6c495");
dog += path("M34 18v-6h18v5h5v17h-4v5H34v-5h-5V19Z", "#e4bf8b");
dog +=
  path("M31 16h8v17h-4v4h-5v-7h-3V20h4Z", "#78563e") +
  path("M49 15h7v5h4v14h-5v-7h-3V19h-3Z", "#94663f");
dog +=
  rect(39, 24, 3, 3, "#3f372e") +
  rect(49, 24, 3, 3, "#3f372e") +
  rect(41, 29, 10, 7, "#f3d7ab") +
  rect(44, 29, 5, 3, "#40392e") +
  rect(45, 35, 3, 3, "#bf7e67");
dog +=
  rect(33, 38, 21, 3, "#638272") +
  rect(41, 40, 3, 3, "#dcb66e") +
  rect(17, 39, 12, 4, "#f0d5a8") +
  rect(47, 40, 11, 3, "#efd0a1");
dog += path("M10 29H5v-5H2v-5h4v3h4v3h6v8h-6Z", "#d6ae7a");
await writeFile("public/art/pet-miso.svg", wrap(cat));
await writeFile("public/art/pet-maple.svg", wrap(dog));
console.log("Generated original Miso and Maple pixel sprites.");
