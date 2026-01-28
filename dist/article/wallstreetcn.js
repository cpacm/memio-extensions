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

    class WallStreetCN extends Rule {
        constructor() {
            super(...arguments);
            this.feedPageCursorMap = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("wallstreetcn", "华尔街见闻", 1 /* MediaType.Article */);
            site.baseUrl = "https://wallstreetcn.com";
            site.thumbnail = "https://static.wscn.net/wscn/_static/favicon.png";
            site.description = "华尔街见闻是中国领先的全球财经资讯平台，提供及时、专业的财经新闻、深度分析和市场数据，帮助用户洞察全球经济动态，把握投资机会。";
            site.lang = "zh";
            site.categoryList = [
                new SiteUrl("最新", "global"),
                new SiteUrl("股市", "shares"),
                new SiteUrl("债市", "bonds"),
                new SiteUrl("商品", "commodities"),
                new SiteUrl("外汇", "forex"),
                new SiteUrl("金融", "finance"),
                new SiteUrl("资管", "asset-manage"),
                new SiteUrl("科技", "tmt"),
                new SiteUrl("硬AI", "ai"),
                new SiteUrl("地产", "estate"),
                new SiteUrl("汽车", "car"),
                new SiteUrl("医药", "medicine"),
            ];
            site.searchList = [
                new SiteUrl("搜索", "search"),
            ];
            return site;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                //https://api-one-wscn.awtmt.com/apiv1/content/information-flow?channel=global&accept=article&cursor=eyJTbG90T2Zmc2V0IjoxLCJUb3RhbENvdW50IjoyMywiQXJ0aWNsZUxlIjoxNzY0OTA2MzM1fQ%3D%3D&limit=20&action=upglide
                let api = `https://api-one-wscn.awtmt.com/apiv1/content/information-flow?channel=${url}&accept=article&limit=20&action=upglide`;
                if (page == 1) {
                    this.feedPageCursorMap.delete(page);
                }
                else {
                    let cursor = this.feedPageCursorMap.get(page);
                    if (cursor) {
                        api += `&cursor=${cursor}`;
                    }
                }
                var jsonResponse = yield this.client.request({
                    url: api,
                    method: "GET",
                    contentType: "application/json",
                });
                let json = JSON.parse(jsonResponse.body);
                let details = [];
                let itemData = json.data.items;
                itemData.forEach((element) => {
                    var _a, _b, _c, _d;
                    let type = element.resource_type;
                    if (type != "article") {
                        return;
                    }
                    let resource = element.resource;
                    let id = resource.id.toString();
                    let title = resource.title;
                    let author = (_b = (_a = resource.author) === null || _a === void 0 ? void 0 : _a.display_name) !== null && _b !== void 0 ? _b : "";
                    let link = resource.uri;
                    let description = resource.content_short;
                    let thumbnail = (_d = (_c = resource.image) === null || _c === void 0 ? void 0 : _c.uri) !== null && _d !== void 0 ? _d : "";
                    let date = resource.display_time;
                    let dateTxt = new Date(date * 1000).toLocaleDateString();
                    let status = resource.vip_type;
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = author;
                    detail.description = description;
                    detail.thumbnail = thumbnail;
                    detail.category = dateTxt;
                    detail.status = status;
                    detail.type = 1 /* MediaType.Article */;
                    details.push(detail);
                });
                let nextCursor = json.data.next_cursor;
                if (nextCursor) {
                    this.feedPageCursorMap.set(page + 1, nextCursor);
                }
                let hasMore = nextCursor != null && details.length >= 20;
                return new ExtensionList(details, page, hasMore ? nextCursor : undefined);
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                //https://api-one-wscn.awtmt.com/apiv1/search/article?query=%E8%B0%B7%E6%AD%8C&cursor=2&limit=20&vip_type=
                let api = `https://api-one-wscn.awtmt.com/apiv1/search/article?query=${encodeURIComponent(keyword)}&limit=20&cursor=${page}`;
                var jsonResponse = yield this.client.request({
                    url: api,
                    method: "GET",
                    contentType: "application/json",
                });
                let json = JSON.parse(jsonResponse.body);
                let details = [];
                let itemData = json.data.items;
                itemData.forEach((element) => {
                    var _a, _b, _c, _d;
                    let resource = element;
                    let id = resource.id.toString();
                    let title = resource.title.replace(/<em>/g, "").replace(/<\/em>/g, "");
                    let author = (_b = (_a = resource.author) === null || _a === void 0 ? void 0 : _a.display_name) !== null && _b !== void 0 ? _b : "";
                    let link = resource.uri;
                    let description = resource.content;
                    let thumbnail = (_d = (_c = resource.image) === null || _c === void 0 ? void 0 : _c.uri) !== null && _d !== void 0 ? _d : "";
                    let date = resource.display_time;
                    let dateTxt = new Date(date * 1000).toLocaleDateString();
                    let status = resource.vip_type;
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = author;
                    detail.description = description;
                    detail.thumbnail = thumbnail;
                    detail.category = dateTxt;
                    detail.status = status;
                    detail.type = 1 /* MediaType.Article */;
                    details.push(detail);
                });
                let hasMore = json.data.count > page * 20;
                return new ExtensionList(details, page, hasMore ? (page + 1).toString() : undefined);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                //https://api-one-wscn.awtmt.com/apiv1/content/articles/${id}?extract=0&accept_theme=theme%2Cpremium-theme
                let api = `https://api-one-wscn.awtmt.com/apiv1/content/articles/${id}?extract=0&accept_theme=theme%2Cpremium-theme`;
                var jsonResponse = yield this.client.request({
                    url: api,
                    method: "GET",
                    contentType: "application/json",
                });
                let json = JSON.parse(jsonResponse.body);
                let resource = json.data;
                let title = resource.title;
                let author = resource.source_name;
                let date = resource.display_time;
                let dateTxt = new Date(date * 1000).toLocaleDateString();
                let content = resource.content;
                let audioUri = resource.audio_info;
                let image = (_b = (_a = resource.image) === null || _a === void 0 ? void 0 : _a.uri) !== null && _b !== void 0 ? _b : "";
                if (audioUri) {
                    content += `<br/><audio controls src="${audioUri.uri}" poster="${image}">您的浏览器不支持 audio 元素。</audio>`;
                }
                content = `<html>${content}</html>`;
                let media = new ArticleMedia(id, title, content);
                media.author = author;
                media.date = dateTxt;
                media.isMarkdown = false;
                return media;
            });
        }
    }
    (function () {
        const wallStreetCN = new WallStreetCN();
        wallStreetCN.init();
    })();

    return WallStreetCN;

})();
