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

    // parse date to "YYYY,MM/DD" format
    function formatDateToYMD(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // Months are zero-based
        const day = date.getDate();
        return `${year},${month}/${day}`;
    }

    class Kakuyomu extends Rule {
        provideExtensionInfo() {
            let site = new Extension("kakuyomu", "カクヨム", 5 /* MediaType.Novel */);
            site.baseUrl = "https://kakuyomu.jp";
            site.thumbnail = "https://cdn-static.kakuyomu.jp/images/brand/favicons/android-192.png?RxPTbcii9yzz";
            site.description = "様々なWeb小説を無料で「書ける、読める、伝えられる」、KADOKAWA × はてな によるWeb小説サイトです。ジャンルはファンタジー、SF、恋愛、ホラー、ミステリーなどがあり、二次創作作品も楽し…";
            site.lang = "ja";
            site.categoryList = [
                { name: "更新順", url: "order=last_episode_published_at" },
                { name: "週間ランキング", url: "order=weekly_ranking" },
                { name: "累計ランキング", url: "order=popular" },
                { name: "異世界ファンタジー", url: "order=last_episode_published_at&genre_name=fantasy" },
                { name: "現代ファンタジー", url: "order=last_episode_published_at&genre_name=action" },
                { name: "SF", url: "order=last_episode_published_at&genre_name=sf" },
                { name: "恋愛", url: "order=last_episode_published_at&genre_name=love_story" },
                { name: "ラブコメ", url: "order=last_episode_published_at&genre_name=romance" },
                { name: "現代ドラマ", url: "order=last_episode_published_at&genre_name=drama" },
                { name: "ホラー", url: "order=last_episode_published_at&genre_name=horror" },
                { name: "ミステリー", url: "order=last_episode_published_at&genre_name=mystery" },
                { name: "エッセイ・ノンフィクション", url: "order=last_episode_published_at&genre_name=nonfiction" },
                { name: "歴史・時代・伝奇", url: "order=last_episode_published_at&genre_name=history" },
                { name: "創作論・評論", url: "order=last_episode_published_at&genre_name=criticism" },
                { name: "詩・童話・その他", url: "order=last_episode_published_at&genre_name=others" },
                { name: "魔法のiらんど", url: "order=last_episode_published_at&genre_name=maho" },
                { name: "二次創作", url: "order=last_episode_published_at&genre_name=fan_fiction" },
                { name: "暴力描写有り", url: "order=weekly_ranking&inclusion_conditions=violent" },
                { name: "残酷描写有り", url: "order=last_episode_published_at&inclusion_conditions=cruel" },
                { name: "性描写有り", url: "order=last_episode_published_at&inclusion_conditions=sexual" }
            ];
            site.searchList = [
                { name: "小説", url: "https://kakuyomu.jp/search?order=last_episode_published_at&q={keyword}" }
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
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let searchApi = url.replace("{keyword}", encodeURIComponent(keyword)) + `&page=${page}`;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: searchApi, method: "GET" }));
                let html = response.body;
                let jsonString = this.searchHtmlScriptElement(html);
                try {
                    let listData = JSON.parse(jsonString).props.pageProps.__APOLLO_STATE__;
                    let items = [];
                    for (let key in listData) {
                        if (key.startsWith("Work:")) {
                            let item = listData[key];
                            let id = item.id;
                            let link = `${this.site.baseUrl}/works/${id}`;
                            let title = item.title;
                            let description = item.introduction;
                            let date = item.lastEpisodePublishedAt;
                            let dateTxt = formatDateToYMD(date);
                            let episodeCount = item.publicEpisodeCount || 0;
                            let category = (_b = item.tagLabels) === null || _b === void 0 ? void 0 : _b.join(", ");
                            let genre = item.genre;
                            // let authorName = "";
                            // let author = item.author.__ref
                            // if( author && listData[author] ){
                            //     authorName = listData[author].activityName;
                            // }
                            let detail = new ExtensionDetail(id, link, title);
                            detail.category = category || genre || "";
                            detail.status = episodeCount + "話";
                            detail.description = description;
                            detail.author = dateTxt;
                            detail.hasChapter = true;
                            detail.type = 5 /* MediaType.Novel */;
                            items.push(detail);
                        }
                    }
                    let hasMore = items.length >= 20;
                    let nextApi = this.site.baseUrl + "/search?" + url + `&page=${page + 1}`;
                    return new ExtensionList(items, page, hasMore ? nextApi : undefined);
                }
                catch (err) {
                    console.log("Kakuyomu requestItemList parse json error:", err);
                }
                return new ExtensionList([], page, undefined);
            });
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let api = this.site.baseUrl + "/search?" + url + `&page=${page}`;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "GET" }));
                let html = response.body;
                let jsonString = this.searchHtmlScriptElement(html);
                try {
                    let listData = JSON.parse(jsonString).props.pageProps.__APOLLO_STATE__;
                    let items = [];
                    for (let key in listData) {
                        if (key.startsWith("Work:")) {
                            let item = listData[key];
                            let id = item.id;
                            let link = `${this.site.baseUrl}/works/${id}`;
                            let title = item.title;
                            let description = item.introduction;
                            let date = item.lastEpisodePublishedAt;
                            let dateTxt = formatDateToYMD(date);
                            let episodeCount = item.publicEpisodeCount || 0;
                            let category = (_b = item.tagLabels) === null || _b === void 0 ? void 0 : _b.join(", ");
                            let genre = item.genre;
                            let authorName = "";
                            let author = item.author.__ref;
                            if (author && listData[author]) {
                                authorName = listData[author].activityName;
                            }
                            let detail = new ExtensionDetail(id, link, title);
                            detail.category = category || genre || "";
                            detail.status = episodeCount + "話";
                            detail.description = description;
                            detail.author = authorName;
                            detail.hasChapter = true;
                            detail.type = 5 /* MediaType.Novel */;
                            items.push(detail);
                        }
                    }
                    let hasMore = items.length >= 20;
                    let nextApi = this.site.baseUrl + "/search?" + url + `&page=${page + 1}`;
                    return new ExtensionList(items, page, hasMore ? nextApi : undefined);
                }
                catch (err) {
                    console.log("Kakuyomu requestItemList parse json error:", err);
                }
                return new ExtensionList([], page, undefined);
            });
        }
        requestItemChapter(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET" }));
                let html = response.body;
                let jsonString = this.searchHtmlScriptElement(html);
                try {
                    let jsonData = JSON.parse(jsonString).props.pageProps.__APOLLO_STATE__;
                    let workData = jsonData["Work:" + id];
                    let title = workData.title;
                    let description = workData.introduction;
                    let authorName = "";
                    let authorRef = workData.author.__ref;
                    if (authorRef && jsonData[authorRef]) {
                        authorName = jsonData[authorRef].activityName;
                    }
                    let thumbnail = workData.adminCoverImageUrl || "";
                    let date = workData.lastEpisodePublishedAt;
                    let dateTxt = formatDateToYMD(date);
                    let category = (_b = workData.tagLabels) === null || _b === void 0 ? void 0 : _b.join(", ");
                    let tableOfContents = workData.tableOfContents || [];
                    let volumes = [];
                    tableOfContents.forEach((volume) => {
                        let volumeRef = volume.__ref;
                        let volumeData = jsonData[volumeRef];
                        let volumeTitle = "目次";
                        if (volumeData.chapter && volumeData.chapter.__ref) {
                            let volumeDataRef = volumeData.chapter.__ref;
                            volumeTitle = jsonData[volumeDataRef].title;
                        }
                        let chapterUnions = volumeData.episodeUnions || [];
                        let chapters = [];
                        chapterUnions.forEach((ep) => {
                            let epRef = ep.__ref;
                            let epData = jsonData[epRef];
                            let epId = epData.id;
                            let epTitle = epData.title;
                            //https://kakuyomu.jp/works/16817139555923024504/episodes/16817139555954620237
                            let epLink = `${this.site.baseUrl}/works/${id}/episodes/${epId}`;
                            let chapter = new ItemChapter(epId, epLink, epTitle);
                            chapters.push(chapter);
                        });
                        let volumeItem = new ItemVolume(volumeTitle, chapters);
                        volumes.push(volumeItem);
                    });
                    let novelDetail = new ExtensionDetail(id, url, title);
                    novelDetail.author = authorName;
                    novelDetail.description = description;
                    novelDetail.thumbnail = thumbnail;
                    novelDetail.category = category || "";
                    novelDetail.type = 5 /* MediaType.Novel */;
                    novelDetail.status = dateTxt;
                    novelDetail.hasChapter = true;
                    novelDetail.volumes = volumes;
                    return novelDetail;
                }
                catch (err) {
                    console.log("Kakuyomu requestItemChapter parse json error:", err);
                }
                return new ExtensionDetail("-1", url, "Parse Error");
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let response = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET" }));
                let html = response.body;
                let $nodes = $(html);
                let contentNode = $nodes.find("div#contentMain");
                let header = contentNode.find("header#contentMain-header");
                let title = header.find("p.widget-episodeTitle").text().trim();
                header.remove();
                let contentBody = contentNode.find("div.widget-episodeBody");
                contentBody.find("ruby").replaceWith("div"); // Remove ruby tags, keep text only
                contentBody.find("rt,rb,rp").replaceWith("span"); // Remove ruby related tags
                let content = `<html>${contentBody.html() || ""}</html>`;
                let novelMedia = new NovelMedia(id, title, content);
                return novelMedia;
            });
        }
    }
    (function () {
        const rule = new Kakuyomu();
        rule.init();
    })();

    return Kakuyomu;

})();
