import { expect } from 'chai';
import sinon from 'sinon';
import { Readable } from 'stream';
import PdfPreviewer from '../services/preview/renderers/PdfPreviewer.js';

describe('PdfPreviewer tests', () => {
  const fakeStorage = { stream: sinon.stub() };
  const sut = new PdfPreviewer({ storage: fakeStorage });

  it('should support only application/pdf', () => {
    expect(sut.supports('application/pdf')).to.equal(true);
    expect(sut.supports('image/png')).to.equal(false);
    expect(sut.supports('text/plain')).to.equal(false);
  });

  it('should return stream + inline headers', async () => {
    fakeStorage.stream.returns({ stream: Readable.from(Buffer.from('%PDF-1.7')) });

    const file = { filePath: '/tmp/a.pdf', mimetype: 'application/pdf', name: 'a.pdf' };
    const { stream, headers } = await sut.render({ file });

    expect(headers['Content-Type']).to.equal('application/pdf');
    expect(headers['Content-Disposition']).to.equal('inline');

    const chunks = [];
    for await (const c of stream) chunks.push(c);
    expect(Buffer.concat(chunks).toString()).to.equal('%PDF-1.7');
  });
});
