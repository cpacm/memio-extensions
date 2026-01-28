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
    class ItemVolume {
        constructor(volumeName, chapters) {
            this.name = volumeName;
            this.chapters = chapters;
        }
    }
    class ItemChapter {
        constructor(id, url, name) {
            this.url = url;
            this.id = id;
            this.name = name;
        }
    }
    class ExtensionMedia {
        constructor(mediaType, id, title) {
            this.mediaType = mediaType;
            this.id = id;
            this.title = title;
        }
    }
    class NovelMedia extends ExtensionMedia {
        constructor(id, title, content, refer) {
            super(5 /* MediaType.Novel */, id, title);
            this.content = content;
            this.refer = refer;
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

    class Syosetu extends Rule {
        constructor() {
            super(...arguments);
            this.mediaMap = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("syosetu", "小説家になろう", 5 /* MediaType.Novel */);
            site.baseUrl = "https://yomou.syosetu.com";
            site.thumbnail = "https://static.syosetu.com/sub/yomouview/images/yomou.ico?psawph";
            site.description = "小説家になろうは、日本最大級のオンライン小説投稿サイトです。多様なジャンルの小説が無料で読めます。";
            site.lang = "ja";
            site.categoryList = [
                { name: "注目度ランキング", url: "/rank/attnlist/type/total/?p={page}" },
                { name: "[日間] 総合ランキング", url: "/rank/list/type/daily_total/?p={page}" },
                { name: "[週間] 総合ランキング", url: "/rank/list/type/weekly_total/?p={page}" },
                { name: "[月間] 総合ランキング", url: "/rank/list/type/monthly_total/?p={page}" },
                { name: "[四半期] 総合ランキング", url: "/rank/list/type/quarter_total/?p={page}" },
                { name: "[年間] 総合ランキング", url: "/rank/list/type/yearly_total/?p={page}" },
                { name: "[累計] 総合ランキング", url: "/rank/list/type/total_total/?p={page}" },
                { name: "[週間] 異世界〔恋愛〕", url: "/rank/genrelist/type/weekly_101/?p={page}" },
                { name: "[週間] 現実世界〔恋愛〕", url: "/rank/genrelist/type/weekly_102/?p={page}" },
                { name: "[週間] ハイファンタジー〔ファンタジー〕", url: "/rank/genrelist/type/weekly_201/?p={page}" },
                { name: "[週間] ローファンタジー〔ファンタジー〕", url: "/rank/genrelist/type/weekly_202/?p={page}" },
                { name: "[週間] 純文学〔文芸〕", url: "/rank/genrelist/type/weekly_301/?p={page}" },
                { name: "[週間] ヒューマンドラマ〔文芸〕", url: "/rank/genrelist/type/weekly_302/?p={page}" },
                { name: "[週間] 歴史〔文芸〕", url: "/rank/genrelist/type/weekly_303/?p={page}" },
                { name: "[週間] 推理〔文芸〕", url: "/rank/genrelist/type/weekly_304/?p={page}" },
                { name: "[週間] ホラー〔文芸〕", url: "/rank/genrelist/type/weekly_305/?p={page}" },
                { name: "[週間] アクション〔文芸〕", url: "/rank/genrelist/type/weekly_306/?p={page}" },
                { name: "[週間] コメディー〔文芸〕", url: "/rank/genrelist/type/weekly_307/?p={page}" },
                { name: "[週間] VRゲーム〔SF〕", url: "/rank/genrelist/type/weekly_401/?p={page}" },
                { name: "[週間] 宇宙〔SF〕", url: "/rank/genrelist/type/weekly_402/?p={page}" },
                { name: "[週間] 空想科学〔SF〕", url: "/rank/genrelist/type/weekly_403/?p={page}" },
                { name: "[週間] パニック〔SF〕", url: "/rank/genrelist/type/weekly_404/?p={page}" },
                { name: "[週間] 童話〔その他〕", url: "/rank/genrelist/type/weekly_9901/?p={page}" },
                { name: "[週間] 詩〔その他〕", url: "/rank/genrelist/type/weekly_9902/?p={page}" },
                { name: "[週間] エッセイ〔その他〕", url: "/rank/genrelist/type/weekly_9903/?p={page}" },
                { name: "[週間] その他〔その他〕", url: "/rank/genrelist/type/weekly_9999/?p={page}" },
                { name: "[週間] 異世界転生/転移〔恋愛〕", url: "/rank/isekailist/type/weekly_1/?p={page}" },
                { name: "[週間] 異世界転生/転移〔ファンタジー〕", url: "/rank/isekailist/type/weekly_2/?p={page}" },
                { name: "[週間] 異世界転生/転移〔文芸・SF・その他〕", url: "/rank/isekailist/type/weekly_o/?p={page}" },
                { name: "[日間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/daily_total/" },
                { name: "[週間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/weekly_total/" },
                { name: "[月間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/monthly_total/" },
                { name: "[四半期] ノクターン", url: "https://noc.syosetu.com/rank/list/type/quarter_total/" },
                { name: "[年間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/yearly_total/" },
                { name: "[日間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/daily_total/" },
                { name: "[週間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/weekly_total/" },
                { name: "[月間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/monthly_total/" },
                { name: "[四半期] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/quarter_total/" },
                { name: "[年間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/yearly_total/" },
                { name: "[日間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/daily_total/" },
                { name: "[週間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/weekly_total/" },
                { name: "[月間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/monthly_total/" },
                { name: "[四半期] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/quarter_total/" },
                { name: "[年間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/yearly_total/" },
            ];
            site.searchList = [
                { name: "小説検索", url: "/search.php?search_type=novel&word={keyword}&order_former=search&order=new&notnizi=1&p={page}" },
            ];
            return site;
        }
        requestR18ItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: url, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }]
                }));
                let html = response.body;
                let $nodes = $(html);
                let rankH = $nodes.find("div.ranking_inbox div.rank_h");
                let rankTable = $nodes.find("div.ranking_inbox table.rank_table");
                let items = [];
                rankH.each((index, element) => {
                    let ele = $(element);
                    let eleTable = $(rankTable[index]);
                    let title = ele.find("a").text().trim();
                    let link = ele.find("a").attr("href") || "";
                    // https://novel18.syosetu.com/n6666lm/ -> n6666lm
                    let id = link.split("/").filter(part => part.length > 0).pop() || "";
                    let author = ele.find("span").last().text().trim();
                    let description = eleTable.find("td.ex").text().trim();
                    let categoryNode = eleTable.find("td.left");
                    categoryNode.find("span").remove();
                    let category = categoryNode.text().trim();
                    let status = eleTable.find("td.s").text().trim();
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = author;
                    detail.description = description;
                    detail.category = category;
                    detail.hasChapter = true;
                    detail.status = status;
                    detail.type = 5 /* MediaType.Novel */;
                    items.push(detail);
                });
                return new ExtensionList(items, page, undefined);
            });
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (url.startsWith("https://")) {
                    return this.requestR18ItemList(url, page);
                }
                let api = this.site.baseUrl + url.replace("{page}", page.toString());
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "GET", }));
                let html = response.body;
                let $nodes = $(html);
                let ranklistNodes = $nodes.find("div.p-ranklist-item__column");
                let items = [];
                ranklistNodes.each((index, element) => {
                    let itemNode = $(element);
                    let title = itemNode.find("div.p-ranklist-item__title a").text().trim();
                    let link = itemNode.find("div.p-ranklist-item__title a").attr("href") || "";
                    // https://ncode.syosetu.com/n8065lj/ -> n8065lj
                    let id = link.split("/").filter(part => part.length > 0).pop() || "";
                    let author = itemNode.find("div.p-ranklist-item__author a").text().trim();
                    let points = itemNode.find("div.p-ranklist-item__points").text().trim();
                    let infomation = itemNode.find("div.p-ranklist-item__infomation span").text().trim();
                    let description = itemNode.find("div.p-ranklist-item__synopsis").text().trim();
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = author;
                    detail.description = description;
                    detail.category = infomation;
                    detail.hasChapter = true;
                    detail.type = 5 /* MediaType.Novel */;
                    detail.status = points;
                    items.push(detail);
                });
                let maxPage = 2;
                if (url.indexOf("/rank/list/type") >= 0) {
                    maxPage = 6;
                }
                let nextPageUrl = page < maxPage ? url.replace("{page}", (page + 1).toString()) : undefined;
                return new ExtensionList(items, page, nextPageUrl);
            });
        }
        parseChapters(chapterNodes) {
            return __awaiter(this, void 0, void 0, function* () {
                let volumes = [];
                let chapters = [];
                chapterNodes.each((vIndex, vElement) => {
                    let ele = $(vElement);
                    if (ele.hasClass("p-eplist__chapter-title")) {
                        // is new volume
                        chapters = [];
                        let newVolme = new ItemVolume(ele.text().trim(), chapters);
                        volumes.push(newVolme);
                        return;
                    }
                    let chapterTitle = ele.find("a.p-eplist__subtitle").text().trim();
                    let chapterUrl = ele.find("a.p-eplist__subtitle").attr("href") || "";
                    // /n8281jr/2/ -> 2
                    let chapterId = chapterUrl.split("/").filter(part => part.length > 0).pop() || "";
                    let newChapter = new ItemChapter(chapterId, "https://ncode.syosetu.com" + chapterUrl, chapterTitle);
                    chapters.push(newChapter);
                    if (volumes.length === 0) {
                        // no volume info, create default volume
                        let defaultVolume = new ItemVolume("章节列表", chapters);
                        volumes.push(defaultVolume);
                    }
                });
                return volumes;
            });
        }
        requestItemChapter(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] }));
                let html = response.body;
                let $nodes = $(html);
                let article = $nodes.find("article.p-novel");
                let title = article.find("h1.p-novel__title").text().trim();
                let author = article.find("div.p-novel__author a").text().trim();
                let description = article.find("div.p-novel__summary").text().trim();
                let detail = new ExtensionDetail(id, url, title);
                detail.author = author;
                detail.description = description;
                detail.type = 5 /* MediaType.Novel */;
                detail.hasChapter = true;
                let chapters = article.find("div.p-eplist > div");
                if (chapters === undefined || chapters.length === 0) {
                    let content = article.find("div.p-novel__body").html() || "";
                    detail.volumes = [new ItemVolume("短編", [new ItemChapter(id, url, title)])];
                    let novelMedia = new NovelMedia(id, title, content);
                    this.mediaMap.set(id, novelMedia);
                    return detail;
                }
                let curPage = 1;
                let pager = article.find("div.c-pager__pager");
                let lastPageNode = pager.find("a.c-pager__item").last();
                let lastPageHref = lastPageNode.attr("href") || "";
                // /n8281jr/?p=1 -> 1
                let maxPage = 1;
                let match = lastPageHref.match(/\?p=(\d+)/);
                if (match && match.length > 1) {
                    maxPage = parseInt(match[1]);
                }
                let volumes = yield this.parseChapters(chapters);
                while (curPage < maxPage) {
                    let pageUrl = url + "?p=" + (curPage + 1);
                    let response = yield ((_b = this.client) === null || _b === void 0 ? void 0 : _b.request({ url: pageUrl, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] }));
                    let html = response.body;
                    let $nodes = $(html);
                    let article = $nodes.find("article.p-novel");
                    let chapters = article.find("div.p-eplist > div");
                    if (chapters === undefined || chapters.length === 0) {
                        break;
                    }
                    let moreVolumes = yield this.parseChapters(chapters);
                    // merge volumes
                    for (let vol of moreVolumes) {
                        if (volumes.length > 0 && volumes[volumes.length - 1].name === vol.name) {
                            // merge chapters
                            volumes[volumes.length - 1].chapters.push(...vol.chapters);
                        }
                        else {
                            volumes.push(vol);
                        }
                    }
                }
                detail.volumes = volumes;
                return detail;
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let searchApi = this.site.baseUrl + url.replace("{keyword}", encodeURIComponent(keyword)).replace("{page}", page.toString());
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: searchApi, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] }));
                let html = response.body;
                let $nodes = $(html);
                let searchlistNodes = $nodes.find("div#main_search div.searchkekka_box");
                let items = [];
                searchlistNodes.each((index, element) => {
                    let itemNode = $(element);
                    let title = itemNode.find("div.novel_h a").text().trim();
                    let link = itemNode.find("div.novel_h a").attr("href") || "";
                    // https://ncode.syosetu.com/n8065lj/ -> n8065lj
                    let id = link.split("/").filter(part => part.length > 0).pop() || "";
                    let author = itemNode.find("a:eq(1)").text().trim();
                    let description = itemNode.find("table div.ex").text().trim();
                    let categoryNode = itemNode.find("table td.left");
                    let category = categoryNode.text().trim();
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = author;
                    detail.description = description;
                    detail.category = category;
                    detail.hasChapter = true;
                    detail.type = 5 /* MediaType.Novel */;
                    items.push(detail);
                });
                let hasMore = items.length >= 20;
                let nextPageUrl = hasMore ? url.replace("{keyword}", encodeURIComponent(keyword)).replace("{page}", (page + 1).toString()) : undefined;
                return new ExtensionList(items, page, nextPageUrl);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let novelMedia = this.mediaMap.get(id);
                if (novelMedia !== undefined) {
                    return novelMedia;
                }
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] }));
                let html = response.body;
                let $nodes = $(html);
                let article = $nodes.find("article.p-novel");
                let title = article.find("h1.p-novel__title").text().trim();
                let content = article.find("div.p-novel__body").html() || "";
                let media = new NovelMedia(id, title, content);
                return media;
            });
        }
    }
    (function () {
        const rule = new Syosetu();
        rule.init();
    })();

    return Syosetu;

})();
