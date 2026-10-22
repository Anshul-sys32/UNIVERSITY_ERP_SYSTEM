import { useCallback, useEffect, useState } from "react";
import { merchantRequest, logout } from "../../api/roleApi";
import { useNavigate } from "react-router-dom";
import AnimatedSidebar, { SidebarToggle } from "../../components/AnimatedSidebar";

const MerchantDashboard = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ itemName: "", description: "", priceCredits: "" });
  const [refundReasons, setRefundReasons] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((current) => !current), []);
  const groups = [
    { label: "Marketplace", items: [{ label: "Merchant workspace", path: "/erp/merchant", icon: "home", end: true, module: "merchant_data" }] },
    { label: "Campus", items: [{ label: "Notifications", path: "/erp/notifications", icon: "notifications", module: "notifications" }] },
  ];
  const signOut = async () => { await logout(); navigate("/"); };

  const load = () => Promise.all([merchantRequest("/catalog"), merchantRequest("/orders")]).then(([catalog, orderRows]) => { setItems(catalog); setOrders(orderRows); });
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, []);

  const createItem = async (event) => {
    event.preventDefault();
    try {
      const response = await merchantRequest("/catalog", { method: "POST", body: JSON.stringify(form) });
      setMessage(response.message);
      setForm({ itemName: "", description: "", priceCredits: "" });
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  const refund = async (orderId) => {
    try {
      const response = await merchantRequest(`/orders/${orderId}/refund`, { method: "POST", body: JSON.stringify({ reason: refundReasons[orderId] || "" }) });
      setMessage(response.message);
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <div className="sidebar-layout min-h-screen text-white erp-gradient">
      <AnimatedSidebar title="Merchant portal" subtitle="Campus marketplace" groups={groups} collapsed={collapsed} mobileOpen={mobileOpen} onToggleCollapse={toggleCollapsed} onCloseMobile={closeMobile} onLogout={signOut} />
      <main className="sidebar-layout-main min-w-0">
        <div className="flex min-h-14 items-center gap-3 border-b border-white/10 px-4 md:hidden"><SidebarToggle className="sidebar-toggle-mobile" expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} /><span className="text-sm text-white/70">Merchant workspace</span></div>
        <div className="min-h-screen space-y-8 p-5 text-white sm:p-8"><div className="mx-auto max-w-5xl"><header><p className="text-xs uppercase text-white/55">Campus marketplace</p><h1 className="mt-2 text-3xl font-bold">Merchant workspace</h1></header>
      {message && <p className="mt-5 rounded bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}{error && <p className="mt-5 rounded bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <form className="erp-panel mt-6 grid gap-3 p-5 md:grid-cols-3" onSubmit={createItem}><h2 className="text-lg font-semibold md:col-span-3">Catalog item</h2><input className="erp-input" placeholder="Name" required value={form.itemName} onChange={(event) => setForm({ ...form, itemName: event.target.value })} /><input className="erp-input" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><input className="erp-input" type="number" min="0.01" step="0.01" placeholder="Price in credits" required value={form.priceCredits} onChange={(event) => setForm({ ...form, priceCredits: event.target.value })} /><button className="erp-button md:col-span-3 md:w-fit" type="submit">Add item</button></form>
      <section className="mt-8"><h2 className="text-xl font-semibold">My catalog</h2><div className="divide-y divide-white/15 border-y border-white/15">{items.map((item) => <div className="flex justify-between py-3" key={item.ITEM_ID}><span>{item.ITEM_NAME} · {item.IS_AVAILABLE ? "Available" : "Unavailable"}</span><strong>{item.PRICE_CREDITS} credits</strong></div>)}</div></section>
      <section className="mt-8"><h2 className="text-xl font-semibold">Orders and refunds</h2><div className="divide-y divide-white/15 border-y border-white/15">{orders.map((order) => <article className="flex flex-wrap items-center justify-between gap-3 py-4" key={order.ORDER_ID}><div><strong>Order #{order.ORDER_ID} · {order.ITEM_NAME} × {order.QUANTITY}</strong><p className="text-sm text-white/60">{order.TOTAL_CREDITS} credits · {order.STATUS}</p></div>{order.STATUS === "PAID" && <div className="flex gap-2"><input aria-label={`Refund reason for order ${order.ORDER_ID}`} className="rounded px-2 py-2 text-sm text-black" placeholder="Refund reason" value={refundReasons[order.ORDER_ID] || ""} onChange={(event) => setRefundReasons({ ...refundReasons, [order.ORDER_ID]: event.target.value })} /><button className="rounded border border-white/30 px-3 py-2 text-xs" onClick={() => refund(order.ORDER_ID)} type="button">Refund</button></div>}</article>)}</div>{!orders.length && <p className="text-sm text-white/60">No orders yet.</p>}</section>
        </div></div>
      </main>
    </div>
  );
};

export default MerchantDashboard;