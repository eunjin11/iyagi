import { test as base } from "@playwright/test";

/**
 * 각 테스트·탐색마다 앱 스크립트보다 먼저 실행되어 localStorage 등이 남아
 * 시나리오가 흔들리지 않게 함.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
