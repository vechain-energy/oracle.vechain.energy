/// <reference types="node" />
export declare class RLP {
    readonly profile: RLP.Profile;
    constructor(profile: RLP.Profile);
    /**
     * encode data according to profile
     * @param data the structured data to be encoded
     */
    encode(data: any): Buffer;
    /**
     * decode buffer according to profile
     * @param buf rlp encoded data
     */
    decode(buf: Buffer): any;
}
export declare namespace RLP {
    /** base class of scalar kind */
    abstract class ScalarKind {
        abstract data(data: any, ctx: string): {
            encode(): Buffer;
        };
        abstract buffer(buf: Buffer, ctx: string): {
            decode(): any;
        };
    }
    /** a buffer kind to keep buffer type */
    class BufferKind extends ScalarKind {
        data(data: Buffer, ctx: string): {
            encode(): Buffer;
        };
        buffer(buf: Buffer, ctx: string): {
            decode(): Buffer;
        };
    }
    /** a scalar kind to presents number */
    class NumericKind extends ScalarKind {
        readonly maxBytes?: number | undefined;
        /**
         * create a numeric kind
         * @param maxBytes up limit of data in bytes
         */
        constructor(maxBytes?: number | undefined);
        data(data: string | number, ctx: string): {
            encode(): Buffer;
        };
        buffer(buf: Buffer, ctx: string): {
            decode(): string | number;
        };
    }
    /** a scalar kind to present blob */
    class BlobKind<T = never> extends ScalarKind {
        data(data: string, ctx: string): {
            encode(): Buffer;
        };
        buffer(buf: Buffer, ctx: string): {
            decode(): string | T;
        };
    }
    /** fixed length blob */
    class FixedBlobKind<T = never> extends BlobKind<T> {
        readonly bytes: number;
        constructor(bytes: number);
        data(data: string, ctx: string): {
            encode(): Buffer;
        };
        buffer(buf: Buffer, ctx: string): {
            decode(): string | T;
        };
    }
    /** fixed length blob allowing null */
    class NullableFixedBlobKind extends FixedBlobKind<null> {
        data(data: string | null, ctx: string): {
            encode(): Buffer;
        };
        buffer(buf: Buffer, ctx: string): {
            decode(): string | null;
        };
    }
    /** fixed length blob kind that will remove leading zero on encoding and pad zero on decoding */
    class CompactFixedBlobKind extends FixedBlobKind {
        data(data: string, ctx: string): {
            encode(): Buffer;
        };
        buffer(buf: Buffer, ctx: string): {
            decode(): string;
        };
    }
    /** a list of items in one kind */
    interface ArrayKind {
        item: Profile['kind'];
    }
    /** a list of items in each kinds */
    type StructKind = Profile[];
    /** presents a list item */
    interface Profile {
        name: string;
        kind: ScalarKind | ArrayKind | StructKind;
    }
}
