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

    class Yuque extends Rule {
        constructor() {
            super(...arguments);
            this.userIdMap = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("yuque", "语雀", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.yuque.com";
            site.description = "语雀是面向个人和团队的知识创作与分享平台，帮助你更高效地沉淀和传递知识。";
            site.thumbnail = "https://gw.alipayobjects.com/zos/rmsportal/UTjFYEzMSYVwzxIGVhMu.png";
            site.lang = "zh";
            site.categoryList = [];
            site.channel = new Channel(0 /* ChannelType.List */, "user/group", "slug");
            site.useGuide = "在语雀中，用户可以通过设置用户名（如 https://www.yuque.com/wikidesign）或团队名访问其主页，从而浏览其公开的文档和知识库。要使用本扩展，请输入语雀用户或团队的名称作为频道标识符。例如，输入 'wikidesign' 以访问该用户的公开内容。";
            return site;
        }
        fecthJsonFromHtml(html) {
            return __awaiter(this, void 0, void 0, function* () {
                // search window.appData = JSON.parse(decodeURIComponent('...'));
                //console.log(html);
                let regex = /window\.appData = JSON\.parse\(decodeURIComponent\("(.+?)"\)\);/;
                let match = html.match(regex);
                if (match && match[1]) {
                    let jsonString = decodeURIComponent(match[1]);
                    console.log("Fetched appData JSON:", jsonString);
                    return jsonString;
                }
                return "";
            });
        }
        fetchGroupDatabase(groupId) {
            return __awaiter(this, void 0, void 0, function* () {
                // https://www.yuque.com/api/groups/594848/bookstacks
                let databaseUrl = `https://www.yuque.com/api/groups/${groupId}/bookstacks`;
                let dbResponse = yield this.client.request({
                    url: databaseUrl,
                    method: "GET",
                    contentType: "application/json",
                });
                let databaseJson = dbResponse.body;
                let dbData = JSON.parse(databaseJson);
                let categorys = dbData === null || dbData === void 0 ? void 0 : dbData.data;
                let items = [];
                categorys.forEach((category) => {
                    let books = category.books;
                    let categoryName = category.name || "BOOKS";
                    books.forEach((book) => {
                        var _a;
                        let id = book.id;
                        //https://www.yuque.com/api/docs?book_id=42469873
                        let url = `https://www.yuque.com/api/docs?book_id=${id}`;
                        let title = book.name;
                        let thumbnail = book.cover;
                        let date = book.updated_at;
                        let dateTxt = formatDateToYMD(date);
                        let detail = new ExtensionDetail(id, url, title);
                        detail.description = book.description;
                        detail.author = (_a = book.user) === null || _a === void 0 ? void 0 : _a.name;
                        detail.thumbnail = thumbnail;
                        detail.status = dateTxt;
                        detail.category = categoryName;
                        detail.type = 1 /* MediaType.Article */;
                        detail.hasChapter = true;
                        this.userIdMap.set(`book_${id}`, JSON.stringify(detail));
                        items.push(detail);
                    });
                });
                return items;
            });
        }
        fetchUserDatabase(userId, username) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                //https://www.yuque.com/api/groups/84141/homepage_public?scene=1
                let key = `user_database_${userId}`;
                let databaseString = this.userIdMap.get(key);
                if (!databaseString) {
                    let homepage = `https://www.yuque.com/api/groups/${userId}/homepage_public?scene=1`;
                    let response = yield this.client.request({
                        url: homepage,
                        method: "GET",
                        contentType: "application/json",
                    });
                    let data = JSON.parse(response.body);
                    if (!data || !data.data || !data.data[0].placements) {
                        return [];
                    }
                    let placements = (_c = (_b = (_a = data.data[0]) === null || _a === void 0 ? void 0 : _a.placements[0]) === null || _b === void 0 ? void 0 : _b.blocks) !== null && _c !== void 0 ? _c : undefined;
                    if (!placements) {
                        return [];
                    }
                    let databaseId = "";
                    // find "type": "publicPageBookStack",
                    for (let placement of placements) {
                        if (placement.type === "publicPageBookStack") {
                            databaseId = placement.id;
                            break;
                        }
                    }
                    if (databaseId === "") {
                        return [];
                    }
                    // https://www.yuque.com/api/book_stack_maps?id=20861136557
                    let databaseUrl = `https://www.yuque.com/api/book_stack_maps?id=${databaseId}`;
                    let dbResponse = yield this.client.request({
                        url: databaseUrl,
                        method: "GET",
                        contentType: "application/json",
                    });
                    let databaseJson = dbResponse.body;
                    databaseString = databaseJson;
                    this.userIdMap.set(key, databaseJson);
                }
                let dbData = JSON.parse(databaseString);
                let books = dbData === null || dbData === void 0 ? void 0 : dbData.data;
                let items = [];
                books.forEach((book) => {
                    let id = book.id;
                    //https://www.yuque.com/api/docs?book_id=42469873
                    let url = `https://www.yuque.com/api/docs?book_id=${id}`;
                    let title = book.name;
                    let thumbnail = book.cover;
                    let date = book.updated_at;
                    let dateTxt = formatDateToYMD(date);
                    let detail = new ExtensionDetail(id, url, title);
                    detail.description = book.description;
                    detail.author = username;
                    detail.thumbnail = thumbnail;
                    detail.status = dateTxt;
                    detail.category = "BOOK";
                    detail.type = 1 /* MediaType.Article */;
                    detail.hasChapter = true;
                    this.userIdMap.set(`book_${id}`, JSON.stringify(detail));
                    items.push(detail);
                });
                return items;
            });
        }
        fetchUserArticles(username, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let userId = this.userIdMap.get(username);
                let isGroupId = false;
                if (!userId) {
                    // https://www.yuque.com/wikidesign
                    let htmlResponse = yield this.client.request({
                        url: `https://www.yuque.com/${username}`,
                        method: "GET",
                    });
                    let appDataJson = yield this.fecthJsonFromHtml(htmlResponse.body);
                    let appData = JSON.parse(appDataJson);
                    let uid = (_a = appData === null || appData === void 0 ? void 0 : appData.user) === null || _a === void 0 ? void 0 : _a.id;
                    let groupId = (_b = appData === null || appData === void 0 ? void 0 : appData.group) === null || _b === void 0 ? void 0 : _b.id;
                    if (!uid && !groupId) {
                        return new ExtensionList([], page, undefined);
                    }
                    if (uid) {
                        isGroupId = false;
                        userId = uid;
                        this.userIdMap.set(username, uid);
                    }
                    else if (groupId) {
                        isGroupId = true;
                        userId = groupId;
                        this.userIdMap.set(username, groupId);
                    }
                }
                if (userId === undefined) {
                    return new ExtensionList([], page, undefined);
                }
                let items = [];
                if (isGroupId) {
                    let databaseDetails = yield this.fetchGroupDatabase(userId);
                    items.push(...databaseDetails);
                    return new ExtensionList(items, page, undefined);
                }
                if (page == 1) {
                    let databaseDetails = yield this.fetchUserDatabase(userId, username);
                    items.push(...databaseDetails);
                }
                // https://www.yuque.com/api/events/public?offset=20&limit=20&id=275935
                let apiUrl = `https://www.yuque.com/api/events/public?limit=20&id=${userId}`;
                let offset = (page - 1) * 20;
                apiUrl += `&offset=${offset}`;
                console.log("Fetching Yuque user articles from URL:", apiUrl);
                let response = yield this.client.request({
                    url: apiUrl,
                    method: "GET",
                    contentType: "application/json",
                });
                let data = JSON.parse(response.body);
                let dataList = (data === null || data === void 0 ? void 0 : data.data) || [];
                dataList.forEach((element) => {
                    if (element.subject_type === "Note") {
                        let note = element.data;
                        let id = note.slug;
                        let url = `https://www.yuque.com/r/note/${note.slug}`;
                        let author = username;
                        let date = note.created_at;
                        let dateTxt = formatDateToYMD(date);
                        let $nodes = $(note.doclet.body_html);
                        let titleNode = $nodes.find("h1,h2,h3").first();
                        let title = titleNode.text() || "无标题";
                        titleNode.remove();
                        let descriptionText = $nodes.text();
                        let detail = new ExtensionDetail(id, url, title);
                        detail.description = descriptionText;
                        detail.status = dateTxt;
                        detail.author = author;
                        detail.category = "NOTE";
                        detail.type = 1 /* MediaType.Article */;
                        detail.hasChapter = false;
                        items.push(detail);
                    }
                });
                let hasMore = data.meta.hasMore;
                return new ExtensionList(items, page, hasMore ? `next` : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let username = key;
                let list = yield this.fetchUserArticles(username, page);
                return list;
            });
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                return new ExtensionList([], page, undefined);
            });
        }
        requestItemChapter(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                let bookKey = `book_${id}`;
                let bookDetailString = this.userIdMap.get(bookKey);
                let bookDetail = undefined;
                if (bookDetailString) {
                    let detail = JSON.parse(bookDetailString);
                    bookDetail = new ExtensionDetail(id, url, detail.title);
                    bookDetail.description = detail.description;
                    bookDetail.author = detail.author;
                    bookDetail.thumbnail = detail.thumbnail;
                    bookDetail.status = detail.status;
                    bookDetail.category = detail.category;
                    bookDetail.type = 1 /* MediaType.Article */;
                    bookDetail.hasChapter = true;
                }
                else {
                    bookDetail = new ExtensionDetail(id, url, "");
                }
                // https://www.yuque.com/api/docs?book_id=42469873
                let response = yield this.client.request({
                    url: url,
                    method: "GET",
                    contentType: "application/json",
                });
                console.log("Requesting item chapter from URL:", url);
                let data = JSON.parse(response.body);
                let docs = (data === null || data === void 0 ? void 0 : data.data) || [];
                let chapters = [];
                docs.forEach((doc) => {
                    //https://www.yuque.com/api/docs/fyunc42hpgmlfe7d?book_id=42469873&merge_dynamic_data=false
                    let chapterId = doc.slug;
                    let chapterName = doc.title;
                    let chapterUrl = `https://www.yuque.com/api/docs/${chapterId}?book_id=${id}`;
                    let chapter = new ItemChapter(chapterId, chapterUrl, chapterName);
                    chapters.push(chapter);
                });
                let volume = new ItemVolume("全部文档", chapters);
                bookDetail.volumes = [volume];
                return bookDetail;
            });
        }
        parseCardToTag(html) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let cleanHtml = html.replace(/<!doctype lake>/g, "");
                const cardRegex = /(<card[^>]*>[\s\S]*?<\/card>)/g;
                let cards = cleanHtml.match(cardRegex) || [];
                for (let index = 0; index < cards.length; index++) {
                    let cardEle = $(cards[index]);
                    let name = cardEle.attr("name") || "";
                    let dataValue = decodeURIComponent(cardEle.attr("value") || "");
                    // remove data: prefix if exists
                    if (dataValue.startsWith("data:")) {
                        dataValue = dataValue.substring(dataValue.indexOf(":") + 1);
                    }
                    let dataJson;
                    try {
                        dataJson = JSON.parse(dataValue);
                    }
                    catch (_c) {
                        console.log("Failed to parse card data JSON:", dataValue);
                        continue;
                    }
                    let tagText = "";
                    switch (name) {
                        case "bookmarkInline":
                            let detail = dataJson.detail || "";
                            let link = detail.url;
                            let title = detail.title || link;
                            tagText = `<a href="${link}">${title}</a>`;
                            break;
                        case "bookmarklink":
                            let linkDetail = dataJson.detail || "";
                            let linkUrl = linkDetail.url;
                            let linkTitle = linkDetail.title || "";
                            let linkPoster = linkDetail.image || "";
                            if (linkUrl) {
                                tagText = `<iframe src="${linkUrl}" title="${linkTitle}" poster="${linkPoster}"></iframe>`;
                            }
                            break;
                        case "codeblock":
                            let codeMode = dataJson.mode || "text";
                            let codeContent = dataJson.code || "";
                            tagText = `<pre><code class="language-${codeMode}">${codeContent}</code></pre>`;
                            break;
                        case "image":
                            let src = dataJson.src || "";
                            let imgTitle = dataJson.title || "";
                            tagText = `<img src="${src}" alt="${imgTitle}"/>`;
                            break;
                        case "file":
                            let fileSrc = dataJson.src || "";
                            let fileName = dataJson.name || fileSrc;
                            let fileType = dataJson.type || "application/octet-stream";
                            tagText = `<embed src="${fileSrc}" type="${fileType}" title="${fileName}"/>`;
                            break;
                        case "localDoc":
                            let docTitle = dataJson.name || "本地文档";
                            let docUrl = dataJson.url || "#";
                            let docType = dataJson.type || "application/octet-stream";
                            tagText = `<embed src="${docUrl}" type="${docType}" title="${docTitle}"/>`;
                            break;
                        case "youku":
                            let videoUrl = dataJson.url || "";
                            if (videoUrl) {
                                tagText = `<iframe src="${videoUrl}" style="width:100%; height:500px" frameborder="0" allowfullscreen></iframe>`;
                            }
                            break;
                        case "yuqueinline":
                        case "yuque":
                            let yuqueDetail = dataJson.detail || "";
                            let yuequeLink = yuqueDetail.url;
                            let yuqueTitle = yuqueDetail.title;
                            let yuqueCover = yuqueDetail.image || "";
                            tagText = `<iframe src="${yuequeLink}" title="${yuqueTitle}" poster="${yuqueCover}"></iframe>`;
                            break;
                        case "board":
                            tagText = `<p>[看板内容无法显示，请前往语雀查看]</p>`;
                            break;
                        case "math":
                            let mathCode = dataJson.code || "";
                            tagText = `<pre><math class="math-inline">\\(${mathCode}\\)</math></pre>`;
                            break;
                        case "video":
                            let videoCover = dataJson.coverUrl || "";
                            let videoTitle = dataJson.name || "视频";
                            let videoId = dataJson.videoId || "";
                            // https://www.yuque.com/api/video?video_id=ad86ec06fe724e6f8c8ad7ba1721a2fc
                            let videoSrc = `https://www.yuque.com/api/video?video_id=${videoId}`;
                            let response = yield this.client.request({ url: videoSrc, method: "GET", contentType: "application/json" });
                            let videoData = JSON.parse(response.body);
                            videoSrc = ((_b = (_a = videoData === null || videoData === void 0 ? void 0 : videoData.data) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.video) || videoSrc;
                            tagText = `<video controls src="${videoSrc}" title="${videoTitle}" poster="${videoCover}">您的浏览器不支持 video 标签。</video>`;
                            break;
                        case "thirdparty":
                            let thirdUrl = dataJson.url || "";
                            let thirdParty = dataJson.type || "第三方内容";
                            tagText = `<embed src="${thirdUrl}" title="${thirdParty}"></embed>`;
                            break;
                        default:
                            tagText = `<p>[未知卡片类型: ${name}]</p>`;
                            break;
                    }
                    if (tagText.length > 0) {
                        let cardHtml = cards[index];
                        cleanHtml = cleanHtml.replace(cardHtml, tagText);
                    }
                }
                return cleanHtml;
            });
        }
        fetchBookNoteContent(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                // https://www.yuque.com/api/docs/fyunc42hpgmlfe7d?book_id=42469873&merge_dynamic_data=false
                let response = yield this.client.request({
                    url: url,
                    method: "GET",
                    contentType: "application/json",
                });
                let data = JSON.parse(response.body);
                let doc = data === null || data === void 0 ? void 0 : data.data;
                let contentHtml = `<html>${(doc === null || doc === void 0 ? void 0 : doc.content) || ""}</html>`;
                let content = yield this.parseCardToTag(contentHtml);
                let title = (doc === null || doc === void 0 ? void 0 : doc.title) || "";
                let media = new ArticleMedia(id, title, content);
                media.author = ((_a = doc === null || doc === void 0 ? void 0 : doc.user) === null || _a === void 0 ? void 0 : _a.name) || "";
                media.date = formatDateToYMD((doc === null || doc === void 0 ? void 0 : doc.created_at) || "");
                return media;
            });
        }
        fetchUserNoteContent(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                //https://www.yuque.com/r/note/9a314a14-e0c0-4d50-b876-6131cfe15339
                let htmlResponse = yield this.client.request({
                    url: url,
                    method: "GET",
                });
                let appDataJson = yield this.fecthJsonFromHtml(htmlResponse.body);
                let appData = JSON.parse(appDataJson);
                let note = appData === null || appData === void 0 ? void 0 : appData.note;
                let doclet = note.doclet;
                let contentHtml = `<html>${(doclet === null || doclet === void 0 ? void 0 : doclet.body) || ""}</html>`;
                let content = yield this.parseCardToTag(contentHtml);
                let media = new ArticleMedia(id, "", content);
                media.author = ((_a = appData === null || appData === void 0 ? void 0 : appData.user) === null || _a === void 0 ? void 0 : _a.name) || "";
                media.date = formatDateToYMD((doclet === null || doclet === void 0 ? void 0 : doclet.content_updated_at) || "");
                return media;
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                // https://www.yuque.com/api/docs/fyunc42hpgmlfe7d?book_id=42469873&merge_dynamic_data=false
                if (url.includes("/api/docs/")) {
                    return this.fetchBookNoteContent(url, id);
                }
                else if (url.includes("/r/note/")) {
                    return this.fetchUserNoteContent(url, id);
                }
                else {
                    return new ArticleMedia("-1", "", "");
                }
            });
        }
    }
    (function () {
        let rule = new Yuque();
        rule.init();
    })();

    return Yuque;

})();
