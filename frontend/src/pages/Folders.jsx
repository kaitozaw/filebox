import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const Folders = () => {
    const { user } = useAuth();
    const [folders, setFolders] = useState([]);
    const [folderName, setFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editedName, setEditedName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFolders = async () => {
            try {
                const response = await axiosInstance.get('/folders');
                setFolders(response.data);
            } catch (error) {
                alert('Failed to load folders.');
            }
        };

        fetchFolders();
    }, [user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!folderName.trim()) return;

        setLoading(true);
        try {
            const response = await axiosInstance.post(
                '/folders',
                { name: folderName },
            );
            setFolders([...folders, response.data]);
            setFolderName('');
        } catch (error) {
            alert('Failed to create folder. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRename = (id, currentName) => {
        setEditingFolderId(id);
        setEditedName(currentName);
    };

    const handleRenameSubmit = async (id) => {
        if (!editedName.trim()) return;

        setLoading(true);
        try {
            const response = await axiosInstance.put(
                `/folders/${id}`,
                { name: editedName },
            );
            setFolders((prev) =>
                prev.map((f) => (f.id === id ? { ...f, name: response.data.name } : f))
            );
            setEditingFolderId(null);
            setEditedName('');
        } catch (error) {
            alert('Failed to rename folder. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm('Are you sure you want to delete this folder?');
        if (!confirmed) return;

        setLoading(true);
        try {
            await axiosInstance.delete(`/folders/${id}`);

            setFolders((prev) => prev.filter((folder) => folder.id !== id));
        } catch (error) {
            alert('Failed to delete folder. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const navigate = useNavigate();

    const openFolder = (id) => {
        navigate(`/files/in-folder/${id}`);
    };

    return (
        <div className="max-w-md mx-auto mt-20">
            <form onSubmit={handleCreate} className="bg-white p-6 shadow-md rounded">
                <h1 className="text-2xl font-bold mb-4 text-center">Create Folder</h1>
                <input
                    type="text"
                    placeholder="Folder Name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full mb-4 p-2 border rounded"
                />
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
                    {loading ? 'Creating...' : 'Create Folder'}
                </button>
            </form>

            {folders.length > 0 && (
                <ul className="mt-6 bg-white p-4 rounded shadow">
                    {folders.map((folder) => (
                        <li
                            key={folder.id}
                            className="border-b py-2 flex justify-between items-center"
                        >
                            {editingFolderId === folder.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="border p-1 flex-1 mr-2"
                                    />
                                    <button
                                        onClick={() => handleRenameSubmit(folder.id)}
                                        className="text-sm text-white bg-green-500 px-2 py-1 rounded"
                                    >
                                        Save
                                    </button>
                                </>
                            ) : (
                                <>
                                     <button
                                        onClick={() => openFolder(folder._id ?? folder.id)}
                                        className="text-left font-medium hover:underline"
                                    >
                                        {folder.name}
                                    </button>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleRename(folder.id, folder.name)}
                                            className="text-sm text-blue-500 underline"
                                        >
                                            Rename
                                        </button>
                                        <button
                                            onClick={() => handleDelete(folder.id)}
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

export default Folders;