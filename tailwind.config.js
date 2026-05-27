const defaultTheme = require('tailwindcss/defaultTheme');

const colorVar = (variable) => {
  return ({ opacityValue } = {}) => {
    if (opacityValue === undefined) {
      return `var(${variable})`;
    }

    return `color-mix(in oklch, var(${variable}) calc(${opacityValue} * 100%), transparent)`;
  };
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: colorVar('--background'),
        foreground: colorVar('--foreground'),
        card: {
          DEFAULT: colorVar('--card'),
          foreground: colorVar('--card-foreground'),
        },
        popover: {
          DEFAULT: colorVar('--popover'),
          foreground: colorVar('--popover-foreground'),
        },
        primary: {
          DEFAULT: colorVar('--primary'),
          foreground: colorVar('--primary-foreground'),
        },
        secondary: {
          DEFAULT: colorVar('--secondary'),
          foreground: colorVar('--secondary-foreground'),
        },
        muted: {
          DEFAULT: colorVar('--muted'),
          foreground: colorVar('--muted-foreground'),
        },
        accent: {
          DEFAULT: colorVar('--accent'),
          foreground: colorVar('--accent-foreground'),
        },
        destructive: {
          DEFAULT: colorVar('--destructive'),
          foreground: colorVar('--destructive-foreground'),
        },
        success: colorVar('--success'),
        warning: colorVar('--warning'),
        border: colorVar('--border'),
        input: colorVar('--input'),
        ring: colorVar('--ring'),
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 10px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
      },
      opacity: {
        4: '0.04',
        8: '0.08',
        12: '0.12',
        15: '0.15',
        18: '0.18',
        55: '0.55',
      },
    },
  },
  plugins: [],
};
