import React from "react";

const Card = ({ title, children }) => (
  <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
    <h2 className="text-lg font-semibold mb-3 text-white">{title}</h2>
    {children}
  </div>
);

const Feedback = () => {
  return (
    <Card title="Help / Feedback">
      <form className="text-white space-y-4">
        <div>
          <label className="block mb-1">Subject:</label>
          <input
            type="text"
            className="w-full rounded-md px-2 py-1 text-black"
            placeholder="Type subject..."
          />
        </div>
        <div>
          <label className="block mb-1">Message:</label>
          <textarea
            rows="4"
            className="w-full rounded-md px-2 py-1 text-black"
            placeholder="Type your message..."
          ></textarea>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-white text-black rounded-md hover:bg-green-400"
        >
          Submit Feedback
        </button>
      </form>
    </Card>
  );
};

export default Feedback;