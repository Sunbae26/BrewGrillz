export const publicCache =
  (maxAge = 15, sMaxAge = 30) =>
  (req, res, next) => {
    res.set(
      "Cache-Control",
      `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=60`,
    );
    next();
  };
