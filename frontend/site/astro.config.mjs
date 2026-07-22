// @ts-check
import { defineConfig } from 'astro/config';

// 官网走根域名 homework.today；应用（家长端）在 app.homework.today。
export default defineConfig({
  site: 'https://homework.today',
});
