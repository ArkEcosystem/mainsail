const {
    reject
} = require('../dist')
const lodash = require('lodash/reject')

const users = [{
        'user': 'barney',
        'age': 36,
        'active': false
    },
    {
        'user': 'fred',
        'age': 40,
        'active': true
    }
];
exports['utils'] = () => reject(users, o => o.active);

exports['lodash'] = () => lodash(users, o => o.active);
