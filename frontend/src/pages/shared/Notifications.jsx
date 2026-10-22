import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, getCurrentUser } from "../../api/roleApi";

const Notifications = () => {
  const userId = getCurrentUser()?.user_id;
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/notifications/${userId}`)
      .then((rows) => { if (active) setItems(rows); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [userId]);

  const load = async () => setItems(await apiRequest(`/notifications/${userId}`));

  const markRead = async (notificationId) => {
    try {
      await apiRequest(`/notifications/${userId}/${notificationId}/read`, { method: "PATCH", body: JSON.stringify({}) });
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  const markAllRead = async () => {
    try {
      await apiRequest(`/notifications/${userId}/read-all`, { method: "PATCH", body: JSON.stringify({}) });
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <main className="min-h-screen p-5 text-white erp-gradient sm:p-8"><div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase text-white/55">Updates</p><h1 className="mt-2 text-3xl font-bold">Notifications</h1></div><button className="rounded border border-white/30 px-3 py-2 text-sm" onClick={markAllRead} type="button">Mark all read</button></header>
      {error && <p className="mt-5 rounded bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <div className="mt-6 divide-y divide-white/15 border-y border-white/15">{items.map((item) => <article className={`flex flex-wrap items-center justify-between gap-4 py-4 ${item.READ_AT ? "opacity-65" : ""}`} key={item.NOTIFICATION_ID}><button className="min-w-0 flex-1 text-left" onClick={() => { if (!item.READ_AT) markRead(item.NOTIFICATION_ID); if (item.RESOURCE_PATH) navigate(item.RESOURCE_PATH); }} type="button"><span className="flex items-center gap-2 font-medium">{!item.READ_AT && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-lime-300" />}{item.TITLE}</span><span className="mt-1 block text-sm text-white/75">{item.MESSAGE}</span><time className="mt-1 block text-xs text-white/50">{new Date(item.CREATED_AT).toLocaleString()}</time></button>{!item.READ_AT && <button className="text-xs text-white/65 underline" onClick={() => markRead(item.NOTIFICATION_ID)} type="button">Mark read</button>}</article>)}{!items.length && <p className="py-6 text-sm text-white/60">You are all caught up.</p>}</div>
    </div></main>
  );
};

export default Notifications;