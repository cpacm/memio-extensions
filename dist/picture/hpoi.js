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
    class PictureMedia extends ExtensionMedia {
        constructor(id, title, imageList) {
            super(2 /* MediaType.Picture */, id, title);
            this.imageList = imageList;
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

    class Hpoi extends Rule {
        provideExtensionInfo() {
            let site = new Extension("hpoi", "Hpoi 手办维基", 2 /* MediaType.Picture */);
            site.baseUrl = "https://www.hpoi.net";
            site.description = "资讯、资料，舔图、晒图，共同建设一个属于大家的手办模型中文网吧！";
            site.thumbnail = "https://www.hpoi.net/favicon.ico";
            site.lang = "zh";
            site.categoryList = [
                new SiteUrl("手办-一天热度", "category=100&order=hitsDay"),
                new SiteUrl("手办-一周热度", "category=100&order=hits7Day"),
                new SiteUrl("手办-总热度", "category=100&order=hits"),
                new SiteUrl("手办-入库", "category=100&order=add"),
                new SiteUrl("手办-发售", "category=100&order=release"),
                new SiteUrl("动漫模型-一天热度", "category=200&order=hitsDay"),
                new SiteUrl("动漫模型-一周热度", "category=200&order=hits7Day"),
                new SiteUrl("动漫模型-总热度", "category=200&order=hits"),
                new SiteUrl("动漫模型-入库", "category=200&order=add"),
                new SiteUrl("动漫模型-发售", "category=200&order=release"),
                new SiteUrl("真实模型-一天热度", "category=500&order=hitsDay"),
                new SiteUrl("真实模型-一周热度", "category=500&order=hits7Day"),
                new SiteUrl("真实模型-总热度", "category=500&order=hits"),
                new SiteUrl("真实模型-入库", "category=500&order=add"),
                new SiteUrl("真实模型-发售", "category=500&order=release"),
                new SiteUrl("毛绒玩具-一天热度", "category=400&order=hitsDay"),
                new SiteUrl("毛绒玩具-一周热度", "category=400&order=hits7Day"),
                new SiteUrl("毛绒玩具-总热度", "category=400&order=hits"),
                new SiteUrl("毛绒玩具-入库", "category=400&order=add"),
                new SiteUrl("毛绒玩具-发售", "category=400&order=release"),
                new SiteUrl("Doll娃娃-一天热度", "category=300&order=hitsDay"),
                new SiteUrl("Doll娃娃-一周热度", "category=300&order=hits7Day"),
                new SiteUrl("Doll娃娃-总热度", "category=300&order=hits"),
                new SiteUrl("Doll娃娃-入库", "category=300&order=add"),
                new SiteUrl("Doll娃娃-发售", "category=300&order=release"),
            ];
            site.searchList = [
                new SiteUrl("全部搜索", "category=10000&order=add&keyword={keyword}"),
            ];
            site.imageRefer = "https://www.hpoi.net";
            site.channel = new Channel(0 /* ChannelType.List */, "厂商", "campany");
            site.useGuide = `## 如何设置厂商频道
1. 进入 Hpoi 厂商浏览周边页面，选择想要浏览的厂商，例如：https://www.hpoi.net/hobby/all?order=add&company=2511669,取得 URL 中的 company 参数值 2511669 ；
2. 在频道设置中，选择“厂商”，并输入参数值 2511669，保存即可查看该厂商的全部作品。
        `;
            return site;
        }
        parseItemDetails(nodeList) {
            var items = [];
            nodeList.each((index, element) => {
                let node = $(element);
                let link = node.find("a").first().attr("href") || "";
                // hobby/98372 -> 98372
                let id = link.split("/").pop() || "";
                let title = node.find("div.hpoi-detail-grid-title a").text().trim() || "";
                let thumbnail = node.find("a img").attr("src") || "";
                let company = node.find("div.hpoi-detail-grid-info span:eq(0)").text().trim() || "";
                let date = node.find("div.hpoi-detail-grid-info span:eq(1)").text().trim() || "";
                let status = node.find("div.hpoi-detail-grid-info span:eq(2)").text().trim() || "";
                let item = new ExtensionDetail(id, this.site.baseUrl + "/" + link, title);
                item.author = company;
                item.type = 2 /* MediaType.Picture */;
                item.hasChapter = false;
                item.category = date;
                item.thumbnail = thumbnail;
                item.status = status;
                items.push(item);
            });
            return items;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let pageurl = this.site.baseUrl + "/hobby/all";
                let body = url + `&part=true&sex=0&r18=0&page=${page}`;
                let htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: pageurl, method: "POST", body: body, contentType: "application/x-www-form-urlencoded" }));
                let $nodes = $("<div>" + htmlResponse.body + "</div>");
                let nodeList = $nodes.find("ul.hpoi-glyphicons-list li");
                let details = this.parseItemDetails(nodeList);
                let pagination = $nodes.find("div.hpoi-page-box input#pageCount").attr("value");
                let totalPage = parseInt(pagination || "1");
                let hasmore = page < totalPage;
                let nextPage = hasmore ? pageurl : undefined;
                return new ExtensionList(details, page, nextPage);
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let pageurl = this.site.baseUrl + "/hobby/all";
                let body = url.replace("{keyword}", encodeURIComponent(keyword)) + `&part=true&sex=0&r18=0&page=${page}`;
                let htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: pageurl, method: "POST", body: body, contentType: "application/x-www-form-urlencoded" }));
                let $nodes = $("<div>" + htmlResponse.body + "</div>");
                let nodeList = $nodes.find("ul.hpoi-glyphicons-list > li");
                let details = this.parseItemDetails(nodeList);
                let pagination = $nodes.find("div.hpoi-page-box input#pageCount").attr("value");
                let totalPage = parseInt(pagination || "1");
                let hasmore = page < totalPage;
                let nextPage = hasmore ? pageurl : undefined;
                return new ExtensionList(details, page, nextPage);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let pageurl = this.site.baseUrl + "/hobby/all";
                let body = "order=add&sex=0&r18=0&releaseYear=0&releaseMonth=0&view=3&category=10000&jobId=1&releaseYearCount=0&part=true";
                body = body + `&company=${key}&page=${page}`;
                let htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: pageurl, method: "POST", body: body, contentType: "application/x-www-form-urlencoded" }));
                let $nodes = $("<div>" + htmlResponse.body + "</div>");
                let nodeList = $nodes.find("ul.hpoi-glyphicons-list > li");
                let details = this.parseItemDetails(nodeList);
                let pagination = $nodes.find("div.hpoi-page-box input#pageCount").attr("value");
                let totalPage = parseInt(pagination || "1");
                let hasmore = page < totalPage;
                let nextPage = hasmore ? pageurl : undefined;
                return new ExtensionList(details, page, nextPage);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let api = this.site.baseUrl + "/hobby/" + id;
                let htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "GET" }));
                let $nodes = $(htmlResponse.body);
                let title = $nodes.find("div.hpoi-ibox-title p").attr("title") || "";
                let imageNodes = $nodes.find("div#intelligenceModal-content div.av-masonry-container a");
                let images = [];
                imageNodes.each((index, element) => {
                    let node = $(element);
                    let imgsrc = node.attr("href") || "";
                    if (imgsrc) {
                        images.push(imgsrc);
                    }
                });
                let media = new PictureMedia(id, title, images);
                media.refer = this.site.baseUrl;
                return media;
            });
        }
    }
    (function () {
        const hpoi = new Hpoi();
        hpoi.init();
    })();

    return Hpoi;

})();
