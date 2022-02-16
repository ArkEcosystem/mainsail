const {
    orderBy
} = require('../dist')
const lodash = require('lodash/orderBy')

const users = [{
        'user': 'fred',
        'age': 48
    },
    {
        'user': 'barney',
        'age': 34
    },
    {
        'user': 'fred',
        'age': 40
    },
    {
        'user': 'barney',
        'age': 36
    }
];

exports['utils'] = () => orderBy(users, ['user', 'age'], ['asc', 'desc']);

exports['lodash'] = () => lodash(users, ['user', 'age'], ['asc', 'desc']);
