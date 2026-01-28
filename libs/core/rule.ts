import { ExtensionDetail, ExtensionList, ExtensionMedia, Extension, ExtensionAuth } from "./extension";
import { RequestClient } from "./request";
import { NativeBridge } from "../tool/native";

export abstract class Rule {

    public site: Extension;
    public client!: RequestClient;

    constructor() {
        this.site = this.provideExtensionInfo();
    }

    setRequestClient(client: RequestClient) {
        this.client = client;
    }

    abstract provideExtensionInfo(): Extension;

    abstract requestItemList(url: string, page: number): Promise<ExtensionList>;

    async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        return new ExtensionList([], 1, undefined);
    }

    async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        return new ExtensionList([], 1, undefined);
    }

    async requestItemChapter(url: string, id?: string): Promise<ExtensionDetail> {
        return new ExtensionDetail(id!, url, "");
    }

    abstract requestItemMedia(url: string, id: string): Promise<ExtensionMedia>;

    async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        return new ExtensionAuth();
    }

    async config(form: Map<string, string>): Promise<boolean> {
        return true;
    }

    init() {
        if (typeof window === "undefined" || typeof document === "undefined") {
            // console.log("rule: window is not defined, cannot initialize bridge.");
            return;
        }
        let bridge;
        const rule = this;
        bridge = new NativeBridge(rule);
        window.__MEMO_BRIDGE__ = bridge;
    }
}