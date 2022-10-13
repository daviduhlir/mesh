export declare type NodeUrlDefParsed = {
    url: string;
    secret: string;
};
export declare type NodeUrlDef = (string | NodeUrlDefParsed);
export declare function parseNodeUrl(def: NodeUrlDef): NodeUrlDefParsed;
