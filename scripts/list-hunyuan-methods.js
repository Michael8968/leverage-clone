const { getHunyuanClient } = require('../src/utils/hunyuan-client');
require('dotenv').config();

const client = getHunyuanClient();
console.log('Hunyuan Client 可用方法:');
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
