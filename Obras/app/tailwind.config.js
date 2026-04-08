/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        biasi: {
          blue:         '#233772',
          'blue-dark':  '#1a2a5e',
          'blue-mid':   '#2d4494',
          'blue-light': '#eef1f8',
          yellow:       '#FFC82D',
          'yellow-dark':'#e6b000',
          'yellow-light':'#FFF3CC',
          gray:         '#B3B3B3',
          dark:         '#333333',
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
