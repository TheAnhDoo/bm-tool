export interface ParsedProxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function parseProxy(proxyString: string): ParsedProxy {
  const parts = proxyString.split(':');
  
  if (parts.length < 2) {
    throw new Error('Invalid proxy format. Expected: ip:port:user:pass');
  }

  const [host, port, username, password] = parts;
  const portNum = parseInt(port);

  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error('Invalid proxy port');
  }

  return {
    host,
    port: portNum,
    username: username || undefined,
    password: password || undefined,
  };
}

