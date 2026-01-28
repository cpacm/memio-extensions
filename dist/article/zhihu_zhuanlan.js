(function () {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    class Extension {
        constructor(key, name, type) {
            this.version = 1;
            this.baseUrl = "";
            this.categoryList = [];
            this.searchList = [];
            this.configParams = [];
            this.forceConfig = false;
            this.forceLogin = false;
            this.loginParams = [];
            this.script = [];
            this.lang = "en";
            this.author = "memio";
            this.key = key;
            this.name = name;
            this.type = type;
            this.script.push(new SiteUrl("jquery", ""));
        }
    }
    class SiteUrl {
        constructor(name, url) {
            this.name = name;
            this.url = url;
        }
    }
    class Channel {
        constructor(type = 0 /* ChannelType.List */, name, value) {
            this.type = type;
            this.name = name;
            this.value = value;
        }
    }
    class ExtensionAuth {
        constructor() {
            this.headers = [];
        }
    }
    class ExtensionList {
        constructor(items, page, nextPage) {
            this.page = 1;
            this.items = items;
            this.page = page;
            this.nextPageUrl = nextPage;
        }
    }
    class ExtensionDetail {
        constructor(id, url, title) {
            this.type = 0 /* MediaType.Undefined */;
            this.hasChapter = false;
            this.url = url;
            this.id = id;
            this.title = title;
        }
    }
    class ExtensionMedia {
        constructor(mediaType, id, title) {
            this.mediaType = mediaType;
            this.id = id;
            this.title = title;
        }
    }
    class ArticleMedia extends ExtensionMedia {
        constructor(id, title, content) {
            super(1 /* MediaType.Article */, id, title);
            this.isMarkdown = false;
            this.content = content;
        }
    }

    class RequestResponse {
        constructor(statusCode, headers, body) {
            this.statusCode = statusCode;
            this.headers = headers;
            this.body = body;
        }
    }

    const u = typeof window !== "undefined" ? window.navigator.userAgent : "Android";
    const isAndroid = u.indexOf("Android") > -1 || u.indexOf("Adr") > -1; //android终端
    const isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    function getDevice() {
        if (isAndroid)
            return "android";
        if (isIOS)
            return "ios";
    }
    const jsbridge = function (callback) {
        if (getDevice() === "android") {
            if (window.MemoWebViewJavascriptBridge) {
                return callback(window.MemoWebViewJavascriptBridge);
            }
            else {
                document.addEventListener("WebViewJavascriptBridgeReady", function () {
                    callback(window.MemoWebViewJavascriptBridge);
                }, false);
            }
        }
        else if (getDevice() === "ios") {
            // new ios method ---> for WKWebview
            if (window.MemoWebViewJavascriptBridge) {
                window.MemoWebViewJavascriptBridge.callbackWithRequest = function (data) {
                    window.webkit.messageHandlers.callbackWithRequest.postMessage(data);
                };
                window.MemoWebViewJavascriptBridge.request = function (option) {
                    window.webkit.messageHandlers.request.postMessage(option);
                    //TODO extra bridge method for ios to get response
                    return "";
                };
                return callback(window.MemoWebViewJavascriptBridge);
            }
        }
    };

    function sleep(timeout) {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }
    class NativeRequestClient {
        constructor(bridge) {
            this.bridge = bridge;
            this.responseData = new Map();
        }
        reveiveResponse(key, response) {
            console.log("reveive key", key);
            this.responseData.set(key, response);
        }
        request(option) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    this.bridge.request(JSON.stringify(option), (key) => __awaiter(this, void 0, void 0, function* () {
                        this.responseData.delete(key);
                        // waiting for native response, 45s timeout
                        let maxCount = 30;
                        let count = 0;
                        console.log("wait key", key);
                        while (count < maxCount) {
                            console.log("waiting for response", count);
                            yield sleep(1500);
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
                    }));
                });
            });
        }
    }
    class NativeBridge {
        constructor(rule) {
            this.rule = rule;
            let nativeRequestClient = new NativeRequestClient(this);
            rule.setRequestClient(nativeRequestClient);
            this.registerNativeHandler(nativeRequestClient);
        }
        registerNativeHandler(client) {
            const nativeBridge = this;
            jsbridge((bridge) => {
                bridge.provideExtensionInfo = function () {
                    let siteInfo = nativeBridge.provideExtensionInfo();
                    let json = JSON.stringify(siteInfo);
                    return json;
                };
                bridge.requestItemList = function (json) {
                    let param = JSON.parse(decodeURIComponent(json));
                    var result = nativeBridge.requestItemList(param.url, param.page);
                    result.then((itemList) => {
                        let s = JSON.stringify(itemList);
                        nativeBridge.callbackWithRequest({ name: "requestItemList", data: s });
                    });
                    result.catch((error) => {
                        nativeBridge.callbackWithRequest({ name: "requestItemList", data: error.message, error: true });
                    });
                };
                bridge.searchItemList = function (json) {
                    /// data from native
                    let param = JSON.parse(decodeURIComponent(json));
                    let result = nativeBridge.searchItemList(param.keyword, param.url, param.page);
                    result.then((itemList) => {
                        let s = JSON.stringify(itemList);
                        /// response to native
                        nativeBridge.callbackWithRequest({ name: "searchItemList", data: s });
                    });
                    result.catch((error) => {
                        nativeBridge.callbackWithRequest({ name: "searchItemList", data: error.message, error: true });
                    });
                };
                bridge.requestChannelList = function (json) {
                    /// data from native
                    let param = JSON.parse(decodeURIComponent(json));
                    let result = nativeBridge.requestChannelList(param.key, param.page);
                    result.then((itemList) => {
                        let s = JSON.stringify(itemList);
                        /// response to native
                        nativeBridge.callbackWithRequest({ name: "requestChannelList", data: s });
                    });
                    result.catch((error) => {
                        nativeBridge.callbackWithRequest({ name: "requestChannelList", data: error.message, error: true });
                    });
                };
                bridge.requestItemChapter = function (json) {
                    /// data from native
                    let param = JSON.parse(decodeURIComponent(json));
                    let result = nativeBridge.requestItemChapter(param.url, param.id);
                    result.then((chapters) => {
                        let s = JSON.stringify(chapters);
                        /// response to native
                        nativeBridge.callbackWithRequest({ name: "requestItemChapter", data: s });
                    });
                    result.catch((error) => {
                        nativeBridge.callbackWithRequest({ name: "requestItemChapter", data: error.message, error: true });
                    });
                };
                bridge.requestItemMedia = function (json) {
                    /// data from native
                    let param = JSON.parse(decodeURIComponent(json));
                    let result = nativeBridge.requestItemMedia(param.url, param.id);
                    result.then((media) => {
                        let s = JSON.stringify(media);
                        /// response to native
                        nativeBridge.callbackWithRequest({ name: "requestItemMedia", data: s });
                    });
                    result.catch((error) => {
                        nativeBridge.callbackWithRequest({ name: "requestItemMedia", data: error.message, error: true });
                    });
                };
                bridge.loginForm = function (json) {
                    let param = JSON.parse(decodeURIComponent(json));
                    let map = new Map();
                    for (var value in param) {
                        map.set(value, param[value]);
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
                };
                bridge.config = function (json) {
                    let param = JSON.parse(decodeURIComponent(json));
                    let map = new Map();
                    for (var value in param) {
                        map.set(value, param[value]);
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
                };
                bridge.responseWithRequest = function (key, status, headers, body) {
                    const obj = JSON.parse(decodeURIComponent(headers));
                    const responseData = new RequestResponse(status, obj, decodeURIComponent(body));
                    client.reveiveResponse(key, responseData);
                };
            });
        }
        /// json call native
        request(option, callback) {
            jsbridge((bridge) => {
                callback(bridge.request(option));
            });
        }
        callbackWithRequest(data) {
            jsbridge((bridge) => {
                let json = JSON.stringify(data);
                bridge.callbackWithRequest(json);
            });
        }
        /// site methods
        provideExtensionInfo() {
            let siteInfo = this.rule.provideExtensionInfo();
            return siteInfo;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.rule.requestItemList(url, page);
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.rule.searchItemList(keyword, url, page);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.rule.requestChannelList(key, page);
            });
        }
        requestItemChapter(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.rule.requestItemChapter(url, id);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.rule.requestItemMedia(url, id);
            });
        }
        loginForm(form) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.rule.loginForm(form);
            });
        }
        config(form) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.rule.config(form);
            });
        }
    }

    class Rule {
        constructor() {
            this.site = this.provideExtensionInfo();
        }
        setRequestClient(client) {
            this.client = client;
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                return new ExtensionList([], 1, undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                return new ExtensionList([], 1, undefined);
            });
        }
        requestItemChapter(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                return new ExtensionDetail(id, url, "");
            });
        }
        loginForm(form) {
            return __awaiter(this, void 0, void 0, function* () {
                return new ExtensionAuth();
            });
        }
        config(form) {
            return __awaiter(this, void 0, void 0, function* () {
                return true;
            });
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

    // parse date to "YYYY,MM/DD" format
    function formatDateToYMD(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // Months are zero-based
        const day = date.getDate();
        return `${year},${month}/${day}`;
    }

    class Zhihu extends Rule {
        provideExtensionInfo() {
            let site = new Extension("zhihu_zhuanlan", "知乎-专栏", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.zhihu.com";
            site.thumbnail = "https://static.zhihu.com/heifetz/favicon.ico";
            site.description = "知乎，是一个真实的网络问答社区，在这里你可以提出问题，分享知识、经验和见解。";
            site.lang = "zh";
            site.imageRefer = "https://www.zhihu.com/";
            site.categoryList = [
                { name: "专栏推荐", url: `/api/v4/column/recommend/web` },
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "专栏链接", "zhuanlan");
            site.loginParams = [
                { key: "Cookie", value: "知乎账号 Cookie" },
            ];
            site.forceLogin = true;
            site.useGuide = `## 获取知乎 Cookie 指南

1. 打开浏览器，登录你的知乎账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，找到“Cookies”，然后选择“https://www.zhihu.com”。
5. 在右侧的 Cookie 列表中，找到名为“z_c0”、“__zse_ck” 等关键 Cookie。
6. 将这些 Cookie 的名称和值复制下来，按照“名称=值; 名称=值; ...”的格式拼接成一个字符串。
7. 将拼接好的 Cookie 字符串粘贴到扩展的登录参数中。

## 如何获取专栏链接

1. 打开知乎网站，浏览到你感兴趣的专栏页面。
2. 复制浏览器地址栏中的 URL 链接，如 https://zhuanlan.zhihu.com/yixinli, 取 “yixinli”。
3. 将该链接粘贴到扩展的频道参数中即可。
`;
            return site;
        }
        loginForm(form) {
            return __awaiter(this, void 0, void 0, function* () {
                let cookie = form.get("Cookie") || "";
                let auth = new ExtensionAuth();
                auth.headers.push({ key: "Cookie", value: cookie });
                return auth;
            });
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let offset = (page - 1) * 30;
                let params = `limit=30&offset=${offset}`;
                let apiUrl = `${this.site.baseUrl}${url}?${params}`;
                let nextUrl = `${this.site.baseUrl}${url}?limit=30&offset=${offset + 30}`;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: apiUrl,
                    method: "GET",
                    contentType: "application/json",
                    headers: [
                        { key: 'Referer', value: this.site.baseUrl },
                        { key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }
                    ],
                }));
                let json = JSON.parse(response.body);
                let data = json.data;
                let detailList = [];
                data.forEach((item) => {
                    let contentInfo = item.content_info;
                    if (!contentInfo) {
                        return;
                    }
                    let title = contentInfo.content_title;
                    let url = contentInfo.content_url;
                    let id = url.split("/").pop() || "";
                    let desc = contentInfo.summary;
                    let images = contentInfo.media_detail.images;
                    let image = images && images.length > 0 ? images[0] : undefined;
                    let thumbnail = image ? image.url : undefined;
                    let author = item.author.name;
                    let detail = new ExtensionDetail(id, url, title);
                    detail.thumbnail = thumbnail;
                    detail.description = desc;
                    detail.author = author;
                    detail.category = item.title;
                    detail.type = 1 /* MediaType.Article */;
                    detailList.push(detail);
                });
                let paging = json.paging;
                let hasMore = paging.is_end === false;
                return new ExtensionList(detailList, page, hasMore ? nextUrl : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let offset = (page - 1) * 10;
                let params = `limit=10&offset=${offset}`;
                let apiUrl = `${this.site.baseUrl}/api/v4/columns/${key}/items?${params}`;
                let nextUrl = `${this.site.baseUrl}/api/v4/columns/${key}/items?limit=10&offset=${offset + 10}`;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: apiUrl,
                    method: "GET",
                    contentType: "application/json",
                    headers: [
                        { key: 'Referer', value: this.site.baseUrl },
                        { key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }
                    ],
                }));
                let json = JSON.parse(response.body);
                let data = json.data;
                console.log(data);
                let detailList = [];
                data.forEach((item) => {
                    let id = item.id;
                    let title = item.title;
                    let url = item.url;
                    let desc = item.excerpt;
                    let thumbnail = item.image_url;
                    let author = item.author.name;
                    let detail = new ExtensionDetail(id, url, title);
                    detail.thumbnail = thumbnail;
                    detail.description = desc;
                    detail.author = author;
                    detail.type = 1 /* MediaType.Article */;
                    detailList.push(detail);
                });
                let paging = json.paging;
                let hasMore = paging.is_end === false;
                return new ExtensionList(detailList, page, hasMore ? nextUrl : undefined);
            });
        }
        searchHtmlScriptElement(html) {
            let $nodes = $(html);
            let jsonString = "";
            $nodes.each((index, element) => {
                if (element instanceof HTMLScriptElement) {
                    if (element.id === "js-initialData") {
                        jsonString = element.innerHTML.replace(/undefined/g, "null");
                        return false; // Exit the each loop
                    }
                }
            });
            return jsonString;
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET" }));
                let jsonString = this.searchHtmlScriptElement(response.body);
                const json = JSON.parse(jsonString);
                let article = json.initialState.entities.articles[id];
                let title = article.title;
                let thumbnail = article.imageUrl;
                let author = article.author.name;
                let content = article.content;
                let fullContent = content;
                if (thumbnail && thumbnail.startsWith("http")) {
                    fullContent = `<img src="${thumbnail}" /><br/>` + content;
                }
                else {
                    fullContent = content;
                }
                let articleMedia = new ArticleMedia(id, title, `<html>${fullContent}</html>`);
                articleMedia.author = author;
                articleMedia.date = formatDateToYMD(new Date(article.created * 1000).toISOString());
                return articleMedia;
            });
        }
    }
    (function () {
        let rule = new Zhihu();
        rule.init();
    })();

    return Zhihu;

})();
