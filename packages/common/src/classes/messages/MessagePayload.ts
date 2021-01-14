import { MessagePayloadType } from '../../enums/network';
import { Json } from '../../types/json';
import { Buffer } from '../../utilities/buffer';

export class MessagePayload {

	public readonly type: MessagePayloadType;
	public readonly data: any;

	/**
	 * Constructs a new `MessagePayload` instance.
	 *
	 * @param type
	 * @param data
	 */
	public constructor(type: MessagePayloadType.Json, data: Json);
	public constructor(type: MessagePayloadType.Binary, data: Uint8Array);
	public constructor(type: MessagePayloadType, data: Uint8Array | Json);
	public constructor(type: MessagePayloadType, data: Uint8Array | Json) {
		if (type === MessagePayloadType.Binary) {
			data = Buffer.from(data as Uint8Array);
		}

		this.type = type;
		this.data = data;
	}

	/**
	 * Returns the JSON data within this message. Throws an error if the payload is not a `Json` type.
	 */
	public getJson<T extends Json = Json>(): T {
		if (this.type === MessagePayloadType.Json) {
			return this.data as T;
		}

		throw new Error('The payload does not contain JSON data');
	}

	/**
	 * Returns the `Buffer` within this message. Throws an error if the payload is not a `Binary` type.
	 */
	public getBinary(): Buffer {
		if (this.type === MessagePayloadType.Binary) {
			return this.data;
		}

		throw new Error('The payload does not contain binary data');
	}

	/**
	 * Converts the data into a `Buffer` instance.
	 */
	public toBuffer(): Buffer {
		// If the type is binary, return the data as a buffer
		if (this.type === MessagePayloadType.Binary) {
			return Buffer.from(this.getBinary());
		}

		// If the type is JSON, encode the data into a buffer
		else if (this.type === MessagePayloadType.Json) {
			return MessagePayload._encodeJsonToBuffer(this.getJson());
		}

		throw new TypeError('Unknown payload type');
	}

	/**
	 * Restores a `MessageBuffer` instance from the given data.
	 *
	 * @param type The type of data in the buffer.
	 * @param data The binary data that will be decoded according to the type.
	 */
	public static from(type: MessagePayloadType, data: Buffer): MessagePayload {
		if (type === MessagePayloadType.Binary) {
			return new MessagePayload(MessagePayloadType.Binary, data);
		}

		else if (type === MessagePayloadType.Json) {
			return new MessagePayload(
				MessagePayloadType.Json,
				this._decodeJsonFromBuffer(data)
			);
		}

		throw new TypeError('Unable to restore MessagePayload: unknown type');
	}

	/**
	 * Serializes the JSON into a buffer.
	 */
	private static _encodeJsonToBuffer(data: Json) {
		// The spec mandates that the first byte of the serialized output be an 8-bit integer informing the receiver on
		// how to decode the data. For now, we'll just return 0, to represent a JSON encoded string.
		const formatMarker = Buffer.from([0]);

		// Serialize the data into a string
		// This is not efficient - it'd be better to serialize directly to a buffer
		const serialized = JSON.stringify(data);

		// Convert the string to a buffer
		const buffer = Buffer.from(serialized);

		// Merge the format byte and serialize buffers
		return Buffer.concat([formatMarker, buffer]);
	}

	/**
	 * Deerializes the given buffer into JSON-like data.
	 *
	 * @param data
	 */
	private static _decodeJsonFromBuffer(data: Buffer): Json {
		const formatMarker = data[0];

		// For now, we only support format=0
		if (formatMarker !== 0) {
			throw new Error('Unrecognized serialization format: ' + formatMarker);
		}

		// Read the rest of the data as UTF-8
		const serialized = data.slice(1).toString();

		// Decode the data
		try {
			return JSON.parse(serialized);
		}
		catch (error) {
			throw new Error('Failed to decode JSON buffer: ' + error.message);
		}
	}

}
