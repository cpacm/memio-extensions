import Bridge from "../core/bridge";
import { RequestClient, RequestOption, RequestResponse } from "../core/request";
import { Rule } from "../core/rule";
import { ExtensionDetail, ExtensionList, ExtensionMedia, Extension, ExtensionAuth, SiteHeader } from "../core/extension";
import { jsbridge } from "./jsbridge";

function sleep(timeout: number) {
    return new Promise(resolve => setTimeout(resolve, timeout))
}

class NativeRequestClient implements RequestClient {

    responseData: Map<string, RequestResponse> = new Map<string, RequestResponse>();

    constructor(private bridge: Bridge) { }

    reveiveResponse(key: string, response: RequestResponse) {
        console.log("reveive key", key);
        this.responseData.set(key, response);
    }

    async request(option: RequestOption): Promise<RequestResponse> {

        return new Promise((resolve, reject) => {
            this.bridge.request(JSON.stringify(option), async (key) => {
                this.responseData.delete(key);
                // waiting for native response, 45s timeout
                let maxCount = 30;
                let count = 0;
                console.log("wait key", key);
                while (count < maxCount) {
                    console.log("waiting for response", count);
                    await sleep(1500);
                    const response = this.responseData.get(key);
                    if (response) {
                        this.responseData.delete(key);
                        resolve(response);
                        count = maxCount;
                        return;
                    }
                    count++;
                }
                this.responseData.delete(key);
                resolve(new RequestResponse(500, [], ''));
            });
        });
    }
}

class NativeBridge implements Bridge {

    constructor(public rule: Rule) {
        let nativeRequestClient = new NativeRequestClient(this);
        rule.setRequestClient(nativeRequestClient);

        this.registerNativeHandler(nativeRequestClient);
    }

    private registerNativeHandler(client: NativeRequestClient) {
        const nativeBridge = this;
        jsbridge((bridge) => {
            bridge.provideExtensionInfo = function () {
                let siteInfo = nativeBridge.provideExtensionInfo();
                let json = JSON.stringify(siteInfo);
                return json;
            }

            bridge.requestItemList = function (json: string) {
                let param: ItemListParam = JSON.parse(decodeURIComponent(json));
                var result = nativeBridge.requestItemList(param.url, param.page);

                result.then((itemList) => {
                    let s = JSON.stringify(itemList);
                    nativeBridge.callbackWithRequest({ name: "requestItemList", data: s });
                });
                result.catch((error) => {
                    nativeBridge.callbackWithRequest({ name: "requestItemList", data: error.message, error: true });
                });
            }

            bridge.searchItemList = function (json: string) {
                /// data from native
                let param: ItemSearchParam = JSON.parse(decodeURIComponent(json));
                let result = nativeBridge.searchItemList(param.keyword, param.url, param.page);
                result.then((itemList) => {
                    let s = JSON.stringify(itemList);
                    /// response to native
                    nativeBridge.callbackWithRequest({ name: "searchItemList", data: s });
                });
                result.catch((error) => {
                    nativeBridge.callbackWithRequest({ name: "searchItemList", data: error.message, error: true });
                });
            }

            bridge.requestChannelList = function (json: string) {
                /// data from native
                let param: ItemChannelParam = JSON.parse(decodeURIComponent(json));
                let result = nativeBridge.requestChannelList(param.key, param.page);
                result.then((itemList) => {
                    let s = JSON.stringify(itemList);
                    /// response to native
                    nativeBridge.callbackWithRequest({ name: "requestChannelList", data: s });
                });
                result.catch((error) => {
                    nativeBridge.callbackWithRequest({ name: "requestChannelList", data: error.message, error: true });
                });
            }

            bridge.requestItemChapter = function (json: string) {
                /// data from native
                let param: ItemChapterParam = JSON.parse(decodeURIComponent(json));
                let result = nativeBridge.requestItemChapter(param.url, param.id);
                result.then((chapters) => {
                    let s = JSON.stringify(chapters);
                    /// response to native
                    nativeBridge.callbackWithRequest({ name: "requestItemChapter", data: s });
                });
                result.catch((error) => {
                    nativeBridge.callbackWithRequest({ name: "requestItemChapter", data: error.message, error: true });
                });
            }

            bridge.requestItemMedia = function (json: string) {
                /// data from native
                let param: ItemChapterParam = JSON.parse(decodeURIComponent(json));
                let result = nativeBridge.requestItemMedia(param.url, param.id);
                result.then((media) => {
                    let s = JSON.stringify(media);
                    /// response to native
                    nativeBridge.callbackWithRequest({ name: "requestItemMedia", data: s });
                });
                result.catch((error) => {
                    nativeBridge.callbackWithRequest({ name: "requestItemMedia", data: error.message, error: true });
                });
            }

            bridge.loginForm = function (json: string) {
                let param = JSON.parse(decodeURIComponent(json));
                let map = new Map<string, string>()
                for (var value in param) {
                    map.set(value, param[value])
                }
                /// data from native
                let result = nativeBridge.loginForm(map);
                result.then((token) => {
                    /// response to native
                    var auth = JSON.stringify(token);
                    nativeBridge.callbackWithRequest({ name: "loginForm", data: auth });
                });
                result.catch((error) => {
                    nativeBridge.callbackWithRequest({ name: "loginForm", data: error.message, error: true });
                });
            }

            bridge.config = function (json: string) {
                let param = JSON.parse(decodeURIComponent(json));
                let map = new Map<string, string>()
                for (var value in param) {
                    map.set(value, param[value])
                }
                /// data from native
                let result = nativeBridge.config(map);
                result.then((success) => {
                    /// response to native
                    nativeBridge.callbackWithRequest({ name: "config", data: success.toString() });
                });
                result.catch((error) => {
                    nativeBridge.callbackWithRequest({ name: "config", data: error.message, error: true });
                });
            }

            bridge.responseWithRequest = function (key: string, status: number, headers: string, body: string) {
                const obj: SiteHeader[] = JSON.parse(decodeURIComponent(headers));
                const responseData = new RequestResponse(status, obj, decodeURIComponent(body));
                client.reveiveResponse(key, responseData);
            }

        });
    }

    /// json call native
    request(option: string, callback: (response: string) => void): void {
        jsbridge((bridge) => {
            callback(bridge.request(option));
        });
    }

    callbackWithRequest(data: RequestCallbackData): void {
        jsbridge((bridge) => {
            let json = JSON.stringify(data);
            bridge.callbackWithRequest(json);
        });
    }


    /// site methods
    provideExtensionInfo(): Extension {
        let siteInfo = this.rule.provideExtensionInfo();
        return siteInfo;
    }

    async requestItemList(url: string, page: number): Promise<ExtensionList> {
        return this.rule.requestItemList(url, page);
    }

    async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        return this.rule.searchItemList(keyword, url, page);
    }

    async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        return this.rule.requestChannelList(key, page);
    }

    async requestItemChapter(url: string, id?: string): Promise<ExtensionDetail> {
        return this.rule.requestItemChapter(url, id);
    }

    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        return this.rule.requestItemMedia(url, id);
    }

    async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        return this.rule.loginForm(form)
    }

    async config(form: Map<string, string>): Promise<boolean> {
        return this.rule.config(form)
    }

}

interface RequestCallbackData { name: string; data: string; error?: boolean; }
interface ItemListParam { url: string; page: number; }
interface ItemSearchParam { keyword: string; url: string; page: number; }
interface ItemChannelParam { key: string; page: number; }
interface ItemChapterParam { url: string; id: string; }
// interface ItemAccountForm { form: Map<string, string>; }

export { NativeRequestClient, NativeBridge };

