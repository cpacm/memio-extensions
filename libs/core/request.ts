import { SiteHeader } from "./extension";

export interface RequestClient {
    request(option: RequestOption): Promise<RequestResponse>;
}

export class RequestResponse {
    public statusCode: number;
    public headers: SiteHeader[];
    public body: string;

    constructor(statusCode: number, headers: SiteHeader[], body: string) {
        this.statusCode = statusCode;
        this.headers = headers;
        this.body = body;
    }
}

export class RequestOption {
    public url: string;
    public method: string;
    public headers?: { key: string, value: string }[];
    public body?: string;
    public timeout?: number;
    public contentType?: string;
    public afterLoad?: boolean = false;
    public responseCharset?: string; // charset of response body
    public responseHeaders?: string[]; // response headers to be returned

    constructor(url: string, method?: string, headers?: { key: string, value: string }[], body?: string, timeout?: number, contentType?: string, afterLoad?: boolean, responseCharset?: string, responseHeaders?: string[]) {
        this.url = url;
        this.method = method ? method : "GET";
        this.headers = headers;
        this.body = body;
        this.timeout = timeout;
        this.contentType = contentType ? contentType : "text/html";
        this.afterLoad = afterLoad ? afterLoad : false;
        this.responseCharset = responseCharset;
        this.responseHeaders = responseHeaders ? responseHeaders : [];
    }
}

export function parseHeaders(headers?: { key: string, value: string }[]): {} {
    let array = new Map();
    if (headers) {
        for (let i = 0; i < headers.length; i++) {
            array.set(headers[i].key, headers[i].value);
        }
    }
    const obj: { [key: string]: string } = {};
    array.forEach((value, key) => {
        obj[key] = value;
    });
    return obj;
}