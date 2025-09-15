import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axiosInstance from '../axiosConfig'

const Preview = () => {
  const { fileId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const urlRef = useRef('')

  useEffect(() => {
    if (!fileId || !user) return

    const loadFilePreview = async () => {
      try {
        setLoading(true)
        setError('')
        
        const fileResponse = await axiosInstance.get(`/files/${fileId}`)
        setFile(fileResponse.data)
        
        const previewResponse = await axiosInstance.get(`/files/${fileId}/preview`, {
          responseType: 'blob'
        })
        
        const blob = new Blob([previewResponse.data], { 
          type: previewResponse.headers['content-type'] || 'application/octet-stream' 
        })
        const url = window.URL.createObjectURL(blob)
        urlRef.current = url
        setPreviewUrl(url)
        
      } catch (err) {
        console.error('Preview error:', err)
        if (err.response?.status === 415) {
          setError('This file type is not supported for preview')
        } else if (err.response?.status === 404) {
          setError('File not found')
        } else if (err.response?.status === 403) {
          setError('No permission to preview this file')
        } else {
          setError('Preview failed, please try again later')
        }
      } finally {
        setLoading(false)
      }
    }

    loadFilePreview()

    return () => {
      if (urlRef.current) {
        window.URL.revokeObjectURL(urlRef.current)
      }
    }
  }, [fileId, user])

  const handleBack = () => {
    navigate(-1)
  }

  const handleDownload = async () => {
    if (!file) return
    
    try {
      const response = await axiosInstance.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      })

      const contentType = response.headers['content-type'] || 'application/octet-stream'
      const blob = new Blob([response.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Download failed')
    }
  }

  const renderPreview = () => {
    if (!file || !previewUrl) return null

    const { mimetype } = file
    
    if (mimetype?.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <img 
            src={previewUrl} 
            alt={file.name}
            className="object-contain max-w-full max-h-full rounded-lg shadow-lg"
            onError={() => setError('Image loading failed')}
          />
        </div>
      )
    }
    
    if (mimetype === 'application/pdf') {
      return (
        <div className="w-full h-full">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0 rounded-lg shadow-lg min-h-96"
            title={file.name}
            onError={() => setError('PDF loading failed')}
          />
        </div>
      )
    }
    
    return (
      <div className="w-full h-full">
        <iframe
          src={previewUrl}
          className="w-full h-full border-0 rounded-lg shadow-lg min-h-96"
          title={file.name}
          onError={() => setError('File preview failed')}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl px-6 mx-auto mt-20">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-600">Loading preview...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl px-6 mx-auto mt-20">
        <div className="p-8 text-center bg-white shadow-lg rounded-2xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">Preview Failed</h2>
          <p className="mb-6 text-slate-600">{error}</p>
          <div className="space-x-4">
            <button
              onClick={handleBack}
              className="px-6 py-2 text-white transition duration-300 rounded-full bg-slate-500 hover:bg-slate-600"
            >
              Back
            </button>
            {file && (
              <button
                onClick={handleDownload}
                className="px-6 py-2 text-white transition duration-300 bg-indigo-500 rounded-full hover:bg-indigo-600"
              >
                Download File
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl px-6 mx-auto mt-20">
      <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="flex items-center px-4 py-2 space-x-2 transition duration-300 text-slate-600 hover:text-slate-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            {file && (
              <div className="text-slate-800">
                <h1 className="text-lg font-semibold">{file.name}</h1>
                <p className="text-sm text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB • {file.mimetype}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {file && (
              <button
                onClick={handleDownload}
                className="flex items-center px-4 py-2 space-x-2 text-white transition duration-300 bg-indigo-500 rounded-full hover:bg-indigo-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {renderPreview()}
        </div>
      </div>
    </div>
  )
}

export default Preview
