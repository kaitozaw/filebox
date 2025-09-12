import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../axiosConfig';

export default function Recents() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRecents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/recent');
      setFiles(res.data);
    } catch {
      alert('Failed to fetch recent files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecents(); }, [loadRecents]);

  const handlePreview = (fileId) => {
    window.open(`/api/files/${fileId}/download?inline=1`, '_blank');
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const res = await axiosInstance.get(`/files/${fileId}/download`, { responseType: 'blob' });
      const type = res.headers['content-type'] || 'application/octet-stream';
      const url = URL.createObjectURL(new Blob([res.data], { type }));
      const a = document.createElement('a');
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    } catch { alert('Failed to download file'); }
  };

  const handleShare = async (fileId) => {
    try {
      const res = await axiosInstance.post(`/files/${fileId}/share`, {});
      window.prompt('Share this link:', res.data.publicUrl);
    } catch { alert('Failed to generate share link'); }
  };

  const handleRename = async (fileId, currentName) => {
    const next = window.prompt('New name:', currentName);
    if (!next || next.trim() === currentName) return;
    try {
      const res = await axiosInstance.put(`/files/${fileId}`, { name: next.trim() });
      setFiles(prev => prev.map(f => (f._id === fileId ? { ...f, name: res.data.name } : f)));
    } catch { alert('Failed to rename file.'); }
  };

  const handleMoveToTrash = async (fileId) => {
    const ok = window.confirm('Move this file to Trash?');
    if (!ok) return;
    try {
      await axiosInstance.delete(`/files/${fileId}`);
      setFiles(prev => prev.filter(f => f._id !== fileId));
    } catch { alert('Failed to move to trash'); }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString();

  return (
    <div className="max-w-3xl mx-auto mt-20 px-6">
      <h1 className="text-4xl font-extrabold tracking-wide text-slate-900 mb-8">Recents</h1>

      {loading && <div className="text-center">Loading...</div>}
      {!loading && files.length === 0 && <div className="text-center">No recent files yet.</div>}

      {files.length > 0 && (
        <ul className="bg-white rounded-2xl shadow-lg p-6 divide-y divide-slate-200">
          {files.map(file => (
            <li key={file._id} className="py-5 flex items-center justify-between">
              <div>
                <div className="text-lg text-slate-800">{file.name}</div>
                <div className="text-sm text-slate-500">Last accessed at: {fmtDate(file.lastAccessedAt)}</div>
              </div>
              <div className="flex space-x-6">
                <button onClick={() => handlePreview(file._id)} className="text-cyan-500 hover:underline">Preview</button>
                <button onClick={() => handleDownload(file._id, file.name)} className="text-green-600 hover:underline">Download</button>
                <button onClick={() => handleShare(file._id)} className="text-purple-500 hover:underline">Share</button>
                <button onClick={() => handleRename(file._id, file.name)} className="text-indigo-600 hover:underline">Rename</button>
                <button onClick={() => handleMoveToTrash(file._id)} className="text-pink-600 hover:underline">Move to Trash</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}