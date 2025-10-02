const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');

const File = require('../models/File');
const RecentService = require('../services/RecentService');

describe('RecentService.listByUser tests', () => {
  afterEach(() => sinon.restore());

  it('should apply default limit = 20 when no limit is provided', async () => {
    const userId = 'U1';

    const execStub = sinon.stub().resolves([{ _id: 'f1' }]);
    const chain = {
      sort: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      lean: sinon.stub().returnsThis(),
      exec: execStub
    };
    sinon.stub(File, 'find').returns(chain);

    const service = new RecentService();
    await service.listByUser(userId, {});

    expect(File.find.calledOnceWith({
      user: userId,
      lastAccessedAt: { $ne: null }
    })).to.be.true;
    expect(chain.limit.calledOnceWith(20)).to.be.true;
    expect(execStub.calledOnce).to.be.true;
  });

  it('should use default = 20 when limit <= 0', async () => {
    const userId = 'U1';

    const chain = {
      sort: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      lean: sinon.stub().returnsThis(),
      exec: sinon.stub().resolves([])
    };
    sinon.stub(File, 'find').returns(chain);

    const service = new RecentService();
    await service.listByUser(userId, { limit: 0 });

    expect(chain.limit.calledOnceWith(20)).to.be.true;
  });

  it('should apply max limit = 100 even when limit is over 100', async () => {
    const userId = 'U1';

    const chain = {
      sort: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      select: sinon.stub().returnsThis(),
      lean: sinon.stub().returnsThis(),
      exec: sinon.stub().resolves([])
    };
    sinon.stub(File, 'find').returns(chain);

    const service = new RecentService();
    await service.listByUser(userId, { limit: 999 });

    expect(chain.limit.calledOnceWith(100)).to.be.true;
  });
});