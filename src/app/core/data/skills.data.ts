// Lista de tecnologías: la usan las tarjetas de Habilidades y la franja del inicio.
// Los logos son iconos de GlassMarshmallow (categoría Brand, forma oficial de cada marca): se escribe su nombre,
// sin «gmi-». Lista completa en la web de GlassMarshmallow → Iconos. Sin logo, sale el icono de código.
import type { Skill, SkillGroup } from '../models/skill.models';

// Iconos de categoría (nombres de los iconos de GlassMarshmallow, sin «gmi-»)
const CATEGORY_ICONS = {
  code: 'code-slash',
  window: 'window',
  server: 'hdd-stack',
  tools: 'tools',
  ai: 'stars',
  palette: 'palette'
};

const skill = (name: string, ...icons: string[]): Skill => ({ name, icons });

// Iconos que no son logos de marca: bases de datos (cilindro) y Clip Studio Paint (lápiz; su logo no se puede
// incluir en el set por su licencia). No salen en la franja del inicio.
const GENERIC_ICONS = new Set(['database', 'pencil']);

// Nombre de cada logo en la franja del inicio. Los que ya son el nombre escrito (.NET, PHP) no llevan texto al lado.
export const LOGO_TITLES: Record<string, string> = {
  html5: 'HTML5', css3: 'CSS', javascript: 'JavaScript', typescript: 'TypeScript', csharp: 'C#', php: '', openjdk: 'Java',
  angular: 'Angular', reactivex: 'ReactiveX', react: 'React', shopify: 'Shopify', astro: 'Astro', tailwindcss: 'Tailwind CSS',
  bootstrap: 'Bootstrap', vitest: 'Vitest', dotnet: '', symfony: 'Symfony', doctrine: 'Doctrine', nodedotjs: 'Node.js',
  jsonwebtokens: 'JSON Web Tokens', swagger: 'Swagger', git: 'Git', github: 'GitHub', docker: 'Docker', claude: 'Claude',
  openai: 'OpenAI', obsidian: 'Obsidian', ollama: 'Ollama', adobephotoshop: 'Adobe Photoshop',
  adobeillustrator: 'Adobe Illustrator', adobepremierepro: 'Adobe Premiere Pro', figma: 'Figma',
  wondersharefilmora: 'Wondershare Filmora', obsstudio: 'OBS Studio'
};

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: 'lang-prog',
    title: 'Lenguajes y programación',
    icon: CATEGORY_ICONS.code,
    items: [
      skill('HTML', 'html5'),
      skill('CSS / SASS', 'css3'),
      skill('JavaScript', 'javascript'),
      skill('TypeScript', 'typescript'),
      skill('C#', 'csharp'),
      skill('PHP', 'php'),
      skill('Java (OOP)', 'openjdk'),
      skill('Bases de datos: SQL, MySQL, PostgreSQL, DBC', 'database')
    ]
  },
  {
    id: 'frontend',
    title: 'Frontend',
    icon: CATEGORY_ICONS.window,
    items: [
      skill('Angular', 'angular'),
      skill('RxJS', 'reactivex'),
      skill('React', 'react'),
      skill('Polaris React (Shopify)', 'shopify'),
      skill('Astro (entorno Node.js)', 'astro'),
      skill('Tailwind CSS', 'tailwindcss'),
      skill('Bootstrap', 'bootstrap'),
      skill('Vitest (tests unitarios)', 'vitest'),
      skill('WCAG (accesibilidad web)')
    ]
  },
  {
    id: 'backend',
    title: 'Backend y frameworks',
    icon: CATEGORY_ICONS.server,
    items: [
      skill('.NET (C# / ASP.NET Core Web API)', 'dotnet'),
      skill('Entity Framework Core', 'dotnet'),
      skill('Symfony', 'symfony'),
      skill('Doctrine ORM', 'doctrine'),
      skill('Node.js', 'nodedotjs'),
      skill('PHP (patrones MVC y DAO)', 'php'),
      skill('APIs REST'),
      skill('Integraciones con Shopify', 'shopify'),
      skill('Autenticación JWT', 'jsonwebtokens'),
      skill('Swagger / OpenAPI', 'swagger'),
      skill('Arquitectura limpia (Clean Architecture)'),
      skill('xUnit (tests unitarios)')
    ]
  },
  {
    id: 'tools-devops',
    title: 'Herramientas y DevOps',
    icon: CATEGORY_ICONS.tools,
    items: [
      skill('Git', 'git'),
      skill('GitHub', 'github'),
      skill('Docker / Docker Compose', 'docker')
    ]
  },
  {
    id: 'ai',
    title: 'Inteligencia artificial',
    icon: CATEGORY_ICONS.ai,
    items: [
      skill('Desarrollo asistido por IA (Claude Code)', 'claude'),
      skill('ChatGPT', 'openai'),
      skill('Obsidian (notas y contexto para la IA)', 'obsidian'),
      skill('Ollama (modelos de IA locales)', 'ollama'),
      skill('Integración de IA en webs y APIs')
    ]
  },
  {
    id: 'design-media',
    title: 'Diseño y multimedia',
    icon: CATEGORY_ICONS.palette,
    items: [
      skill('Adobe Photoshop', 'adobephotoshop'),
      skill('Adobe Illustrator', 'adobeillustrator'),
      skill('Adobe Premiere', 'adobepremierepro'),
      skill('Figma', 'figma'),
      skill('Clip Studio Paint', 'pencil'),
      skill('Filmora', 'wondersharefilmora'),
      skill('Procreate'),
      skill('OBS Studio', 'obsstudio')
    ]
  }
];

// Tecnologías con logo propio, sin repetir (para la franja del inicio).
export const SKILL_LOGOS: string[] = [
  ...new Set(SKILL_GROUPS.flatMap(group => group.items).flatMap(item => item.icons).filter(icon => !GENERIC_ICONS.has(icon)))
];

/** Logos de un grupo sin repetir (sin los iconos genéricos), para la vista previa del acordeón cerrado */
export const groupLogos = (group: SkillGroup): string[] => [
  ...new Set(group.items.flatMap(item => item.icons).filter(icon => !GENERIC_ICONS.has(icon)))
];
