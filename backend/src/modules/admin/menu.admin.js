import { prisma } from "../../lib/prisma.js";
import { notFound, HttpError } from "../../utils/http-error.js";
import { invalidateMenu } from "../menu/menu.service.js";

// Everything on the menu, for the dashboard's Menu tab (sold out switches and prices).
export async function adminMenu() {
  const categories = await prisma.category.findMany({
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
  });
  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    group: c.group,
    orderable: c.orderable,
    items: [
      ...c.items.map((i) => ({
        kind: "items",
        slug: i.slug,
        name: i.name,
        priceCents: i.priceCents,
        variants: i.variants,
        isAvailable: i.isAvailable,
        edited: Boolean(i.staffEditedAt),
      })),
      ...c.sections.flatMap((s) =>
        s.drinks.map((d) => ({
          kind: "drinks",
          slug: d.slug,
          name: d.name,
          section: s.title,
          cols: s.cols,
          prices: d.prices,
          isAvailable: d.isAvailable,
          edited: Boolean(d.staffEditedAt),
        })),
      ),
    ],
  }));
}

export async function updateMenuItem(kind, slug, changes) {
  const model = kind === "items" ? prisma.menuItem : prisma.drink;
  const found = await model.findUnique({ where: { slug } });
  if (!found) throw notFound("Dish not found");
  if (kind === "items" && changes.priceCents !== undefined && found.variants?.length)
    throw new HttpError(400, "This dish has sizes. Change its prices in the menu file for now.");
  if (kind === "drinks" && changes.prices && changes.prices.length !== found.prices.length)
    throw new HttpError(400, "Send one price for each size.");
  const updated = await model.update({ where: { slug }, data: { ...changes, staffEditedAt: new Date() } });
  invalidateMenu();
  return { slug: updated.slug, isAvailable: updated.isAvailable };
}
