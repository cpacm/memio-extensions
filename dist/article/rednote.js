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

    class RedNote extends Rule {
        provideExtensionInfo() {
            let site = new Extension("rednote", "小红书", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.xiaohongshu.com";
            site.description = "小红书 - 中国的社交媒体平台，分享生活方式和购物体验";
            site.thumbnail = "https://www.xiaohongshu.com/favicon.ico";
            site.lang = "zh";
            site.categoryList = [
                new SiteUrl("推荐", site.baseUrl + "/explore?channel_id=homefeed_recommend"),
                new SiteUrl("穿搭", site.baseUrl + "/explore?channel_id=homefeed.fashion_v3"),
                new SiteUrl("美食", site.baseUrl + "/explore?channel_id=homefeed.food_v3"),
                new SiteUrl("彩妆", site.baseUrl + "/explore?channel_id=homefeed.cosmetics_v3"),
                new SiteUrl("影视", site.baseUrl + "/explore?channel_id=homefeed.movie_and_tv_v3"),
                new SiteUrl("职场", site.baseUrl + "/explore?channel_id=homefeed.career_v3"),
                new SiteUrl("情感", site.baseUrl + "/explore?channel_id=homefeed.love_v3"),
                new SiteUrl("家居", site.baseUrl + "/explore?channel_id=homefeed.household_product_v3"),
                new SiteUrl("游戏", site.baseUrl + "/explore?channel_id=homefeed.gaming_v3"),
                new SiteUrl("旅行", site.baseUrl + "/explore?channel_id=homefeed.travel_v3"),
                new SiteUrl("健身", site.baseUrl + "/explore?channel_id=homefeed.fitness_v3"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "用户ID", "userId");
            site.forceLogin = true;
            site.loginParams = [
                { key: "cookie", value: "用户Cookie值(web_session=xxxxxx;)" },
            ];
            site.useGuide =
                `## 如何获取小红书 Cookie？

1. 打开浏览器，登录你的小红书账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，选择“Cookie”，然后选择“小红书”的域名（xiaohongshu.com）。
5. 找到名为“web_session”的 Cookie 值。
6. 将该值复制并粘贴到扩展的登录表单中对应的字段，输入格式为 web_session=xxxxxx; 。

> 注意：请确保妥善保管你的 Cookie 信息，避免泄露给他人以保护你的账号安全。

## 如何获取用户ID？

1. 打开浏览器，访问小红书网站。
2. 访问要查看的用户个人空间，URL 格式通常为：https://www.xiaohongshu.com/user/profile/{用户ID}。
3. 从 URL 中提取数字和字母组合部分，这就是该用户的用户ID。例如，在 https://www.xiaohongshu.com/user/profile/675befb4000000001801ce6f 中，用户ID 是 675befb4000000001801ce6f。
4. 将该用户ID 输入到扩展的频道字段中。
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
        searchHtmlScriptElement(html) {
            let $nodes = $(html);
            let jsonString = "";
            $nodes.each((index, element) => {
                if (element instanceof HTMLScriptElement) {
                    let scriptContent = element.innerHTML;
                    if (scriptContent.includes("window.__INITIAL_STATE__")) {
                        jsonString = scriptContent.replace('window.__INITIAL_STATE__=', '').replace(/undefined/g, "null");
                        return false; // Exit the each loop
                    }
                }
            });
            return jsonString;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET" }));
                var html = htmlResponse.body;
                const jsonString = this.searchHtmlScriptElement(html);
                if (!jsonString || jsonString === "") {
                    return new ExtensionList([], page, url);
                }
                var articles = [];
                try {
                    const data = JSON.parse(jsonString);
                    const items = data.feed.feeds;
                    articles = items.map((item) => {
                        const note = item.noteCard;
                        const noteId = item.id.toString();
                        const cover = decodeURIComponent(note.cover.urlDefault);
                        const author = note.user.nickname;
                        const title = note.displayTitle;
                        const xsec_token = item.xsecToken;
                        const url = this.site.baseUrl + `/explore/${noteId}?xsec_token=${xsec_token}`;
                        const detail = new ExtensionDetail(noteId, url, title);
                        detail.thumbnail = cover;
                        detail.author = author;
                        detail.type = 1 /* MediaType.Article */;
                        return detail;
                    });
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                }
                const extensionList = new ExtensionList(articles, page, url);
                return extensionList;
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                const realUrl = this.site.baseUrl + "/user/profile/{userid}".replace("{userid}", key);
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: realUrl, method: "GET" }));
                var html = htmlResponse.body;
                const jsonString = this.searchHtmlScriptElement(html);
                if (!jsonString || jsonString === "") {
                    return new ExtensionList([], page, undefined);
                }
                var articles = [];
                try {
                    const data = JSON.parse(jsonString);
                    const items = data.user.notes[0];
                    articles = items.map((item) => {
                        const note = item.noteCard;
                        const noteId = item.id.toString();
                        const cover = decodeURIComponent(note.cover.urlDefault);
                        const author = note.user.nickname;
                        const title = note.displayTitle;
                        const xsec_token = item.xsecToken;
                        const url = this.site.baseUrl + `/explore/${noteId}?xsec_token=${xsec_token}`;
                        const detail = new ExtensionDetail(noteId, url, title);
                        detail.thumbnail = cover;
                        detail.author = author;
                        detail.type = 1 /* MediaType.Article */;
                        return detail;
                    });
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                }
                console.log(articles);
                const extensionList = new ExtensionList(articles, page, undefined);
                return extensionList;
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET" }));
                var html = htmlResponse.body;
                const jsonString = this.searchHtmlScriptElement(html);
                if (jsonString === "") {
                    return new ArticleMedia(id, "内容加载失败", "无法获取笔记内容，可能是未登录或笔记不存在。");
                }
                let mediaContent = "";
                let content = "";
                try {
                    const data = JSON.parse(jsonString);
                    const noteDetail = data.note.noteDetailMap[id].note;
                    const type = noteDetail.type;
                    let desc = noteDetail.desc;
                    desc = desc.replaceAll(/\[.*?\]/g, '');
                    desc = desc.replaceAll(/#(.*?)#/g, '#$1');
                    desc = desc.replaceAll('\n', '<br>');
                    // parse timestamp to date
                    const timestamp = noteDetail.time;
                    const date = new Date(timestamp);
                    const formattedDate = date.toLocaleDateString();
                    if (type === "video") {
                        const videoUrls = [];
                        const streamTypes = ['h264', 'av1', 'h265', 'h266'];
                        for (const type of streamTypes) {
                            const streams = (_d = (_c = (_b = noteDetail.video) === null || _b === void 0 ? void 0 : _b.media) === null || _c === void 0 ? void 0 : _c.stream) === null || _d === void 0 ? void 0 : _d[type];
                            if ((streams === null || streams === void 0 ? void 0 : streams.length) > 0) {
                                const stream = streams[0];
                                if (stream.masterUrl) {
                                    videoUrls.push(stream.masterUrl);
                                }
                                if ((_e = stream.backupUrls) === null || _e === void 0 ? void 0 : _e.length) {
                                    videoUrls.push(...stream.backupUrls);
                                }
                            }
                        }
                        const originVideoKey = (_g = (_f = noteDetail.video) === null || _f === void 0 ? void 0 : _f.consumer) === null || _g === void 0 ? void 0 : _g.originVideoKey;
                        if (originVideoKey) {
                            videoUrls.push(`http://sns-video-al.xhscdn.com/${originVideoKey}`);
                        }
                        const posterUrl = (_j = (_h = noteDetail.imageList) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.urlDefault;
                        if (videoUrls.length > 0) {
                            mediaContent = `<video controls ${posterUrl ? `poster="${posterUrl}"` : ''}>
                    ${videoUrls.map((url) => `<source src="${url}" type="video/mp4">`).join('\n')}
                </video><br>`;
                        }
                    }
                    else {
                        mediaContent = noteDetail.imageList.map((image) => {
                            var _a, _b;
                            if (image.livePhoto) {
                                const videoUrls = [];
                                const streamTypes = ['h264', 'av1', 'h265', 'h266'];
                                for (const type of streamTypes) {
                                    const streams = (_a = image.stream) === null || _a === void 0 ? void 0 : _a[type];
                                    if ((streams === null || streams === void 0 ? void 0 : streams.length) > 0) {
                                        if (streams[0].masterUrl) {
                                            videoUrls.push(streams[0].masterUrl);
                                        }
                                        if ((_b = streams[0].backupUrls) === null || _b === void 0 ? void 0 : _b.length) {
                                            videoUrls.push(...streams[0].backupUrls);
                                        }
                                    }
                                }
                                if (videoUrls.length > 0) {
                                    return `<video controls poster="${image.urlDefault}">
                            ${videoUrls.map((url) => `<source src="${url}" type="video/mp4">`).join('\n')}
                        </video>`;
                                }
                            }
                            return `<img src="${image.urlDefault}">`;
                        }).join('<br>');
                    }
                    content = `${mediaContent}<br><p>${desc}</p>`;
                    const articleMedia = new ArticleMedia(id, noteDetail.title, content);
                    articleMedia.author = noteDetail.user.nickname;
                    articleMedia.date = formattedDate;
                    return articleMedia;
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                    return new ArticleMedia(id, "内容加载失败", "无法获取笔记内容，可能是未登录或笔记不存在。");
                }
            });
        }
    }
    (function () {
        const redNote = new RedNote();
        redNote.init();
    })();

    return RedNote;

})();
