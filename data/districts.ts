/**
 * data/districts.ts — the 8 official districts of Almaty (PROMPTS §5.1).
 *
 * Source: administrative division of the city of Almaty (8 audandar).
 * Coordinates are approximate district centroids (used as WAQI geo-feed
 * query points and as H3 hex centers on the map). Good enough for a
 * city-scale risk grid; not survey-grade.
 *
 *   1. Almaly     2. Auezov     3. Bostandyk   4. Jetysu
 *   5. Medeu      6. Nauryzbai  7. Turksib     8. Alatau
 */

export interface District {
  slug: string;
  nameRu: string;
  nameKk: string;
  lat: number;
  lon: number;
}

export const DISTRICTS: readonly District[] = [
  { slug: "almaly", nameRu: "Алмалинский", nameKk: "Алмалы ауданы", lat: 43.2389, lon: 76.945 },
  { slug: "auezov", nameRu: "Ауэзовский", nameKk: "Әуезов ауданы", lat: 43.255, lon: 76.904 },
  { slug: "bostandyk", nameRu: "Бостандыкский", nameKk: "Бостандық ауданы", lat: 43.215, lon: 76.895 },
  { slug: "jetysu", nameRu: "Жетысуский", nameKk: "Жетісу ауданы", lat: 43.275, lon: 76.97 },
  { slug: "medeu", nameRu: "Медеуский", nameKk: "Медеу ауданы", lat: 43.195, lon: 77.06 },
  { slug: "nauryzbai", nameRu: "Наурызбайский", nameKk: "Наурызбай ауданы", lat: 43.175, lon: 76.84 },
  { slug: "turksib", nameRu: "Турксибский", nameKk: "Тұрсыб ауданы", lat: 43.265, lon: 77.0 },
  { slug: "alatau", nameRu: "Алатауский", nameKk: "Алатау ауданы", lat: 43.295, lon: 76.93 },
];

const bySlug = new Map(DISTRICTS.map((d) => [d.slug, d]));

export function getDistrict(slug: string): District | undefined {
  return bySlug.get(slug);
}
