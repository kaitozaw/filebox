const { expect } = require('chai');
const path = require('path');

class ValidationError extends Error { constructor(m){ super(m); this.name='ValidationError'; this.code=400; } }
class ForbiddenError extends Error { constructor(m){ super(m); this.name='ForbiddenError';  this.code=403; } }
class NotFoundError extends Error { constructor(m){ super(m); this.name='NotFoundError';   this.code=404; } }
 
const FileStub = {
    find () {
      FileStub.find.lastArgs = arguments;
      return {
        _populateArgs: null,
        _sortArgs: null,
        populate(field, sel) { this._populateArgs = [field, sel]; return this; },
        sort(spec) { this._sortArgs = spec; FileStub.find.lastChain = this; return Promise.resolve(FileStub.items || []); }
      };
    },
    findById: async (id) => (FileStub._byId && FileStub._byId[id]) || null,
    _byId: Object.create(null),
    items: []
  };

const fileDepId   = require.resolve('../models/File');  
const errorsDepId = require.resolve('../utils/errors');  
require.cache[fileDepId]   = { id: fileDepId, filename: fileDepId, loaded: true, exports: FileStub };
require.cache[errorsDepId] = { id: errorsDepId, filename: errorsDepId, loaded: true, exports: { ValidationError, ForbiddenError, NotFoundError } };

const TrashService = require('../services/TrashService.js');

describe('TrashService tests', () => {
  const userId = 'u_001';
  let storage, svc;

  beforeEach(() => {
    storage = {
      _removeCalls: [],
      async remove(p) { this._removeCalls.push(p); return true; }
    };
    svc = new TrashService({ storage });
    FileStub._byId  = Object.create(null);
    FileStub.items  = [];
    FileStub.find.lastArgs = null;
    FileStub.find.lastChain = null;
  });

  it('list() returns the recycle bin files and sorts them in descending order based on deletedAt.', async () => {
    FileStub.items = [{ id: 'f2' }, { id: 'f1' }];
    const out = await svc.list(userId);
    const [query] = FileStub.find.lastArgs;
    expect(query).to.be.an('object');
    expect(query.user).to.equal(userId);
    expect(query.deletedAt).to.have.property('$ne');
    const chain = FileStub.find.lastChain;
    expect(chain._populateArgs).to.deep.equal(['folder', 'name']);
    expect(chain._sortArgs).to.deep.equal({ deletedAt: -1 });
    expect(out).to.deep.equal(FileStub.items);
  });

  it('The restore() function successfully cleared the deletedAt field and saved the changes.', async () => {
    let saved = false;
    FileStub._byId['f1'] = {
      _id: 'f1',
      user: { toString: () => userId },
      deletedAt: new Date(),
      async save(){ saved = true; }
    };

    const out = await svc.restore(userId, 'f1');
    expect(FileStub._byId['f1'].deletedAt).to.equal(null);
    expect(saved).to.equal(true);
    expect(out).to.deep.equal({ message: 'File restored successfully' });
  });

  it('File does not exist - Throw NotFoundError', async () => {
    FileStub._byId = Object.create(null); 
    try {
      await svc.restore(userId, 'missing');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.be.instanceOf(NotFoundError);
      expect(e.code).to.equal(404);
    }
  });

  it('Owner mismatch - Throw ForbiddenError', async () => {
    FileStub._byId['f1'] = {
      _id: 'f1',
      user: { toString: () => 'another_user' },
      deletedAt: new Date(),
      async save(){}
    };
    try {
      await svc.restore(userId, 'f1');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.be.instanceOf(ForbiddenError);
      expect(e.code).to.equal(403);
    }
  });

  it('The file is not in the recycle bin - Raise ValidationError', async () => {
    FileStub._byId['f1'] = {
      _id: 'f1',
      user: { toString: () => userId },
      deletedAt: null,
      async save(){}
    };
    try {
      await svc.restore(userId, 'f1');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.be.instanceOf(ValidationError);
      expect(e.code).to.equal(400);
    }
  });

  it('The purge() function calls storage.remove and deleteOne', async () => {
    let deleted = false;
    FileStub._byId['f1'] = {
      _id: 'f1',
      user: { toString: () => userId },
      deletedAt: new Date(),
      filePath: '/data/f1.bin',
      async deleteOne(){ deleted = true; }
    };

    const out = await svc.purge(userId, 'f1');

    expect(storage._removeCalls).to.deep.equal(['/data/f1.bin']);
    expect(deleted).to.equal(true);
    expect(out).to.deep.equal({ message: 'File permanently deleted' });
  });

  it('File does not exist - Raise NotFoundError', async () => {
    FileStub._byId = Object.create(null);
    try {
      await svc.purge(userId, 'missing');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.be.instanceOf(NotFoundError);
      expect(e.code).to.equal(404);
    }
  });
  
  it('Owner mismatch - Throw ForbiddenError', async () => {
    FileStub._byId['f1'] = {
      _id: 'f1',
      user: { toString: () => 'another_user' },
      deletedAt: new Date(),
      filePath: '/data/f1.bin',
      async deleteOne(){}
    };
    try {
      await svc.purge(userId, 'f1');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.be.instanceOf(ForbiddenError);
      expect(e.code).to.equal(403);
    }
  });

  it('File not in the recycle bin - Raise ValidationError', async () => {
    FileStub._byId['f1'] = {
      _id: 'f1',
      user: { toString: () => userId },
      deletedAt: null,
      filePath: '/data/f1.bin',
      async deleteOne(){}
    };
    try {
      await svc.purge(userId, 'f1');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).to.be.instanceOf(ValidationError);
      expect(e.code).to.equal(400);
    }
  });
});
