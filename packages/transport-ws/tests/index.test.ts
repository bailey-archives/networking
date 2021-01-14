import { WSClientTransport } from '../src';

test('just testing', function() {
	expect(new WSClientTransport('')).toBeInstanceOf(WSClientTransport);
	expect(5).toBeGreaterThan(3);
});
