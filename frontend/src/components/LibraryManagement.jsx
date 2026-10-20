import { useCallback, useEffect, useState } from "react";
import { operationsRequest } from "../api/roleApi";

const emptyBook = { title: "", author: "", isbn: "", category: "", totalCopies: 1 };
const emptyIssue = { bookId: "", studentId: "", dueDate: "" };

const LibraryManagement = () => {
  const [catalog, setCatalog] = useState([]);
  const [issues, setIssues] = useState([]);
  const [book, setBook] = useState(emptyBook);
  const [issue, setIssue] = useState(emptyIssue);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [catalogData, issueData] = await Promise.all([
      operationsRequest("/library/catalog"),
      operationsRequest("/library/issues"),
    ]);
    setCatalog(catalogData);
    setIssues(issueData);
  }, []);

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [load]);

  const submit = async (path, payload, reset) => {
    setError("");
    try {
      const result = await operationsRequest(path, { method: "POST", body: JSON.stringify(payload) });
      setMessage(result.message);
      reset();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const returnBook = async (issueId) => {
    try {
      const result = await operationsRequest(`/library/issues/${issueId}/return`, { method: "PATCH" });
      setMessage(result.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="min-h-screen p-5 text-white erp-gradient sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8"><p className="text-xs uppercase tracking-[0.3em] text-white/60">Employee operations</p><h2 className="mt-2 text-3xl font-bold">Library management</h2><p className="mt-2 text-white/70">Maintain the catalog and manage circulation.</p></div>
        <form className="erp-panel grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); submit("/library/catalog", book, () => setBook(emptyBook)); }}><input className="erp-input" placeholder="Book title" value={book.title} onChange={(event) => setBook({ ...book, title: event.target.value })} required /><input className="erp-input" placeholder="Author" value={book.author} onChange={(event) => setBook({ ...book, author: event.target.value })} required /><input className="erp-input" placeholder="ISBN" value={book.isbn} onChange={(event) => setBook({ ...book, isbn: event.target.value })} /><input className="erp-input" placeholder="Category" value={book.category} onChange={(event) => setBook({ ...book, category: event.target.value })} /><input className="erp-input" type="number" min="1" placeholder="Total copies" value={book.totalCopies} onChange={(event) => setBook({ ...book, totalCopies: event.target.value })} /><button className="erp-button lg:col-span-3 lg:w-fit" type="submit">Add book</button></form>
        <form className="erp-panel mt-6 grid gap-4 p-6 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); submit("/library/issues", issue, () => setIssue(emptyIssue)); }}><select className="erp-input" value={issue.bookId} onChange={(event) => setIssue({ ...issue, bookId: event.target.value })} required><option className="text-black" value="">Select available book</option>{catalog.filter((item) => item.AVAILABLE_COPIES > 0).map((item) => <option className="text-black" key={item.BOOK_ID} value={item.BOOK_ID}>{item.TITLE} ({item.AVAILABLE_COPIES} available)</option>)}</select><input className="erp-input" type="number" min="1" placeholder="Student ID" value={issue.studentId} onChange={(event) => setIssue({ ...issue, studentId: event.target.value })} required /><input className="erp-input" type="date" value={issue.dueDate} onChange={(event) => setIssue({ ...issue, dueDate: event.target.value })} required /><button className="erp-button md:col-span-3 md:w-fit" type="submit">Issue book</button></form>
        {message && <p className="mt-4 rounded-xl bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}{error && <p className="mt-4 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
        <div className="mt-6 grid gap-5 lg:grid-cols-2"><div className="erp-panel p-6"><h3 className="mb-4 text-xl font-semibold">Catalog</h3><div className="space-y-3">{catalog.length ? catalog.map((item) => <div className="flex justify-between gap-4 border-b border-white/15 pb-3 text-sm last:border-0" key={item.BOOK_ID}><span>{item.TITLE}<span className="ml-2 text-white/50">{item.AUTHOR}</span></span><span>{item.AVAILABLE_COPIES}/{item.TOTAL_COPIES}</span></div>) : <p className="text-sm text-white/60">No books in the catalog.</p>}</div></div><div className="erp-panel p-6"><h3 className="mb-4 text-xl font-semibold">Circulation</h3><div className="space-y-3">{issues.length ? issues.map((item) => <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3 text-sm last:border-0" key={item.ISSUE_ID}><span>{item.TITLE}<span className="block text-white/50">{item.FIRST_NAME} {item.LAST_NAME || ""}</span></span>{item.STATUS === "RETURNED" ? <span className="text-green-300">Returned</span> : <button className="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20" onClick={() => returnBook(item.ISSUE_ID)} type="button">Return</button>}</div>) : <p className="text-sm text-white/60">No books are currently issued.</p>}</div></div></div>
      </div>
    </section>
  );
};

export default LibraryManagement;
