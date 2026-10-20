import { useEffect, useState } from "react";
import { fetchStudentResource, formatDate } from "../api/studentApi";
import StudentDataState from "./StudentDataState";

const LibraryDetails = () => {
  const [books, setBooks] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    fetchStudentResource("library")
      .then(setBooks)
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Library details</h2>
      <p className="mb-6 text-sm text-white/70">Track books issued to your account.</p>
      <StudentDataState {...state} empty={!books.length}>
        <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10">
          <table className="w-full min-w-[640px] text-left text-sm text-white">
            <thead><tr>{["Book title", "Issue date", "Return date", "Status"].map((heading) => <th className="p-4" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{books.map((book) => (
              <tr className="border-t border-white/15" key={book.ISSUE_ID}>
                <td className="p-4 font-medium">{book.TITLE}</td>
                <td className="p-4 text-white/75">{formatDate(book.ISSUE_DATE)}</td>
                <td className="p-4 text-white/75">{formatDate(book.RETURN_DATE)}</td>
                <td className={`p-4 font-semibold ${book.STATUS === "RETURNED" ? "text-green-300" : book.STATUS === "OVERDUE" ? "text-red-200" : "text-yellow-200"}`}>{book.STATUS}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </StudentDataState>
    </section>
  );
};

export default LibraryDetails;
