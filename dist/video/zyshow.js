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
    class VideoMedia extends ExtensionMedia {
        constructor(id, title, url, autoCatch = true, webPlay = false) {
            super(3 /* MediaType.Video */, id, title);
            this.autoCatch = true;
            this.webPlay = false;
            this.watchUrl = url;
            this.autoCatch = autoCatch;
            this.webPlay = webPlay;
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

    class ZyShow extends Rule {
        provideExtensionInfo() {
            let site = new Extension("zyshow", "综艺秀", 3 /* MediaType.Video */);
            site.baseUrl = "https://www.zyshow.co";
            site.description = "综艺秀旨在为台湾综艺爱好者提供及时全面的节目主题和来宾信息，各个节目的内容和观点不代表本站立场";
            site.thumbnail = "https://www.zyshow.co/images/favicon.ico";
            site.lang = "zh-TW";
            site.categoryList = [
                new SiteUrl("台湾", site.baseUrl + "/index/{page}.html"),
                new SiteUrl("大陆", site.baseUrl + "/dl/index/{page}.html"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "综艺节目Id", "name");
            site.useGuide = `## 如何获取综艺Id

1. 访问综艺秀网站 [${site.baseUrl}](${site.baseUrl})
2. 浏览或搜索您感兴趣的综艺节目
3. 点击进入该节目的详情页面
4. 在浏览器地址栏中，您会看到类似于 \`${site.baseUrl}/shishangwanjia/\` 的URL
5. 复制该URL中的 \`shishangwanjia\` 部分，即为该节目的ID;
6. 如果是大陆综艺，则URL类似于 \`${site.baseUrl}/dl/zongyijiemu/\`，ID则是 \`dl/zongyijiemu\`;
`;
            return site;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                const dlInsert = url.includes("/dl/") ? "dl/" : "";
                var realUrl = url.replace("{page}", page.toString());
                var nextUrl = url.replace("{page}", (page + 1).toString());
                var httpResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: realUrl,
                    method: "GET",
                }));
                const html = httpResponse.body;
                let $nodes = $(html);
                let tableTrs = $nodes.find("table tr");
                if (!tableTrs || tableTrs.length == 0) {
                    return new ExtensionList([], page ? page : 1, undefined);
                }
                var items = [];
                tableTrs.each((_index, element) => {
                    var _a, _b, _c;
                    if (((_a = element.firstElementChild) === null || _a === void 0 ? void 0 : _a.tagName.toLowerCase()) === "th") {
                        return; // skip header row
                    }
                    if (!element.hasAttribute("onmouseover")) {
                        return; // skip non-data row
                    }
                    let ele = $(element);
                    let tds = ele.find("td");
                    // ../../wozuida/  ->  wozuida
                    let date = tds.eq(0).find("a").text().trim();
                    let link = (_b = tds.eq(0).find("a").attr("href")) === null || _b === void 0 ? void 0 : _b.replace(/\.\.\//g, "");
                    let idPrefix = (_c = tds.eq(1).find("a").attr("href")) === null || _c === void 0 ? void 0 : _c.replace(/\.\.\//g, "").replace(/\//g, "");
                    let id = idPrefix + "_" + date;
                    let title = tds.eq(1).find("a").text().trim();
                    let description = tds.eq(2).text().trim();
                    let author = tds.eq(3).text().trim();
                    let update = tds.eq(0).text().trim();
                    let item = new ExtensionDetail(id, this.site.baseUrl + "/" + dlInsert + link, title);
                    item.description = description;
                    item.author = author;
                    item.category = update;
                    item.hasChapter = false;
                    item.type = 3 /* MediaType.Video */;
                    items.push(item);
                });
                let maxPage = 20;
                let disableNext = page >= maxPage || items.length < 50;
                return new ExtensionList(items, page, disableNext ? undefined : nextUrl);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                const dlInsert = key.startsWith("dl/") ? "dl/" : "";
                let requestUrl = `${this.site.baseUrl}/${key}/${page}.html`;
                var httpResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: requestUrl,
                    method: "GET",
                }));
                const html = httpResponse.body;
                let $nodes = $(html);
                let detailNode = $nodes.find("figure#event_grid");
                let cover = detailNode.find("div.inner_lyr > img").attr("src") || "";
                // ../img/nvshenjianglin.jpg -> https://www.zyshow.co/img/nvshenjianglin.jpg
                if (cover.startsWith("../")) {
                    cover = this.site.baseUrl + cover.replace("../", "/");
                }
                var items = [];
                let chapterNodes = $nodes.find("figure#event_detail table tr");
                chapterNodes.each((_idx, element) => {
                    var _a;
                    if (((_a = element.firstElementChild) === null || _a === void 0 ? void 0 : _a.tagName.toLowerCase()) === "th") {
                        return; // skip header row
                    }
                    if (!element.hasAttribute("onmouseover")) {
                        return; // skip non-data row
                    }
                    let ele = $(element);
                    let tds = ele.find("td");
                    // ../nvshenjianglin/v/20211117.html ->  /nvshenjianglin/v/20211117.html
                    let link = tds.eq(0).find("a").attr("href") || "";
                    let id = link === null || link === void 0 ? void 0 : link.replace(".html", "").replace("/v/", "_").replace(/\.\.\//g, "");
                    link = this.site.baseUrl + "/" + dlInsert + link.replace(/\.\.\//g, "");
                    let title = tds.eq(0).find("a").text().trim();
                    let chapterTitle = tds.eq(1).text().trim();
                    let author = tds.eq(2).text().trim();
                    let chapter = new ExtensionDetail(id, link, title);
                    chapter.description = chapterTitle;
                    // chapter.thumbnail = cover;
                    chapter.author = author;
                    chapter.hasChapter = false;
                    chapter.type = 3 /* MediaType.Video */;
                    items.push(chapter);
                });
                let pageInfo = $nodes.find("div.pagination form ul a").last().attr("href") || "";
                // 6.html -> 6
                let pageIndex = 0;
                try {
                    pageIndex = parseInt(pageInfo.replace(".html", ""));
                }
                catch (_b) {
                    pageIndex = 0;
                }
                let hasMore = true;
                if (pageIndex <= page || items.length < 30) {
                    hasMore = false;
                }
                return new ExtensionList(items, page, hasMore ? `${this.site.baseUrl}/${key}/${page + 1}.html` : undefined);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                var httpResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: url,
                    method: "GET",
                }));
                const html = httpResponse.body;
                let $nodes = $(html);
                let playList = $nodes.find("div.js_videoCon");
                let script = playList.find("script").first().html() || "";
                let finalUrl = "";
                let title = $nodes.find("section#event_listing h3").text().trim();
                if (script.length > 0) {
                    const regex = /'([^']+)'\.split\('\|'\)/;
                    const match = script.match(regex);
                    if (match && match[1]) {
                        const parts = match[1].split('|');
                        const urlPart = parts.find(p => p.length > 50); // Find the long base64-like string
                        if (urlPart) {
                            // Now you have the extracted string: Zms5OXIyTmIxVkk2...
                            // You can proceed to decode it or use it as needed.
                            // For example, let's assume it's a URL parameter for another request.
                            finalUrl = `https://www.zyshow.co/url=${urlPart}`;
                            // TODO: Make a request to finalUrl or process it.
                            // This is a placeholder for the final media URL.
                            // You will likely need to make another request and parse the result.
                        }
                    }
                }
                if (finalUrl.length == 0) {
                    // Fallback: try to find video source directly in HTML
                    finalUrl = $nodes.find("a").attr("href") || "";
                }
                if (finalUrl.length == 0) {
                    console.error("No media URL found");
                    return new VideoMedia("-1", "", "");
                }
                // request m3u8
                var mediaResponse = yield ((_b = this.client) === null || _b === void 0 ? void 0 : _b.request({
                    url: finalUrl,
                    method: "GET",
                }));
                let mediaBody = mediaResponse.body;
                console.log("Extracted media: " + mediaBody);
                let m3u8Url = "";
                const regex = /var urls = "([^"]+)"/;
                const match = mediaBody.match(regex);
                if (match && match[1]) {
                    m3u8Url = match[1];
                }
                if (m3u8Url.length > 0) {
                    return new VideoMedia(id, title, m3u8Url, false, false);
                }
                return new VideoMedia(id, title, finalUrl, false, true);
            });
        }
    }
    (function () {
        const zyshow = new ZyShow();
        zyshow.init();
    })();

    return ZyShow;

})();
