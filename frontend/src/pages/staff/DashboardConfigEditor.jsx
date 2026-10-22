import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { employeeRequest, getCurrentUser } from "../../api/roleApi";

const DashboardConfigEditor = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const returnPath = getCurrentUser()?.role === "ADMIN" ? "/erp/admin" : "/erp/employee";
  const [config, setConfig] = useState(null);
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    employeeRequest(`/config/${type}`).then(setConfig).catch((error) => setMessage(error.message));
  }, [type]);

  const save = async () => {
    try {
      const data = await employeeRequest(`/config/${type}`, { method: "PUT", body: JSON.stringify(config) });
      setMessage(data.message);
    } catch (error) { setMessage(error.message); }
  };

  if (!config) return <main className="min-h-screen p-8 text-white erp-gradient"><p>{message || "Loading configuration…"}</p></main>;

  return (
    <main className="min-h-screen p-5 text-white sm:p-8 erp-gradient" style={{ background: config.background }}>
      <div className="mx-auto max-w-3xl"><button className="mb-6 text-sm text-white/70 hover:text-white" onClick={() => navigate(returnPath)} type="button">← Back to workspace</button><h1 className="text-3xl font-bold">Configure {type} dashboard</h1><div className="erp-panel mt-6 space-y-5 p-6"><label className="block text-sm">Background<input className="erp-input mt-2" value={config.background} onChange={(event) => setConfig({ ...config, background: event.target.value })} /></label><div><h2 className="mb-3 text-lg font-semibold">Sidebar items</h2><div className="space-y-2">{config.sidebarItems.map((item, index) => <div className="flex items-center gap-3" key={`${item.path}-${index}`}><span className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm">{item.label} · {item.path}</span><button className="text-sm text-red-200" onClick={() => setConfig({ ...config, sidebarItems: config.sidebarItems.filter((_, itemIndex) => itemIndex !== index) })} type="button">Remove</button></div>)}</div></div><div className="grid gap-3 md:grid-cols-2"><input className="erp-input" placeholder="Item label" value={label} onChange={(event) => setLabel(event.target.value)} /><input className="erp-input" placeholder="Item path" value={path} onChange={(event) => setPath(event.target.value)} /></div><button className="rounded-xl border border-white/30 px-4 py-3 text-sm hover:bg-white/15" onClick={() => { if (label.trim() && path.trim()) { setConfig({ ...config, sidebarItems: [...config.sidebarItems, { label: label.trim(), path: path.trim() }] }); setLabel(""); setPath(""); } }} type="button">Add sidebar item</button><div><button className="erp-button" onClick={save} type="button">Save configuration</button></div>{message && <p className="rounded-lg bg-white/10 p-3 text-sm">{message}</p>}</div></div>
    </main>
  );
};

export default DashboardConfigEditor;
