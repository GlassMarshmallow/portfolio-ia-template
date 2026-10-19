// Copia el CSS de GlassMarshmallow y de sus iconos a src/styles-vendor, y sus scripts opcionales a
// src/vendor/glassmarshmallow (se guardan en el repositorio, así la imagen de Docker no necesita las otras
// carpetas). Úsalo al actualizar el framework: npm run glassmarshmallow
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'src/styles-vendor');
copyFileSync(join(root, '../glassmarshmallow/dist/css/glassmarshmallow.min.css'), join(vendor, 'glassmarshmallow.min.css'));
copyFileSync(join(root, '../glassmarshmallow-icons/font/glassmarshmallow-icons.css'), join(vendor, 'glassmarshmallow-icons.css'));
// La letra Montserrat (opcional en el framework): su CSS la busca en ../fonts, es decir, en src/fonts
copyFileSync(join(root, '../glassmarshmallow/dist/css/glassmarshmallow-font.min.css'), join(vendor, 'glassmarshmallow-font.min.css'));
const fonts = join(root, 'src/fonts');
mkdirSync(fonts, { recursive: true });
for (const file of ['montserrat-latin.woff2', 'OFL.txt']) {
  copyFileSync(join(root, '../glassmarshmallow/dist/fonts', file), join(fonts, file));
}
const scripts = join(root, 'src/vendor/glassmarshmallow');
mkdirSync(scripts, { recursive: true });
for (const file of ['gallery.js', 'gallery.d.ts']) {
  copyFileSync(join(root, '../glassmarshmallow/js', file), join(scripts, file));
}
console.log('GlassMarshmallow → src/styles-vendor, src/fonts y src/vendor/glassmarshmallow');
