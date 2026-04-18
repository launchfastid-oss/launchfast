import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1D9E75', 500: '#1D9E75', 600: '#178A64', 700: '#117653' },
        danger: '#E24B4A', success: '#639922', warning: '#EF9F27',
      },
      fontFamily: { sans: ['Plus Jakarta Sans','Inter','sans-serif'] },
      borderRadius: { card: '12px', pill: '20px' },
    },
  },
  plugins: [],
}
export default config