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

    // parse date to "YYYY,MM/DD" format
    function formatDateToYMD(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // Months are zero-based
        const day = date.getDate();
        return `${year},${month}/${day}`;
    }

    class Reuters extends Rule {
        provideExtensionInfo() {
            let site = new Extension("reuters", "Reuters", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.reuters.com";
            site.description = "Reuters";
            site.thumbnail = "https://www.reuters.com/favicon.ico";
            site.lang = "en";
            site.categoryList = [
                new SiteUrl("World", "/world/"),
                new SiteUrl("Africa", "/world/africa/"),
                new SiteUrl("Americas", "/world/americas/"),
                new SiteUrl("Asia Pacific", "/world/asia-pacific/"),
                new SiteUrl("China", "/world/china/"),
                new SiteUrl("War", "/world/ukraine-russia-war/"),
                new SiteUrl("Europe", "/world/europe/"),
                new SiteUrl("India", "/world/india/"),
                new SiteUrl("Middle East", "/world/middle-east/"),
                new SiteUrl("United Kingdom", "/world/uk/"),
                new SiteUrl("United States", "/world/us/"),
                new SiteUrl("Israel and Hamas at War", "/world/israel-hamas/"),
            ];
            site.searchList = [];
            return site;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                const pageSize = 20;
                let baseUrl = 'https://www.reuters.com/pf/api/v3/content/fetch/articles-by-section-alias-or-id-v1';
                let offset = (page - 1) * pageSize;
                let query = new ReutersQuery(url, offset, pageSize);
                let requestUrl = baseUrl + `?query=${encodeURIComponent(JSON.stringify(query))}`;
                const jsonResponse = yield this.client.request({
                    url: requestUrl,
                    method: "GET",
                    headers: [
                        { key: 'Accept', value: 'application/json, text/plain, */*' },
                        { key: 'Referer', value: 'https://www.reuters.com/' },
                        { key: 'Accept-Language', value: 'en-US,en;q=0.9' },
                        { key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }
                    ],
                });
                try {
                    console.log("JSON Response:", jsonResponse.body);
                    const json = JSON.parse(jsonResponse.body);
                    if (!json || !json.statusCode || json.statusCode !== 200) {
                        return new ExtensionList([], page, undefined);
                    }
                    let items = json.result.articles;
                    const details = items.map((item) => {
                        var _a;
                        let id = item.id;
                        let title = item.title;
                        let summary = item.description || "";
                        let link = `https://www.reuters.com${item.canonical_url}`;
                        let formattedDate = formatDateToYMD(item.published_time);
                        let authors = (_a = item.authors) === null || _a === void 0 ? void 0 : _a.map((author) => author.name).join(', ');
                        let cover = item.thumbnail && item.thumbnail.resizer_url ? item.thumbnail.resizer_url : "";
                        let category = item.kicker ? item.kicker.name : "";
                        let detail = new ExtensionDetail(id, link, title);
                        detail.description = summary;
                        detail.author = authors;
                        detail.status = formattedDate;
                        detail.category = category;
                        detail.thumbnail = cover;
                        return detail;
                    });
                    let hasMore = false;
                    let pagination = json.result.pagination;
                    if (pagination) {
                        hasMore = pageSize * page < pagination.total_size;
                    }
                    return new ExtensionList(details, page, hasMore ? url : undefined);
                }
                catch (e) {
                    console.error("Failed to parse JSON response:", e);
                    return new ExtensionList([], page, undefined);
                }
            });
        }
        searchHtmlScriptElement(html) {
            let $nodes = $(html);
            let jsonString = "";
            $nodes.each((index, element) => {
                if (element instanceof HTMLScriptElement) {
                    if (element.id === "fusion-metadata") {
                        let scriptContent = element.innerHTML;
                        // match json part with Fusion.globalContent={}
                        let match = scriptContent.match(/Fusion.globalContent=({[\S\s]*?});/);
                        if (match && match[1]) {
                            jsonString = match[1].replace(/undefined/g, "null");
                        }
                        return false; // Exit the each loop
                    }
                }
            });
            return jsonString;
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                const htmlResponse = yield this.client.request({
                    url: url,
                    method: "GET",
                    headers: [
                        { key: 'Accept', value: 'application/json, text/plain, */*' },
                        { key: 'Referer', value: 'https://www.reuters.com/' },
                        { key: 'Accept-Language', value: 'en-US,en;q=0.9' },
                    ],
                });
                let html = htmlResponse.body;
                let jsonString = this.searchHtmlScriptElement(html);
                try {
                    let json = JSON.parse(jsonString);
                    if (!json || !json.statusCode || json.statusCode !== 200) {
                        return new ArticleMedia("-1", "", "");
                    }
                    let article = json.result;
                    let title = article.title;
                    let date = formatDateToYMD(article.updated_time);
                    let authors = (_a = article.authors) === null || _a === void 0 ? void 0 : _a.map((author) => author.name).join(', ');
                    let content = '';
                    let elements = article.content_elements;
                    for (let element of elements) {
                        if (element.type === 'paragraph') {
                            let paragraph = element.content;
                            let pContent = paragraph.replace(/href="(\/[^"]*)"/g, 'href="https://www.reuters.com$1"');
                            content += `<p>${pContent}</p>\n\n`;
                        }
                        else if (element.type === 'header') {
                            let level = (element.level || 2) + 1;
                            content += `<h${level}>${element.content}</h${level}>\n\n`;
                        }
                        else if (element.type === 'graphic') {
                            content += `<img src="${(_b = element.resizer_url) !== null && _b !== void 0 ? _b : element.url}" alt="${element.title || ''}"/>\n\n`;
                        }
                    }
                    let related_content = article.related_content;
                    if (related_content) {
                        let galleries = related_content.galleries;
                        if (galleries) {
                            for (let gallery of galleries) {
                                let gallery_elements = gallery.content_elements;
                                for (let g_element of gallery_elements) {
                                    if (g_element.type === 'image') {
                                        content += `<img src="${(_c = g_element.resizer_url) !== null && _c !== void 0 ? _c : g_element.url}" alt="${g_element.caption || ''}"/>\n\n`;
                                    }
                                }
                            }
                        }
                        let images = related_content.images;
                        if (images) {
                            for (let image of images) {
                                content += `<img src="${(_d = image.resizer_url) !== null && _d !== void 0 ? _d : image.url}" alt="${image.caption || ''}"/>\n\n`;
                            }
                        }
                        let videos = related_content.videos;
                        if (videos) {
                            for (let video of videos) {
                                content += `<video controls src="${video.source.hls}" poster="${video.thumbnail.resizer_url}" title="${video.title || ''}" duration="${video.duration || ''}"></video>\n\n`;
                            }
                        }
                    }
                    let media = new ArticleMedia(id, title, "<html>" + content + "</html>");
                    media.author = authors;
                    media.date = date;
                    media.isMarkdown = false;
                    return media;
                }
                catch (error) {
                    console.error("Failed to parse JSON data:", error);
                    return new ArticleMedia("-1", "", "");
                }
            });
        }
    }
    class ReutersQuery {
        constructor(sectionId, offset = 0, size = 9) {
            this["arc-site"] = "reuters";
            this.fetch_type = "collection";
            this.offset = offset;
            this.section_id = sectionId;
            this.size = size;
            this.website = "reuters";
        }
    }
    (function () {
        const reuters = new Reuters();
        reuters.init();
    })();

    return Reuters;

})();
