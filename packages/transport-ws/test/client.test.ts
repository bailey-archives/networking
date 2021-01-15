import { Buffer, EventEmitter, ServerEventSchema } from '@networking/common';
import { WebSocketClient, WebSocketServer } from '../src';
import { getClient, getServer, getPort, setClient, setServer } from './utils/helpers';

describe('WebSocketClient', function() {

	afterEach(() => {
		getServer()?.close();
		getClient()?.close();
	});

	it('Constructs and stores the correct address', function() {
		const address = 'ws://localhost/example';
		const client = new WebSocketClient(address);
		expect(client.address).toBe(address);
	});

	it('Connects to server transport', function() {
		return new Promise<void>(async resolve => {
			const port = getPort();
			const server = setServer(new WebSocketServer({ port }));
			const client = setClient(new WebSocketClient('ws://localhost:' + port));

			server.once('connection', connection => {
				resolve();
			});

			await server.start();
			await client.connect();
		});
	}, 2000);

	it('Sends data to server transport', async function() {
		const string = 'This is a test! ✨';
		const data = await new Promise<Buffer>(async resolve => {
			const port = getPort();
			const server = setServer(new WebSocketServer({ port }));
			const client = setClient(new WebSocketClient('ws://localhost:' + port));

			server.once('connection', connection => {
				connection.once('data', resolve);
			});

			await server.start();
			await client.connect();
			await client.send(Buffer.from(string));
		});

		expect(data.toString()).toBe(string);
	});

	it('Receives data back from server transport', function() {
		return new Promise<void>(async resolve => {
			const port = getPort();
			const server = setServer(new WebSocketServer({ port }));
			const client = setClient(new WebSocketClient('ws://localhost:' + port));

			// Server will wait for "1" and send back "2"
			server.once('connection', connection => {
				connection.once('data', data => {
					expect(data.toString()).toBe('1');
					connection.send(Buffer.from('2'));
				});
			});

			// Client will wait for "2" and resolve
			client.once('data', data => {
				expect(data.toString()).toBe('2');
				resolve();
			});

			await server.start();
			await client.connect();
			await client.send(Buffer.from('1'));
		});
	});

	it('Notifies server transport of normal disconnect', function() {
		return new Promise<void>(async resolve => {
			const port = getPort();
			const server = setServer(new WebSocketServer({ port }));
			const client = setClient(new WebSocketClient('ws://localhost:' + port));

			server.once('connection', connection => {
				connection.once('disconnected', (intentional, error) => {
					expect(intentional).toBe(true);
					expect(error).toBeUndefined();
					resolve();
				});
			});

			await server.start();
			await client.connect();
			client.close();
		});
	});

	it('Notifies server transport of erroneous disconnect', function() {
		return new Promise<void>(async resolve => {
			const port = getPort();
			const server = setServer(new WebSocketServer({ port }));
			const client = setClient(new WebSocketClient('ws://localhost:' + port));

			server.once('connection', connection => {
				connection.once('disconnected', (intentional, error) => {
					// The intentional arg specifies whether or not the client wanted to close
					// The error arg is only provided for locally-occurring errors

					expect(intentional).toBe(false);
					expect(error).toBeUndefined();
					resolve();
				});
			});

			await server.start();
			await client.connect();
			client.close(new Error('Something went terribly wrong!'));
		});
	});

	it('Can reconnect after disconnecting', function() {
		return new Promise<void>(async resolve => {
			const port = getPort();
			const server = setServer(new WebSocketServer({ port }));
			const client = setClient(new WebSocketClient('ws://localhost:' + port));

			await server.start();
			await client.connect();
			await client.disconnect();

			// Resolve once a connection is made
			server.once('connection', connection => {
				resolve();
			});

			await client.connect();
		});
	});

	it('Can reconnect after server side disconnect', function() {
		return new Promise<void>(async resolve => {
			const port = getPort();
			const server = setServer(new WebSocketServer({ port }));
			const client = setClient(new WebSocketClient('ws://localhost:' + port));

			// The first connection will be closed
			server.once('connection', connection => {
				connection.close();
			});

			await server.start();

			client.once('disconnected', intentional => {
				expect(intentional).toBe(true);
				server.once('connection', connection => {
					resolve();
				});

				expect(client.connect()).resolves.not.toThrow();
			});

			await client.connect();
		});
	});

});
