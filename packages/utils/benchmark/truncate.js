const {
    truncate
} = require('../dist')
const lodash = require('lodash/truncate')

exports['utils'] = () => truncate('Hello World', {
    length: 5
});

exports['lodash'] = () => lodash('Hello World', {
    length: 5
});
