import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import DownloadZipModal from '../components/DownloadZipModal';

const FileList = ({ folderId }) => {
    const { user } = useAuth();
    const { folderId: folderIdParam } = useParams();
    const effectiveFolderId = folderId ?? folderIdParam;

    //const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showZipModal, setShowZipModal] = useState(false);


    const [files, setFiles] = useState([]);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [editingFileId, setEditingFileId] = useState(null);
    const [editedFileName, setEditedFileName] = useState('');
    const [loading, setLoading] = useState(false);

    const loadFiles = useCallback(async () => {
        if (!effectiveFolderId) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/files/in-folder/${effectiveFolderId}`);
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
            const response = await axiosInstance.get(`/files/${fileId}/download`, {
                responseType: 'blob',
            });

            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const blob = new Blob([response.data], { type: contentType });
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
            await axiosInstance.post(`/files/in-folder/${effectiveFolderId}`, formData, {
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
            const response = await axiosInstance.post(`/files/${fileId}/share`, {});
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
                `/files/${id}`,
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
            await axiosInstance.delete(`/files/${fileId}`);
            setFiles((prev) => prev.filter((file) => file._id !== fileId));
        } catch (error) {
            alert('Failed to delete file');
        }
    };

    return (
            <div className="max-w-lg mx-auto mt-20 px-6">
                {files.length > 0 && (
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={() => setShowZipModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-300"
                    >
                        Download ZIP
                    </button>
            </div>
        )}
        
        <form onSubmit={handleUpload} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h1 className="text-3xl font-extrabold tracking-wide text-slate-900 text-center mb-2">Files in Folder</h1>
            <input
                type="file"
                onChange={(e) => setFileToUpload(e.target.files[0])}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300"
                />
                <button type="submit" className="w-full bg-pink-500 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition duration-300">
                    {loading ? 'Uploading...' : 'Upload File'}
                </button>
            </form>

            {files.length > 0 && (
                <ul className="mt-6 bg-white rounded-2xl shadow-lg p-6 divide-y divide-slate-200">
                    {files.map((file) => (
                        <li
                            key={file._id}
                            className="py-3 flex justify-between items-center hover:bg-slate-50 transition duration-300 px-2 rounded-xl"
                        >
                            {editingFileId === file._id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editedFileName}
                                        onChange={(e) => setEditedFileName(e.target.value)}
                                        className="flex-1 mr-2 rounded-xl border border-slate-300 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300"
                                    />
                                    <button
                                        onClick={() => handleFileRenameSubmit(file._id)}
                                        className="text-sm text-white bg-green-500 px-3 py-1.5 rounded-full hover:bg-green-700 transition duration-300"
                                    >
                                        Save
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="text-slate-800">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleDownload(file._id, file.name)}
                                            className="text-sm text-green-600 hover:text-yellow-200 transition duration-300"
                                        >
                                            Download
                                        </button>
                                        <button
                                            onClick={() => handleShare(file._id)}
                                            className="text-sm text-purple-500 hover:text-yellow-200 transition duration-30"
                                        >
                                            Share
                                        </button>
                                        <button
                                            onClick={() => handleFileRename(file._id, file.name)}
                                            className="text-sm text-indigo-600 hover:text-yellow-200 transition duration-300"
                                        >
                                            Rename
                                        </button>
                                        <button
                                            onClick={() => handleDelete(file._id)}
                                            className="text-sm text-pink-600 hover:text-yellow-200 transition duration-300"
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
            {showZipModal && (
            <DownloadZipModal
                folderId={effectiveFolderId}
                onClose={() => setShowZipModal(false)}
            />
            )}
        </div>
        
    );
};

export default FileList;