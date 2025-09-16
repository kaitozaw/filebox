import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import axiosInstance from '../axiosConfig'

const Trashess = () => {
  const { user } = useAuth()
  const [trashFiles, setTrashFiles] = useState([])

  const loadTrashFiles = useCallback(async () => {
    if (!user) return
    try {
      const res = await axiosInstance.get('/trash')
      setTrashFiles(res.data)
    } catch (error) {
      console.error('Failed to fetch trash files:', error)
      alert('Failed to fetch trash files')
    } finally {
    }
  }, [user])

  useEffect(() => {
    if (user) loadTrashFiles()
  }, [user, loadTrashFiles])

  const handleRestore = async fileId => {
    const confirmed = window.confirm('Are you sure you want to restore this file?')
    if (!confirmed) return

    try {
      await axiosInstance.post(`/trash/${fileId}/restore`)
      setTrashFiles(prev => prev.filter(file => file._id !== fileId))
      alert('File restored successfully')
    } catch (error) {
      console.error('Failed to restore file:', error)
      alert('Failed to restore file')
    }
  }

  const handlePurge = async fileId => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this file? This action cannot be undone!'
    )
    if (!confirmed) return

    try {
      await axiosInstance.delete(`/trash/${fileId}`)
      setTrashFiles(prev => prev.filter(file => file._id !== fileId))
      alert('File permanently deleted')
    } catch (error) {
      console.error('Failed to purge file:', error)
      alert('Failed to permanently delete file')
    }
  }

  return (
    <div className="max-w-lg px-6 mx-auto mt-20">
      <div className="p-6 bg-white shadow-lg rounded-2xl">
        <h1 className="mb-6 text-3xl font-extrabold tracking-wide text-slate-900">Trashes</h1>

        <div className="space-y-4">
          <ul className="divide-y divide-slate-200">
            {trashFiles.map(file => (
              <li
                key={file._id}
                className="flex items-center justify-between px-4 py-4 transition duration-300 hover:bg-slate-50 rounded-xl"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-slate-800">{file.name}</span>
                    <span className="text-sm text-slate-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">Trashed at: {file.deletedAt}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRestore(file._id)}
                    className="text-sm text-green-600 transition duration-300 hover:text-yellow-200"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePurge(file._id)}
                    className="text-sm text-pink-600 transition duration-300 hover:text-yellow-200"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Trashess

