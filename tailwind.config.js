/** @type {import('tailwindcss').Config} */
// Couleurs définies par variables CSS (src/index.css) : le mode nuit les redéfinit d'un coup.
const v = (nom) => `rgb(var(--${nom}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fond: v('fond'),
        carte: v('carte'),
        creux: v('creux'),
        texte: v('texte'),
        doux: v('doux'),
        bord: v('bord'),
        nuit: v('nuit'),
        feu: v('feu'),
        feuclair: v('feuclair'),
        vert: v('vert'),
        alerte: v('alerte'),
        ambre: v('ambre')
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
}
