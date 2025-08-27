'use client';
import React, { useState } from 'react';
import Papa from 'papaparse';

interface UploadPopupProps {
  onClose: () => void;
  onUpload: (data: any[]) => void;
}

const UploadPopup: React.FC<UploadPopupProps> = ({ onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSend = () => {
    if (!selectedFile) return;

    Papa.parse(selectedFile, {
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        console.log('Dados do CSV:', result.data);
        onUpload(result.data); // envia os dados para o dashboard
        onClose(); // fecha o popup
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-80">
        <h2 className="text-lg font-bold mb-4">Send CSV File</h2>
        <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedFile}
            className={`px-4 py-2 rounded ${
              selectedFile
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPopup;
