const {
    unset
} = require('../dist')
const lodash = require('lodash/unset')

var object = {
    'a': {
        'b': {
            'c': 7
        }
    }
};

exports['utils'] = () => unset(object, 'a.b.c');

exports['lodash'] = () => lodash(object, 'a.b.c');
