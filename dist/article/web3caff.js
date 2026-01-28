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
    class SiteHeader {
        constructor(key, value) {
            this.key = key;
            this.value = value;
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

    class Web3Caff extends Rule {
        constructor() {
            super(...arguments);
            this.channelMaps = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("web3caff", "Web3Caff", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.web3caff.com";
            site.description = "Web3Caff - Your Daily Dose of Web3 News and Insights";
            site.thumbnail = "https://oss24.web3caff.com/wp-content/uploads/2022/01/cropped-icon-2.png";
            site.lang = "zh";
            site.categoryList = [
                new SiteUrl("推荐", "append=list-home&action=ajax_load_posts&query=&page=home"),
                new SiteUrl("叙事", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=199"),
                new SiteUrl("观点", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=195"),
                new SiteUrl("会员内容", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=1555"),
                new SiteUrl("对话", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=189"),
                new SiteUrl("资源与指南", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=197"),
                new SiteUrl("政策与法律", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=191"),
            ];
            site.loginParams = [
                { key: "cookie", value: "用户Cookie值" },
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "作者名称", "author");
            site.useGuide = `## 如何获取作者名称

1. 访问网站，进入想要访问的作者主页；
2. 在其网页链接上，例如 \`https://www.web3caff.com/author/author-name\` ，其中的 \`author-name\` 就是作者名称。
`;
            return site;
        }
        loginForm(form) {
            return __awaiter(this, void 0, void 0, function* () {
                const cookie = form.get("cookie") || "";
                const auth = new ExtensionAuth();
                auth.headers.push(new SiteHeader("Cookie", cookie));
                return auth;
            });
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let api = `https://web3caff.com/wp-admin/admin-ajax.php`;
                let query = url + `&paged=${page}`;
                const htmlResponse = yield this.client.request({
                    url: api,
                    contentType: "application/x-www-form-urlencoded",
                    method: "POST",
                    body: query
                });
                const html = htmlResponse.body;
                const $nodes = $(html);
                let itemList = $nodes.find("div.list-item");
                let list = [];
                itemList.each((index, element) => {
                    let el = $(element);
                    let cover = el.find("div.media img").attr("data-src") || "";
                    let title = el.find("div.media a").attr("title") || "";
                    let link = el.find("div.media a").attr("href") || "";
                    // https://web3caff.com/archives/130083
                    let id = link.split("/").pop() || "";
                    let author = el.find("div.list-content div.h-1x").text().trim();
                    let time = el.find("div.list-content div").last().text().trim();
                    let category = el.find("div.list-content div.list-featured-tag span").text().trim();
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = author;
                    detail.thumbnail = cover;
                    detail.status = time;
                    detail.category = category;
                    list.push(detail);
                });
                let hasMore = itemList.length >= 10;
                return new ExtensionList(list, page, hasMore ? url : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let authorId = this.channelMaps.get(key);
                if (authorId === undefined) {
                    let authorPage = "https://web3caff.com/archives/author/" + key;
                    const htmlResponse = yield this.client.request({
                        url: authorPage,
                        method: "GET"
                    });
                    const html = htmlResponse.body;
                    let bodyClass = "";
                    const bodyClassMatch = html.match(/<body.*?class="([^"]*)"/);
                    if (bodyClassMatch && bodyClassMatch.length > 1) {
                        bodyClass = bodyClassMatch[1];
                    }
                    let match = bodyClass.match(/author-(\d+)/);
                    if (match) {
                        authorId = match[1];
                        console.log("Author ID:", authorId);
                        this.channelMaps.set(key, authorId);
                    }
                    else {
                        console.log("Author ID not found for key:", key);
                        return new ExtensionList([], page, undefined);
                    }
                }
                let api = `https://web3caff.com/wp-admin/admin-ajax.php`;
                let query = `append=list-home&action=ajax_load_posts&query=${authorId}&page=author&paged=${page}`;
                const htmlResponse = yield this.client.request({
                    url: api,
                    contentType: "application/x-www-form-urlencoded",
                    method: "POST",
                    body: query
                });
                const html = htmlResponse.body;
                const $nodes = $(html);
                let itemList = $nodes.find("div.list-item");
                let list = [];
                itemList.each((index, element) => {
                    let el = $(element);
                    let cover = el.find("div.media img").attr("data-src") || "";
                    let title = el.find("div.media a").attr("title") || "";
                    let link = el.find("div.media a").attr("href") || "";
                    // https://web3caff.com/archives/130083
                    let id = link.split("/").pop() || "";
                    let author = el.find("div.list-content div.h-1x").text().trim();
                    let time = el.find("div.list-content div").last().text().trim();
                    let category = el.find("div.list-content div.list-featured-tag span").text().trim();
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = author;
                    detail.thumbnail = cover;
                    detail.status = time;
                    detail.category = category;
                    list.push(detail);
                });
                let hasMore = itemList.length >= 10;
                return new ExtensionList(list, page, hasMore ? api : undefined);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                const htmlResponse = yield this.client.request({
                    url: url,
                    method: "GET"
                });
                const html = htmlResponse.body;
                let $nodes = $(html);
                let content = $nodes.find("div.post");
                let coverStyle = content.find("div.post-poster div.media-content").attr("style") || "";
                // get cover from background-image:url('https://oss24.web3caff.com/wp-content/uploads/2024/12/image_2022_8_20_490-1.jpg')
                const match = coverStyle.match(/url\(['"]?(.*?)['"]?\)/);
                let cover = match ? match[1] : "";
                let coverNode = "<img src='" + cover + "' />";
                let title = content.find("h1.post-title").text().trim();
                let author = content.find("div.author-name a.author-popup").text().trim();
                let time = content.find("div.author-name time").text().trim();
                let article = content.find("div.post-content");
                article.find("div.addtoany_content").remove();
                article.find("noscript").remove();
                article.find("img").each((index, element) => {
                    let el = $(element);
                    let dataSrc = el.attr("data-src");
                    if (dataSrc) {
                        el.attr("src", dataSrc);
                    }
                });
                let contentHtml = "<html>" + coverNode + (article.html() || "") + "</html>";
                let media = new ArticleMedia(id, title, contentHtml);
                media.author = author;
                media.date = time;
                return media;
            });
        }
    }
    // append=list-home&paged=2&action=ajax_load_posts&query=&page=home
    (function () {
        let web3caff = new Web3Caff();
        web3caff.init();
    })();

    return Web3Caff;

})();
