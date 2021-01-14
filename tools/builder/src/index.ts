import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class Builder {

	public async start() {
		const bin = path.resolve(__dirname, '../node_modules/.bin');
		const delim = path.delimiter;

		process.env.PATH += delim + bin;
		process.env.FORCE_COLOR = 'true';

		const args = process.argv.slice(2);
		if (args.length === 0) args.push('build');
		const command = args.shift()!.toLowerCase();
		const isAll = command === 'all';

		// Test
		if (command === 'test' || isAll) {
			await this._test();
		}

		// Build
		if (command === 'build' || isAll) {
			console.log('Starting builder for %s...', process.cwd());
			console.log('Using bin path: %s (delimiter=%s)', bin, delim);

			await this._clean();
			await this._compile();
		}
	}

	private async _clean() {
		const directories = [
			path.resolve(process.cwd(), 'lib'),
			path.resolve(process.cwd(), 'dist')
		];

		for (const dir of directories) {
			try {
				if (fs.existsSync(dir)) {
					if (fs.statSync(dir).isDirectory()) {
						console.log('Removing build directory: %s', dir);
						await fs.promises.rm(dir, { recursive: true });
					}
				}
			}
			catch (err) {
				console.error('Failed to clean build directory: %s', dir);
				console.error(err);
			}
		}
	}

	private _test() {
		return new Promise<void>(resolve => {
			const configPath = path.resolve(__dirname, '../configs/jest.config.js');

			// console.log('Running jest with config: %s\n', configPath);

			const proc = spawn(
				'jest' + (process.platform === 'win32' ? '.cmd' : ''),
				[
					'--config=' + configPath,
					'--colors'
				],
				{
					shell: true,
					stdio: ['pipe', 'pipe', 'pipe']
				}
			);

			proc.stderr?.on('data', data => {
				process.stdout.write(data);
			});

			proc.stdout?.on('data', data => {
				process.stdout.write(data);
			});

			proc.on('exit', code => {
				if (!code) {
					return resolve();
				}

				console.log('Exiting with code %d.', code);
				process.exit(code);
			});
		});
	}

	private _compile() {
		return new Promise<void>(resolve => {
			console.log('Running tsc\n');

			const proc = spawn('tsc' + (process.platform === 'win32' ? '.cmd' : ''), {
				stdio: ['pipe', 'inherit', 'inherit'],
				shell: true
			});

			proc.on('exit', code => {
				if (!code) {
					return resolve();
				}

				process.exit(code);
			});
		});
	}

}
