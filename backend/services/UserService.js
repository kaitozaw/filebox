const User = require('../models/User');
const { ValidationError, UnauthorizedError, NotFoundError } = require('../utils/errors');

class UserService {
    constructor({ hasher, tokenUtil }) {
        this.hasher = hasher;
        this.tokenUtil = tokenUtil;
    }

    async register({ name, email, password }) {
        const exists = await User.findOne({ email });
        if (exists) throw new ValidationError('User already exists');
        const hashed = await this.hasher.hash(password);
        const user = await User.create({ name, email, password: hashed });
        const token = this.tokenUtil.sign({ id: user.id });
        return { id: user.id, name: user.name, email: user.email, token };
    }

    async login({ email, password }) {
        const user = await User.findOne({ email });
        if (!user || !(await this.hasher.compare(password, user.password))) throw new UnauthorizedError('Invalid email or password');
        const token = this.tokenUtil.sign({ id: user.id });
        return { id: user.id, name: user.name, email: user.email, token };
    }

    async getProfile(userId) {
        const user = await User.findById(userId);
        if (!user) throw new NotFoundError('User not found');
        return { name: user.name, email: user.email, university: user.university, address: user.address };
    }

    async updateProfile(userId, { name, email, university, address }) {
        const user = await User.findById(userId);
        if (!user) throw new NotFoundError('User not found');
        user.name = name ?? user.name;
        user.email = email ?? user.email;
        user.university = university ?? user.university;
        user.address = address ?? user.address;
        const updated = await user.save();
        const token = this.tokenUtil.sign({ id: updated.id });
        return { id: updated.id, name: updated.name, email: updated.email, university: updated.university, address: updated.address, token };
    }
}

module.exports = UserService;