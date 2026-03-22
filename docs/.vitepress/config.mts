import { defineConfig } from "vitepress";

const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  title: "ajan-sql",
  description: "AI-safe MCP server for schema-aware, read-only SQL access.",
  base: isGitHubActions ? "/ajan-sql/" : "/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/" },
      { text: "Tools", link: "/tools" },
      { text: "Security", link: "/security" },
      { text: "Contributing", link: "/contributing" },
      { text: "Roadmap", link: "/roadmap" },
      { text: "npm", link: "https://www.npmjs.com/package/ajan-sql" },
    ],
    sidebar: [
      {
        text: "Documentation",
        items: [
          { text: "Overview", link: "/" },
          { text: "Tools", link: "/tools" },
          { text: "Security", link: "/security" },
          { text: "Contributing", link: "/contributing" },
          { text: "Roadmap", link: "/roadmap" },
          { text: "Changelog", link: "/changelog" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/borakilicoglu/ajan-sql" },
    ],
  },
});
