declare module 'pg' {
  export interface QueryResult<Row = Record<string, unknown>> {
    rows: Row[];
  }

  export class Pool {
    constructor(config?: { connectionString?: string });
    query<Row = Record<string, unknown>>(queryText: string, values?: unknown[]): Promise<QueryResult<Row>>;
    end(): Promise<void>;
  }

  export class Client {
    constructor(config?: { connectionString?: string });
    connect(): Promise<void>;
    query<Row = Record<string, unknown>>(queryText: string, values?: unknown[]): Promise<QueryResult<Row>>;
    end(): Promise<void>;
  }

  const pg: {
    Pool: typeof Pool;
    Client: typeof Client;
  };

  export default pg;
}
