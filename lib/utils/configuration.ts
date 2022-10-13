export type NodeUrlDefParsed = {url: string; secret: string;}
export type NodeUrlDef = (string | NodeUrlDefParsed)

export function parseNodeUrl(def: NodeUrlDef): NodeUrlDefParsed {
  if (typeof def === 'string') {
    const secret = def.indexOf('@') === -1 ? '' : def.split('@')[0]
    const url = def.indexOf('@') === -1 ? def : def.split('@')[1]
    return { secret, url }
  } else if (!Array.isArray(def) && typeof def === 'object') {
    return { secret: def.secret, url: def.url }
  } else {
    return { secret: null, url: null }
  }
}