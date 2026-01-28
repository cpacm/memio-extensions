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

    class Famitsu extends Rule {
        provideExtensionInfo() {
            let site = new Extension("famitsu", "ファミ通", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.famitsu.com";
            site.description = "ファミ通.comは、ゲーム情報を中心にエンタメ情報を発信する総合メディアサイトです。最新ニュース、レビュー、攻略情報、インタビュー、動画など、多彩なコンテンツを提供しています。";
            site.thumbnail = "https://www.famitsu.com/res/images/favicons/favicon.ico";
            site.lang = "ja";
            site.categoryList = [
                new SiteUrl("新着", "new-article"),
                new SiteUrl("Switch2", "switch2"),
                new SiteUrl("Switch", "switch"),
                new SiteUrl("PS5", "ps5"),
                new SiteUrl("PCゲーム", "pc-game"),
                new SiteUrl("ニュース", "news"),
                new SiteUrl("動画", "videos"),
                new SiteUrl("特集・企画記事", "special-article"),
            ];
            return site;
        }
        searchHtmlScriptElement(html) {
            let $nodes = $(html);
            let jsonString = "";
            $nodes.each((index, element) => {
                if (element instanceof HTMLScriptElement) {
                    if (element.id === "__NEXT_DATA__") {
                        let scriptContent = element.innerHTML;
                        jsonString = scriptContent;
                        return false; // Exit the each loop
                    }
                }
            });
            return jsonString;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                //https://www.famitsu.com/category/new-article/page/1
                let api = `${this.site.baseUrl}/category/${url}/page/${page}`;
                let htmlResponse = yield this.client.request({ url: api, method: "GET" });
                let jsonString = this.searchHtmlScriptElement(htmlResponse.body);
                try {
                    let jsonData = JSON.parse(jsonString);
                    let totalPage = jsonData.props.pageProps.pages;
                    let articles = jsonData.props.pageProps.categoryArticleDataForPc;
                    let details = [];
                    articles.forEach((article) => {
                        if (article.isPr)
                            return;
                        console.log("article:", article);
                        let id = article.id.toString();
                        let description = article.description;
                        let categorys = article.subCategories;
                        let category = "";
                        if (categorys && categorys.length > 0) {
                            category = categorys.map((cat) => cat.nameJa).join(", ");
                        }
                        let date = article.publishedAt;
                        let dateTxt = formatDateToYMD(date);
                        let thumbnail = article.thumbnailUrl;
                        let dataArray = date.split("-");
                        let ym = dataArray[0] + dataArray[1];
                        // https://www.famitsu.com/article/202512/61249
                        let link = this.site.baseUrl + `/article/${ym}/${id}`;
                        let title = article.title;
                        let detail = new ExtensionDetail(id, link, title);
                        detail.thumbnail = thumbnail;
                        detail.type = 1 /* MediaType.Article */;
                        detail.description = description;
                        detail.category = category;
                        detail.status = dateTxt;
                        details.push(detail);
                    });
                    let hasMore = page < totalPage;
                    let nextApi = `${this.site.baseUrl}/category/${url}/page/${page + 1}`;
                    return new ExtensionList(details, page, hasMore ? nextApi : undefined);
                }
                catch (err) {
                    console.log("Kakuyomu requestItemList parse json error:", err);
                }
                return new ExtensionList([], page, undefined);
            });
        }
        safeDecodeURIComponent(str) {
            try {
                return decodeURIComponent(str);
            }
            catch (e) {
                return str;
            }
        }
        parseContent(content) {
            let contentHtml = "";
            if (content.type === "STRING") {
                let inlineContent = content.content;
                if (inlineContent && inlineContent instanceof Array) {
                    inlineContent.forEach((inlineItem) => {
                        let htmlContent = this.parseContent(inlineItem);
                        contentHtml += htmlContent;
                    });
                }
                else if (inlineContent) {
                    contentHtml += `${this.safeDecodeURIComponent(inlineContent)}`;
                }
            }
            else if (content.type === "STRONG") {
                contentHtml += `<strong>${content.content}</strong>`;
            }
            else if (content.type === "ITEMIZATION") {
                let items = content.content;
                let itemHtml = "<ul>";
                items.forEach((item) => {
                    let htmlContent = this.parseContent(item);
                    itemHtml += `<li>${htmlContent}</li>`;
                });
                itemHtml += "</ul>";
                contentHtml += itemHtml;
            }
            else if (content.type === "HEAD") {
                contentHtml += `<h2>${content.content}</h2>`;
            }
            else if (content.type === "SHEAD") {
                contentHtml += `<h3>${content.content}</h3>`;
            }
            else if (content.type === "NEWS") {
                let path = content.url;
                let thumbnail = content.thumbnail_url;
                if (path && path.startsWith("//")) {
                    path = "https:" + path;
                }
                else if (path && path.startsWith("/")) {
                    path = this.site.baseUrl + path;
                }
                let title = content.content || content.description || "";
                contentHtml += `<embed src="${path}" poster="${thumbnail}" title="${title}"></embed>`;
            }
            else if (content.type === "IMAGE") {
                let path = content.path;
                if (path && path.startsWith("//")) {
                    path = "https:" + path;
                }
                else if (path && path.startsWith("/")) {
                    path = this.site.baseUrl + path;
                }
                let title = content.alt || "";
                contentHtml += `<img src="${path}" alt="${title}" />`;
            }
            else if (content.type === "ANNOTATION") {
                contentHtml += `<!--${this.safeDecodeURIComponent(content.content)}-->`;
            }
            else if (content.type === "YOUTUBE") {
                contentHtml += this.safeDecodeURIComponent(content.content);
            }
            else if (content.type.startsWith("BUTTON")) {
                let linkUrl = content.url;
                if (linkUrl && linkUrl.startsWith("/")) {
                    linkUrl = this.site.baseUrl + linkUrl;
                }
                else if (linkUrl && linkUrl.startsWith("//")) {
                    linkUrl = "https:" + linkUrl;
                }
                contentHtml += `<a href="${linkUrl}">${content.content}</a>`;
            }
            else if (content.url && content.url.length > 0) {
                contentHtml += `<a href="${content.url}">${this.safeDecodeURIComponent(content.content)}</a>`;
            }
            else {
                contentHtml += `${this.safeDecodeURIComponent(content.content)}`;
            }
            return contentHtml;
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                let htmlResponse = yield this.client.request({ url: url, method: "GET" });
                let jsonString = this.searchHtmlScriptElement(htmlResponse.body);
                try {
                    let jsonData = JSON.parse(jsonString);
                    let article = jsonData.props.pageProps.articleDetailData;
                    let contentArray = article.content;
                    let contentHtml = "";
                    contentArray.forEach((contentItem) => {
                        let contents = contentItem.contents;
                        contents.forEach((content) => {
                            let result = this.parseContent(content);
                            contentHtml += result;
                        });
                    });
                    let title = article.title;
                    let media = new ArticleMedia(id, title, `<html>${contentHtml}</html>`);
                    media.date = formatDateToYMD(article.publishedAt);
                    return media;
                }
                catch (err) {
                    console.log("Kakuyomu requestItemMedia parse json error:", err);
                }
                return new ArticleMedia("-1", "", "");
            });
        }
    }
    (function () {
        const famitsu = new Famitsu();
        famitsu.init();
    })();

    return Famitsu;

})();
