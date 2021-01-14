module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: process.cwd(),
	globals: {
		'ts-jest': {
			tsconfig: 'tests/tsconfig.json'
		}
	}
}
