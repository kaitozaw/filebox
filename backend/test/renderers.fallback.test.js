import { expect } from 'chai';
import FallbackPreviewer from '../services/preview/renderers/FallbackPreviewer.js';

describe('FallbackPreviewer (unit)', () => {
  it('render() results in 415 for unsupported types', async () => {
    const sut = new FallbackPreviewer();
    try {
      const out = await sut.render({ file: { mimetype: 'application/zip' } });
      expect(out && (out.status === 415 || out.code === 415)).to.equal(true);
    } catch (e) {
      const msg = String(e?.message || e?.name || e).toLowerCase();
      expect(e?.status === 415 || /415|unsupported/.test(msg)).to.equal(true);
    }
  });
});
