/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    500: '#df6e01',
                    600: '#c45f00',
                },
                // Dark mode background override if needed, but standard dark mode uses slate/zinc/gray
            },
        },
    },
    plugins: [],
    darkMode: 'class', // or 'media'
}
