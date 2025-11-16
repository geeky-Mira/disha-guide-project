import autoprefixer from 'autoprefixer';
import tailwindcssPostcss from '@tailwindcss/postcss'; // Rename the import

const config = {
  plugins: [
    tailwindcssPostcss, // Use the imported name
    autoprefixer,
  ],
};

export default config;