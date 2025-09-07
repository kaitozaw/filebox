const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;
module.exports = {
    sign: (payload, opts = { expiresIn: '30d' }) => jwt.sign(payload, SECRET, opts),
    verify: (token) => jwt.verify(token, SECRET),
};