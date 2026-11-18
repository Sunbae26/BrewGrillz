import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "../../lib/api.js";
import { ADMIN_KEYS, isAdmin, useAdminAction } from "../../lib/admin.js";
import { cents } from "../../lib/format.js";
import { ABtn, Empty, ErrorNote, Loading, PageHead } from "../../components/admin/Admin";

/* MENU — anyone on shift can mark a dish sold out; admins can also change prices. */

const toCents = (value) => Math.round(Number(value) * 100);

export default function AdminMenu() {
  const { user } = useOutletContext();
  const admin = isAdmin(user);
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [soldOnly, setSoldOnly] = useState(false);
  const [drafts, setDrafts] = useState({});
  const menu = useQuery({ queryKey: ADMIN_KEYS.menu, queryFn: ({ signal }) => apiGet("/admin/menu", { signal }) });
  const action = useAdminAction([ADMIN_KEYS.menu]);

  const patch = (item, body) =>
    action.mutate(
      { method: "PATCH", path: `/admin/menu/${item.kind}/${item.slug}`, body },
      { onSuccess: () => { setDrafts((d) => ({ ...d, [item.slug]: undefined })); queryClient.invalidateQueries({ queryKey: ["menu"] }); } },
    );

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (menu.data ?? [])
      .map((c) => ({ ...c, items: c.items.filter((i) => (!term || i.name.toLowerCase().includes(term)) && (!soldOnly || !i.isAvailable)) }))
      .filter((c) => c.items.length);
  }, [menu.data, q, soldOnly]);

  const soldOut = (menu.data ?? []).flatMap((c) => c.items).filter((i) => !i.isAvailable).length;

  return (
    <>
      <PageHead title="Menu">
        <input className="adm__input" type="search" placeholder="Find a dish or drink" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="adm__check">
          <input type="checkbox" checked={soldOnly} onChange={(e) => setSoldOnly(e.target.checked)} /> Sold out only ({soldOut})
        </label>
      </PageHead>
      <p className="adm__hint">Sold-out items disappear from online ordering within a minute. {admin ? "Price changes show on the website straight away." : "Only an admin can change prices."}</p>
      <ErrorNote error={action.error} />
      {menu.isLoading ? <Loading /> : menu.isError ? <ErrorNote error={menu.error} /> : groups.length === 0 ? <Empty>Nothing matches.</Empty> : (
        groups.map((c) => (
          <section key={c.slug} className="amenu">
            <h3 className="adm__sub">{c.name}{!c.orderable && <small> · not sold online</small>}</h3>
            <div className="amenu__list">
              {c.items.map((i) => {
                const draft = drafts[i.slug];
                const editable = admin && (i.kind === "drinks" || !i.variants?.length);
                return (
                  <div key={`${i.kind}-${i.slug}`} className={`amenu__row ${i.isAvailable ? "" : "is-out"}`}>
                    <div className="amenu__name">
                      <b>{i.name}</b>
                      <small>
                        {i.section ? `${i.section} · ` : ""}
                        {i.kind === "drinks"
                          ? i.prices.map((p, n) => (p == null ? null : `${i.cols?.[n] ?? ""} ${cents(p)}`.trim())).filter(Boolean).join(" / ")
                          : i.variants?.length ? i.variants.map((v) => `${v.name} ${cents(v.priceCents)}`).join(" / ") : cents(i.priceCents)}
                      </small>
                    </div>
                    {editable && (
                      <div className="amenu__price">
                        {i.kind === "drinks"
                          ? i.prices.map((p, n) => p == null ? null : (
                              <input
                                key={n} className="adm__input adm__input--sm" inputMode="decimal" aria-label={`${i.name} ${i.cols?.[n] ?? ""} price`}
                                value={draft?.[n] ?? (p / 100).toFixed(2)}
                                onChange={(e) => setDrafts({ ...drafts, [i.slug]: Object.assign([...(draft ?? i.prices.map((x) => (x == null ? null : (x / 100).toFixed(2))))], { [n]: e.target.value }) })}
                              />
                            ))
                          : (
                            <input
                              className="adm__input adm__input--sm" inputMode="decimal" aria-label={`${i.name} price`}
                              value={draft ?? (i.priceCents / 100).toFixed(2)}
                              onChange={(e) => setDrafts({ ...drafts, [i.slug]: e.target.value })}
                            />
                          )}
                        {draft !== undefined && (
                          <ABtn
                            tone="primary"
                            disabled={action.isPending}
                            onClick={() => patch(i, i.kind === "drinks" ? { prices: draft.map((v) => (v == null ? null : toCents(v))) } : { priceCents: toCents(draft) })}
                          >
                            Save
                          </ABtn>
                        )}
                      </div>
                    )}
                    <label className="aswitch">
                      <input type="checkbox" checked={i.isAvailable} disabled={action.isPending} onChange={(e) => patch(i, { isAvailable: e.target.checked })} />
                      <span>{i.isAvailable ? "Available" : "Sold out"}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}
