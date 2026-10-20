import React, { useState } from "react";

const FacultyQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion]);
      setNewQuestion("");
    }
  };

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg w-full">
      <h1 className="text-2xl font-bold mb-4">Faculty Question Bank</h1>
      
      {/* Question Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter your question..."
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
        <button onClick={addQuestion} className="bg-blue-500 text-white px-4 py-2 rounded">
          Add
        </button>
      </div>

      {/* Display Questions */}
      <ul className="space-y-2">
        {questions.map((question, index) => (
          <li key={index} className="flex justify-between bg-gray-100 p-2 rounded">
            <span>{question}</span>
            <button onClick={() => deleteQuestion(index)} className="text-red-500">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FacultyQuestionBank;
