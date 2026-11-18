import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../lib/api.js";
import { bookingDay, bookingTime, calendarFile, fetchBooking, saveLocalBooking } from "../lib/booking.js";
import { Button, Flame } from "../components/ui/ui";
import MoCoLink from "../motion/MoCoLink";
import { site } from "../config/site";

/* BOOKING STATUS — the private link from the email (/reserve/BT-…?t=…). Updates by itself. */

export const meta = ({ params }) => [{ title: `Booking ${params.code} | BrewGrillz` }, { name: "robots", content: "noindex" }];

const SEAL = {
  REQUESTED: { word: "Requested", tone: "amber" },
  CONFIRMED: { word: "Confirmed", tone: "lime" },
  DECLINED: { word: "Not available", tone: "off" },
  CANCELLED: { word: "Cancelled", tone: "off" },
  COMPLETED: { word: "Enjoyed", tone: "red" },
  NO_SHOW: { word: "Missed", tone: "off" },
};

export default function ReserveStatus() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const isNew = params.has("new");
  const queryClient = useQueryClient();
  const [armed, setArmed] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", code, token],
    queryFn: ({ signal }) => fetchBooking(code, token, signal),
    enabled: Boolean(token),
    retry: (count, err) => err?.status !== 404 && count < 3,
    refetchInterval: (q) => (q.state.data?.status === "REQUESTED" ? 8000 : false),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (booking) saveLocalBooking({ code, token });
  }, [booking, code, token]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const ics = useMemo(
    () => (booking && ["REQUESTED", "CONFIRMED"].includes(booking.status) && typeof window !== "undefined" ? calendarFile(booking) : null),
    [booking],
  );
  useEffect(() => () => ics && URL.revokeObjectURL(ics), [ics]);

  const cancel = async () => {
    if (!armed) return setArmed(true);
    try {
      const updated = await apiPost(`/reservations/${code}/cancel?t=${encodeURIComponent(token)}`, {});
      queryClient.setQueryData(["booking", code, token], updated);
    } catch (err) {
      setCancelError(err.message);
    }
    setArmed(false);
  };

  if (isLoading)
    return (
      <section className="track"><div className="container track__wrap"><div className="track__loading"><Flame /> Loading your booking…</div></div></section>
    );

  if (!booking)
    return (
      <section className="track">
        <div className="container track__wrap track__missing">
          <h1 className="display track__title">Booking not found</h1>
          <p className="lead">This link doesn’t match a booking. Check the link in your email, or call us on {site.phone}.</p>
          <Button to="/reserve" variant="ghost">Book a table</Button>
        </div>
      </section>
    );

  const seal = SEAL[booking.status];
  const live = booking.status === "REQUESTED" || booking.status === "CONFIRMED";

  return (
    <section className="track bstatus">
      <div className="container track__wrap">
        <header className="track__head">
          <span className="eyebrow">Booking {booking.code}</span>
          <h1 className="display track__title">
            {booking.status === "CONFIRMED" ? <>See you soon, <span className="text-red">{booking.name}!</span></>
              : booking.status === "REQUESTED" ? <>{isNew ? "Request sent," : "Hang tight,"} <span className="text-red">{booking.name}!</span></>
              : booking.status === "COMPLETED" ? <>Thanks for coming, <span className="text-red">{booking.name}!</span></>
              : seal.word}
          </h1>
          <p className="track__pickup">
            {booking.status === "REQUESTED" && "We’re holding your table while our team confirms it. This page updates by itself, and we’ll email you."}
            {booking.status === "CONFIRMED" && "Your table is confirmed. We hold it for 15 minutes after your booking time."}
            {booking.status === "DECLINED" && "Sorry, we couldn’t confirm this time. Please choose another, or call us and we’ll help."}
            {booking.status === "CANCELLED" && "This booking has been cancelled."}
            {booking.status === "NO_SHOW" && "We missed you this time. Hope to see you soon."}
            {booking.status === "COMPLETED" && "Hope the grill treated you well."}
          </p>
        </header>

        <div className={`placecard placecard--big placecard--${seal.tone}`}>
          <span className="placecard__fold" aria-hidden="true" />
          <span className="placecard__eyebrow">Reserved for</span>
          <b className="placecard__name">{booking.name}</b>
          <div className="placecard__rows">
            <div><span>Day</span><b>{bookingDay(booking.startsAt)}</b></div>
            <div><span>Time</span><b>{bookingTime(booking.startsAt)}</b></div>
            <div><span>Guests</span><b>{booking.partySize}</b></div>
            {booking.occasion && <div><span>Occasion</span><b>{booking.occasion}</b></div>}
          </div>
          <div className="placecard__seats" aria-hidden="true">{Array.from({ length: booking.partySize }, (_, i) => <span key={i} />)}</div>
          <span className={`seal seal--${seal.tone}`} key={booking.status}>
            <span>{seal.word}</span>
          </span>
        </div>

        <div className="track__actions">
          {live && ics && (
            <a className="btn btn--ghost" href={ics} download={`brewgrillz-${booking.code}.ics`}>
              <span className="btn__label">Add to calendar</span>
            </a>
          )}
          <Button to={site.mapsUrl} variant="ghost">Directions</Button>
          <Button to="/menu" variant="ghost">See the menu</Button>
          {booking.status === "DECLINED" && <Button to="/reserve" variant="primary">Choose another time</Button>}
        </div>

        {booking.canCancel && (
          <div className="bstatus__cancel">
            <button type="button" className={`drawer__clear ${armed ? "is-armed" : ""}`} onClick={cancel}>
              {armed ? "Tap again to cancel your booking" : "Can’t make it? Cancel booking"}
            </button>
            {cancelError && <p className="csum__error" role="alert">{cancelError}</p>}
          </div>
        )}

        <p className="track__save">
          This page updates by itself. Your booking link is also in your email. Need to change something? Call us on <a href={site.phoneHref}>{site.phone}</a> or <MoCoLink to={site.whatsappHref}>WhatsApp us</MoCoLink>.
        </p>
      </div>
    </section>
  );
}
