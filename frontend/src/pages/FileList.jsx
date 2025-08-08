import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const FileList = ({ folderId }) => {
    const { user } = useAuth();
    const { folderId: folderIdParam } = useParams();
    const effectiveFolderId = folderId ?? folderIdParam;
    const [files, setFiles] = useState([]);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [editingFileId, setEditingFileId] = useState(null);
    const [editedFileName, setEditedFileName] = useState('');
    const [loading, setLoading] = useState(false);

    const loadFiles = useCallback(async () => {
        if (!effectiveFolderId) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/api/files/in-folder/${effectiveFolderId}`);
            setFiles(res.data);
        } catch {
            alert('Failed to fetch files');
        } finally {
            setLoading(false);
        }
    }, [effectiveFolderId]);

    useEffect(() => {
        if (effectiveFolderId && user) loadFiles();
    }, [effectiveFolderId, user, loadFiles]);

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

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!fileToUpload) return;

        const formData = new FormData();
        formData.append('file', fileToUpload);

        try {
            await axiosInstance.post(`/api/files/in-folder/${effectiveFolderId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setFileToUpload(null);
            await loadFiles();
        } catch (error) {
            alert('Failed to upload file');
        }
    };

    const handleShare = async (fileId) => {
        try {
            const response = await axiosInstance.post(`/api/files/${fileId}/share`, {});
            const url = response.data.publicUrl;
            window.prompt('Share this link:', url);
        } catch (error) {
            alert('Failed to generate share link');
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

    const handleDelete = async (fileId) => {
        const confirmed = window.confirm('Are you sure you want to delete this file?');
        if (!confirmed) return;

        try {
            await axiosInstance.delete(`/api/files/${fileId}`);
            setFiles((prev) => prev.filter((file) => file._id !== fileId));
        } catch (error) {
            alert('Failed to delete file');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20">
            <form onSubmit={handleUpload} className="bg-white p-6 shadow-md rounded">
                <h1 className="text-2xl font-bold mb-4 text-center">Files in Folder</h1>
                <input
                    type="file"
                    onChange={(e) => setFileToUpload(e.target.files[0])}
                    className="w-full mb-4 p-2 border rounded"
                />
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
                    {loading ? 'Uploading...' : 'Upload File'}
                </button>
            </form>

            {files.length > 0 && (
                <ul className="mt-6 bg-white p-4 rounded shadow">
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
                                    <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleDownload(file._id, file.name)}
                                            className="text-sm text-green-600 underline"
                                        >
                                            Download
                                        </button>
                                        <button
                                            onClick={() => handleShare(file._id)}
                                            className="text-sm text-purple-500 underline"
                                        >
                                            Share
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
            )}
        </div>
    );
};

export default FileList;