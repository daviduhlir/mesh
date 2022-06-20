export class RPCResult<T> {
  constructor(
    public readonly results: {result?: T; error?: any}[],
  ) {}

  public get isValid(): boolean {
    return !!this.firstResult
  }

  public get firstResult(): T | undefined {
    return this.results.find(i => !i?.error)?.result
  }

  public get firstError(): any {
    return this.results.find(i => i?.error)?.error
  }
}