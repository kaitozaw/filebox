class FallbackPreviewer {
    constructor() {}
  
    async render(file, options = {}) {
      const error = new Error('Unsupported file type for preview')
      error.status = 415
      throw error
    }
  
    supports(mimetype) {
      return true
    }
  }
  
  module.exports = FallbackPreviewer
  