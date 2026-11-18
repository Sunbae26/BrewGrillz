// Loads prisma/data/menu.js into the database. Runs automatically before `npm run dev` and `npm start`,
// and does nothing when the menu file hasn't changed. `npm run db:seed:force` reloads everything.
import { createHash } from "node:crypto";
import pg from "pg";
import { prisma } from "../src/lib/prisma.js";
import { categories, notes } from "./data/menu.js";

const cents = (value) =>
  value === undefined || value === null ? null : Math.round(value * 100);

const menuVersion = () =>
  createHash("sha256")
    .update(JSON.stringify({ categories, notes }))
    .digest("hex")
    .slice(0, 16);

// Staff edits (prices, sold out) from the dashboard are kept unless --force is used.
async function upsertKeepingStaffEdits(model, slug, data, priceFields, force) {
  const existing = await prisma[model].findUnique({
    where: { slug },
    select: { staffEditedAt: true },
  });
  const update = { ...data };
  if (existing?.staffEditedAt && !force)
    for (const field of priceFields) delete update[field];
  await prisma[model].upsert({
    where: { slug },
    create: { slug, ...data },
    update,
  });
}

async function seedCategory(category, index, force) {
  const { items = [], sections = [], ...fields } = category;
  const saved = await prisma.category.upsert({
    where: { slug: fields.slug },
    create: { ...fields, sortOrder: index, isActive: true },
    update: { ...fields, sortOrder: index, isActive: true },
  });

  for (const [order, item] of items.entries()) {
    await upsertKeepingStaffEdits(
      "menuItem",
      item.slug,
      {
        name: item.name,
        description: item.description,
        priceCents: cents(item.price),
        variants: item.variants
          ? item.variants.map((v) => ({ name: v.name, priceCents: cents(v.price) }))
          : null,
        options: item.options ?? null,
        tags: item.tags ?? [],
        image: item.image ?? null,
        isActive: true,
        sortOrder: order,
        categoryId: saved.id,
      },
      ["priceCents", "variants"],
      force,
    );
  }

  for (const [order, section] of sections.entries()) {
    const savedSection = await prisma.drinkSection.upsert({
      where: { categoryId_slug: { categoryId: saved.id, slug: section.slug } },
      create: {
        slug: section.slug,
        title: section.title,
        sub: section.sub,
        cols: section.cols,
        sortOrder: order,
        categoryId: saved.id,
      },
      update: {
        title: section.title,
        sub: section.sub,
        cols: section.cols,
        sortOrder: order,
        isActive: true,
      },
    });
    for (const [rowOrder, drink] of section.drinks.entries()) {
      if (drink.prices.length !== section.cols.length)
        throw new Error(`${drink.slug}: ${drink.prices.length} prices for ${section.cols.length} columns`);
      await upsertKeepingStaffEdits(
        "drink",
        drink.slug,
        {
          name: drink.name,
          info: drink.info,
          prices: drink.prices.map(cents),
          isActive: true,
          sortOrder: rowOrder,
          sectionId: savedSection.id,
        },
        ["prices"],
        force,
      );
    }
  }
  return items.length + sections.reduce((sum, s) => sum + s.drinks.length, 0);
}

// Anything no longer in the file is hidden, never deleted, so past orders keep their links.
async function retireRemoved() {
  const categorySlugs = categories.map((c) => c.slug);
  const itemSlugs = categories.flatMap((c) => (c.items ?? []).map((i) => i.slug));
  const drinkSlugs = categories.flatMap((c) =>
    (c.sections ?? []).flatMap((s) => s.drinks.map((d) => d.slug)),
  );
  const sectionKeys = new Set(
    categories.flatMap((c) => (c.sections ?? []).map((s) => `${c.slug}/${s.slug}`)),
  );
  const [hiddenCategories, hiddenItems, hiddenDrinks] = await Promise.all([
    prisma.category.updateMany({
      where: { slug: { notIn: categorySlugs }, isActive: true },
      data: { isActive: false },
    }),
    prisma.menuItem.updateMany({
      where: { slug: { notIn: itemSlugs }, isActive: true },
      data: { isActive: false },
    }),
    prisma.drink.updateMany({
      where: { slug: { notIn: drinkSlugs }, isActive: true },
      data: { isActive: false },
    }),
  ]);
  const sections = await prisma.drinkSection.findMany({
    where: { isActive: true },
    include: { category: { select: { slug: true } } },
  });
  const stale = sections.filter((s) => !sectionKeys.has(`${s.category.slug}/${s.slug}`));
  if (stale.length)
    await prisma.drinkSection.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { isActive: false },
    });
  return hiddenCategories.count + hiddenItems.count + hiddenDrinks.count + stale.length;
}

const SEED_LOCK = 515302;

// Two API instances starting together never seed at the same time.
async function withSeedLock(run) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [SEED_LOCK]);
    return await run();
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [SEED_LOCK]).catch(() => {});
    await client.end();
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const version = menuVersion();
  const stored = await prisma.appSetting.findUnique({ where: { key: "menuVersion" } });
  if (!force && stored?.value === version) {
    console.log("Menu is up to date.");
    return;
  }
  let count = 0;
  for (const [index, category] of categories.entries())
    count += await seedCategory(category, index, force);
  const retired = await retireRemoved();
  await prisma.appSetting.upsert({
    where: { key: "menuNotes" },
    create: { key: "menuNotes", value: JSON.stringify(notes) },
    update: { value: JSON.stringify(notes) },
  });
  await prisma.appSetting.upsert({
    where: { key: "menuVersion" },
    create: { key: "menuVersion", value: version },
    update: { value: version },
  });
  console.log(
    `Menu updated: ${categories.length} categories, ${count} dishes and drinks.` +
      (retired ? ` Hid ${retired} no longer on the menu.` : ""),
  );
}

withSeedLock(main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
