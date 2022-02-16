const {
    sortBy
} = require('../dist')
const lodash = require('lodash/sortBy')

const users = [{
        'user': 'fred',
        'age': 48
    },
    {
        'user': 'barney',
        'age': 36
    },
    {
        'user': 'fred',
        'age': 40
    },
    {
        'user': 'barney',
        'age': 34
    }
];

exports['utils'] = () => sortBy(users, ['user', 'age']);

exports['lodash'] = () => lodash(users, ['user', 'age']);
