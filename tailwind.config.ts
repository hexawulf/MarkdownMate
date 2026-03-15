import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.foreground'),
            '--tw-prose-headings': theme('colors.foreground'),
            '--tw-prose-lead': theme('colors.foreground'),
            '--tw-prose-links': 'var(--dt-brown)',
            '--tw-prose-bold': theme('colors.foreground'),
            '--tw-prose-counters': 'var(--dt-ink-muted)',
            '--tw-prose-bullets': 'var(--dt-gold)',
            '--tw-prose-hr': theme('colors.border'),
            '--tw-prose-quotes': theme('colors.foreground'),
            '--tw-prose-quote-borders': 'var(--dt-gold)',
            '--tw-prose-captions': 'var(--dt-ink-muted)',
            '--tw-prose-code': theme('colors.foreground'),
            '--tw-prose-pre-code': '#E0D8C8',
            '--tw-prose-pre-bg': '#2D2A24',
            '--tw-prose-th-borders': theme('colors.border'),
            '--tw-prose-td-borders': theme('colors.border'),
            '--tw-prose-invert-body': theme('colors.foreground'),
            '--tw-prose-invert-headings': theme('colors.foreground'),
            '--tw-prose-invert-lead': theme('colors.foreground'),
            '--tw-prose-invert-links': 'var(--dt-gold)',
            '--tw-prose-invert-bold': theme('colors.foreground'),
            '--tw-prose-invert-counters': 'var(--dt-ink-muted)',
            '--tw-prose-invert-bullets': 'var(--dt-gold)',
            '--tw-prose-invert-hr': theme('colors.border'),
            '--tw-prose-invert-quotes': theme('colors.foreground'),
            '--tw-prose-invert-quote-borders': 'var(--dt-gold)',
            '--tw-prose-invert-captions': 'var(--dt-ink-muted)',
            '--tw-prose-invert-code': theme('colors.foreground'),
            '--tw-prose-invert-pre-code': '#E0D8C8',
            '--tw-prose-invert-pre-bg': '#1E1B17',
            '--tw-prose-invert-th-borders': theme('colors.border'),
            '--tw-prose-invert-td-borders': theme('colors.border'),
            'h1, h2, h3, h4, h5, h6': {
              fontFamily: 'inherit',
              fontWeight: '600',
              letterSpacing: 'normal',
            },
            'a': {
              color: 'var(--dt-brown)',
              textDecoration: 'none',
              transition: 'color 0.15s',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            'blockquote': {
              borderLeftColor: theme('colors.border'),
              color: 'var(--dt-ink-muted)',
              fontStyle: 'normal',
            },
            'code:not(pre code)': {
              backgroundColor: theme('colors.muted'),
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              color: theme('colors.foreground'),
              fontWeight: 'inherit',
              '&::before': {
                content: 'none',
              },
              '&::after': {
                content: 'none',
              },
            },
          },
        },
      }),
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        card: {
          DEFAULT: "rgb(var(--card))",
          foreground: "rgb(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "rgb(var(--popover))",
          foreground: "rgb(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "rgb(var(--primary))",
          foreground: "rgb(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary))",
          foreground: "rgb(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "rgb(var(--muted))",
          foreground: "rgb(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "rgb(var(--accent))",
          foreground: "rgb(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive))",
          foreground: "rgb(var(--destructive-foreground))",
        },
        border: "rgb(var(--border))",
        input: "rgb(var(--input))",
        ring: "rgb(var(--ring))",
        chart: {
          "1": "rgb(var(--chart-1))",
          "2": "rgb(var(--chart-2))",
          "3": "rgb(var(--chart-3))",
          "4": "rgb(var(--chart-4))",
          "5": "rgb(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "rgb(var(--sidebar-background))",
          foreground: "rgb(var(--sidebar-foreground))",
          primary: "rgb(var(--sidebar-primary))",
          "primary-foreground": "rgb(var(--sidebar-primary-foreground))",
          accent: "rgb(var(--sidebar-accent))",
          "accent-foreground": "rgb(var(--sidebar-accent-foreground))",
          border: "rgb(var(--sidebar-border))",
          ring: "rgb(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
