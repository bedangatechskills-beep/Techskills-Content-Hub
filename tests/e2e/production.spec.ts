import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Phase 3 demo path: Nil assigns from Unassigned Work; Sumeej's row leads the
// Team Board; Sumeej completes a task, uploads a poster, adds the folder link,
// submits; Nil returns it with a reason; Sumeej re-uploads; Nil passes.
// Bedanga opens Sumeej's backlog and sees the history.
const PASSWORD = "Password123!";
const POSTER = path.join(__dirname, "fixtures", "poster.png");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", { timeout: 30_000 });
}
async function logout(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
}
async function uploadPoster(page: Page) {
  await page.getByLabel("File").setInputFiles(POSTER);
  await page.getByRole("button", { name: /upload review version/i }).click();
  await expect(page.getByText(/Review version uploaded|Uploaded/).first()).toBeVisible({
    timeout: 30_000,
  });
}

test("production demo path", async ({ page }) => {
  test.setTimeout(240_000);

  // Siris creates; the script gate is covered elsewhere, so jump the record to Ready for Production in the DB.
  await login(page, "siris@techskills.institute");
  await page.goto("/content/new");
  const title = `Prod e2e ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Region").selectOption("NP");
  await page.getByLabel("Content type").selectOption({ label: "Reel / short vertical video" });
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page).toHaveURL(/\/content\/TS-NP-\d{4}-\d{3}$/, { timeout: 45_000 });
  const url = page.url();
  const code = url.split("/").pop()!;
  await logout(page);

  const docker =
    "C:/Users/Bedanga.BEDANGA-PC/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe";
  execSync(
    `"${docker}" exec -i supabase_db_content-hub psql -U postgres -d postgres -c "update public.content_records set status_key='ready_for_production' where content_id='${code}'; update public.stage_history set exited_at=now() where exited_at is null and content_id=(select id from public.content_records where content_id='${code}'); insert into public.stage_history(content_id,status_key) select id,'ready_for_production' from public.content_records where content_id='${code}';"`,
    { stdio: "ignore" },
  );

  // Nil assigns from Unassigned Work on the Team Board
  await login(page, "nil@techskills.institute");
  await page.goto("/team");
  const row = page.getByRole("row", { name: new RegExp(code) }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Assign" }).click();
  const dlg = page.getByRole("dialog");
  const sumeejValue = await dlg
    .locator("select option", { hasText: "Sumeej" })
    .first()
    .getAttribute("value");
  await dlg.locator("select").selectOption(sumeejValue!);
  await dlg.getByRole("button", { name: /^assign$/i }).click();
  await expect(page.getByText(new RegExp(`${code} assigned`, "i")).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.reload();
  await expect(
    page
      .getByRole("row", { name: new RegExp(code) })
      .filter({ has: page.getByRole("button", { name: "Assign" }) }),
  ).toHaveCount(0);
  const firstProductionRow = page.getByRole("table").first().getByRole("row").nth(1);
  await expect(firstProductionRow).toContainText("Sumeej");
  await logout(page);

  // Sumeej works it
  await login(page, "sumeej@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await page
    .getByRole("button", { name: /add task/i })
    .first()
    .click();
  await page.getByLabel("Title").fill("Edit video");
  await page
    .getByRole("button", { name: /^add task$/i })
    .last()
    .click();
  await expect(page.getByText("Task added")).toBeVisible({ timeout: 15_000 });
  await page
    .locator("select")
    .filter({ hasText: /To do|In progress/ })
    .first()
    .selectOption("done");
  await expect(page.getByText(/Task updated/).first()).toBeVisible({ timeout: 15_000 });
  await uploadPoster(page);
  await page
    .getByLabel("Folder URL")
    .fill("https://techskills.sharepoint.com/sites/marketing/" + code);
  await page.getByRole("button", { name: /save link/i }).click();
  await expect(page.getByText(/Folder link saved/i).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /submit for production review/i }).click();
  await expect(page.getByText("Production Review").first()).toBeVisible({ timeout: 20_000 });
  await logout(page);

  // Nil returns it with a reason
  await login(page, "nil@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await page.getByLabel("Notes").fill("Subtitles are missing");
  await page.getByRole("button", { name: /return to production/i }).click();
  const confirm = page.getByRole("dialog");
  if (await confirm.isVisible().catch(() => false)) {
    await confirm
      .getByRole("button", { name: /return/i })
      .last()
      .click();
  }
  await expect(page.getByText(/Returned to production/).first()).toBeVisible({ timeout: 20_000 });
  await logout(page);

  // Sumeej re-uploads and resubmits
  await login(page, "sumeej@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await uploadPoster(page);
  await page.getByRole("button", { name: /submit for production review/i }).click();
  await expect(page.getByText("Production Review").first()).toBeVisible({ timeout: 20_000 });
  await logout(page);

  // Nil passes
  await login(page, "nil@techskills.institute");
  await page.goto(`${url}?tab=production`);
  await page.getByRole("button", { name: /pass production review/i }).click();
  await expect(page.getByText(/Production review passed/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("DM / Brand Review").first()).toBeVisible();
  await logout(page);

  // Bedanga opens Sumeej's backlog
  await login(page, "app@techskills.institute");
  await page.goto("/team");
  await page.getByRole("link", { name: "Sumeej" }).first().click();
  await expect(page).toHaveURL(/\/people\/.+\/backlog/);
  await expect(page.getByText("Recently done").first()).toBeVisible();
  await expect(page.getByText(new RegExp(code)).first()).toBeVisible();
});
