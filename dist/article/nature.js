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

    class Nature extends Rule {
        provideExtensionInfo() {
            let site = new Extension("nature-research", "Nature Research", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.nature.com";
            site.description = "Nature is a weekly international journal publishing the finest peer-reviewed research in all fields of science and technology.";
            site.thumbnail = "https://www.nature.com/static/images/favicons/nature/favicon.ico";
            site.lang = "en";
            site.categoryList = [
                new SiteUrl("All", ""),
                new SiteUrl("Analysis", "analysis"),
                new SiteUrl("Appointments Vacant", "appointments-vacant"),
                new SiteUrl("Article", "article"),
                new SiteUrl("Brief Communication", "brief-communication"),
                new SiteUrl("Brief Communications Arising", "brief-communications-arising"),
                new SiteUrl("British Association Supplement", "british-association-supplement"),
                new SiteUrl("British Diary", "british-diary"),
                new SiteUrl("Guide to Authors", "guide-to-authors"),
                new SiteUrl("International News", "international-news"),
                new SiteUrl("Letter", "letter"),
                new SiteUrl("Matters Arising", "matters-arising"),
                new SiteUrl("Millennium Essay", "millennium-essay"),
                new SiteUrl("New World", "new-world"),
                new SiteUrl("Nordic Science", "nordic-science"),
                new SiteUrl("Old World", "old-world"),
                new SiteUrl("Reports and Other Publications", "reports-and-other-publications"),
                new SiteUrl("Research Article", "research-article"),
                new SiteUrl("Scientific Correspondence", "scientific-correspondence"),
                new SiteUrl("Supplement to Nature", "supplement-to-nature"),
                new SiteUrl("University News", "university-news"),
            ];
            site.searchList = [
                new SiteUrl("Search By Relevance", "relevance"),
                new SiteUrl("Search By Date Desc", "date_desc"),
            ];
            return site;
        }
        parseHtmlDetails(articleNodes) {
            let items = [];
            articleNodes.each((_index, element) => {
                var _a;
                let ele = $(element);
                let link = ele.find("h3.c-card__title a").attr("href");
                if (link) {
                    let title = ele.find("h3.c-card__title a").text().trim();
                    let cover = ele.find("div.c-card__image img").attr("src");
                    let description = ele.find("p.c-card__summary").text().trim();
                    let date = ele.find("time").attr("datetime");
                    let idPattern = new RegExp('/articles/(.*?)$', 'i');
                    let id = (_a = idPattern.exec(link)) === null || _a === void 0 ? void 0 : _a[1];
                    let authors = ele.find("ul.app-author-list li").map((i, el) => $(el).text().trim()).get().join(", ");
                    let status = ele.find("span.u-color-open-access").text().trim();
                    let item = new ExtensionDetail(id, this.site.baseUrl + link, title);
                    item.thumbnail = cover;
                    item.description = description;
                    item.category = date;
                    item.author = authors;
                    item.status = status;
                    item.type = 1 /* MediaType.Article */;
                    items.push(item);
                }
            });
            return items;
        }
        // https://www.nature.com/nature/research-articles?searchType=journalSearch&sort=PubDate&page=4
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let baseUrl = "https://www.nature.com/nature/research-articles?searchType=journalSearch&sort=PubDate";
                if (url && url.length > 0) {
                    baseUrl = baseUrl + `&type=${url}`;
                }
                if (page > 1) {
                    baseUrl = baseUrl + `&page=${page}`;
                }
                const response = yield this.client.request({
                    url: baseUrl,
                    method: "GET",
                });
                let $nodes = $(response.body);
                let articleNodes = $nodes.find("section#new-article-list article.c-card");
                console.log("Found article nodes:", articleNodes.length);
                if (!articleNodes || articleNodes.length == 0) {
                    return new ExtensionList([], page ? page : 1, undefined);
                }
                let items = this.parseHtmlDetails(articleNodes);
                // Check if there is a next page
                let disableNext = true;
                const nextPageNode = $nodes.find("a.c-pagination__link");
                if (nextPageNode && nextPageNode.length > 0) {
                    disableNext = false;
                }
                return new ExtensionList(items, page, disableNext ? undefined : url);
            });
        }
        // https://www.nature.com/siteindex like: https://www.nature.com/aps/articles
        // override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        //     return new ExtensionList([], page ? page : 1, undefined);
        // }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let searchUrl = this.site.baseUrl + `/search?order=${url}&q=${encodeURIComponent(keyword)}&page=${page}`;
                const response = yield this.client.request({
                    url: searchUrl,
                    method: "GET",
                });
                let $nodes = $(response.body);
                let articleNodes = $nodes.find("section#search-article-list article.c-card");
                console.log("Found article nodes:", articleNodes.length);
                if (!articleNodes || articleNodes.length == 0) {
                    return new ExtensionList([], page ? page : 1, undefined);
                }
                let items = this.parseHtmlDetails(articleNodes);
                // Check if there is a next page
                let disableNext = true;
                const nextPageNode = $nodes.find("a.c-pagination__link");
                if (nextPageNode && nextPageNode.length > 0) {
                    disableNext = false;
                }
                return new ExtensionList(items, page, disableNext ? undefined : url);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield this.client.request({
                    url: url,
                    method: "GET",
                });
                const html = response.body;
                let $nodes = $(html);
                let articleNode = $nodes.find("main.c-article-main-column > article");
                let content = "";
                let pdfUrl = articleNode.find("div.c-pdf-download > a").attr("href");
                if (pdfUrl && pdfUrl.startsWith("/")) {
                    pdfUrl = this.site.baseUrl + pdfUrl;
                }
                content = `<embed src="${pdfUrl}" title="PDF Document" />`;
                let header = articleNode.find("div.c-article-header > header");
                let title = header.find("h1.c-article-title").text().trim();
                let authors = header.find("ul.c-article-author-list li > a").map((i, el) => $(el).text().trim()).get().join(", ");
                let date = header.find("time").text().trim();
                let articleContent = articleNode.find("div.c-article-body");
                // replace span with mathjax to math tag
                articleContent.find("span.mathjax-tex").each((i, el) => {
                    console.log("replace span with mathjax", el.textContent);
                    let mathContent = $(el).text();
                    $(el).replaceWith(`<math>${mathContent}</math>`);
                });
                let articleHtml = (articleContent.html() || "").replace(/href="(\/[^"]*)"/g, 'href="https://www.nature.com$1"');
                content = `<html>${content}\n${articleHtml}</html>`;
                let articleMedia = new ArticleMedia(id, title, content);
                articleMedia.author = authors;
                articleMedia.date = date;
                return articleMedia;
            });
        }
    }
    (function () {
        const nature = new Nature();
        nature.init();
    })();

    return Nature;

})();
