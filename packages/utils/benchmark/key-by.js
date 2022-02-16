const {
    keyBy
} = require('../dist')
const lodash = require('lodash/keyBy')

const array = [{
        'dir': 'left',
        'code': 97
    },
    {
        'dir': 'right',
        'code': 100
    }
];

exports['utils'] = () => keyBy(array, o => String.fromCharCode(o.code));

exports['lodash'] = () => lodash(array, o => String.fromCharCode(o.code));
