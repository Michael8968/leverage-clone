const fs = require('fs');
try {
	const content = fs.readFileSync('./data/local-seeded-users.json','utf8');
	const p = JSON.parse(content);
	console.log(p.length);
} catch (e) {
	console.error('ERROR', e && e.message);
	process.exit(1);
}
