import { useEffect, useState, useCallback, useMemo } from 'react';
import axiosInstance from '../axiosConfig';
import { todayFilter, last7Filter, allFilter } from './RecentsFilterPrototype';

export default function Recents() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(allFilter);

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

      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download file');
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

  const handleRename = async (fileId, currentName) => {
    const next = window.prompt('New name:', currentName);
    if (!next || next.trim() === currentName) return;
    try {
      const res = await axiosInstance.put(`/files/${fileId}`, { name: next.trim() });
      setFiles(prev => prev.map(f => (f._id === fileId ? { ...f, name: res.data.name } : f)));
    } catch { alert('Failed to rename file.'); }
  };

  const handleMoveToTrash = async (fileId) => {
    const confirmed = window.confirm('Are you sure you want to delete this file?');
    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/files/${fileId}`);
      setFiles((prev) => prev.filter((file) => file._id !== fileId));
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

  const filteredFiles = useMemo(() => {
    return files
      .filter(f => activeFilter.filtering(f))
  }, [files, activeFilter]);

  return (
    <div className="max-w-5xl mx-auto mt-20 px-6">
      <h1 className="text-4xl font-extrabold tracking-wide text-slate-900 mb-8">Recents</h1>

      <div className="flex space-x-4 mb-6">
        {[allFilter, todayFilter, last7Filter].map(f => (
          <button
            key={f.title}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1 rounded-full ${activeFilter.title === f.title
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
          >
            {f.title}
          </button>
        ))}
      </div>

      {loading && <div className="text-center">Loading...</div>}
      {!loading && files.length === 0 && <div className="text-center">No recent files yet.</div>}

      {!loading && files.length > 0 && filteredFiles.length === 0 && (
        <div className="text-center">No files match this filter.</div>
      )}

      {filteredFiles.length > 0 && (
        <ul className="mt-6 bg-white rounded-2xl shadow-lg p-6 divide-y divide-slate-200">
          {filteredFiles.map(file => (
            <li key={file._id} className="py-3 flex justify-between items-center hover:bg-slate-50 transition duration-300 px-2 rounded-xl">
              <div>
                <div className="text-lg text-slate-800">{file.name}</div>
                <div className="text-sm text-slate-500">Last accessed at: {fmtDate(file.lastAccessedAt)}</div>
              </div>
              <div className="flex space-x-6">
                <button onClick={() => handlePreview(file._id)} className="text-sm text-cyan-600 hover:text-yellow-200 transition duration-300">Preview</button>
                <button onClick={() => handleDownload(file._id, file.name)} className="text-sm text-green-600 hover:text-yellow-200 transition duration-300">Download</button>
                <button onClick={() => handleShare(file._id)} className="text-sm text-purple-500 hover:text-yellow-200 transition duration-300">Share</button>
                <button onClick={() => handleRename(file._id, file.name)} className="text-sm text-indigo-600 hover:text-yellow-200 transition duration-300">Rename</button>
                <button onClick={() => handleMoveToTrash(file._id)} className="text-sm text-pink-600 hover:text-yellow-200 transition duration-300">Move to Trash</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}