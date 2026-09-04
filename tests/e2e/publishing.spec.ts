import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

// Phase 6 demo path: Siris schedules the poster for Instagram and Facebook;
// Keshar sees it in Today, is blocked by the disclosure checkbox because the
// poster used an AI stock image, ticks it, publishes with URLs; the record shows
// Published and Biraj's dashboard shows it under Published This Month.
const PASSWORD = "Password123!";
const docker =
  "C:/Users/Bedanga.BEDANGA-PC/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}
async function logout(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
}
function sql(q: string) {
  execSync(
    `"${docker}" exec -i supabase_db_content-hub psql -U postgres -d postgres -c "${q.replace(/"/g, '\\"')}"`,
    { stdio: "ignore" },
  );
}
function toFinalApproved(code: string): string {
  const rec = `(select id from public.content_records where content_id='${code}')`;
  return [
    `update public.content_records set status_key='final_approved', requires_ai_disclosure=true, dm_owner_id=(select id from public.profiles where email='siris@techskills.institute') where content_id='${code}'`,
    `update public.stage_history set exited_at=now() where exited_at is null and content_id=${rec}`,
    `insert into public.stage_history(content_id,status_key) values (${rec},'final_approved')`,
    `insert into public.content_platforms(content_id, platform_id) select ${rec}, id from public.platforms where key in ('facebook','instagram') on conflict do nothing`,
  ].join("; ");
}

test("publishing demo path", async ({ page }) => {
  test.setTimeout(240_000);

  await login(page, "siris@techskills.institute");
  await page.goto("/content/new");
  await page.getByLabel("Title").fill(`Publish e2e ${Date.now()}`);
  await page.getByLabel("Region").selectOption("NP");
  await page.getByLabel("Content type").selectOption({ label: "Admission poster" });
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page).toHaveURL(/\/content\/TS-NP-\d{4}-\d{3}$/, { timeout: 45_000 });
  const url = page.url();
  const code = url.split("/").pop()!;
  sql(toFinalApproved(code));

  // Siris schedules both platforms for tomorrow morning
  await page.goto(`${url}?tab=publishing`);
  await expect(page.getByText(/Schedule for publishing/)).toBeVisible();
  const tomorrow = new Date(Date.now() + 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`;
  const whens = page.locator('input[type="datetime-local"]');
  await expect(whens).toHaveCount(2);
  await whens.nth(0).fill(local);
  await whens.nth(1).fill(local);
  await page.locator("#publisher-0").selectOption({ label: "Keshar" });
  await page.locator("#publisher-1").selectOption({ label: "Keshar" });
  await page.getByRole("button", { name: /^schedule$/i }).click();
  await expect(page.getByText(/Schedule saved/).first()).toBeVisible({ timeout: 20_000 });
  await page.goto(`${url}?tab=publishing`);
  await expect(page.getByText("Scheduled").first()).toBeVisible();
  await expect(page.getByText("AI disclosure required").first()).toBeVisible();
  await logout(page);

  // Keshar: queue → record → blocked until the checkbox → publish with URLs
  await login(page, "keshar@techskills.institute");
  await expect(page.getByText(/^Publisher ·/)).toBeVisible();
  await page.goto("/publishing");
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText(/Disclosure pending/).first()).toBeVisible();
  await page.goto(`${url}?tab=publishing`);
  await page.getByLabel("Facebook URL").fill("https://www.facebook.com/techskills.nepal/posts/1");
  await page.getByLabel("Instagram URL").fill("https://www.instagram.com/p/abc123/");
  const publish = page.getByRole("button", { name: /mark published/i });
  await expect(publish).toBeDisabled();
  await expect(page.getByText(/Blocked: tick the AI disclosure/)).toBeVisible();
  await page.getByLabel(/I confirm the platform AI-content disclosure/).check();
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByText(/Published\. Live URLs stored/).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.goto(`${url}?tab=publishing`);
  await expect(page.getByText("Disclosure confirmed").first()).toBeVisible();
  await expect(page.getByText("https://www.instagram.com/p/abc123/")).toBeVisible();
  await page.goto(`${url}?tab=activity`);
  await expect(
    page.getByText(/confirmed the platform AI-content disclosure/).first(),
  ).toBeVisible();
  await expect(page.getByText(/published .* on 2 platform/).first()).toBeVisible();
  await logout(page);

  // Biraj's dashboard shows it under Published This Month
  await login(page, "biraj@techskills.institute");
  await expect(page.getByText(/^Final approver ·/)).toBeVisible();
  const card = page.locator("a", { hasText: "Published This Month" });
  await expect(card).toBeVisible();
  const n = Number((await card.innerText()).replace(/\D/g, ""));
  expect(n).toBeGreaterThanOrEqual(1);
  await page.getByRole("button", { name: /notifications/i }).click();
  await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
  await expect(page.getByText(`${code} published`).first()).toBeVisible();
});
