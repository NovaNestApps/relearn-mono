/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/app/**/*.{ts,tsx}",
        "./src/components/**/*.{ts,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                primary: "#6366f1",
                secondary: "#8b5cf6"
            },
            borderRadius: {
                xl: "1rem"
            }
        }
    },
    plugins: []
};
