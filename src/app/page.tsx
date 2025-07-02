"use client"

import { useState } from "react";

export default function Home() {
  const [response, setResponse] = useState<string | null>(null);
  const handleSubmit = async () => {
    const res = await fetch("http://localhost:3001/api/field", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "value" }),
    });

    const contentType = res.headers.get("content-type");
    let data: string;

    if (contentType && contentType.includes("application/json")) {
      data = JSON.stringify(await res.json(), null, 2);
    } else {
      data = await res.text();
    }

    setResponse(data);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-blue-700 mb-4">Geo-Weather Field Visualizer</h1>
      <p className="text-lg text-gray-700 mb-6">Welcome to the app!</p>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleSubmit}
      >
        Send POST Request
      </button>
      {response && (
        <pre className="mt-4 bg-white p-2 rounded text-sm text-gray-800 overflow-auto">
          {response}
        </pre>
      )}
    </main>
  );
}