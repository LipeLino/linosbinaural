import { expect, test } from "@playwright/test";
import { FACTORY_PRESETS } from "../../src/lib/mix";

const HOME = "/builds/linosbinaural/";

test("five starting points load complete factory mixes without sound or master-volume changes", async ({
  page,
}) => {
  await page.goto(HOME);
  const starters = page.getByRole("region", {
    name: "Find your starting point",
  });
  await expect(starters).toBeVisible();
  const master = page.getByRole("spinbutton", { name: "Master volume (%)" });
  await master.fill("23");
  for (const preset of FACTORY_PRESETS) {
    await starters
      .getByRole("button", { name: new RegExp("Load " + preset.en + "$") })
      .click();
    await expect(
      page.getByRole("heading", { name: preset.en, exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const draft = JSON.parse(
            localStorage.getItem("linosbinaural:v1:draft") || "{}",
          );
          return draft.mix || null;
        }),
      )
      .toEqual(preset.mix);
    await expect(master).toHaveValue("23");
    await expect(
      page.getByRole("button", { name: "Play session" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Stop and reset session" }),
    ).toBeDisabled();
    await expect(page.locator(".room-scene")).not.toHaveClass(/playing/);
  }
  await expect(starters.getByRole("status")).toContainText(
    "Press Start listening when you’re ready.",
  );
});

test("first-use tour keeps focus inside and returns it to the opener on Escape", async ({
  page,
}) => {
  await page.goto(HOME);
  const opener = page.getByRole("button", { name: "Show me around" });
  await opener.click();
  const tour = page.getByRole("dialog", { name: "Your first few minutes" });
  await expect(tour).toBeVisible();
  await expect(
    tour.getByRole("heading", { name: "Choose a little atmosphere" }),
  ).toBeVisible();
  await expect(
    tour.getByRole("heading", { name: "Headphones on. Volume low." }),
  ).toBeVisible();
  await expect(tour).toContainText("no guaranteed benefit");
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document.querySelector("dialog")?.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(tour).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Stop and reset session" }),
  ).toBeDisabled();
});

test("petting Miso and Maple changes only their greeting; motion choice persists silently", async ({
  page,
}) => {
  await page.goto(HOME);
  await page.getByRole("button", { name: "Load Quiet Shore" }).click();
  await expect(
    page.getByRole("heading", { name: "Quiet Shore" }),
  ).toBeVisible();
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("linosbinaural:v1:draft") || "{}").mix,
  );
  const master = page.getByRole("spinbutton", { name: "Master volume (%)" });
  const masterBefore = await master.inputValue();
  await page.getByRole("button", { name: "Pet Miso the cat" }).click();
  await expect(page.locator('.pet-message[role="status"]')).toContainText(
    "Miso leans into your hand",
  );
  await page.getByRole("button", { name: "Pet Maple the dog" }).click();
  await expect(page.locator('.pet-message[role="status"]')).toContainText(
    "Maple gives a little tail wag",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("linosbinaural:v1:draft") || "{}").mix,
    ),
  ).toEqual(before);
  await expect(master).toHaveValue(masterBefore);
  await expect(
    page.getByRole("button", { name: "Stop and reset session" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Pause room motion" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-room-motion", "off");
  await expect(
    page.getByRole("button", { name: "Resume room motion" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("linosbinaural:v1:room-motion"),
    ),
  ).toBe("off");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-room-motion", "off");
  await expect(
    page.getByRole("button", { name: "Resume room motion" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Stop and reset session" }),
  ).toBeDisabled();
});

test("current frequency explanation tracks exact band boundaries and links to cautious research", async ({
  page,
}) => {
  await page.goto(HOME);
  const note = page.locator("details.current-frequency-note");
  const beat = page.getByRole("spinbutton", { name: "Beat frequency (Hz)" });
  for (const [frequency, label] of [
    ["2", "delta"],
    ["4", "theta"],
    ["8", "alpha"],
    ["13", "beta"],
    ["30", "gamma-range experiment"],
    ["40", "gamma-range experiment"],
  ] as const) {
    await beat.fill(frequency);
    await expect(note.locator("summary")).toContainText(
      "About this " + label + " setting",
    );
  }
  await note.locator("summary").click();
  await expect(note).toHaveAttribute("open", "");
  await expect(note).toContainText("no cognitive benefit is established");

  const guide = page.locator("#frequency-guide");
  await expect(guide).toBeVisible();
  await expect(guide.locator("details")).toHaveCount(5);
  expect(await guide.locator(".band-name").allTextContents()).toEqual([
    "Delta",
    "Theta",
    "Alpha",
    "Beta",
    "Gamma-range experiment",
  ]);
  expect(await guide.locator(".band-range").allTextContents()).toEqual([
    "0.5–4 Hz",
    "4–8 Hz",
    "8–13 Hz",
    "13–30 Hz",
    "30–40 Hz",
  ]);
  await expect(guide).toContainText(
    "Listening to a named band does not mean your brain enters that state.",
  );
  await expect(guide).toContainText("40 Hz is included");
  const evidence = guide.getByRole("link", {
    name: /The science, without the promises/,
  });
  await expect(evidence).toHaveAttribute("href", /\/evidence\/?$/);
  await expect(guide.locator(".guide-sources a")).toHaveCount(3);
});

test("Portuguese mobile room supports keyboard pets, tour, and reduced motion without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(HOME);
  await page.getByRole("button", { name: "Mudar para português" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.locator("html")).toHaveAttribute("data-room-motion", "off");
  await expect(page.getByText("Movimento reduzido ativo")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Pausar|Retomar) animações$/ }),
  ).toHaveCount(0);
  const opener = page.getByRole("button", { name: "Me mostre como" });
  await opener.click();
  const tour = page.getByRole("dialog", { name: "Seus primeiros minutos" });
  await expect(tour).toBeVisible();
  await expect(tour).toContainText("sem benefício garantido");
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  const miso = page.getByRole("button", { name: "Fazer carinho no gato Miso" });
  await miso.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('.pet-message[role="status"]')).toContainText(
    "Miso se aconchega",
  );
  const maple = page.getByRole("button", {
    name: "Fazer carinho no cachorro Maple",
  });
  await maple.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('.pet-message[role="status"]')).toContainText(
    "Maple abana o rabo",
  );
  expect(
    await page
      .locator(".mug-steam")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  await expect(
    page.getByRole("button", { name: "Parar e reiniciar sessão" }),
  ).toBeDisabled();
  await expect(page.locator(".room-scene")).not.toHaveClass(/playing/);
});

test("mobile player shortcut scrolls to Play silently and custom forest mix loses stale factory advice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto(HOME);
  await page.getByRole("button", { name: "Load Forest Cabin" }).click();
  await expect(page.locator(".record-intention")).toContainText(
    "Just listen to the woods",
  );
  await expect(page.locator(".current-frequency-note")).toContainText(
    "there is no binaural beat in this mix",
  );
  const jump = page.getByRole("link", { name: /Go to player/ });
  await expect(jump).toHaveAttribute("href", "#session-controls");
  await jump.click();
  await expect(page).toHaveURL(/#session-controls$/);
  const play = page.getByRole("button", { name: "Play session" });
  await expect
    .poll(async () =>
      play.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      }),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Stop and reset session" }),
  ).toBeDisabled();
  await expect(page.locator(".room-scene")).not.toHaveClass(/playing/);
  await page.getByRole("switch", { name: "Enable binaural tones" }).click();
  await expect(page.locator(".record-intention")).toHaveCount(0);
  await expect(
    page.locator("details.current-frequency-note summary"),
  ).toContainText("About this theta setting");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("linosbinaural:v1:draft") || "{}").mix
            ?.binaural?.enabled,
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Stop and reset session" }),
  ).toBeDisabled();
});

test("tablet frequency readout stays inside its screen at short and long band labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(HOME);
  const beat = page.getByRole("spinbutton", { name: "Beat frequency (Hz)" });
  for (const [frequency, label] of [
    ["2", "Delta"],
    ["40", "Gamma · experiment"],
  ] as const) {
    await beat.fill(frequency);
    await expect(page.locator(".frequency-number")).toContainText(
      Number(frequency).toFixed(1),
    );
    await expect(page.locator(".band-badge")).toContainText(label);
    const geometry = await page
      .locator(".frequency-controls")
      .evaluate((root) => {
        const box = (selector: string) => {
          const element = root.querySelector(selector);
          if (!element)
            throw new Error("Missing frequency element: " + selector);
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        };
        return {
          screen: box(".frequency-screen"),
          controls: box(".frequency-sliders"),
          items: {
            eyebrow: box(".frequency-screen > .eyebrow"),
            number: box(".frequency-number"),
            badge: box(".band-badge"),
          },
        };
      });
    expect(
      geometry.screen.right,
      frequency + " Hz screen/control gap",
    ).toBeLessThan(geometry.controls.left);
    for (const [name, item] of Object.entries(geometry.items)) {
      expect(
        item.left,
        frequency + " Hz " + name + " left edge",
      ).toBeGreaterThanOrEqual(geometry.screen.left - 1);
      expect(
        item.right,
        frequency + " Hz " + name + " right edge",
      ).toBeLessThanOrEqual(geometry.screen.right + 1);
      expect(
        item.right,
        frequency + " Hz " + name + " must not overlap controls",
      ).toBeLessThan(geometry.controls.left);
    }
  }
});
