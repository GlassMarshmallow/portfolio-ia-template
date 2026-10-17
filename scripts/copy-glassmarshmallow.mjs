// Copia el CSS de GlassMarshmallow y de sus iconos a src/styles-vendor (se guardan en el repositorio, así la
// imagen de Docker no necesita las otras carpetas). Úsalo al actualizar el framework: npm run glassmarshmallow
import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'src/styles-vendor');
copyFileSync(join(root, '../glassmarshmallow/dist/css/glassmarshmallow.min.css'), join(vendor, 'glassmarshmallow.min.css'));
copyFileSync(join(root, '../glassmarshmallow-icons/font/glassmarshmallow-icons.css'), join(vendor, 'glassmarshmallow-icons.css'));
console.log('GlassMarshmallow → src/styles-vendor');
