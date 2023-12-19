import BigNumber from 'bignumber.js';
import * as rlp from 'rlp';
export class RLP {
    constructor(profile) {
            this.profile = profile;
        }
        /**
         * encode data according to profile
         * @param data the structured data to be encoded
         */
    encode(data) {
            const packed = pack(data, this.profile, '');
            return rlp.encode(packed);
        }
        /**
         * decode buffer according to profile
         * @param buf rlp encoded data
         */
    decode(buf) {
        const packed = rlp.decode(buf);
        return unpack(packed, this.profile, '');
    }
}
(function(RLP) {
    /** base class of scalar kind */
    class ScalarKind {}
    RLP.ScalarKind = ScalarKind;
    /** a buffer kind to keep buffer type */
    class BufferKind extends ScalarKind {
        data(data, ctx) {
            assert(Buffer.isBuffer(data), ctx, 'expected buffer');
            return { encode() { return data; } };
        }
        buffer(buf, ctx) {
            return { decode() { return buf; } };
        }
    }
    RLP.BufferKind = BufferKind;
    /** a scalar kind to presents number */
    class NumericKind extends ScalarKind {
        /**
         * create a numeric kind
         * @param maxBytes up limit of data in bytes
         */
        constructor(maxBytes) {
            super();
            this.maxBytes = maxBytes;
        }
        data(data, ctx) {
            assert(typeof data === 'string' || typeof data === 'number', ctx, 'expected string or number');
            if (typeof data === 'string') {
                const isHex = isHexString(data);
                const isDec = isDecString(data);
                assert(isHex || isDec, ctx, 'expected non-negative integer in hex or dec string');
                if (isHex) {
                    assert(data.length > 2, ctx, 'expected valid hex string');
                }
            } else {
                assert(Number.isSafeInteger(data) && data >= 0, ctx, 'expected non-negative safe integer');
            }
            const bn = new BigNumber(data);
            if (bn.isZero()) {
                return {
                    encode() {
                        return Buffer.alloc(0);
                    }
                };
            }
            let hex = bn.toString(16);
            if (hex.length % 2 !== 0) {
                hex = '0' + hex;
            }
            assert(this.maxBytes ? hex.length <= this.maxBytes * 2 : true, ctx, `expected number in ${this.maxBytes} bytes`);
            return {
                encode() {
                    return Buffer.from(hex, 'hex');
                }
            };
        }
        buffer(buf, ctx) {
            assert(this.maxBytes ? buf.length <= this.maxBytes : true, ctx, `expected less than ${this.maxBytes} bytes`);
            assert(buf.length === 0 || buf[0] !== 0, ctx, `expected canonical integer (no leading zero bytes)`);
            return {
                decode() {
                    if (buf.length === 0) {
                        return 0;
                    }
                    const bn = new BigNumber(buf.toString('hex'), 16);
                    const num = bn.toNumber();
                    return Number.isSafeInteger(num) ? num : '0x' + bn.toString(16);
                }
            };
        }
    }
    RLP.NumericKind = NumericKind;
    /** a scalar kind to present blob */
    class BlobKind extends ScalarKind {
        data(data, ctx) {
            assert(isHexString(data), ctx, 'expected hex string');
            assert(data.length % 2 === 0, ctx, 'expected even length hex');
            return {
                encode() {
                    return Buffer.from(data.slice(2), 'hex');
                }
            };
        }
        buffer(buf, ctx) {
            return {
                decode() {
                    return '0x' + buf.toString('hex');
                }
            };
        }
    }
    RLP.BlobKind = BlobKind;
    /** fixed length blob */
    class FixedBlobKind extends BlobKind {
        constructor(bytes) {
            super();
            this.bytes = bytes;
        }
        data(data, ctx) {
            const encoder = super.data(data, ctx);
            assert(data.length === this.bytes * 2 + 2, ctx, `expected hex string presents ${this.bytes} bytes`);
            return encoder;
        }
        buffer(buf, ctx) {
            const decoder = super.buffer(buf, ctx);
            assert(buf.length === this.bytes, ctx, `expected ${this.bytes} bytes`);
            return decoder;
        }
    }
    RLP.FixedBlobKind = FixedBlobKind;
    /** fixed length blob allowing null */
    class NullableFixedBlobKind extends FixedBlobKind {
        data(data, ctx) {
            if (!data) {
                return {
                    encode() {
                        return Buffer.alloc(0);
                    }
                };
            }
            return super.data(data, ctx);
        }
        buffer(buf, ctx) {
            if (buf.length === 0) {
                return { decode() { return null; } };
            }
            return super.buffer(buf, ctx);
        }
    }
    RLP.NullableFixedBlobKind = NullableFixedBlobKind;
    /** fixed length blob kind that will remove leading zero on encoding and pad zero on decoding */
    class CompactFixedBlobKind extends FixedBlobKind {
        data(data, ctx) {
            const buf = super.data(data, ctx).encode();
            return {
                encode() {
                    const nzIndex = buf.findIndex(v => v !== 0);
                    if (nzIndex >= 0) {
                        return buf.slice(nzIndex);
                    }
                    return Buffer.alloc(0);
                }
            };
        }
        buffer(buf, ctx) {
            assert(buf.length <= this.bytes, ctx, `expected less than ${this.bytes} bytes`);
            assert(buf.length === 0 || buf[0] !== 0, ctx, `expected no leading zero bytes`);
            const bytes = this.bytes;
            return {
                decode() {
                    const zeros = '0'.repeat((bytes - buf.length) * 2);
                    return '0x' + zeros + buf.toString('hex');
                }
            };
        }
    }
    RLP.CompactFixedBlobKind = CompactFixedBlobKind;
})(RLP || (RLP = {}));

function pack(obj, profile, ctx) {
    ctx = ctx ? ctx + '.' + profile.name : profile.name;
    const kind = profile.kind;
    if (kind instanceof RLP.ScalarKind) {
        return kind.data(obj, ctx).encode();
    }
    if (Array.isArray(kind)) {
        return kind.map(k => pack(obj[k.name], k, ctx));
    }
    assert(Array.isArray(obj), ctx, 'expected array');
    const item = kind.item;
    return obj.map((part, i) => pack(part, { name: '#' + i, kind: item }, ctx));
}

function unpack(packed, profile, ctx) {
    ctx = ctx ? ctx + '.' + profile.name : profile.name;
    const kind = profile.kind;
    if (kind instanceof RLP.ScalarKind) {
        assert(Buffer.isBuffer(packed), ctx, 'expected Buffer');
        return kind.buffer(packed, ctx).decode();
    }
    if (Array.isArray(kind)) {
        assert(Array.isArray(packed), ctx, 'expected array');
        const parts = packed;
        assert(parts.length === kind.length, ctx, `expected ${kind.length} items, but got ${parts.length}`);
        return kind.reduce((o, p, i) => {
            o[p.name] = unpack(parts[i], p, ctx);
            return o;
        }, {});
    }
    assert(Array.isArray(packed), ctx, 'expected array');
    const item = kind.item;
    return packed.map((part, i) => unpack(part, { name: '#' + i, kind: item }, ctx));
}

function assert(cond, ctx, msg) {
    if (!cond) {
        throw new RLPError(`${ctx}: ${msg}`);
    }
}

function isHexString(str) {
    return /^0x[0-9a-f]*$/i.test(str);
}

function isDecString(str) {
    return /^[0-9]+$/.test(str);
}
class RLPError extends Error {
    constructor(msg) {
        super(msg);
        this.name = RLPError.name;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3JscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLFNBQVMsTUFBTSxjQUFjLENBQUE7QUFDcEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFFMUIsTUFBTSxPQUFPLEdBQUc7SUFDWixZQUFxQixPQUFvQjtRQUFwQixZQUFPLEdBQVAsT0FBTyxDQUFhO0lBQUksQ0FBQztJQUU5Qzs7O09BR0c7SUFDSSxNQUFNLENBQUMsSUFBUztRQUNuQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBa0IsQ0FBQTtJQUM5QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLEdBQVc7UUFDckIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFVLENBQUMsQ0FBQTtRQUNyQyxPQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0NBQ0o7QUFFRCxXQUFpQixHQUFHO0lBQ2hCLGdDQUFnQztJQUNoQyxNQUFzQixVQUFVO0tBRy9CO0lBSHFCLGNBQVUsYUFHL0IsQ0FBQTtJQUVELHdDQUF3QztJQUN4QyxNQUFhLFVBQVcsU0FBUSxVQUFVO1FBQy9CLElBQUksQ0FBQyxJQUFZLEVBQUUsR0FBVztZQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtZQUNyRCxPQUFPLEVBQUUsTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFBLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDdkMsQ0FBQztRQUNNLE1BQU0sQ0FBQyxHQUFXLEVBQUUsR0FBVztZQUNs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