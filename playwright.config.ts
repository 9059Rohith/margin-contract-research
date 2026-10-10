import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:90_000,
  expect:{timeout:30_000},
  use:{baseURL:'http://127.0.0.1:3100',headless:true,trace:'retain-on-failure'},
  webServer:{
    command:'npx next dev -p 3100',
    url:'http://127.0.0.1:3100/api/health',
    reuseExistingServer:!process.env.CI,
    timeout:120_000,
    env:{DATA_DIR:'./tmp/e2e-data',E2E_BUILD_DIR:'1',LLM_API_KEY:''},
  },
});
