import { useEffect, useState } from "react";
import { fetchStudentResource, formatDate } from "../api/studentApi";
import StudentDataState from "./StudentDataState";

const EventsPlacement = () => {
  const [events, setEvents] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    fetchStudentResource("events")
      .then(setEvents)
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Events & placement</h2>
      <p className="mb-6 text-sm text-white/70">Discover what is happening across campus.</p>
      <StudentDataState {...state} empty={!events.length}>
        <div className="grid gap-5 md:grid-cols-2">
          {events.map((event) => (
            <article className="erp-panel p-5 text-white" key={event.EVENT_ID}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold">{event.TITLE}</h3>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs">{event.TYPE}</span>
              </div>
              <p className="mt-4 text-sm text-white/75">{formatDate(event.EVENT_DATE)} · {event.LOCATION || "Campus"}</p>
              {event.DESCRIPTION && <p className="mt-3 text-sm leading-6 text-white/65">{event.DESCRIPTION}</p>}
            </article>
          ))}
        </div>
      </StudentDataState>
    </section>
  );
};

export default EventsPlacement;
