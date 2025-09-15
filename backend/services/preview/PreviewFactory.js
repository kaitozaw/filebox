const ImagePreviewer = require('./renderers/ImagePreviewer')
const PdfPreviewer = require('./renderers/PdfPreviewer')
const FallbackPreviewer = require('./renderers/FallbackPreviewer')

class PreviewFactory {
  constructor({ storage }) {
    this.storage = storage
    this.renderers = [
      new ImagePreviewer({ storage }),
      new PdfPreviewer({ storage }),
      new FallbackPreviewer()
    ]
  }

  for(file) {
    const mimetype = file.mimetype
    const renderer = this.renderers.find(r => r.supports(mimetype))
    return renderer || this.renderers[this.renderers.length - 1]
  }

  static create({ storage }) {
    return new PreviewFactory({ storage })
  }
}

module.exports = PreviewFactory
