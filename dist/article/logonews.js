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

    class LogoNews extends Rule {
        provideExtensionInfo() {
            let site = new Extension("logonews", "标志情报局", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.logonews.cn";
            site.description = "标志情报局24小时提供全球最新最全的新标志、新LOGO、标志新闻、标志资讯、LOGO新闻、LOGO设计欣赏、标志揭晓、国外LOGO设计欣赏等情报资讯。";
            site.thumbnail = "https://www.logonews.cn/favicon-64x64.png";
            site.lang = "zh";
            site.categoryList = [
                new SiteUrl("新闻频道", "category/news"),
                new SiteUrl("欣赏评论", "category/ead"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "分类", "category");
            site.searchList = [
                new SiteUrl("Search...", ""),
            ];
            site.useGuide = `## 如何获取分类名称

1. 访问网站 [标志情报局](https://www.logonews.cn/)，进入想要访问的分类页面；
2. 在其网页链接上，例如 \`https://www.logonews.cn/category/news\`，其中的 \`category/news\` 就是您需要填入的分类名称。
`;
            return site;
        }
        parseArticleNodes(articleNodes) {
            let items = [];
            articleNodes.each((index, element) => {
                var _a;
                let ele = $(element);
                if (ele.hasClass("ads")) {
                    return; // skip ad item
                }
                let thumbnail = ele.find("div.cover-image").attr("data-src") || "";
                let title = ele.find("div.post-doo h3").text().trim();
                let link = ele.find("a.article-link").attr("href") || "";
                let date = ele.find("div.article-meta time").attr("datetime") || "";
                //https://www.logonews.cn/atletico-dallas-new-logo.html => atletico-dallas-new-logo
                let id = ((_a = link.match(/logonews\.cn\/(.*?)\.html/)) === null || _a === void 0 ? void 0 : _a[1]) || "";
                let item = new ExtensionDetail(id, link, title);
                item.thumbnail = thumbnail;
                item.status = date;
                item.type = 1 /* MediaType.Article */;
                items.push(item);
            });
            return items;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let pageUrl = page == 1 ? this.site.baseUrl + "/" + url : this.site.baseUrl + "/" + url + "/page/" + page;
                let nextPageUrl = this.site.baseUrl + "/" + url + "/page/" + (page + 1);
                const htmlResponse = yield this.client.request({
                    url: pageUrl,
                    method: "GET",
                });
                const html = htmlResponse.body;
                let $nodes = $(html);
                let articleNodes = $nodes.find("div.postlist div.article-item-card");
                let items = this.parseArticleNodes(articleNodes);
                let pagination = $nodes.find("div.pagination ul li");
                let hasNextText = pagination.last().find("a").text().trim().indexOf("下一页") >= 0;
                let hasNext = items.length >= 15 || hasNextText;
                return new ExtensionList(items, page ? page : 1, hasNext ? nextPageUrl : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let pageUrl = page == 1 ? this.site.baseUrl + "/" + key : this.site.baseUrl + "/" + key + "/page/" + page;
                let nextPageUrl = this.site.baseUrl + "/" + key + "/page/" + (page + 1);
                const htmlResponse = yield this.client.request({
                    url: pageUrl,
                    method: "GET",
                });
                const html = htmlResponse.body;
                let $nodes = $(html);
                let articleNodes = $nodes.find("div.postlist div.article-item-card");
                let items = this.parseArticleNodes(articleNodes);
                let pagination = $nodes.find("div.pagination ul li");
                let hasNextText = pagination.last().find("a").text().trim().indexOf("下一页") >= 0;
                let hasNext = items.length >= 15 || hasNextText;
                return new ExtensionList(items, page ? page : 1, hasNext ? nextPageUrl : undefined);
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let pageUrl = page == 1 ? this.site.baseUrl + "/search/" + encodeURIComponent(keyword) : this.site.baseUrl + "/search/" + encodeURIComponent(keyword) + "/page/" + page;
                let nextPageUrl = this.site.baseUrl + "/search/" + encodeURIComponent(keyword) + "/page/" + (page + 1);
                const htmlResponse = yield this.client.request({
                    url: pageUrl,
                    method: "GET",
                });
                console.log("requestItemMedia url:", pageUrl);
                console.log("htmlResponse:", htmlResponse);
                const html = htmlResponse.body;
                let $nodes = $(html);
                let articleNodes = $nodes.find("div.mainsss div.post");
                let items = [];
                articleNodes.each((index, element) => {
                    var _a;
                    let ele = $(element);
                    if (ele.hasClass("ads")) {
                        return; // skip ad item
                    }
                    let thumbnail = ele.find("div.image").attr("data-src") || "";
                    let title = ele.find("h2.search_title").text().trim();
                    let link = ele.find("h2.search_title a").attr("href") || "";
                    //https://www.logonews.cn/atletico-dallas-new-logo.html => atletico-dallas-new-logo
                    let id = ((_a = link.match(/logonews\.cn\/(.*?)\.html/)) === null || _a === void 0 ? void 0 : _a[1]) || "";
                    let item = new ExtensionDetail(id, link, title);
                    item.thumbnail = thumbnail;
                    item.type = 1 /* MediaType.Article */;
                    items.push(item);
                });
                let pagination = $nodes.find("div.pagination ul li");
                let hasNextText = pagination.last().find("a").text().trim().indexOf("下一页") >= 0;
                let hasNext = items.length >= 10 || hasNextText;
                return new ExtensionList(items, page ? page : 1, hasNext ? nextPageUrl : undefined);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                const htmlResponse = yield this.client.request({
                    url: url,
                    method: "GET",
                });
                const html = htmlResponse.body;
                let $nodes = $(html);
                console.log("html:", html);
                let article = $nodes.find("article#post_content");
                let title = article.find("h1.h1").text().trim();
                let date = article.find("span.category_and_post_time span").text().trim();
                let contentNode = article.find("div.article_content");
                // remove all a tag but keep inner text
                contentNode.find("img").each((index, element) => {
                    let ele = $(element);
                    let dataSrc = ele.attr("data-src") || "";
                    if (dataSrc) {
                        ele.attr("src", dataSrc);
                    }
                });
                let contentHtml = contentNode.html() || "";
                let articleMedia = new ArticleMedia(id, title, contentHtml);
                articleMedia.date = date;
                return articleMedia;
            });
        }
    }
    (function () {
        const logonews = new LogoNews();
        logonews.init();
    })();

    return LogoNews;

})();
