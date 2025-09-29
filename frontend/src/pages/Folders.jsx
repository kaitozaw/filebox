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
        <div className="max-w-5xl mx-auto mt-20 px-6">
            <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <h1 className="text-3xl font-extrabold tracking-wide text-slate-900 text-center mb-2">Create Folder</h1>
                <input
                    type="text"
                    placeholder="Folder Name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300"
                />
                <button type="submit" className="w-full bg-pink-500 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition duration-300">
                    {loading ? 'Creating...' : 'Create Folder'}
                </button>
            </form>

            {folders.length > 0 && (
                <ul className="mt-6 bg-white rounded-2xl shadow-lg p-6 divide-y divide-slate-200">
                    {folders.map((folder) => (
                        <li
                            key={folder.id}
                            className="py-3 flex justify-between items-center hover:bg-slate-50 transition duration-300 px-2 rounded-xl"
                        >
                            {editingFolderId === folder.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="flex-1 mr-2 rounded-xl border border-slate-300 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-300"
                                    />
                                    <button
                                        onClick={() => handleRenameSubmit(folder.id)}
                                        className="text-sm text-white bg-green-500 px-3 py-1.5 rounded-full hover:bg-green-700 transition duration-300"
                                    >
                                        Save
                                    </button>
                                </>
                            ) : (
                                <>
                                     <button
                                        onClick={() => openFolder(folder._id ?? folder.id)}
                                        className="text-left font-medium text-slate-800 hover:text-yellow-200 transition duration-300"
                                    >
                                        {folder.name}
                                    </button>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleRename(folder.id, folder.name)}
                                            className="text-sm text-indigo-600 hover:text-yellow-200 transition duration-300"
                                        >
                                            Rename
                                        </button>
                                        <button
                                            onClick={() => handleDelete(folder.id)}
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
        </div>
    );
};

export default Folders;