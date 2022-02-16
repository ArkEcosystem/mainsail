const {
    find
} = require('../dist')
const lodash = require('lodash/find')

const users = [{
        user: "barney",
        age: 36,
        active: true
    },
    {
        user: "fred",
        age: 40,
        active: false
    },
    {
        user: "pebbles",
        age: 1,
        active: true
    },
];

exports['utils'] = () => find(users, o => o.age < 40);

exports['lodash'] = () => lodash(users, o => o.age < 40);
