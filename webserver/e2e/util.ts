import type { Locator, Page } from "@playwright/test";

export function getSectionByHeading(page: Page, headingText: string): Locator {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: headingText }) });
}
