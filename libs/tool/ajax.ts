import Bridge from "../core/bridge";
import { RequestClient, RequestOption, RequestResponse } from "../core/request";
import { Rule } from "../core/rule";
import { ExtensionDetail, ExtensionList, ExtensionMedia, Extension, ExtensionAuth } from "../core/extension";
import $ from "jquery";

class AjaxRequestClient implements RequestClient {

    siteKey: string = "";

    async request(option: RequestOption): Promise<RequestResponse> {
        option.headers = option.headers || [];
        const auth = window.localStorage.getItem(this.siteKey + "-auth");
        if (auth && auth.length > 0) {
            console.log("request=" + auth);
            var extensionAuth: ExtensionAuth = JSON.parse(auth);
            for (let header of extensionAuth.headers) {
                option.headers.push({ key: header.key, value: header.value });
            }
        }
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/request',
                type: "POST",
                crossDomain: true,
                contentType: "application/json",
                data: JSON.stringify(option),
                success: function (data) {
                    resolve(data);
                },
                error: function (error) {
                    reject(error);
                }
            });
        });
    }
}

class NodeBridge implements Bridge {

    constructor(public rule: Rule) {
        let ajaxRequestClient = new AjaxRequestClient();
        rule.setRequestClient(ajaxRequestClient);
        ajaxRequestClient.siteKey = rule.site.key;
    }


    request(option: string, callback: (html: any) => void): void {
        /// nothing to do
    }

    provideExtensionInfo(): Extension {
        return this.rule.provideExtensionInfo();
    }

    requestItemList(url: string, page: number): Promise<ExtensionList> {
        return this.rule.requestItemList(url, page);
    }

    searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        return this.rule.searchItemList(keyword, url, page);
    }

    requestChannelList(key: string, page: number): Promise<ExtensionList>{
        return this.rule.requestChannelList(key, page);
    }

    requestItemChapter(url: string, id?: string): Promise<ExtensionDetail> {
        return this.rule.requestItemChapter(url, id);
    }

    requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        return this.rule.requestItemMedia(url, id);
    }

    loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        var authPromise = this.rule.loginForm(form)
        authPromise.then((auth) => {
            console.log("set:" + auth);
            const key = this.rule.site.key;
            window.localStorage.setItem(key + "-auth", JSON.stringify(auth));
        });
        return Promise.resolve(authPromise);
    }

    config(form: Map<string, string>): Promise<boolean> {
        return this.rule.config(form);
    }
}

export default NodeBridge;