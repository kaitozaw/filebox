import { expect } from 'chai';
import PreviewFactory from '../services/preview/PreviewFactory.js';
import ImagePreviewer from '../services/preview/renderers/ImagePreviewer.js';
import PdfPreviewer from '../services/preview/renderers/PdfPreviewer.js';
import FallbackPreviewer from '../services/preview/renderers/FallbackPreviewer.js';

describe('PreviewFactory tests', () => {
  const factory = new PreviewFactory({ storage: {} });

  it('image/* -> ImagePreviewer', () => {
    const r = factory.for({ mimetype: 'image/png' });
    expect(r).to.be.instanceOf(ImagePreviewer);
  });

  it('application/pdf -> PdfPreviewer', () => {
    const r = factory.for({ mimetype: 'application/pdf' });
    expect(r).to.be.instanceOf(PdfPreviewer);
  });

  it('others -> FallbackPreviewer', () => {
    const r = factory.for({ mimetype: 'text/csv' });
    expect(r).to.be.instanceOf(FallbackPreviewer);
  });
});
