const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');

const File = require('../models/File');
const FileService = require('../services/FileService');

describe('FileService.touchAccess test', () => {
  afterEach(() => sinon.restore());

  it('should updates lastAccessedAt for a valid file id successfully', async () => {
    const service = new FileService({ storage: {} });
    const file = { _id: 'file123' };

    const updateStub = sinon.stub(File, 'updateOne')
      .resolves({ acknowledged: true, modifiedCount: 1 });

    const before = Date.now();
    await service.touchAccess(file);

    expect(updateStub.calledOnce).to.be.true;

    const [filter, update] = updateStub.firstCall.args;
    expect(filter).to.deep.equal({ _id: file._id });

    expect(update).to.have.property('$set');
    expect(update.$set).to.have.property('lastAccessedAt');
    expect(update.$set.lastAccessedAt).to.be.instanceOf(Date);

    const ts = update.$set.lastAccessedAt.getTime();
    expect(ts).to.be.at.least(before);
    expect(ts).to.be.at.most(Date.now());
  });

  it('should do nothing when file or _id is missing', async () => {
    const service = new FileService({ storage: {} });
    const updateStub = sinon.stub(File, 'updateOne').resolves();

    await service.touchAccess(undefined);
    await service.touchAccess({});
    expect(updateStub.notCalled).to.be.true;
  });
});