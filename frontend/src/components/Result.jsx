import React from "react";

const Card = ({ title, children }) => (
  <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
    <h2 className="text-lg font-semibold mb-3 text-white">{title}</h2>
    {children}
  </div>
);

const Result = () => {
  return (
    <Card title="All Results">
      <div className="text-white text-sm space-y-2">
        <div className="flex justify-between border-b border-white/30 py-1">
          <span>Big Data</span>
          <span className="font-semibold">88%</span>
        </div>
        <div className="flex justify-between border-b border-white/30 py-1">
          <span>AEC - III</span>
          <span className="font-semibold">72%</span>
        </div>
        <div className="flex justify-between border-b border-white/30 py-1">
          <span>Software Testing</span>
          <span className="font-semibold">79%</span>
        </div>
        <div className="flex justify-between border-b border-white/30 py-1">
          <span>Library</span>
          <span className="font-semibold">100%</span>
        </div>
      </div>
    </Card>
  );
};

export default Result;