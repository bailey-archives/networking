import type { MessagePayloadType, MessageType } from '../../enums/network';
import { Buffer } from '../../utilities/buffer';
import { EventEmitter } from '../../utilities/events';
import { PromiseCompletionSource } from '../../utilities/promises';
import { Message } from '../messages/Message';
import { MessagePayload } from '../messages/MessagePayload';

/**
 * The `NetworkReader` class helps buffer and parse incoming binary data.
 */
export class NetworkReader extends EventEmitter<Events> {

	private _queue: Array<Buffer>;
	private _queueLength = 0;
	private _queueHeadOffset = 0;
	private _queueConsumeRequests: Array<ConsumeRequest>;

	private _parsingConnectionIndex = 0;
	private _parsing = false;

	public constructor() {
		super();

		this._queue = [];
		this._queueConsumeRequests = [];
	}

	/**
	 * Writes bytes to the reader.
	 *
	 * @param bytes
	 */
	public write(bytes: Uint8Array) {
		const buffer = Buffer.from(bytes);

		// Add the buffer to the queue
		this._queueLength += buffer.byteLength;
		this._queue.push(buffer);

		// Fulfill consume requests
		if (this._queueConsumeRequests.length > 0) {
			const request = this._queueConsumeRequests[0];

			if (this._queueLength >= request.length) {
				this._queueConsumeRequests.shift();
				request.source.setResult(this._consumeBytes(request.length));
			}
		}

		// Start parsing if there is data left in the queue
		else if (this._queueLength > 0) {
			this._parseData();
		}
	}

	/**
	 * Clears the reader's internal data.
	 */
	public clear() {
		this._queue = [];
		this._queueLength = 0;
		this._queueHeadOffset = 0;
		this._queueConsumeRequests = [];
		this._parsing = false;
		this._parsingConnectionIndex++;
	}

	/**
	 * Parses incoming data until we have a complete message, and then emits it.
	 */
	private async _parseData() {
		// Do nothing if we are already parsing or there is no data
		if (this._parsing || this._queueLength === 0) {
			return;
		}

		// Prevent multiple simultaneous runs
		this._parsing = true;

		// Get the current operational index
		// This is used to prevent the reader from emitting errors or messages after clear() has been called
		const routine = this._parsingConnectionIndex;

		try {
			// Check the marker to make sure this is the beginning of a message
			const markBuffer = await this._getBytes(2);
			if (markBuffer[0] !== 221 || markBuffer[1] !== 240) {
				throw new Error('Unknown byte marker: ' + markBuffer.toString('hex'));
			}

			// Start parsing the header
			const headerStartBuffer = await this._getBytes(6);
			const messageId = headerStartBuffer.readUInt32BE(0);
			const messageType = headerStartBuffer.readUInt8(4) as MessageType;
			const channelLength = headerStartBuffer.readUInt8(5);

			// Get the channel name and payload count
			const headerEndBuffer = await this._getBytes(1 + channelLength);
			const channelName = headerEndBuffer.subarray(0, channelLength).toString();
			const numPayloads = headerEndBuffer.readUInt8(channelLength);

			// Build the message
			const message = new Message(messageId, messageType, channelName);

			// Add payloads
			for (let index = 0; index < numPayloads; index++) {
				const headBuffer = await this._getBytes(4);
				const payloadType = headBuffer.readUInt8(0) as MessagePayloadType;
				const payloadSize = headBuffer.readUIntBE(1, 3);
				const payloadBuffer = await this._getBytes(payloadSize);

				message.addPayload(MessagePayload.from(payloadType, payloadBuffer));
			}

			if (this._parsingConnectionIndex === routine) {
				this._emit('message', message);
			}
		}
		catch (error) {
			if (this._parsingConnectionIndex === routine) {
				this._emit('error', error);
			}
		}

		this._parsing = false;
		this._parseData();
	}

	/**
	 * Returns a buffer containing the next `length` bytes received over the network, and removes those bytes from the
	 * network reader.
	 *
	 * @param length
	 */
	private _getBytes(length: number) {
		const source = new PromiseCompletionSource<Buffer>();

		// If the queue holds enough data, resolve immediately
		if (this._queueLength >= length) {
			source.setResult(this._consumeBytes(length));
		}

		// Otherwise, queue this request
		else {
			this._queueConsumeRequests.push({
				length,
				source
			});
		}

		// Return the promise
		return source.promise;
	}

	/**
	 * Consumes the first `length` bytes from the queue, removing buffers and adjusting offets as necessary.
	 *
	 * @param length
	 */
	private _consumeBytes(length: number): Buffer {
		if (this._queueLength < length) {
			throw new Error('Cannot consume ' + length + ' bytes from queue of size ' + this._queueLength);
		}

		if (length === 0) {
			return Buffer.alloc(0);
		}

		let buffers = new Array<Buffer>(), size = 0;

		while (size < length) {
			const bytesNeeded = length - size;

			// Get information from the queue's head
			const head = this._queue[0];
			const headBytesAvailable = head.byteLength - this._queueHeadOffset;
			const headBytesToTake = headBytesAvailable > bytesNeeded ? bytesNeeded : headBytesAvailable;
			const headBytesRemaining = headBytesAvailable - headBytesToTake;

			// Get the buffer
			const buffer = head.subarray(
				this._queueHeadOffset,
				this._queueHeadOffset + headBytesToTake
			);

			// Subtract the bytes taken from the queue
			this._queueLength -= headBytesToTake;

			// If we've emptied the head, remove it from the queue
			if (headBytesRemaining === 0) {
				this._queue.shift();
				this._queueHeadOffset = 0;
			}

			// Otherwise, if there is still data in the head, adjust the offset
			else {
				this._queueHeadOffset += headBytesToTake;
			}

			// Add the buffer
			buffers.push(buffer);
			size += buffer.byteLength;
		}

		// Final size check
		if (size !== length) {
			throw new Error('Consumed bytes size mismatch (got ' + size + ', wanted ' + length + '), this should never happen');
		}

		// Return all buffers concatenated
		return Buffer.concat(buffers);
	}

}

type Events = {
	message: [message: Message];
	error: [error: Error];
}

interface ConsumeRequest {
	length: number;
	source: PromiseCompletionSource<Buffer>;
}
