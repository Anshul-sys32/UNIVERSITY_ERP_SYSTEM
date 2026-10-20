import React, { useState } from "react";

const FormGenerator = () => {
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [questions, setQuestions] = useState([]);

  const addQuestion = (type) => {
    setQuestions([...questions, { id: Date.now(), type, question: "", options: [] }]);
  };

  const updateQuestion = (id, value) => {
    setQuestions(questions.map(q => (q.id === id ? { ...q, question: value } : q)));
  };

  const addOption = (id) => {
    setQuestions(questions.map(q => (q.id === id ? { ...q, options: [...q.options, ""] } : q)));
  };

  const updateOption = (qId, optIndex, value) => {
    setQuestions(questions.map(q =>
      q.id === qId
        ? { ...q, options: q.options.map((opt, i) => (i === optIndex ? value : opt)) }
        : q
    ));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <input
        type="text"
        className="w-full p-2 text-lg font-bold border-b"
        value={formTitle}
        onChange={(e) => setFormTitle(e.target.value)}
        placeholder="Form Title"
      />
      
      {questions.map((q, index) => (
        <div key={q.id} className="mt-4 p-3 border rounded-lg">
          <input
            type="text"
            className="w-full p-2 border-b"
            value={q.question}
            onChange={(e) => updateQuestion(q.id, e.target.value)}
            placeholder={`Question ${index + 1}`}
          />

          {q.type === "mcq" && (
            <>
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center mt-2">
                  <input
                    type="text"
                    className="w-full p-2 border"
                    value={opt}
                    onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                    placeholder={`Option ${optIndex + 1}`}
                  />
                </div>
              ))}
              <button onClick={() => addOption(q.id)} className="mt-2 text-blue-600">
                + Add Option
              </button>
            </>
          )}
        </div>
      ))}

      <div className="mt-4 space-x-3">
        <button onClick={() => addQuestion("text")} className="p-2 bg-gray-800 text-white rounded">+ Short Answer</button>
        <button onClick={() => addQuestion("mcq")} className="p-2 bg-gray-800 text-white rounded">+ Multiple Choice</button>
      </div>
    </div>
  );
};

export default FormGenerator;
