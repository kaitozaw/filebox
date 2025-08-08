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