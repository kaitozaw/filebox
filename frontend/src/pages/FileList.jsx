import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const FileList = ({ folderId }) => {
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [editingFileId, setEditingFileId] = useState(null);
    const [editedFileName, setEditedFileName] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`/api/files/in-folder/${folderId}`);
            setFiles(response.data);
        } catch (error) {
            alert('Failed to fetch files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (folderId && user) fetchFiles();
    }, [folderId, user]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!fileToUpload) return;

        const formData = new FormData();
        formData.append('file', fileToUpload);

        try {
            await axiosInstance.post(`/api/files/in-folder/${folderId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setFileToUpload(null);
            fetchFiles();
        } catch (error) {
            alert('Failed to upload file');
        }
    };

    const handleDownload = async (fileId, fileName) => {
        try {
            const response = await axiosInstance.get(`/api/files/${fileId}/download`, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to download file');
        }
    };

    const handleFileRename = (id, currentName) => {
        setEditingFileId(id);
        setEditedFileName(currentName);
    };

    const handleFileRenameSubmit = async (id) => {
        if (!editedFileName.trim()) return;

        try {
            const response = await axiosInstance.put(
                `/api/files/${id}`,
                { name: editedFileName },
            );
            setFiles((prev) =>
                prev.map((f) => (f._id === id ? { ...f, name: response.data.name } : f))
            );
            setEditingFileId(null);
            setEditedFileName('');
        } catch (error) {
            alert('Failed to rename file.');
        }
    };

    return (
        <div className="mt-6 bg-white p-4 rounded shadow">
            <h2 className="text-lg font-bold mb-2">Files in Folder</h2>

            <form onSubmit={handleUpload} className="mb-4">
                <input
                    type="file"
                    onChange={(e) => setFileToUpload(e.target.files[0])}
                    className="mb-2"
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-1 rounded"
                >
                    Upload
                </button>
            </form>

            <ul>
                {files.map((file) => (
                    <li
                        key={file._id}
                        className="border-b py-2 flex justify-between items-center"
                    >
                        {editingFileId === file._id ? (
                            <>
                                <input
                                    type="text"
                                    value={editedFileName}
                                    onChange={(e) => setEditedFileName(e.target.value)}
                                    className="border p-1 flex-1 mr-2"
                                />
                                <button
                                    onClick={() => handleFileRenameSubmit(file._id)}
                                    className="text-sm text-white bg-green-500 px-2 py-1 rounded"
                                >
                                    Save
                                </button>
                            </>
                        ) : (
                            <>
                                <span>
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleDownload(file._id, file.name)}
                                        className="text-sm text-green-600 underline"
                                    >
                                        Download
                                    </button>
                                    <button
                                        onClick={() => handleFileRename(file._id, file.name)}
                                        className="text-sm text-blue-500 underline"
                                    >
                                        Rename
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file._id)}
                                        className="text-sm text-red-500 underline"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FileList;