const {
    set
} = require('../dist')
const lodash = require('lodash/set')

var object = {
    'a': {
        'b': {
            'c': 3
        }
    }
};

exports['utils'] = () => set(object, 'a.b.c', 4);

exports['lodash'] = () => lodash(object, 'a.b.c', 4);
