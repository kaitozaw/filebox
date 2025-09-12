import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function DownloadZipModal({ folderId, onClose }) {
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');   // ✅ new state
    const [loading, setLoading] = useState(false);

    // Fetch files in folder
    useEffect(() => {
        if (!folderId || !user) return;
        const fetchFiles = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_BASE_URL}/files/folder/${folderId}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setFiles(res.data.files || []);
                setError('');
            } catch (err) {
                console.error('Folder API error:', err.response || err);
                setError('Failed to fetch files');
            }
        };
        fetchFiles();
    }, [folderId, user]);

    const toggleFile = (fileId) => {
        setSelectedFiles(prev =>
            prev.includes(fileId) ? prev.filter(f => f !== fileId) : [...prev, fileId]
        );
    };

    const downloadZip = async () => {
        if (!selectedFiles.length) return setError('Please select at least one file.');
        if (selectedFiles.length > 5) return setError('Maximum 5 files allowed per download.');

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await axios.get(
                `${process.env.REACT_APP_BASE_URL}/folders/${folderId}/zip`,
                {
                    params: { files: selectedFiles.join(',') },
                    responseType: 'blob',
                    headers: { Authorization: `Bearer ${user.token}` },
                }
            );

            const blob = new Blob([response.data], { type: 'application/zip' });
            let fileName = 'files.zip';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fileName = fileName.replace('.zip', `_${timestamp}.zip`);

            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker();
                const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
            }

            // Show success message
            setSuccess('Download successful!');
            } catch (err) {
            console.error('ZIP download error:', err.response || err);

            if (err.response?.status === 429) {
                try {
                // Convert Blob → JSON
                const text = await err.response.data.text();
                const json = JSON.parse(text);
                console.log("Quota error parsed JSON:", json);

                const details = json.details;
                if (details) {
                    setError(
                    `Quota reached: You can only download ${details.limit} ZIPs every ${details.windowMinutes} minute(s). ` +
                    `You already downloaded ${details.count}. Please try again in ~${details.retryAfterSeconds} seconds.`
                    );
                } else {
                    setError(json.message || 'Quota limit reached.');
                }
                } catch (parseErr) {
                console.error("Failed to parse quota error:", parseErr);
                setError('Quota limit reached. Please wait before retrying.');
                }
            } else {
                setError(err.response?.data?.message || 'Failed to download ZIP');
            }
            } finally {
                setLoading(false); // this resets loading state
                //onClose();   Activate this line if you want to close modal after zip download
        }

    };

    return (
        <div className="modal-backdrop fixed inset-0 bg-black/30 flex justify-center items-center z-50">
            <div className="modal p-6 bg-white rounded shadow-lg w-96">
                <h2 className="text-lg font-bold mb-4">Select Files to Download</h2>

                {error && <div className="text-red-600 mb-2">{error}</div>}
                {success && <div className="text-green-600 mb-2">{success}</div>} {/* success message */}

                <div className="file-list max-h-64 overflow-y-auto mb-4 border rounded p-2">
                    {files.length > 0 ? (
                        <>
                            {/* Select All */}
                            <div className="mb-2">
                                <label className="flex items-center space-x-2 font-semibold">
                                    <input
                                        type="checkbox"
                                        checked={selectedFiles.length === files.length}
                                        onChange={() => {
                                            if (selectedFiles.length === files.length) {
                                                setSelectedFiles([]);
                                            } else {
                                                setSelectedFiles(files.map(f => f._id));
                                            }
                                        }}
                                    />
                                    <span>Select All</span>
                                </label>
                            </div>

                            {/* Individual files */}
                            {files.map(f => (
                                <div key={f._id} className="mb-1">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedFiles.includes(f._id)}
                                            onChange={() => toggleFile(f._id)}
                                        />
                                        <span>{f.name}</span>
                                    </label>
                                </div>
                            ))}
                        </>
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
                        className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Downloading...' : 'Download ZIP'}
                    </button>
                </div>
            </div>
        </div>
    );
}
