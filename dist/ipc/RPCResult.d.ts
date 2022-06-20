export declare class RPCResult<T> {
    readonly results: {
        result?: T;
        error?: any;
    }[];
    constructor(results: {
        result?: T;
        error?: any;
    }[]);
    get isValid(): boolean;
    get firstResult(): T | undefined;
    get firstError(): any;
}
