import { useCallback, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../api/roleApi";

const defaultFor = (column) => {
  if (column.defaultValue !== null && column.defaultValue !== undefined) {
    return /^current_timestamp(?:\(|$)/i.test(String(column.defaultValue)) ? "" : String(column.defaultValue);
  }
  if (column.type === "json") return "{}";
  return "";
};

const emptyValues = (columns) => Object.fromEntries(columns.map((column) => [column.name, defaultFor(column)]));

const enumValues = (columnType) => [...String(columnType || "").matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1].replaceAll("\\'", "'"));

const inputType = (type) => {
  if (["date", "time", "datetime", "timestamp"].includes(type)) return type === "datetime" || type === "timestamp" ? "datetime-local" : type;
  if (["tinyint", "smallint", "mediumint", "int", "integer", "bigint", "decimal", "numeric", "float", "double", "year"].includes(type)) return "number";
  if (type === "password") return "password";
  return "text";
};

const recordKey = (row, primaryKey) => Object.fromEntries(primaryKey.map((column) => [column, row[column]]));

const AdminDatabaseManager = () => {
  const [tables, setTables] = useState([]);
  const [table, setTable] = useState("");
  const [columns, setColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState([]);
  const [rows, setRows] = useState([]);
  const [offset, setOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const loadTables = useCallback(async () => {
    const result = await adminRequest("/admin-data/tables");
    setTables(result.tables);
    if (result.tables.length) setTable((current) => current || result.tables[0]);
  }, []);

  const loadTable = useCallback(async () => {
    if (!table) return;
    setLoading(true);
    setError("");
    try {
      const result = await adminRequest(`/admin-data/${encodeURIComponent(table)}?limit=${pageSize}&offset=${offset}`);
      setColumns(result.columns);
      setPrimaryKey(result.primaryKey);
      setRows(result.rows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [offset, table]);

  useEffect(() => { loadTables().catch((requestError) => setError(requestError.message)); }, [loadTables]);
  useEffect(() => { loadTable(); }, [loadTable]);

  const displayColumns = useMemo(() => columns.filter((column) => column.name !== "PASSWORD"), [columns]);

  const openCreate = () => {
    setEditingKey(null);
    setValues(emptyValues(columns));
    setFormOpen(true);
    setMessage("");
  };

  const openEdit = (row) => {
    const nextValues = emptyValues(columns);
    columns.forEach((column) => {
      if (column.name === "PASSWORD") return;
      const value = row[column.name];
      nextValues[column.name] = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    });
    setEditingKey(recordKey(row, primaryKey));
    setValues(nextValues);
    setFormOpen(true);
    setMessage("");
  };

  const saveRecord = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const payload = {};
    for (const column of columns) {
      if (column.readOnly || (editingKey && column.primaryKey)) continue;
      const value = values[column.name];
      if (column.type === "json" && value) {
        try { payload[column.name] = JSON.parse(value); }
        catch { setError(`${column.name} must contain valid JSON.`); return; }
      } else if (value === "" && column.nullable) {
        payload[column.name] = null;
      } else if (value === "" && !editingKey && column.defaultValue !== null && column.defaultValue !== undefined) {
        continue;
      } else if (value !== "" || column.name === "PASSWORD") {
        payload[column.name] = value;
      }
    }
    try {
      const result = await adminRequest(`/admin-data/${encodeURIComponent(table)}`, {
        method: editingKey ? "PUT" : "POST",
        body: JSON.stringify(editingKey ? { key: editingKey, values: payload } : { values: payload }),
      });
      setMessage(result.message);
      setFormOpen(false);
      await loadTable();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteRecord = async (row) => {
    if (!window.confirm(`Delete this record from ${table}? Related records may also be affected by database cascade rules.`)) return;
    setError("");
    setMessage("");
    try {
      const result = await adminRequest(`/admin-data/${encodeURIComponent(table)}`, {
        method: "DELETE",
        body: JSON.stringify({ key: recordKey(row, primaryKey) }),
      });
      setMessage(result.message);
      if (rows.length === 1 && offset > 0) setOffset((current) => Math.max(current - pageSize, 0));
      await loadTable();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const renderField = (column) => {
    if (column.extra?.includes("auto_increment") || column.extra?.includes("generated")) return null;
    const enumOptions = column.type === "enum" ? enumValues(column.columnType) : [];
    const common = {
      id: `admin-data-${column.name}`,
      value: values[column.name] ?? "",
      disabled: Boolean(editingKey && column.primaryKey),
      required: !column.nullable && !column.readOnly && column.name !== "PASSWORD" && column.defaultValue === null && !column.primaryKey,
      onChange: (event) => setValues((current) => ({ ...current, [column.name]: event.target.value })),
    };
    return (
      <label className="block min-w-0" htmlFor={common.id} key={column.name}>
        <span className="mb-1 block text-xs font-medium text-white/70">{column.name}{column.primaryKey ? " · key" : ""}{column.nullable ? " · optional" : ""}</span>
        {enumOptions.length ? <select {...common} className="erp-input"><option value="">Select value</option>{enumOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
          : column.type === "json" || ["text", "mediumtext", "longtext"].includes(column.type) ? <textarea {...common} className="erp-input min-h-24 font-mono text-xs" placeholder={column.name === "PASSWORD" ? "Set a new password (12+ characters)" : column.type === "json" ? "{}" : "Enter text"} />
            : <input {...common} className="erp-input" type={inputType(column.type)} step={column.type === "decimal" || column.type === "numeric" || column.type === "float" || column.type === "double" ? "any" : undefined} placeholder={column.name === "PASSWORD" ? "Set a new password (12+ characters)" : column.defaultValue ?? ""} />}
      </label>
    );
  };

  return (
    <main className="min-h-screen p-5 text-white erp-gradient sm:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header>
          <p className="text-xs uppercase text-white/55">Administrator tools</p>
          <h1 className="mt-2 text-3xl font-bold">Database records</h1>
          <p className="mt-2 max-w-4xl text-sm text-white/65">Manage records across the active database. Foreign keys, uniqueness, and table constraints are still enforced. Password hashes are write-only.</p>
        </header>

        <div className="flex flex-wrap items-end gap-3 border-b border-white/15 pb-5">
          <label className="min-w-60 text-sm" htmlFor="admin-data-table">Database table
            <select className="erp-input mt-1" id="admin-data-table" value={table} onChange={(event) => { setTable(event.target.value); setOffset(0); setFormOpen(false); }}>
              {tables.map((name) => <option className="text-slate-900" key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <button className="erp-button" disabled={!columns.length} onClick={openCreate} type="button">Add record</button>
          <span className="text-xs text-white/50">Showing {rows.length} rows · 10 per page</span>
        </div>

        {message && <p className="border-l-2 border-green-300 px-4 py-2 text-sm text-green-100">{message}</p>}
        {error && <p className="border-l-2 border-red-300 px-4 py-2 text-sm text-red-100">{error}</p>}

        {formOpen && <form className="space-y-4 border-b border-white/15 pb-6" onSubmit={saveRecord}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{editingKey ? "Edit record" : "Create record"} · {table}</h2>
            <button aria-label="Close record form" className="rounded px-3 py-2 text-sm hover:bg-white/10" onClick={() => setFormOpen(false)} type="button">Close</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{columns.map(renderField)}</div>
          <button className="erp-button" type="submit">{editingKey ? "Save changes" : "Create record"}</button>
        </form>}

        <div className="overflow-x-auto border-y border-white/15">
          {loading ? <p className="p-5 text-sm text-white/60">Loading records…</p> : <table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr className="text-xs uppercase text-white/55">{displayColumns.map((column) => <th className="px-3 py-3" key={column.name}>{column.name}</th>)}<th className="px-3 py-3">Actions</th></tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr className="border-t border-white/10 align-top" key={JSON.stringify(recordKey(row, primaryKey)) || rowIndex}>
              {displayColumns.map((column) => <td className="max-w-72 truncate px-3 py-3" key={column.name} title={typeof row[column.name] === "object" ? JSON.stringify(row[column.name]) : String(row[column.name] ?? "")}>{row[column.name] === null ? <span className="text-white/35">NULL</span> : typeof row[column.name] === "object" ? JSON.stringify(row[column.name]) : String(row[column.name])}</td>)}
              <td className="whitespace-nowrap px-3 py-2"><button className="rounded px-2 py-1 text-xs text-sky-200 hover:bg-white/10" disabled={!primaryKey.length} onClick={() => openEdit(row)} type="button">Edit</button><button className="rounded px-2 py-1 text-xs text-red-200 hover:bg-white/10" disabled={!primaryKey.length} onClick={() => deleteRecord(row)} type="button">Delete</button></td>
            </tr>)}</tbody>
          </table>}
          {!loading && !rows.length && <p className="p-5 text-sm text-white/55">No records in this table.</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button className="rounded border border-white/20 px-3 py-2 text-sm disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset((current) => Math.max(current - pageSize, 0))} type="button">Previous</button>
          <button className="rounded border border-white/20 px-3 py-2 text-sm disabled:opacity-40" disabled={rows.length < pageSize} onClick={() => setOffset((current) => current + pageSize)} type="button">Next</button>
        </div>
      </div>
    </main>
  );
};

export default AdminDatabaseManager;
