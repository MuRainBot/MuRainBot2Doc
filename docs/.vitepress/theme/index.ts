import DefaultTheme from 'vitepress/theme'
import type { Theme as ThemeConfig } from 'vitepress'
import {
  NolebaseGitChangelogPlugin
} from '@nolebase/vitepress-plugin-git-changelog/client'

import '@nolebase/vitepress-plugin-git-changelog/client/style.css'

export const Theme: ThemeConfig = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(NolebaseGitChangelogPlugin);
  },

}

export default Theme
