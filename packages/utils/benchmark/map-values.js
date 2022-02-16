const {
    mapValues
} = require('../dist')
const lodash = require('lodash/mapValues')

const users = {
    'fred': {
        'user': 'fred',
        'age': 40
    },
    'pebbles': {
        'user': 'pebbles',
        'age': 1
    }
};

exports['utils'] = () => mapValues(users, o => o.age);

exports['lodash'] = () => lodash(users, o => o.age);
