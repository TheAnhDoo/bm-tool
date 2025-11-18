import { request } from 'http';

const API_BASE_URL = 'http://127.0.0.1:3001';

export async function makeRequest(route: string, method: string, data?: any, query?: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(route, API_BASE_URL);
    
    // Add query parameters if provided
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const methodUpper = method.toUpperCase();
    const hasData = data !== undefined && data !== null;
    const needsBody = methodUpper === 'POST' || methodUpper === 'PUT' || methodUpper === 'DELETE';
    
    const headers: Record<string, string> = {};
    // Only set Content-Type when we actually have data to send
    if (hasData && needsBody) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: methodUpper,
      headers,
    };

    const req = request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          // Check content type
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
            // Return raw string for CSV/text
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(body);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            }
          } else {
            // Parse as JSON
            const response = body ? JSON.parse(body) : {};
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              // Include more details in error message
              const errorMessage = response.error || response.message || `HTTP ${res.statusCode}`;
              const error = new Error(errorMessage);
              (error as any).statusCode = res.statusCode;
              (error as any).response = response;
              reject(error);
            }
          }
        } catch (error) {
          // If parsing fails but status is OK, return raw body
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body || {});
          } else {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Write body if we have data and it's a method that supports a body
    if (hasData && needsBody) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

