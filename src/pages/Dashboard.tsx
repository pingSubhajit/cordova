import React from "react";
import { useNavigate } from "react-router-dom";

function Dashboard(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
      <div className="max-w-2xl p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600 mb-6">Welcome to your document management dashboard.</p>
        <button 
          onClick={() => navigate("/")}
          className="bg-blue-600 text-white font-medium py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default Dashboard; 