import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    // 기본값은 playwright가 관리하는 headless shell을 사용.
    // 다운로드가 막힌 환경에서만 시스템 Chrome을 쓰고 싶으면:
    //   PW_USE_SYSTEM_CHROME=1 yarn test:e2e
    channel: process.env.PW_USE_SYSTEM_CHROME ? "chrome" : undefined,
    trace: "off",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "yarn dev --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
