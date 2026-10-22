import { useEffect, useState } from "react";
import { apiRequest } from "../api/roleApi";
import { getStudentUserId } from "../api/studentApi";
import { formatMoney } from "../api/studentApi";
import StudentDataState from "./StudentDataState";

const StudentWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [state, setState] = useState({ loading: true, error: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [orderingItem, setOrderingItem] = useState(null);

  const load = () => Promise.all([
    apiRequest(`/wallet-data/${getStudentUserId()}`),
    apiRequest(`/wallet-data/${getStudentUserId()}/ledger`),
    apiRequest(`/wallet-data/${getStudentUserId()}/catalog`),
  ]).then(([summary, entries, items]) => {
    setWallet(summary);
    setLedger(entries);
    setCatalog(items);
  });

  useEffect(() => {
    let active = true;
    load().catch((loadError) => {
      if (active) setState({ loading: false, error: loadError.message });
    }).finally(() => {
      if (active) setState((current) => ({ ...current, loading: false }));
    });
    return () => { active = false; };
  }, []);

  const orderItem = async (item) => {
    setOrderingItem(item.ITEM_ID);
    setError("");
    setMessage("");
    try {
      const response = await apiRequest(`/wallet-data/${getStudentUserId()}/orders`, {
        method: "POST",
        headers: { "Idempotency-Key": `wallet-${crypto.randomUUID()}` },
        body: JSON.stringify({ itemId: item.ITEM_ID, quantity: Number(quantities[item.ITEM_ID] || 1) }),
      });
      setMessage(`Order #${response.orderId} confirmed for ${formatMoney(response.amount)} credits.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setOrderingItem(null);
    }
  };

  return (
    <section className="space-y-8 p-6">
      <header><h2 className="text-3xl font-bold text-white">Campus credit wallet</h2><p className="mt-2 text-sm text-white/70">Closed-loop campus credits for approved rewards and purchases.</p></header>
      {message && <p className="rounded-lg bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
      {error && <p className="rounded-lg bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <StudentDataState {...state}>
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Available balance", wallet?.balance], ["Lifetime earned", wallet?.LIFETIME_EARNED], ["Lifetime spent", wallet?.LIFETIME_SPENT]].map(([label, value]) => <div className="erp-panel p-5 text-white" key={label}><p className="text-sm text-white/60">{label}</p><p className="mt-3 text-2xl font-semibold">{formatMoney(value)}</p></div>)}
        </div>
        <section>
          <h3 className="mb-3 text-xl font-semibold text-white">Campus marketplace</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{catalog.map((item) => <article className="erp-panel space-y-3 p-5 text-white" key={item.ITEM_ID}><div><h4 className="font-semibold">{item.ITEM_NAME}</h4><p className="text-xs text-white/55">{item.MERCHANT_NAME}</p><p className="mt-2 text-sm text-white/70">{item.DESCRIPTION || "Campus item"}</p></div><div className="flex items-center justify-between gap-3"><strong>{formatMoney(item.PRICE_CREDITS)}</strong><div className="flex items-center gap-2"><input aria-label={`Quantity for ${item.ITEM_NAME}`} className="w-16 rounded px-2 py-2 text-center text-black" min="1" max="20" type="number" value={quantities[item.ITEM_ID] || 1} onChange={(event) => setQuantities({ ...quantities, [item.ITEM_ID]: event.target.value })} /><button className="erp-button px-3 py-2 text-xs" disabled={orderingItem !== null} onClick={() => orderItem(item)} type="button">{orderingItem === item.ITEM_ID ? "Working…" : "Purchase"}</button></div></div></article>)}</div>
          {!catalog.length && <p className="text-sm text-white/60">No active campus items are available.</p>}
        </section>
        <section>
          <h3 className="mb-3 text-xl font-semibold text-white">Wallet history</h3>
          <div className="divide-y divide-white/15 border-y border-white/15">{ledger.map((entry) => <article className="flex flex-wrap justify-between gap-3 py-3 text-sm text-white" key={entry.LEDGER_ENTRY_ID}><div><p className="font-medium">{entry.DESCRIPTION}</p><p className="text-xs text-white/55">{entry.REASON_CODE} · {new Date(entry.CREATED_AT).toLocaleString()}</p></div><strong className={entry.ENTRY_TYPE === "CREDIT" ? "text-green-300" : "text-white"}>{entry.ENTRY_TYPE === "CREDIT" ? "+" : "−"}{formatMoney(entry.AMOUNT)}</strong></article>)}</div>
          {!ledger.length && <p className="text-sm text-white/60">No wallet activity yet.</p>}
        </section>
      </StudentDataState>
    </section>
  );
};

export default StudentWallet;