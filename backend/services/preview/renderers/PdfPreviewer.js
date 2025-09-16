class PdfPreviewer {
    constructor({ storage }) {
      this.storage = storage
    }
  
    async render(file, options = {}) {
      const { stream } = this.storage.stream(file.filePath)
      const headers = {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline'
      }
  
      return { stream, headers }
    }
  
    supports(mimetype) {
      return mimetype === 'application/pdf'
    }
  }
  
  module.exports = PdfPreviewer
  