import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { cached, invalidate } from "../../utils/cache.js";
import { notFound } from "../../utils/http-error.js";

const dollars = (cents) => (cents == null ? null : cents / 100);

const shapeItem = (item) => ({
  id: item.slug,
  name: item.name,
  price: dollars(item.priceCents),
  image: item.image,
  tags: item.tags,
  desc: item.description,
  available: item.isAvailable,
  ...(item.variants?.length
    ? { variants: item.variants.map((v) => ({ name: v.name, price: dollars(v.priceCents) })) }
    : {}),
  ...(item.options?.length ? { options: item.options } : {}),
});

const shapeDrink = (drink) => ({
  id: drink.slug,
  name: drink.name,
  ...(drink.info ? { info: drink.info } : {}),
  prices: drink.prices.map(dollars),
  available: drink.isAvailable,
});

async function loadMenu() {
  const [categories, notesRow] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        items: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        sections: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: { drinks: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.appSetting.findUnique({ where: { key: "menuNotes" } }),
  ]);
  return {
    notes: notesRow ? JSON.parse(notesRow.value) : {},
    categories: categories.map((c) => ({
      id: c.slug,
      group: c.group === "FOOD" ? "food" : "drinks",
      name: c.name,
      ...(c.aliases.length ? { alias: c.aliases } : {}),
      ...(c.note ? { note: c.note } : {}),
      orderable: c.orderable,
      ...(c.group === "FOOD"
        ? { items: c.items.map(shapeItem) }
        : {
            layout: "board",
            sections: c.sections.map((s) => ({
              title: s.title,
              ...(s.sub ? { sub: s.sub } : {}),
              cols: s.cols,
              rows: s.drinks.map(shapeDrink),
            })),
          }),
    })),
  };
}

// The whole menu is small (~150 rows), so it is served in one response and cached in memory.
export const getMenu = () => cached("menu:all", env.MENU_CACHE_TTL_SECONDS, loadMenu);

export async function getItem(slug) {
  const menu = await getMenu();
  for (const c of menu.categories) {
    const item = c.items?.find((i) => i.id === slug);
    if (item) return { ...item, category: c.id };
  }
  throw notFound("Dish not found");
}

// Sold-out status for the cart and checkout (always fresh, never cached).
export async function availability(slugs) {
  const [items, drinks] = await Promise.all([
    prisma.menuItem.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, isAvailable: true, isActive: true },
    }),
    prisma.drink.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, isAvailable: true, isActive: true, section: { select: { category: { select: { orderable: true } } } } },
    }),
  ]);
  const found = new Map([
    ...items.map((i) => [i.slug, i.isAvailable && i.isActive]),
    ...drinks.map((d) => [d.slug, d.isAvailable && d.isActive && d.section.category.orderable]),
  ]);
  return Object.fromEntries(slugs.map((slug) => [slug, found.get(slug) ?? false]));
}

export const invalidateMenu = () => invalidate("menu:");
