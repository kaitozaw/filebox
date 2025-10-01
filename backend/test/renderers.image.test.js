import { expect } from 'chai';
import sinon from 'sinon';
import { Readable } from 'stream';
import ImagePreviewer from '../services/preview/renderers/ImagePreviewer.js';

describe('ImagePreviewer (unit)', () => {
  const fakeStorage = { stream: sinon.stub() };
  const sut = new ImagePreviewer({ storage: fakeStorage });

  it('supports image/*', () => {
    expect(sut.supports('image/png')).to.equal(true);
    expect(sut.supports('image/jpeg')).to.equal(true);
    expect(sut.supports('application/pdf')).to.equal(false);
  });

  it('render() returns a readable stream (headers optional)', async () => {
    fakeStorage.stream.returns({ stream: Readable.from(Buffer.from('PNGDATA')) });

    const file = { filePath: '/tmp/a.png', mimetype: 'image/png', name: 'a.png' };
    const out = await sut.render({ file, w: 800, h: 600 });

    expect(out).to.be.an('object');
    expect(out.stream?.readable).to.equal(true);

    const headers = out.headers;
    if (headers) {
      const ct =
        headers['Content-Type'] ??
        headers['content-type'] ??
        headers.contentType ??
        headers.mimetype;
      const cd =
        headers['Content-Disposition'] ??
        headers['content-disposition'] ??
        headers.contentDisposition;

      if (ct) expect(ct).to.equal('image/png');
      if (cd) expect(String(cd).toLowerCase()).to.equal('inline');
    }

    const chunks = [];
    for await (const c of out.stream) chunks.push(c);
    expect(Buffer.concat(chunks).toString()).to.equal('PNGDATA');
  });
});
