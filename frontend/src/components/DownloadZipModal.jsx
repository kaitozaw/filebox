import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { useAuth } from '../context/AuthContext';

export default function DownloadZipModal({ folderId, onClose }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch files in the folder
    useEffect(() => {
    if (!folderId || !user) return;
    const fetchFiles = async () => {
        try {
        const res = await axios.get(`${process.env.REACT_APP_BASE_URL}/folders/${folderId}`, {
            headers: { Authorization: `Bearer ${user.token}` }
        });

        console.log("Folder API response:", res.data);

        const folderFiles = Array.isArray(res.data.files)
            ? res.data.files
            : Array.isArray(res.data)
            ? res.data
            : [];

        setFiles(folderFiles);
        setError(''); // clear previous error
        } catch (err) {
        console.error('Folder API error:', err.response || err);
        setError(err.response?.data?.message || 'Failed to fetch files');
        }
    };

    fetchFiles();
    }, [folderId, user]);


  const toggleFile = (fileId) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((f) => f !== fileId) : [...prev, fileId]
    );
  };

  const downloadZip = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file.');
      return;
    }
    if (selectedFiles.length > 5) {
      setError('Maximum 5 files allowed per download.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/folders/${folderId}/zip`,
        {
          params: { files: selectedFiles.join(',') },
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'files.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) fileName = match[1];
      }

      saveAs(response.data, fileName);
      onClose();
    } catch (err) {
      console.error('ZIP download error:', err.response || err);
      setError(err.response?.data?.message || 'Failed to download ZIP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="modal p-6 bg-white rounded shadow-lg w-96">
        <h2 className="text-lg font-bold mb-4">Select Files to Download</h2>

        {error && <div className="text-red-600 mb-2">{error}</div>}

        <div className="file-list max-h-64 overflow-y-auto mb-4 border rounded p-2">
          {files.length > 0 ? (
            files.map((file) => (
              <div key={file._id} className="mb-1">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file._id)}
                    onChange={() => toggleFile(file._id)}
                  />
                  <span>{file.name}</span>
                </label>
              </div>
            ))
          ) : (
            <div className="text-gray-500">No files available in this folder.</div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={downloadZip}
            disabled={loading}
            className={`px-4 py-2 rounded text-white ${
              loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Downloading...' : 'Download ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
