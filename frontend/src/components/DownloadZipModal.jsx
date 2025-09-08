import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';

export default function DownloadZipModal({ folderId, onClose }) {
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_BASE_URL}/folders/${folderId}`)
            .then(res => setFiles(res.data.files || res.data))
            .catch(err => setError(err.response?.data?.message || 'Failed to fetch files'));
    }, [folderId]);

    const toggleFile = (fileId) => {
        setSelectedFiles(prev => {
            if (prev.includes(fileId)) return prev.filter(f => f !== fileId);
            return [...prev, fileId];
        });
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
            const response = await axios.get(
                `${process.env.REACT_APP_BASE_URL}/folders/${folderId}/zip`,
                {
                    params: { files: selectedFiles.join(',') },
                    responseType: 'blob',
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
            setError(err.response?.data?.message || 'Failed to download ZIP');
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal p-4 bg-white rounded shadow-lg">
                <h2 className="text-lg font-bold mb-2">Select Files to Download</h2>
                {error && <div className="text-red-600 mb-2">{error}</div>}
                <div className="file-list max-h-64 overflow-y-auto mb-2">
                    {files.map(file => (
                        <div key={file._id}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file._id)}
                                    onChange={() => toggleFile(file._id)}
                                />
                                {file.name}
                            </label>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
                    <button onClick={downloadZip} className="px-3 py-1 bg-blue-600 text-white rounded">Download ZIP</button>
                </div>
            </div>
        </div>
    );
}
