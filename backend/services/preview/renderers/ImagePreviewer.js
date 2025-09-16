class ImagePreviewer {
    constructor({ storage }) {
      this.storage = storage
    }
  
    async render(file, options = {}) {
      const { stream } = this.storage.stream(file.filePath)
      const headers = {
        'Content-Type': file.mimetype,
        'Content-Disposition': 'inline'
      }
  
      return { stream, headers }
    }
  
    supports(mimetype) {
      return mimetype && mimetype.startsWith('image/')
    }
  }
  
  module.exports = ImagePreviewer
  