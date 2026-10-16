// Lista de tecnologías: la usan las tarjetas de Habilidades y la franja del inicio.
import type { BootstrapIconName } from '../../shared/icons/bootstrap-icons';
import type { Skill, SkillGroup } from '../models/skill.models';
import {
  type SimpleIcon,
  siAdobeillustrator,
  siAdobephotoshop,
  siAdobepremierepro,
  siAngular,
  siAstro,
  siBootstrap,
  siClaude,
  siCss3,
  siDocker,
  siDoctrine,
  siDotnet,
  siFigma,
  siGit,
  siGithub,
  siHtml5,
  siJavascript,
  siJsonwebtokens,
  siNodedotjs,
  siObsidian,
  siObsstudio,
  siOllama,
  siOpenai,
  siOpenjdk,
  siPhp,
  siReact,
  siReactivex,
  siShopify,
  siSwagger,
  siSymfony,
  siTailwindcss,
  siTypescript,
  siVitest,
  siWondersharefilmora
} from 'simple-icons';

// Logos de Simple Icons (CC0). Las que no tienen logo en la colección llevan un icono genérico.

// Iconos de categoría (nombres de Bootstrap Icons, ver bootstrap-icons.ts)
const CATEGORY_ICONS = {
  code: 'code-slash',
  window: 'window',
  server: 'hdd-stack',
  tools: 'tools',
  ai: 'stars',
  palette: 'palette'
} satisfies Record<string, BootstrapIconName>;

const skill = (name: string, ...icons: SimpleIcon[]): Skill => ({ name, icons });

// Icono genérico de base de datos (cilindro), dibujado con trazo como el de código.
export const DATABASE = { slug: 'database', title: 'Bases de datos', path: '' } as SimpleIcon;

// Logos que no están en Simple Icons:
// - C#: Devicon (devicon-plain:csharp), licencia MIT, https://devicon.dev
const CSHARP = { slug: 'csharp', title: 'C#', path: 'm117.5 33.5l.3-.2c-.6-1.1-1.5-2.1-2.4-2.6L67.1 2.9c-.8-.5-1.9-.7-3.1-.7s-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.3.9 3.4l-.2.1c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7s2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c.1-.8 0-1.7-.4-2.6m-53.5 70c-21.8 0-39.5-17.7-39.5-39.5S42.2 24.5 64 24.5c14.7 0 27.5 8.1 34.3 20l-13 7.5C81.1 44.5 73.1 39.5 64 39.5c-13.5 0-24.5 11-24.5 24.5s11 24.5 24.5 24.5c9.1 0 17.1-5 21.3-12.4l12.9 7.6c-6.8 11.8-19.6 19.8-34.2 19.8M115 62h-3.2l-.9 4h4.1v5h-5l-1.2 6h-4.9l1.2-6h-3.8l-1.2 6h-4.8l1.2-6H94v-5h3.5l.9-4H94v-5h5.3l1.2-6h4.9l-1.2 6h3.8l1.2-6h4.8l-1.2 6h2.2zm-12.7 4h3.8l.9-4h-3.8z' } as SimpleIcon;
// - Clip Studio Paint: Arcticons (arcticons:clip-studio) por Donnnno y el equipo de Arcticons,
//   licencia CC BY-SA 4.0, https://github.com/Arcticons-Team/Arcticons. Es de trazo, no relleno.
const CLIP_STUDIO = { slug: 'clip-studio', title: 'Clip Studio Paint', path: 'm26.652 42.5l-4.672-7.023l13.044-6.682c6.388-3.273 8.324-10.803 4.322-16.819S26.922 3.737 20.533 7.01l-10.6 5.43c-3.354 1.718-4.37 5.671-2.27 8.83c2.101 3.157 6.523 4.324 9.877 2.606l9.395-4.813' } as SimpleIcon;
export const OUTLINE_ICONS = new Set(['clip-studio']);
// Logos que ya son el nombre escrito (".NET", "php"): en la franja del inicio no se repite el texto al lado.
export const WORDMARK_ICONS = new Set(['dotnet', 'php']);

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: 'lang-prog',
    title: 'Lenguajes y programación',
    icon: CATEGORY_ICONS.code,
    items: [
      skill('HTML', siHtml5),
      skill('CSS / SASS', siCss3),
      skill('JavaScript', siJavascript),
      skill('TypeScript', siTypescript),
      skill('C#', CSHARP),
      skill('PHP', siPhp),
      skill('Java (OOP)', siOpenjdk),
      skill('Bases de datos: SQL, MySQL, PostgreSQL, DBC', DATABASE)
    ]
  },
  {
    id: 'frontend',
    title: 'Frontend',
    icon: CATEGORY_ICONS.window,
    items: [
      skill('Angular', siAngular),
      skill('RxJS', siReactivex),
      skill('React', siReact),
      skill('Polaris React (Shopify)', siShopify),
      skill('Astro (entorno Node.js)', siAstro),
      skill('Tailwind CSS', siTailwindcss),
      skill('Bootstrap', siBootstrap),
      skill('Vitest (tests unitarios)', siVitest),
      skill('WCAG (accesibilidad web)')
    ]
  },
  {
    id: 'backend',
    title: 'Backend y frameworks',
    icon: CATEGORY_ICONS.server,
    items: [
      skill('.NET (C# / ASP.NET Core Web API)', siDotnet),
      skill('Entity Framework Core', siDotnet),
      skill('Symfony', siSymfony),
      skill('Doctrine ORM', siDoctrine),
      skill('Node.js', siNodedotjs),
      skill('PHP (patrones MVC y DAO)', siPhp),
      skill('APIs REST'),
      skill('Integraciones con Shopify', siShopify),
      skill('Autenticación JWT', siJsonwebtokens),
      skill('Swagger / OpenAPI', siSwagger),
      skill('Arquitectura limpia (Clean Architecture)'),
      skill('xUnit (tests unitarios)')
    ]
  },
  {
    id: 'tools-devops',
    title: 'Herramientas y DevOps',
    icon: CATEGORY_ICONS.tools,
    items: [
      skill('Git', siGit),
      skill('GitHub', siGithub),
      skill('Docker / Docker Compose', siDocker)
    ]
  },
  {
    id: 'ai',
    title: 'Inteligencia artificial',
    icon: CATEGORY_ICONS.ai,
    items: [
      skill('Desarrollo asistido por IA (Claude Code)', siClaude),
      skill('ChatGPT', siOpenai),
      skill('Obsidian (notas y contexto para la IA)', siObsidian),
      skill('Ollama (modelos de IA locales)', siOllama),
      skill('Integración de IA en webs y APIs')
    ]
  },
  {
    id: 'design-media',
    title: 'Diseño y multimedia',
    icon: CATEGORY_ICONS.palette,
    items: [
      skill('Adobe Photoshop', siAdobephotoshop),
      skill('Adobe Illustrator', siAdobeillustrator),
      skill('Adobe Premiere', siAdobepremierepro),
      skill('Figma', siFigma),
      skill('Clip Studio Paint', CLIP_STUDIO),
      skill('Filmora', siWondersharefilmora),
      skill('Procreate'),
      skill('OBS Studio', siObsstudio)
    ]
  }
];

// Tecnologías con logo propio, sin repetir (para la franja del inicio).
export const SKILL_LOGOS: SimpleIcon[] = [
  ...new Map(
    SKILL_GROUPS.flatMap(group => group.items)
      .flatMap(item => item.icons)
      .filter(icon => icon.slug !== DATABASE.slug)
      .map(icon => [icon.slug, icon] as const)
  ).values()
];
