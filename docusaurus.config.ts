import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Centralized identifiers keep plugin config reusable and commentable.
const CANONICAL_URL =
  process.env.DOCS_CANONICAL_URL ?? 'https://docs.achilles.run';
const GA_TRACKING_ID =
  process.env.DOCS_GOOGLE_ANALYTICS_ID ?? 'G-0000000000';
const GTAG_TRACKING_ID =
  process.env.DOCS_GOOGLE_GTAG_ID ?? 'G-0000000000';
const GTM_CONTAINER_ID =
  process.env.DOCS_GOOGLE_TAG_MANAGER_ID ?? 'GTM-XXXXXXX';

const config: Config = {
  title: 'Achilles Runs',
  tagline: 'Dark-first observability, CI intelligence, and agent-aware rules.',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: CANONICAL_URL,
  baseUrl: '/',
  organizationName: 'achilles-run',
  projectName: 'achilles-runs',
  onBrokenLinks: 'throw',
  markdown: {
    // Docstring: keep Markdown link enforcement centralized for future v4 migrations.
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/achilles-run/achilles-runs/tree/main/docs/achilles-docs/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: {
          showReadingTime: true,
          postsPerPage: 10,
          feedOptions: {
            type: ['rss', 'atom'],
          },
          editUrl:
            'https://github.com/achilles-run/achilles-runs/tree/main/docs/achilles-docs/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-google-analytics',
      {
        trackingID: GA_TRACKING_ID,
        anonymizeIP: true,
      },
    ],
    [
      '@docusaurus/plugin-google-gtag',
      {
        trackingID: GTAG_TRACKING_ID,
        anonymizeIP: true,
      },
    ],
    [
      '@docusaurus/plugin-google-tag-manager',
      {
        containerId: GTM_CONTAINER_ID,
      },
    ],
    [
      '@docusaurus/plugin-ideal-image',
      {
        disableInDev: false,
        quality: 85,
        max: 1600,
        min: 400,
        steps: 4,
        backgrounds: {
          light: '#f0f4ff',
          dark: '#05070c',
        },
      },
    ],
    [
      '@docusaurus/plugin-pwa',
      {
        debug: false,
        offlineModeActivationStrategies: [
          'appInstalled',
          'queryString',
          'standalone',
        ],
        injectManifestConfig: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,json,woff2}'],
        },
        pwaHead: [
          {
            tagName: 'link',
            rel: 'icon',
            href: '/img/logo.svg',
          },
          {
            tagName: 'link',
            rel: 'manifest',
            href: '/manifest.json',
          },
          {
            tagName: 'meta',
            name: 'theme-color',
            content: '#05070c',
          },
        ],
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        createRedirects(existingPath) {
          if (existingPath.includes('/tutorial/')) {
            return [existingPath.replace('/tutorial/', '/docs/tutorial-basics/')];
          }
          return undefined;
        },
        redirects: [
          {
            to: '/docs/intro',
            from: '/getting-started',
          },
        ],
      },
    ],
    [
      '@docusaurus/plugin-sitemap',
      {
        changefreq: 'daily',
        priority: 0.8,
        filename: 'sitemap.xml',
        ignorePatterns: ['/tags/**'],
      },
    ],
  ],

  themes: ['@docusaurus/theme-live-codeblock', '@docusaurus/theme-mermaid'],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    // Dark-first UX keeps the docs visually aligned with Achilles dashboards.
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    navbar: {
      title: 'Achilles Runs',
      logo: {
        alt: 'Achilles Runs Glyph',
        src: 'img/logo.svg',
      },
      hideOnScroll: true,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/blog', label: 'Updates', position: 'left'},
        {
          href: 'https://github.com/achilles-run/achilles-runs',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://status.achilles.run',
          label: 'Status',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Intro', to: '/docs/intro'},
            {label: 'Tutorial', to: '/docs/category/tutorial---basics'},
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discussions',
              href: 'https://github.com/achilles-run/achilles-runs/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/achilles-run/achilles-runs/issues',
            },
            {
              label: 'Cursor MCP',
              href: 'https://cursor.sh/mcp',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Blog', to: '/blog'},
            {
              label: 'Twitter',
              href: 'https://twitter.com/achilles',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Achilles.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.nightOwl,
      additionalLanguages: ['bash', 'json'],
    },
    metadata: [
      {name: 'theme-color', content: '#05070c'},
      {name: 'og:title', content: 'Achilles Runs'},
      {
        name: 'og:description',
        content:
          'Build intelligence hub for Achilles observability, CI tracing, and rule enforcement.',
      },
    ],
    announcementBar: {
      id: 'alpha-preview',
      content:
        'Cursor MCP ingestion is in active development — watch the blog for rollout notes.',
      backgroundColor: '#071b2c',
      textColor: '#ffffff',
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
