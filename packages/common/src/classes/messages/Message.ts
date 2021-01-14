import type { MessagePayloadType, MessageType } from '../../enums/network';
import type { Json } from '../../types/json';
import type { Buffer } from '../../utilities/buffer';
import { NetworkSerializer } from '../network/NetworkSerializer';
import { MessagePayload } from './MessagePayload';

export class Message {

	/**
	 * The unique identifier for this message. This is an incrementing number that is guaranteed to be unique for the
	 * sender connection, even if the connection is lost and then later resumed.
	 */
	public id: number;

	/**
	 * The type of message being sent.
	 */
	public type: MessageType;

	/**
	 * The name of the channel this message should be delivered to.
	 */
	public channel: string;

	/**
	 * The payloads contained in this message. If you want a specific payload and know the expected format, it is
	 * recommended to use the `getBinaryPayload()` and `getJsonPayload()` methods instead of accessing this array
	 * directly.
	 */
	public payloads = new Array<MessagePayload>();

	/**
	 * Constructs a new `Message` instance.
	 */
	public constructor(id: number, type: MessageType, channel: string) {
		this.id = id;
		this.type = type;
		this.channel = channel;
	}

	/**
	 * Adds a payload to the message.
	 *
	 * @param payload
	 */
	public addPayload(type: MessagePayloadType.Binary, data: Uint8Array): number;
	public addPayload(type: MessagePayloadType.Json, data: Json): number;
	public addPayload(payload: MessagePayload): number;
	public addPayload(payloadOrType: MessagePayload | MessagePayloadType, data?: Uint8Array | Json): number {
		if (typeof payloadOrType === 'number') {
			if (typeof data === 'undefined') {
				throw new Error('Data parameter is required');
			}

			return this.payloads.push(new MessagePayload(payloadOrType, data));
		}

		if (payloadOrType instanceof MessagePayload) {
			return this.payloads.push(payloadOrType);
		}

		throw new TypeError('Payload must be an instance of MessagePayload or MessagePayloadType');
	}

	/**
	 * Returns the binary value of the payload at `index` as an `Uint8Array`. If the payload at the index is not a
	 * binary payload, an error will be thrown.
	 */
	public getBinaryPayload(index: number = 0): Buffer {
		if (index >= this.payloads.length) {
			throw new RangeError('Index out of range');
		}

		return this.payloads[index].getBinary();
	}

	/**
	 * Returns the JSON value of the payload at `index`. If the payload at the index is not a JSON payload, an error
	 * will be thrown.
	 */
	public getJsonPayload<T extends Json = Json>(index: number = 0): T {
		if (index >= this.payloads.length) {
			throw new RangeError('Index out of range');
		}

		return this.payloads[index].getJson<T>();
	}

	/**
	 * Serializes the message as binary and returns the corresponding `Buffer`.
	 */
	public serialize() {
		return new NetworkSerializer().serializeMessage(this);
	}

	/**
	 * Creates a new `Message` from the given serialized binary, which should have come straight from the `serialize()`
	 * method.
	 *
	 * @param serialized
	 */
	public static from(data: Buffer) {
		return new NetworkSerializer().parseMessage(data);
	}

}
