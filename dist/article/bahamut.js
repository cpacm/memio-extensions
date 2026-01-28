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

    // parse date to "YYYY,MM/DD" format
    // get current year
    function getCurrentYear() {
        return new Date().getFullYear();
    }
    // get current month
    function getCurrentMonth() {
        return new Date().getMonth() + 1; // Months are zero-based
    }

    class Bahamut extends Rule {
        provideExtensionInfo() {
            let site = new Extension("bahamut", "巴哈姆特電玩資訊站", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.gamer.com.tw";
            site.description = "巴哈姆特電玩資訊站為台灣最大遊戲網站，提供最新遊戲新聞、專題報導、電玩展資訊、遊戲攻略、玩家心得、電玩直播等豐富內容。";
            site.thumbnail = "https://gnn.gamer.com.tw/favicon.ico";
            site.lang = "zh-TW";
            site.categoryList = [
                { name: "GNN新聞", url: "k=2" },
                { name: "手機", url: "k=4" },
                { name: "PC", url: "k=1" },
                { name: "TV", url: "k=3" },
                { name: "動漫畫", url: "k=5" },
                { name: "新訊", url: "k=14" },
                { name: "宅物", url: "k=15" },
                { name: "活動", url: "k=16" }
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "哈啦区(bsn)", "bsn");
            site.useGuide = `## 如何获取频道ID
1. 访问巴哈姆特电玩资讯站的哈啦区页面：[https://forum.gamer.com.tw/](https://forum.gamer.com.tw/)
2. 在页面上找到您感兴趣的频道（例如：电玩综合讨论区、主机综合讨论区等）。
3. 点击该频道进入频道页面。
4. 查看浏览器地址栏中的URL，找到类似 **B.php?bsn=XX** 的部分，其中 **XX** 就是该频道的ID。
5. 将该ID用于订阅相应的频道内容。
`;
            return site;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                // https://gnn.gamer.com.tw/index.php?yy=2025&mm=12&k=4
                let year = getCurrentYear();
                let month = getCurrentMonth();
                while (month + 1 - page <= 0) {
                    year -= 1;
                    month += 12;
                }
                month = month + 1 - page;
                let api = `https://gnn.gamer.com.tw/index.php?yy=${year}&mm=${month}&${url}`;
                let htmlResponse = yield this.client.request({ url: api, method: "GET" });
                let $nodes = $(htmlResponse.body);
                let details = [];
                let items = $nodes.find("div.BH-lbox > div[class^='GN-lbox']");
                items.each((index, element) => {
                    let ele = $(element);
                    let titleElement = ele.find("a").first();
                    let thumbnail = titleElement.find("img").attr("src") || "";
                    let link = titleElement.attr("href") || "";
                    if (link && link.startsWith("//")) {
                        link = "https:" + link;
                    }
                    // gnn.gamer.com.tw/detail.php?sn=297654 -> 297654
                    let idMatch = link.match(/sn=(\d+)/);
                    let id = idMatch ? idMatch[1] : "";
                    let title = ele.find("h1 > a").text().trim();
                    if (title === "") {
                        title = ele.find("a").first().text().trim();
                    }
                    let category = ele.find("div.platform-tag_list").text().trim();
                    let descP = ele.find("p").last();
                    descP.find("a").remove();
                    let desc = descP.text().trim();
                    let detail = new ExtensionDetail(id, link, title);
                    detail.thumbnail = thumbnail;
                    detail.description = desc;
                    detail.category = category;
                    details.push(detail);
                });
                let hasMore = page < 48;
                return new ExtensionList(details, page, hasMore ? url : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                //https://forum.gamer.com.tw/B.php?page=1&bsn=74934
                let api = `https://forum.gamer.com.tw/B.php?page=${page}&bsn=${key}`;
                let htmlResponse = yield this.client.request({ url: api, method: "GET" });
                let $nodes = $(htmlResponse.body);
                let details = [];
                let items = $nodes.find("table.b-list tr.b-list-item");
                items.each((index, element) => {
                    let ele = $(element);
                    let category = ele.find("td.b-list__summary p.b-list__summary__sort a").text().trim();
                    let title = ele.find("div.b-list__tile").find("a,p").text().trim();
                    let link = ele.find("div.b-list__tile").find("a,p").attr("href") || "";
                    // C.php?bsn=74934&snA=5698
                    let idMatch = link.match(/snA=(\d+)/);
                    let id = idMatch ? idMatch[1] : "";
                    link = `https://forum.gamer.com.tw/${link}`;
                    let thumbnail = ele.find("div.b-list__img").attr("data-thumbnail") || "";
                    let description = ele.find("td.b-list__main p.b-list__brief").text().trim();
                    let date = ele.find("td.b-list__time p.b-list__time__edittime a").text().trim();
                    let detail = new ExtensionDetail(id, link, title);
                    detail.author = date;
                    detail.thumbnail = thumbnail;
                    detail.description = description;
                    detail.category = category;
                    details.push(detail);
                });
                let pagnationMax = $nodes.find("div#BH-pagebtn p.BH-pagebtnA a").last().text().trim();
                let hasMore = page < parseInt(pagnationMax);
                let nextPage = `https://forum.gamer.com.tw/B.php?page=${page + 1}&bsn=${key}`;
                return new ExtensionList(details, page, hasMore ? nextPage : undefined);
            });
        }
        requestArtworkMedia(id, nodes) {
            return __awaiter(this, void 0, void 0, function* () {
                let title = nodes.find("div.article-title").text().trim();
                let author = nodes.find("div.article-intro a.caption-text").text().trim();
                let date = nodes.find("div.article-intro span:eq(1)").text().trim();
                let content = nodes.find("div#article_content");
                let media = new ArticleMedia(id, title, `<html>` + (content.html() || "") + `</html>`);
                media.author = author;
                media.date = date;
                return media;
            });
        }
        requestForumMedia(id, nodes) {
            return __awaiter(this, void 0, void 0, function* () {
                let sections = nodes.find("section.c-section div.c-post");
                let firstSection = sections.first();
                let title = firstSection.find("div.c-post__header h1.c-post__header__title ").text().trim();
                let author = firstSection.find("div.c-post__header div.c-post__header__author a.username").text().trim();
                let date = firstSection.find("div.c-post__header div.c-post__header__info a.edittime").text().trim();
                let content = firstSection.find("div.c-post__body article div.c-article__content");
                let contentHtml = `<p>` + content.html() + "</p><br/>";
                sections.each((index, element) => {
                    if (index === 0) {
                        return; // skip first
                    }
                    let floor = `${index + 1}樓`;
                    let ele = $(element);
                    let eleAuthor = ele.find("div.c-post__header div.c-post__header__author a.username").text().trim();
                    let eleDate = ele.find("div.c-post__header div.c-post__header__info a.edittime").text().trim();
                    let eleContent = ele.find("div.c-post__body article div.c-article__content");
                    contentHtml += `<hr><em>${floor}</em><strong>${eleAuthor}</strong><br/><em>${eleDate}</em><br/><p>` + (eleContent.html() || "") + `</p><br/>`;
                });
                let media = new ArticleMedia(id, title, `<html>` + contentHtml + `</html>`);
                media.author = author;
                media.date = date;
                return media;
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                let htmlResponse = yield this.client.request({ url: url, method: "GET" });
                let $nodes = $(htmlResponse.body);
                if ($nodes.find("div#article_content").length > 0) {
                    return this.requestArtworkMedia(id, $nodes);
                }
                else if (url.indexOf("forum.gamer.com.tw") >= 0) {
                    return this.requestForumMedia(id, $nodes);
                }
                let contentNode = $nodes.find("div.BH-lbox");
                let title = contentNode.find("h1").text().trim();
                let spanText = contentNode.find("span.GN-lbox3C").text().trim();
                // （GNN 記者 Jisho 報導） 2025-12-18 12:14:31 -> GNN 記者 Jisho 報導
                let authorMatch = spanText.match(/（(.*)）/);
                let author = authorMatch ? authorMatch[1] : "";
                let date = spanText.replace(/（.*）/, "").trim();
                let content = contentNode.find("div.GN-lbox3B");
                content.find("script").remove();
                let imgUls = content.find("ul.bh-grids-img");
                imgUls.each((index, element) => {
                    let ignoreUl = $(element);
                    let img = ignoreUl.find("img");
                    img.insertAfter(ignoreUl);
                    ignoreUl.remove();
                });
                content.find("div.slider-nav-block").remove();
                let contentHtml = `<html>` + (content.html() || "") + `</html>`;
                let media = new ArticleMedia(id, title, contentHtml);
                media.author = author;
                media.date = date;
                return media;
            });
        }
    }
    (function () {
        const bahamut = new Bahamut();
        bahamut.init();
    })();

    return Bahamut;

})();
