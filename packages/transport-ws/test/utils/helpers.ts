import { WebSocketClient, WebSocketServer } from '../../src';

let nextTestPort = 42550;

let server: WebSocketServer;
let client: WebSocketClient;

/**
 * Returns the next port to use for a test server.
 */
export function getPort() {
	return nextTestPort++;
}

/**
 * Sets the server instance.
 *
 * @param instance
 */
export function setServer(instance: WebSocketServer) {
	return server = instance;
}

/**
 * Sets the client instance.
 *
 * @param instance
 */
export function setClient(instance: WebSocketClient) {
	return client = instance;
}

/**
 * Returns the server instance.
 */
export function getServer(): WebSocketServer | undefined {
	return server;
}

/**
 * Returns the client instance.
 */
export function getClient(): WebSocketClient | undefined {
	return client;
}
