const {
    toLower
} = require('../dist')
const lodash = require('lodash/toLower')

exports['native'] = () => '__FOO_BAR__'.toLowerCase();

exports['utils'] = () => toLower('__FOO_BAR__');

exports['lodash'] = () => lodash('__FOO_BAR__');
