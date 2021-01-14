import type { MessagePayloadType, MessageType } from '../../enums/network';
import { Buffer } from '../../utilities/buffer';
import { Message } from '../messages/Message';
import { MessagePayload } from '../messages/MessagePayload';

/**
 * The `NetworkWriter` class helps build binary messages for outgoing data.
 */
export class NetworkSerializer {

	/**
	 * Serializes a message into a buffer instance that can be sent over the network.
	 *
	 * @param message
	 */
	public serializeMessage(message: Message): Buffer {
		const header = this._getHeaderBuffer(message);
		const mark = Buffer.from([221, 240]); // 0xDDF0 to mark the beginning of a message
		const payloads = this._getPayloadBuffers(message);

		return Buffer.concat([ mark, header, ...payloads ]);
	}

	/**
	 * Parses a message from a `Buffer` back into the `Message` used to create it.
	 *
	 * @param data
	 */
	public parseMessage(data: Buffer): Message {
		const buffer = Buffer.from(data);

		// Make sure the message starts with the message mark 0xDDF0
		if (buffer[0] !== 221 || buffer[1] !== 240) {
			throw new Error('The provided buffer is not a valid message (missing 16-bit mark)');
		}

		// Parse the header for information
		const header = this._parseHeaderFromBuffer(buffer.slice(2));
		const payloads = this._parsePayloadsFromBuffer(buffer.slice(2 + header.payloadStartOffset), header.payloadCount);

		// Build the message
		const message = new Message(header.id, header.type, header.channel);
		for (const payload of payloads) {
			message.addPayload(payload);
		}

		return message;
	}

	/**
	 * Builds the header for the given message options.
	 *
	 * @param options
	 */
	private _getHeaderBuffer(options: Message): Buffer {
		// Get the header and channel buffers
		const channel = Buffer.from(options.channel);
		const header = Buffer.alloc(7 + channel.byteLength);

		// Add message id and type
		header.writeUInt32BE(options.id, 0);
		header.writeUInt8(options.type, 4);

		// Add the length of the channel name
		header.writeUInt8(channel.byteLength, 5);

		// Copy the channel name
		header.write(channel.toString(), 6);

		// Add the number of payloads
		header.writeUInt8(options.payloads?.length ?? 0, 6 + channel.byteLength);

		return header;
	}

	/**
	 * Parses the header from a buffer and returns an object containing the information received, as well as the
	 * offset at which the message's payloads start.
	 *
	 * @param buffer
	 */
	private _parseHeaderFromBuffer(buffer: Buffer): ParsedHeaderData {
		const messageId = buffer.readUInt32BE(0);
		const messageType = buffer.readUInt8(4) as MessageType;

		const channelNameLength = buffer.readUInt8(5);
		const channelName = buffer.subarray(6, 6 + channelNameLength).toString();

		const payloadCount = buffer.readUInt8(6 + channelNameLength);
		const payloadStartOffset = 7 + channelNameLength;

		return {
			id: messageId,
			type: messageType,
			channel: channelName,
			payloadCount,
			payloadStartOffset
		};
	}

	private _parsePayloadsFromBuffer(buffer: Buffer, count: number): MessagePayload[] {
		const payloads = new Array<MessagePayload>();

		let offset = 0;
		for (let payloadIndex = 0; payloadIndex < count; payloadIndex++) {
			// The first byte is the type
			// The next three bytes are the size (24 bits unsigned)
			// The rest is the data

			const type = buffer.readUInt8(offset) as MessagePayloadType;
			const size = buffer.readUIntBE(offset + 1, 3);
			const data = buffer.slice(offset + 4, offset + size + 4);

			payloads.push(MessagePayload.from(type, data));
			offset += 4 + data.byteLength;
		}

		return payloads;
	}

	/**
	 * Returns an array of buffers that can be concatenated to represent the message's payloads.
	 *
	 * @param options
	 */
	private _getPayloadBuffers(options: Message): Buffer[] {
		const buffers = new Array<Buffer>();

		if (options.payloads) {
			for (const payload of options.payloads) {
				// Get the data buffer
				const data = payload.toBuffer();

				// Add the type as an 8 bit integer
				buffers.push(Buffer.from([ payload.type ]));

				// Add the size of the data as a 24 bit integer
				const sizeBuffer = Buffer.alloc(3);
				sizeBuffer.writeUIntBE(data.length, 0, 3);
				buffers.push(sizeBuffer);

				// Add the payload data
				buffers.push(data);
			}
		}

		return buffers;
	}

}

interface ParsedHeaderData {
	id: number;
	type: MessageType;
	channel: string;
	payloadCount: number;
	payloadStartOffset: number;
}
