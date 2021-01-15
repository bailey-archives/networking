const path = require('path');
const fs = require('fs');
const cwd = process.cwd();

// Detect the tsconfig path
const eligible = [
	path.resolve(cwd, 'tsconfig.test.json'),
	path.resolve(cwd, 'tsconfig.spec.json'),
	path.resolve(cwd, 'test/tsconfig.json'),
	path.resolve(cwd, 'test/tsconfig.test.json'),
	path.resolve(cwd, 'test/tsconfig.spec.json'),
	path.resolve(cwd, 'test/tsconfig.json'),
	path.resolve(cwd, 'tests/tsconfig.test.json'),
	path.resolve(cwd, 'tests/tsconfig.spec.json'),
	path.resolve(cwd, 'tests/tsconfig.json'),
	path.resolve(cwd, 'tsconfig.json')
];

const tsconfigPath = eligible.find(p => fs.existsSync(p));

if (!tsconfigPath) {
	console.error('Could not find a tsconfig.json file to use for testing!');
	process.exit(1);
}

module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: process.cwd(),
	globals: {
		'ts-jest': {
			tsconfig: tsconfigPath
		}
	}
}
