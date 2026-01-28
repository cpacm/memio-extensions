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

    class EpicGames extends Rule {
        constructor() {
            super(...arguments);
            this.locale = "en-US"; // ["es-419", "es", "en", "zh-HK", "zh-TW", "zh-Hans", "en-US", "ko", "ja", "zh-CN", "zh-Hant", "fr", "de", "ru", "it", "es-ES", "es-MX", "pt-BR", "pl", "th", "tr", "ar", "nl", "sv", "cs", "da", "no", "fi", "pt", "hu", "ro", "id", "vi", "bg", "uk", "hi", "ms", "fil"]
            this.cookie = "";
        }
        provideExtensionInfo() {
            let site = new Extension("epicgames", "Epic Games Store", 1 /* MediaType.Article */);
            site.baseUrl = "https://store.epicgames.com";
            site.description = "Epic Games Store ";
            site.thumbnail = "https://www.epicgames.com/apple-touch-icon.png";
            site.lang = "en";
            site.categoryList = [
                new SiteUrl("All", "?sortBy=relevancy&sortDir=DESC"),
                new SiteUrl("New Release", "?sortBy=releaseDate&sortDir=DESC"),
                new SiteUrl("Coming Soon", "?sortBy=comingSoon&sortDir=DESC"),
                new SiteUrl("Alphabetical", "?sortBy=title&sortDir=ASC"),
                new SiteUrl("Price: Low to High", "?sortBy=currentPrice&sortDir=ASC"),
                new SiteUrl("Price: High to Low", "?sortBy=currentPrice&sortDir=DESC"),
            ];
            site.configParams = [
                { key: "locale", value: "en-US|zh-CN|ja|..." },
            ];
            site.useGuide = `## Locale Setting Guide

The **locale** parameter allows you to set the language and region for the Epic Games Store. This affects the content and pricing displayed in the store.
Examples include "en-US" for English (United States), "zh-CN" for Chinese (Simplified), "ja" for Japanese, etc.

> Choose locale from the list: ["es-419", "es", "en", "zh-HK", "zh-TW", "zh-Hans", "en-US", "ko", "ja", "zh-CN", "zh-Hant", "fr", "de", "ru", "it", "es-ES", "es-MX", "pt-BR", "pl", "th", "tr", "ar", "nl", "sv", "cs", "da", "no", "fi", "pt", "hu", "ro", "id", "vi", "bg", "uk", "hi", "ms", "fil"]

`;
            return site;
        }
        config(form) {
            return __awaiter(this, void 0, void 0, function* () {
                this.locale = form.get("locale") || this.locale;
                return Promise.resolve(true);
            });
        }
        searchHtmlScriptElement(html) {
            let $nodes = $(html);
            let jsonString = "";
            $nodes.each((_index, element) => {
                if (element instanceof HTMLScriptElement) {
                    let scriptContent = element.innerHTML;
                    if (scriptContent.includes("window.__REACT_QUERY_INITIAL_QUERIES__")) {
                        // match json part with window.__REACT_QUERY_INITIAL_QUERIES__={}
                        // 首先获取 window.__REACT_QUERY_INITIAL_QUERIES__ 一整行内容
                        let line = scriptContent.split('\n').find(line => line.includes("window.__REACT_QUERY_INITIAL_QUERIES__"));
                        if (line) {
                            let match = line.match(/window\.__REACT_QUERY_INITIAL_QUERIES__\s*=\s*({.*?});/);
                            if (match && match[1]) {
                                jsonString = match[1].replace(/undefined/g, "null");
                            }
                        }
                        return false; // Exit the each loop
                    }
                }
            });
            return jsonString;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let baseUrl = `https://store.epicgames.com/${this.locale}/browse`;
                let category = "&category=Game%7CEditor";
                let pagination = `&start=${(page - 1) * 40}&count=40`;
                let requestUrl = baseUrl + url + category + pagination;
                console.log("EpicGames Request URL:", requestUrl);
                let htmlResponse = yield this.client.request({
                    url: requestUrl,
                    method: "GET",
                    headers: [
                        { key: 'Accept', value: 'application/json, text/plain, */*' },
                        { key: 'User-Agent', value: 'Postman' },
                        { key: 'Referer', value: 'https://store.epicgames.com/' },
                        { key: 'Cookie', value: this.cookie },
                    ],
                });
                let jsonString = this.searchHtmlScriptElement(htmlResponse.body);
                try {
                    const json = JSON.parse(jsonString);
                    let querys = json["queries"];
                    // find searchStore query
                    let searchStoreQuery = querys.find((q) => q.state.data && q.state.data.Catalog && q.state.data.Catalog.searchStore);
                    if (!searchStoreQuery) {
                        return new ExtensionList([], page, undefined);
                    }
                    let searchStore = searchStoreQuery.state.data.Catalog.searchStore;
                    let items = searchStore.elements;
                    let paging = searchStore.paging;
                    let details = [];
                    for (const item of items) {
                        try {
                            let id = item.id;
                            let title = item.title;
                            let summary = item.description || "";
                            let nameSlug = (_a = item.catalogNs.mappings[0].pageSlug) !== null && _a !== void 0 ? _a : item.offerMappings[0].pageSlug;
                            let link = `https://store.epicgames.com/${this.locale}/p/${nameSlug}`;
                            let formattedDate = formatDateToYMD(item.releaseDate);
                            //https://cdn1.epicgames.com/spt-assets/c938aad977fb4b5aafe75922750028ba/capri-care-1n214.png?resize=1&w=360&h=480&quality=medium
                            let keyImages = item.keyImages || [];
                            let cover = keyImages && keyImages.length > 0 ? keyImages[0].url : "";
                            let thumbnailImage = keyImages.find((img) => img.type === "Thumbnail");
                            if (thumbnailImage) {
                                cover = thumbnailImage.url + `?resize=1&w=360&h=480&quality=medium`;
                            }
                            let authors = item.developerDisplayName || item.publisherDisplayName || "Epic Games";
                            let status = "";
                            if (item.price && item.price.totalPrice && item.price.totalPrice.fmtPrice.intermediatePrice) {
                                status = item.price.totalPrice.fmtPrice.intermediatePrice;
                            }
                            let category = item.categories && item.categories.length > 0 ? item.categories[0].path : "Game";
                            let detail = new ExtensionDetail(id, link, title);
                            detail.description = summary;
                            detail.category = status + " , " + category;
                            detail.thumbnail = cover;
                            detail.hasChapter = false;
                            detail.author = authors;
                            detail.status = formattedDate;
                            detail.type = 1 /* MediaType.Article */;
                            details.push(detail);
                        }
                        catch (e) {
                            console.log("EpicGames Item Parse Error:", e, item);
                            continue;
                        }
                    }
                    let hasMore = false;
                    if (paging) {
                        hasMore = paging.total > page * paging.count;
                    }
                    return new ExtensionList(details, page, hasMore ? url : undefined);
                }
                catch (e) {
                    console.log("EpicGames JSON Parse Error:", e);
                    return new ExtensionList([], page, undefined);
                }
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                let htmlResponse = yield this.client.request({
                    url: url,
                    method: "GET",
                    headers: [
                        { key: 'Accept', value: 'application/json, text/plain, */*' },
                        { key: 'Cookie', value: this.cookie },
                    ],
                });
                let jsonString = this.searchHtmlScriptElement(htmlResponse.body);
                try {
                    const json = JSON.parse(jsonString);
                    let querys = json["queries"];
                    // find searchStore query
                    let catalogOffer = querys.find((q) => q.state.data && q.state.data.Catalog && q.state.data.Catalog.catalogOffer);
                    if (!catalogOffer) {
                        console.log("can't find catalogOffer");
                        return new ExtensionMedia(1 /* MediaType.Article */, "", "");
                    }
                    let offerData = catalogOffer.state.data.Catalog.catalogOffer;
                    let title = offerData.title;
                    let description = offerData.description || "";
                    let content = decodeURIComponent(offerData.longDescription || description);
                    let tags = offerData.tags || [];
                    let tagNames = tags.map((tag) => tag.name);
                    if (tagNames.length > 0) {
                        content += "\n\n> **Tags:** " + tagNames.join(", ");
                    }
                    // mark markdown # to ##
                    content = content.replace(/^# /gm, "## ");
                    let articleMedia = new ArticleMedia(id, title, content);
                    articleMedia.isMarkdown = true;
                    articleMedia.date = formatDateToYMD(offerData.releaseDate);
                    return articleMedia;
                }
                catch (e) {
                    console.log("EpicGames Detail JSON Parse Error:", e);
                }
                return new ExtensionMedia(1 /* MediaType.Article */, id, "");
            });
        }
    }
    (function () {
        const epicGames = new EpicGames();
        epicGames.init();
    })();

    return EpicGames;

})();
