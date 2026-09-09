import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Playwright transpiles specs to CJS (the package is not `"type": "module"`),
// so `__dirname` is available and `import.meta` is not.
const FIXTURES = join(__dirname, "fixtures");
const IMAGE = join(FIXTURES, "quadrants.png");

/**
 * Selectors use accessible roles and labels wherever the markup offers them, and
 * `data-testid` only for containers with no semantic identity (the preview canvas,
 * the side panels). Copy is matched in English: `DEFAULT_LOCALE` is "en" and the
 * locale is read only from localStorage, so a fresh context is deterministic.
 *
 * The fixture is a 16x16 image of four solid quadrants. `loadAndResizeImage`
 * samples each target cell's centre pixel, so generating at 2x2 lands exactly one
 * quadrant per cell — the resulting blocks are known, not approximate.
 */
const EXPECTED_BLOCKS = {
  allCategories: ["Black Concrete", "White Wool", "Orange Concrete", "Purple Wool"],
  woolOnly: ["Black Wool", "White Wool", "Red Wool", "Purple Wool"],
};

/** A block that never appears in the fixture's grid, so its presence is unambiguous. */
const REPLACEMENT = "Magenta Wool";

async function uploadAndGenerate(page: Page, { width = 2, height = 2 } = {}) {
  await page.goto("/create");

  await page.locator('input[type="file"]').setInputFiles(IMAGE);
  await expect(page.getByRole("complementary").getByText("quadrants.png")).toBeVisible();

  await page.getByLabel("Width").fill(String(width));
  await page.getByLabel("Height").fill(String(height));
  await page.getByRole("button", { name: "Generate Pixel Art" }).click();

  await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();
}

async function openMaterials(page: Page) {
  await page.getByRole("button", { name: "Materials" }).click();
  const panel = page.getByTestId("materials-panel");
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("create flow", () => {
  test("uploads an image, generates a grid, and downloads a .litematic", async ({ page }) => {
    await page.goto("/create");

    // The action bar only exists once there is a grid.
    await expect(page.getByTestId("action-bar")).toHaveCount(0);

    await page.locator('input[type="file"]').setInputFiles(IMAGE);
    await expect(page.getByRole("complementary").getByText("quadrants.png")).toBeVisible();

    await page.getByLabel("Schematic name").fill("E2E Art");
    await page.getByLabel("Width").fill("2");
    await page.getByLabel("Height").fill("2");
    await page.getByRole("button", { name: "Generate Pixel Art" }).click();

    await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();
    await expect(page.getByTestId("action-bar")).toBeVisible();
    await expect(page.getByText("2 × 2 blocks")).toBeVisible();

    const panel = await openMaterials(page);
    for (const name of EXPECTED_BLOCKS.allCategories) {
      await expect(panel.getByText(name, { exact: true })).toBeVisible();
    }

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .litematic" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("E2E Art.litematic");

    const bytes = readFileSync(await download.path());
    expect(bytes.length).toBeGreaterThan(0);
    // gzip magic — a real compressed NBT payload, not an error page.
    expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b]);
  });

  test("regenerates the preview when dimensions change", async ({ page }) => {
    await uploadAndGenerate(page, { width: 2, height: 2 });
    await expect(page.getByText("2 × 2 blocks")).toBeVisible();

    await page.getByLabel("Width").fill("4");
    await page.getByLabel("Height").fill("3");
    await page.getByRole("button", { name: "Generate Pixel Art" }).click();

    await expect(page.getByText("4 × 3 blocks")).toBeVisible();
  });

  test("restricting the block palette changes which blocks are generated", async ({ page }) => {
    await uploadAndGenerate(page);

    const panel = await openMaterials(page);
    await expect(panel.getByText("Black Concrete", { exact: true })).toBeVisible();

    // Leave only Wool selected. Category buttons read "Concrete (n)".
    await page.getByRole("button", { name: /^Concrete \(/ }).click();
    await page.getByRole("button", { name: /^Terracotta \(/ }).click();
    await page.getByRole("button", { name: "Generate Pixel Art" }).click();

    for (const name of EXPECTED_BLOCKS.woolOnly) {
      await expect(panel.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(panel.getByText("Black Concrete", { exact: true })).toHaveCount(0);
    await expect(panel.getByText("Orange Concrete", { exact: true })).toHaveCount(0);
  });

  test("refuses to deselect the last remaining block category", async ({ page }) => {
    // `handleCategoryToggle` returns early when the set would empty, which makes
    // the "No blocks available" error unreachable from the UI. Assert the guard
    // that is actually in force rather than the error that never fires.
    await uploadAndGenerate(page);

    for (const cat of ["Wool", "Concrete", "Terracotta"]) {
      await page.getByRole("button", { name: new RegExp(`^${cat} \\(`) }).click();
    }

    // Whichever category was clicked last is still selected, so generation works.
    await page.getByRole("button", { name: "Generate Pixel Art" }).click();
    await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();
    await expect(
      page.getByText("No blocks available. Select at least one category."),
    ).toHaveCount(0);
  });
});

test.describe("undo", () => {
  /**
   * The undo stack is only ever pushed by a grid edit (`handleRegionReplace`,
   * `handleBlockPainted`, `handleReplaceBlock`). Driving it through the materials
   * panel's Replace flow keeps this in plain DOM — the other two need synthesised
   * canvas coordinates, which a refactor of PixelArtPreview would invalidate.
   */
  async function replaceFirstBlock(page: Page) {
    const panel = await openMaterials(page);

    await panel.getByRole("button", { name: "Replace", exact: true }).first().click();

    const picker = page.getByRole("dialog");
    await expect(picker).toBeVisible();
    await picker.getByPlaceholder("Search blocks…").fill(REPLACEMENT);
    await picker.getByRole("button", { name: REPLACEMENT, exact: true }).click();

    await expect(picker).toHaveCount(0);
    await expect(panel.getByText(REPLACEMENT, { exact: true })).toBeVisible();
    return panel;
  }

  test("the undo control only appears once the grid has been edited", async ({ page }) => {
    await uploadAndGenerate(page);
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);

    await replaceFirstBlock(page);
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  test("undo restores the replaced block and empties the stack", async ({ page }) => {
    await uploadAndGenerate(page);
    const panel = await replaceFirstBlock(page);

    await page.getByRole("button", { name: "Undo" }).click();

    await expect(panel.getByText(REPLACEMENT, { exact: true })).toHaveCount(0);
    for (const name of EXPECTED_BLOCKS.allCategories) {
      await expect(panel.getByText(name, { exact: true })).toBeVisible();
    }
    // The stack is empty again, so the control unmounts.
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
  });

  test("Ctrl+Z undoes an edit", async ({ page }) => {
    await uploadAndGenerate(page);
    const panel = await replaceFirstBlock(page);

    // A window keydown listener — a separate code path from the button.
    await page.keyboard.press("ControlOrMeta+z");

    await expect(panel.getByText(REPLACEMENT, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
  });

  test("undo steps back through several edits one at a time", async ({ page }) => {
    await uploadAndGenerate(page);
    const panel = await replaceFirstBlock(page);

    await panel.getByRole("button", { name: "Replace", exact: true }).first().click();
    const picker = page.getByRole("dialog");
    await picker.getByPlaceholder("Search blocks…").fill("Lime Wool");
    await picker.getByRole("button", { name: "Lime Wool", exact: true }).click();
    await expect(panel.getByText("Lime Wool", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(panel.getByText("Lime Wool", { exact: true })).toHaveCount(0);
    // The first edit is still applied — one undo, one step.
    await expect(panel.getByText(REPLACEMENT, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(panel.getByText(REPLACEMENT, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
  });
});

test.describe("?creation= deep link", () => {
  const CREATION_ID = "cre_e2e_fixture";

  const CREATION = {
    id: CREATION_ID,
    authorId: "usr_e2e",
    authorNickname: "e2e",
    title: "Hydrated Creation",
    description: "",
    tags: [],
    visibility: "private",
    previewImageUrl: "",
    width: 2,
    height: 2,
    blockCount: 4,
    orientation: "horizontal",
    blockCategories: ["Wool"],
    fillBlockId: null,
    foundation: { enabled: true, blockId: "minecraft:deepslate" },
    schematicName: "HydratedArt",
    downloadCount: 0,
    publishedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  /**
   * Both endpoints read Firestore and Firebase Storage server-side. Stubbing them
   * keeps this hermetic — the test is about the hydration effect, not about whether
   * a document happens to exist in a shared project.
   */
  async function stubCreationRoutes(page: Page) {
    await page.route(`**/api/creations/${CREATION_ID}`, (route) =>
      route.fulfill({ json: CREATION }),
    );
    await page.route(`**/api/creations/${CREATION_ID}/grid`, (route) =>
      route.fulfill({
        contentType: "application/gzip",
        body: readFileSync(join(FIXTURES, "grid.json.gz")),
      }),
    );
  }

  test("hydrates every editor field from the saved creation", async ({ page }) => {
    await stubCreationRoutes(page);
    await page.goto(`/create?creation=${CREATION_ID}`);

    await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();

    await expect(page.getByLabel("Schematic name")).toHaveValue("HydratedArt");
    await expect(page.getByLabel("Width")).toHaveValue("2");
    await expect(page.getByLabel("Height")).toHaveValue("2");
    await expect(page.getByText("2 × 2 blocks")).toBeVisible();

    // orientation "horizontal" means the foundation section renders at all.
    await expect(page.getByLabel("Foundation block")).toHaveValue("minecraft:deepslate");

    // The grid fixture is black/white wool — proof the gzipped payload was decoded.
    const panel = await openMaterials(page);
    await expect(panel.getByText("Black Wool", { exact: true })).toBeVisible();
    await expect(panel.getByText("White Wool", { exact: true })).toBeVisible();

    // The effect ends with setUndoStack([]) — nothing to undo on a fresh load.
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
  });

  test("downloads the hydrated grid without regenerating it", async ({ page }) => {
    await stubCreationRoutes(page);
    await page.goto(`/create?creation=${CREATION_ID}`);
    await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .litematic" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("HydratedArt.litematic");
    const bytes = readFileSync(await download.path());
    expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b]);
  });

  test("shows the loading banner while hydrating, and clears it when done", async ({ page }) => {
    await page.route(`**/api/creations/${CREATION_ID}`, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({ json: CREATION });
    });
    await page.route(`**/api/creations/${CREATION_ID}/grid`, (route) =>
      route.fulfill({
        contentType: "application/gzip",
        body: readFileSync(join(FIXTURES, "grid.json.gz")),
      }),
    );

    await page.goto(`/create?creation=${CREATION_ID}`);
    await expect(page.getByText("Loading creation…")).toBeVisible();
    await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();
    await expect(page.getByText("Loading creation…")).toHaveCount(0);
  });

  test("clears the loading banner even when hydration fails", async ({ page }) => {
    await page.route(`**/api/creations/${CREATION_ID}**`, async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.fulfill({ status: 500, json: { error: "boom" } });
    });

    await page.goto(`/create?creation=${CREATION_ID}`);
    await expect(page.getByText("Loading creation…")).toBeVisible();
    await expect(
      page.getByText("Failed to load the creation. Please try again."),
    ).toBeVisible();
    await expect(page.getByText("Loading creation…")).toHaveCount(0);
  });

  test("shows no loading banner without a ?creation param", async ({ page }) => {
    await page.goto("/create");
    await expect(page.getByText("Loading creation…")).toHaveCount(0);
  });

  test("surfaces an error instead of hanging when the creation cannot be loaded", async ({
    page,
  }) => {
    await page.route(`**/api/creations/${CREATION_ID}**`, (route) =>
      route.fulfill({ status: 500, json: { error: "boom" } }),
    );
    await page.goto(`/create?creation=${CREATION_ID}`);

    await expect(
      page.getByText("Failed to load the creation. Please try again."),
    ).toBeVisible();
  });
});

test.describe("3D viewer", () => {
  test("mounts the dynamically imported three.js viewer without throwing", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await uploadAndGenerate(page);
    await page.getByRole("button", { name: "3D", exact: true }).click();

    await expect(page.getByTestId("viewer-3d")).toBeVisible();
    await expect(page.getByTestId("viewer-3d").locator("canvas")).toBeVisible();

    expect(pageErrors).toEqual([]);

    // Switching back must not tear anything down badly either.
    await page.getByRole("button", { name: "2D", exact: true }).click();
    await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

test.describe("header navigation", () => {
  /**
   * A fresh context has no Clerk session, so this is the signed-out header. The
   * signed-in half (`/dashboard`, `UserMenu`) and the sign-in round trip itself
   * need an authenticated session, which the suite cannot fake yet.
   *
   * `/` and `/gallery` both read Firestore server-side, so any link that is
   * actually followed here is stubbed — these are specs about `/create`'s chrome.
   */
  test("a signed-out visitor is offered home, the gallery and sign-in", async ({ page }) => {
    await page.goto("/create");
    const header = page.getByRole("banner");

    await expect(header.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(header.getByRole("link", { name: "Gallery" })).toHaveAttribute(
      "href",
      "/gallery",
    );
    // Clerk's <SignInButton> wraps a button, not a link.
    await expect(header.getByRole("button", { name: "Sign in" })).toBeVisible();

    // /dashboard stays gated on the session.
    await expect(header.getByRole("link", { name: "My Creations" })).toHaveCount(0);

    // The page heading is not buried inside the logo anchor.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("mc-pixel app");
  });

  test("header links navigate freely while the editor is empty", async ({ page }) => {
    // The gallery page itself reads Firestore server-side; stub it so this stays
    // a test of the leave-guard's early return and nothing else.
    await page.route("**/gallery**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<html><body>gallery stub</body></html>" }),
    );

    await page.goto("/create");
    await page.getByRole("banner").getByRole("link", { name: "Gallery" }).click();

    // Nothing to lose, so `onNavigate` returns early and the dialog never opens.
    await expect(page).toHaveURL(/\/gallery/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("leave guard", () => {
  test("warns before leaving the editor with a generated grid", async ({ page }) => {
    await uploadAndGenerate(page);

    await page.getByRole("banner").getByRole("link", { name: "Gallery" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Leave the editor?")).toBeVisible();

    await dialog.getByRole("button", { name: "Stay" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/create$/);
    // Staying means the work is still there — the point of the guard.
    await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();
    await expect(page.getByText("2 × 2 blocks")).toBeVisible();
  });

  test("guards the logo link as well as the nav links", async ({ page }) => {
    await uploadAndGenerate(page);

    await page.getByRole("banner").getByRole("link", { name: "Home" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Leave the editor?")).toBeVisible();

    await dialog.getByRole("button", { name: "Stay" }).click();
    await expect(page).toHaveURL(/\/create$/);
  });
});

test.describe("layout and theme", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("renders the full editor in light and dark at 1280px", async ({ page }) => {
    await uploadAndGenerate(page);

    const html = page.locator("html");

    for (const theme of ["Light", "Dark"] as const) {
      // Toggle in-app rather than reloading — editor state lives in memory.
      await page.getByRole("button", { name: theme, exact: true }).click();

      if (theme === "Dark") {
        await expect(html).toHaveClass(/\bdark\b/);
      } else {
        await expect(html).not.toHaveClass(/\bdark\b/);
      }

      await expect(page.getByTestId("preview-panel")).toBeVisible();
      await expect(page.getByTestId("pixel-art-canvas")).toBeVisible();
      await expect(page.getByTestId("action-bar")).toBeVisible();
      await expect(page.getByRole("button", { name: "Generate Pixel Art" })).toBeVisible();

      // Desktop target is >=1280px — nothing may push the body wider.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });
});
