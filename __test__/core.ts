import { Rule } from '@/core/rule';
import { RequestOption, RequestResponse } from "@/core/request";
import { Extension, ExtensionAuth, ExtensionList, ExtensionDetail, ExtensionMedia } from '@/core/extension';
import puppeteer from 'puppeteer';

export class RuleJest {
    protected rule: Rule;

    constructor(rule: Rule) {
        this.rule = rule;

        this.mockRequestClient();
    }

    provideExtensionInfo(): Extension {
        return this.rule.provideExtensionInfo();
    }

    async requestItemList(url: string, page: number): Promise<ExtensionList> {
        return this.rule.requestItemList(url, page);
    }

    async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        return this.rule.requestChannelList(key, page);
    }

    async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        return this.rule.searchItemList(keyword, url, page);
    }

    async requestItemChapter(url: string, id?: string): Promise<ExtensionDetail> {
        return this.rule.requestItemChapter(url, id);
    }

    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        return this.rule.requestItemMedia(url, id);
    }

    async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        return this.rule.loginForm(form);
    }

    async config(form: Map<string, string>): Promise<boolean> {
        return this.rule.config(form);
    }

    // mock rule.client.request 方法
    protected mockRequestClient() {
        this.rule.client = {
            request: jest.fn().mockImplementation((option: RequestOption) => {
                if (option.afterLoad) {
                    return this.mockBrowser(option);
                }
                return this.mockRequest(option);
            }),
        } as any;
    }

    async mockBrowser(option: RequestOption): Promise<RequestResponse> {
        const url = option.url;
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
        const content = await page.content();
        await browser.close();
        return new RequestResponse(200, [], content);
    }

    async mockRequest(option: RequestOption): Promise<RequestResponse> {
        const url = option.url;
        const method = option.method || 'GET';
        const headers: { key: string, value: string }[] = option.headers || [];
        const contentType = option.contentType;
        const data = option.body || null;

        try {
            // headers add extra headers
            this.extraHeaders.forEach(header => {
                headers.push({ key: header.key, value: header.value });
            });

            if (contentType) {
                headers.push({ key: "Content-Type", value: contentType });
            }

            const response = await fetch(url, {
                method,
                headers: Object.fromEntries(headers.map(header => [header.key, header.value])),
                body: data,
                redirect: 'follow',
            });

            // console.log(`Mock Request: ${method} ${url} - Status: ${response.status}`);
            // console.log('response header:', response.headers);
            // console.log('response:', response);

            if (!response.ok) {
                return new RequestResponse(response.status, [], '');
            }

            let responseBody: string;
            if (option.responseCharset != null) {
                const decoder = new TextDecoder(option.responseCharset);
                responseBody = decoder.decode(await response.arrayBuffer());
            } else {
                responseBody = await response.text();
            }
            const targetHeaderkey = option.responseHeaders || [];
            const responseHeaders: { key: string, value: string }[] = [];
            if (targetHeaderkey.length > 0) {
                response.headers.forEach((value, key) => {
                    if (targetHeaderkey.includes(key)) {
                        responseHeaders.push({ key, value });
                    }
                });
            }
            return new RequestResponse(response.status, responseHeaders, responseBody);
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    extraHeaders: { key: string, value: string }[] = [];
    // extra request headers
    addExtraHeaders(headers: { key: string, value: string }[]) {
        this.extraHeaders.push(...headers);
    }

    removeExtraHeaders() {
        this.extraHeaders = [];
    }

}