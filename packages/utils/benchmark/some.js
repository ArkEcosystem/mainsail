const {
    some
} = require('../dist')
const lodash = require('lodash/some')

exports['native'] = () => [null, 0, 'yes', false].some(Boolean);

exports['utils'] = () => some([null, 0, 'yes', false], Boolean);

exports['lodash'] = () => lodash([null, 0, 'yes', false], Boolean);
