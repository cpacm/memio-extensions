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

    class Douban extends Rule {
        provideExtensionInfo() {
            let site = new Extension("douban", "豆瓣", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.douban.com";
            site.description = "提供图书、电影、音乐唱片的推荐、评论和价格比较，以及城市独特的文化生活。";
            site.thumbnail = "https://www.douban.com/favicon.ico";
            site.categoryList = [
                { name: "书籍书评", url: "https://book.douban.com/review/best/" },
                { name: "电影影评", url: "https://movie.douban.com/review/best/" },
                { name: "音乐乐评", url: "https://music.douban.com/review/latest/" }
            ];
            site.lang = "zh";
            site.channel = new Channel(0 /* ChannelType.List */, "小组 ID", "group");
            site.useGuide = `## 如何获取小组 ID

1. 打开豆瓣小组页面，例如 [豆瓣小组](https://www.douban.com/group/explore)
2. 在浏览器地址栏中找到你想要进入的小组的，进入后URL格式通常为 https://www.douban.com/group/634017/，其中 634017 即为小组 ID。
3. 将该 ID 填入扩展配置中的小组 ID 字段。`;
            return site;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let start = (page - 1) * 10;
                let requestUrl = url + `?start=${start}`;
                let nextUrl = url + `?start=${start + 10}`;
                let htmlResponse = yield this.client.request({
                    url: requestUrl,
                    method: "GET",
                });
                let $nodes = $(htmlResponse.body);
                let items = [];
                let nodeList = $nodes.find("div.article div.review-list div.review-item");
                nodeList.each((index, element) => {
                    let ele = $(element);
                    let titleElement = ele.find("div.main-bd h2");
                    let title = titleElement.text().trim();
                    let url = titleElement.find("a").attr("href") || "";
                    //https://book.douban.com/review/17201029/ --> 17201029
                    let idMatch = url.match(/\/review\/([\d]+)/);
                    let id = idMatch ? idMatch[1] : url;
                    let author = ele.find("header.main-hd a.name").text().trim();
                    let date = ele.find("header.main-hd span.main-meta").text().trim();
                    let thumbnailElement = ele.find("a.subject-img img");
                    let thumbnail = thumbnailElement.attr("src") || "";
                    let category = thumbnailElement.attr("title") || "";
                    let summaryElement = ele.find("div.short-content");
                    summaryElement.find("p,a").remove();
                    let summary = summaryElement.text().trim();
                    let detail = new ExtensionDetail(id, url, title);
                    detail.author = author;
                    detail.category = category;
                    detail.thumbnail = thumbnail;
                    detail.description = summary;
                    detail.status = date;
                    detail.type = 1 /* MediaType.Article */;
                    items.push(detail);
                });
                let countText = $nodes.find("div.paginator span.count").text().trim();
                // (共50条) -> 50
                let total = 0;
                let countMatch = countText.match(/共([\d]+)条/);
                if (countMatch) {
                    total = parseInt(countMatch[1]);
                }
                let count = 10 * page;
                let hasMore = total > count;
                return new ExtensionList(items, page, hasMore ? nextUrl : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let start = (page - 1) * 30;
                let requestUrl = `https://www.douban.com/group/${key}/discussion?start=${start}&type=new`;
                let htmlResponse = yield this.client.request({
                    url: requestUrl,
                    method: "GET",
                });
                let $nodes = $(htmlResponse.body);
                let items = [];
                let nodeList = $nodes.find("div#content table.olt tr");
                nodeList.find("tr.th").remove();
                nodeList.each((index, element) => {
                    let ele = $(element);
                    let titleElement = ele.find("td.title a");
                    let title = titleElement.text().trim();
                    let url = titleElement.attr("href") || "";
                    //https://www.douban.com/group/topic/177200223?_spm_id=MTg0MTYwMjEz --> 177200223
                    let idMatch = url.match(/\/topic\/([\d]+)/);
                    let id = idMatch ? idMatch[1] : url;
                    let author = ele.find("td:eq(1) a").text().trim();
                    let date = ele.find("td.time").text().trim();
                    let detail = new ExtensionDetail(id, url, title);
                    detail.author = author;
                    detail.category = date;
                    detail.type = 1 /* MediaType.Article */;
                    items.push(detail);
                });
                let hasMore = nodeList.length >= 30;
                let nextUrl = hasMore ? `https://www.douban.com/group/${key}/discussion?start=${start + 30}&type=new` : undefined;
                return new ExtensionList(items, page, nextUrl);
            });
        }
        requestReviewMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                // https://book.douban.com/review/17206526/
                let htmlResponse = yield this.client.request({
                    url: url,
                    method: "GET",
                });
                let $nodes = $(htmlResponse.body);
                let content = $nodes.find("div.review-content");
                let author = content.attr("data-author") || "";
                let title = $nodes.find("div.article h1").text().trim();
                let date = $nodes.find("header.main-hd div.main-meta span").first().text().trim();
                let media = new ArticleMedia(id, title, `<html>${content.html()}</html>`);
                media.author = author;
                media.date = date;
                media.isMarkdown = false;
                return media;
            });
        }
        requestTopicMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                // https://www.douban.com/group/topic/314128071
                let htmlResponse = yield this.client.request({
                    url: url,
                    method: "GET",
                });
                let $nodes = $(htmlResponse.body);
                let content = $nodes.find("div.rich-content");
                let author = $nodes.find("div.topic-doc h3 span.from").text().trim();
                let title = $nodes.find("div.article h1").text().trim();
                let date = $nodes.find("div.topic-doc div.topic-meta span.create-time").text().trim();
                let media = new ArticleMedia(id, title, `<html>${content.html()}</html>`);
                media.author = author;
                media.date = date;
                media.isMarkdown = false;
                return media;
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                // Determine if it's a review or topic
                let media;
                if (url.includes("/review/")) {
                    media = yield this.requestReviewMedia(url, id);
                }
                else if (url.includes("/topic/")) {
                    media = yield this.requestTopicMedia(url, id);
                }
                else {
                    media = new ExtensionMedia(1 /* MediaType.Article */, id);
                }
                return media;
            });
        }
    }
    (function () {
        let rule = new Douban();
        rule.init();
    })();

    return Douban;

})();
