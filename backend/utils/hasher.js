const bcrypt = require('bcrypt');
module.exports = {
    hash: async (plain) => {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(plain, salt);
    },
    compare: (plain, hashed) => bcrypt.compare(plain, hashed),
};