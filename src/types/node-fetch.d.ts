declare module 'node-fetch' {
  import { RequestInit, Response } from 'node-fetch';
  const fetch: (url: string, init?: RequestInit) => Promise<Response>;
  export default fetch;
}
