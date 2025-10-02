const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');

const { RecentController } = require('../controllers/RecentController');

describe('RecentController.getRecent tests', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should call service with req.user.id successfully', async () => {
    const recentService = { listByUser: sinon.stub().resolves([{ _id: 'f1', name: 'File1' }]) };
    const controller = new RecentController({ recentService });

    const req = { user: { id: 'U1' } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };

    await controller.getRecent(req, res);

    expect(recentService.listByUser.calledOnceWith('U1')).to.be.true;
    expect(res.status.calledWith(200)).to.be.true;
    expect(res.json.calledWith([{ _id: 'f1', name: 'File1' }])).to.be.true;
  });

  it('should return 500 if an error occurs', async () => {
    const recentService = { listByUser: sinon.stub().rejects(new Error('DB Error')) };
    const controller = new RecentController({ recentService });

    const req = { user: { id: 'U1' } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };

    const handleError = sinon.stub(controller, 'handleError').callsFake((res, err) => {
      res.status(500).json({ message: err.message });
      return res;
    });

    await controller.getRecent(req, res);
    
    expect(handleError.calledOnce).to.be.true;
    expect(res.status.calledWith(500)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
  });
});