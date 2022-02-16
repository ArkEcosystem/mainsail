const {
    lowerFirst
} = require('../dist')
const lodash = require('lodash/lowerFirst')

exports['utils'] = () => lowerFirst('__FOO_BAR__');

exports['lodash'] = () => lodash('__FOO_BAR__');
