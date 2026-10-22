import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/roleApi";

const AccessControlManager = () => {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [role, setRole] = useState("STUDENT");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");

  const load = async () => {
    const result = await apiRequest("/access-admin/policies");
    setRoles(result.roles);
    setModules(result.modules);
    setPolicies(result.policies);
  };

  useEffect(() => {
    let active = true;
    apiRequest("/access-admin/policies")
      .then((result) => {
        if (!active) return;
        setRoles(result.roles);
        setModules(result.modules);
        setPolicies(result.policies);
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  const rolePolicies = useMemo(() => new Map(
    policies.filter((policy) => policy.ROLE_NAME === role).map((policy) => [policy.MODULE_KEY, policy]),
  ), [policies, role]);

  const save = async (module, patch) => {
    const current = rolePolicies.get(module.key) || {
      CAN_READ: 0, CAN_WRITE: 0, ROW_SCOPE: module.scopes[0], SIDEBAR_VISIBLE: 0,
    };
    const next = { ...current, ...patch };
    if (next.CAN_WRITE && !next.CAN_READ) next.CAN_READ = 1;
    if (!next.CAN_READ) next.CAN_WRITE = 0;
    setSaving(module.key);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest(`/access-admin/policies/${role}/${module.key}`, {
        method: "PUT",
        body: JSON.stringify({
          canRead: Boolean(Number(next.CAN_READ)),
          canWrite: Boolean(Number(next.CAN_WRITE)),
          rowScope: next.ROW_SCOPE,
          sidebarVisible: Boolean(Number(next.SIDEBAR_VISIBLE)),
        }),
      });
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving("");
    }
  };

  return (
    <main className="min-h-screen p-5 text-white erp-gradient sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs uppercase text-white/55">Security administration</p>
          <h1 className="mt-2 text-3xl font-bold">Role access control</h1>
          <p className="mt-2 max-w-4xl text-sm text-white/70">
            Control module read/write permissions and sidebar visibility by role. The backend checks each grant; hiding a link alone is not security. Row scopes are limited to the scopes each module actually enforces.
          </p>
        </header>
        <label className="flex flex-wrap items-center gap-3 text-sm" htmlFor="access-policy-role">
          Role
          <select className="rounded-lg bg-white px-3 py-2 text-slate-900" id="access-policy-role" value={role} onChange={(event) => setRole(event.target.value)}>
            {roles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
          <span className="text-xs text-white/55">Administrator control rights are fixed and cannot be removed here.</span>
        </label>
        {message && <p className="rounded-lg bg-green-300/15 p-3 text-sm text-green-100">{message}</p>}
        {error && <p className="rounded-lg bg-red-300/15 p-3 text-sm text-red-100">{error}</p>}
        <div className="overflow-x-auto border-y border-white/20">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-white/55">
                <th className="py-3 pr-4">Module</th><th className="px-3 py-3">Read</th><th className="px-3 py-3">Write</th><th className="px-3 py-3">Row scope</th><th className="px-3 py-3">Sidebar</th><th className="px-3 py-3">Policy</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => {
                const policy = rolePolicies.get(module.key) || { CAN_READ: 0, CAN_WRITE: 0, ROW_SCOPE: module.scopes[0], SIDEBAR_VISIBLE: 0 };
                const isSaving = saving === module.key;
                return (
                  <tr className="border-t border-white/10" key={module.key}>
                    <th className="py-3 pr-4 font-medium">{module.label}<span className="mt-1 block text-xs font-normal text-white/45">{module.key}</span></th>
                    <td className="px-3 py-3"><input aria-label={`${module.label} read permission`} checked={Boolean(Number(policy.CAN_READ))} onChange={(event) => save(module, { CAN_READ: event.target.checked ? 1 : 0 })} type="checkbox" /></td>
                    <td className="px-3 py-3"><input aria-label={`${module.label} write permission`} checked={Boolean(Number(policy.CAN_WRITE))} onChange={(event) => save(module, { CAN_WRITE: event.target.checked ? 1 : 0 })} type="checkbox" /></td>
                    <td className="px-3 py-3"><select aria-label={`${module.label} row scope`} className="rounded bg-white px-2 py-2 text-xs text-slate-900" disabled={module.scopes.length < 2} value={policy.ROW_SCOPE} onChange={(event) => save(module, { ROW_SCOPE: event.target.value })}>{module.scopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></td>
                    <td className="px-3 py-3"><input aria-label={`${module.label} sidebar visibility`} checked={Boolean(Number(policy.SIDEBAR_VISIBLE))} onChange={(event) => save(module, { SIDEBAR_VISIBLE: event.target.checked ? 1 : 0 })} type="checkbox" /></td>
                    <td className="px-3 py-3 text-xs text-white/55">{isSaving ? "Saving…" : policy.CAN_READ ? "Granted" : "Denied"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default AccessControlManager;
