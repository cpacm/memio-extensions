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

    class BilibiliVideo extends Rule {
        constructor() {
            super(...arguments);
            this.bvidTime = 1589990400;
        }
        provideExtensionInfo() {
            let site = new Extension("bilibili_video", "哔哩哔哩", 3 /* MediaType.Video */);
            site.baseUrl = "https://www.bilibili.com";
            site.description = "哔哩哔哩-中国的年轻人文化社区。";
            site.thumbnail = "https://www.bilibili.com/favicon.ico";
            site.lang = "zh";
            site.categoryList = [
                new SiteUrl("热门视频", "https://api.bilibili.com/x/web-interface/popular?pn={page}&ps=20"), // pn为页码，从1开始，ps为每页数量，默认20
                new SiteUrl("排行榜", "https://api.bilibili.com/x/web-interface/ranking/v2"), //   rid=0 全站
                new SiteUrl("排行榜-动画", "https://api.bilibili.com/x/web-interface/ranking/v2?tid=1"),
                new SiteUrl("排行榜-音乐", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=3"),
                new SiteUrl("排行榜-舞蹈", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=129"),
                new SiteUrl("排行榜-游戏", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=4"),
                new SiteUrl("排行榜-知识", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=36"),
                new SiteUrl("排行榜-科技", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=188"),
                new SiteUrl("排行榜-运动", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=234"),
                new SiteUrl("排行榜-生活", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=160"),
                new SiteUrl("排行榜-汽车", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=223"),
                new SiteUrl("排行榜-美食", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=211"),
                new SiteUrl("排行榜-动物圈", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=217"),
                new SiteUrl("排行榜-鬼畜", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=119"),
                new SiteUrl("排行榜-时尚", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=155"),
                new SiteUrl("排行榜-娱乐", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=5"),
                new SiteUrl("排行榜-影视", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=181"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "UP主ID", "userId");
            site.forceLogin = false;
            site.loginParams = [
                { key: "Cookie", value: "Cookie值(取 SESSDATA 值)" },
            ];
            site.useGuide =
                `## 如何获取 Bilibili Cookie？

1. 打开浏览器，登录你的 Bilibili 账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，选择“Cookies”，然后选择“https://www.bilibili.com”。
5. 找到名为“SESSDATA”的 Cookie 值。
6. 将该值复制并粘贴到扩展的登录表单中对应的字段，输入格式为 SESSDATA=xxx; 。

> 注意：请确保妥善保管你的 Cookie 信息，避免泄露给他人以保护你的账号安全。
            
## 如何获取用户ID？

1. 打开浏览器，访问 Bilibili 网站。
2. 访问要查看的用户个人空间，URL 格式通常为：https://space.bilibili.com/{用户ID}。
3. 从 URL 中提取数字部分，这就是该用户的用户ID。例如，在 https://space.bilibili.com/3546857466759197 中，用户ID 是 3546857466759197。
4. 将该用户ID 输入到扩展的频道字段中。
            `;
            return site;
        }
        loginForm(form) {
            return __awaiter(this, void 0, void 0, function* () {
                const cookie = form.get("Cookie") || "";
                const auth = new ExtensionAuth();
                auth.headers.push(new SiteHeader("Cookie", cookie));
                return auth;
            });
        }
        parseVideoListJson(items) {
            var videos = [];
            videos = items.map((video) => {
                var _a;
                const cover = (_a = video.pic) !== null && _a !== void 0 ? _a : video.first_frame;
                const author = video.owner.name;
                const category = video.tname;
                const title = video.title;
                const desc = video.desc;
                const timestamp = video.pubdate;
                const date = new Date(timestamp * 1000);
                const formattedDate = date.toLocaleDateString();
                const link = video.pubdate > this.bvidTime && video.bvid ? `https://www.bilibili.com/video/${video.bvid}` : `https://www.bilibili.com/video/av${video.aid}`;
                const id = video.cid;
                const detail = new ExtensionDetail(id, link, title);
                detail.thumbnail = cover;
                detail.author = author;
                detail.status = category;
                detail.category = formattedDate;
                detail.description = desc;
                detail.type = 3 /* MediaType.Video */;
                return detail;
            });
            return videos;
        }
        calculateDateNum() {
            const referenceTimestamp = 1761904800000; // 毫秒
            const referenceIssueNumber = 345;
            // 2. 获取当前时间戳 (毫秒)
            const currentTimestamp = Date.now();
            // 3. 计算时间差（毫秒）
            const timeDifference = currentTimestamp - referenceTimestamp;
            // 4. 计算过去了多少个7天周期 (1000ms * 60s * 60min * 24h * 7d)
            const weeksPassed = Math.floor(timeDifference / 604800000);
            // 5. 计算当前期数
            const currentIssueNumber = referenceIssueNumber + weeksPassed;
            return currentIssueNumber;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let currentUrl = url;
                let hasMore = false;
                if (url.includes("ranking")) {
                    currentUrl = url;
                }
                else {
                    currentUrl = url.replace("{page}", page.toString());
                }
                console.log("Requesting URL:", currentUrl);
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: currentUrl, method: "GET"
                }));
                var html = htmlResponse.body;
                var videos = [];
                console.log("Response HTML:", html);
                try {
                    const data = JSON.parse(html);
                    if (data.code !== 0) {
                        console.error("API returned error code:", data.code, "message:", data.message);
                        return new ExtensionList(videos, page, undefined);
                    }
                    const items = data.data.list;
                    if (data.data.no_more !== undefined) {
                        hasMore = data.data.no_more === false;
                    }
                    videos = this.parseVideoListJson(items);
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                }
                let nextUrl = hasMore ? url.replace("{page}", (page + 1).toString()) : undefined;
                const extensionList = new ExtensionList(videos, page, nextUrl);
                return extensionList;
            });
        }
        requestChannelList(userId, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                var realUrl = `https://api.bilibili.com/x/series/recArchivesByKeywords?mid=${userId}&keywords=&pn=${page}&ps=20`;
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: realUrl, method: "GET" }));
                var html = htmlResponse.body;
                var hasMore = false;
                var videos = [];
                try {
                    const data = JSON.parse(html);
                    if (data.code !== 0) {
                        console.error("Failed to fetch channel list:", data.message);
                        return new ExtensionList([], page, undefined);
                    }
                    let total = data.data.page.total;
                    hasMore = page * 20 < total;
                    const items = data.data.archives;
                    videos = items.map((video) => {
                        var _a;
                        const cover = (_a = video.pic) !== null && _a !== void 0 ? _a : video.first_frame;
                        const title = video.title;
                        const timestamp = video.ctime;
                        const date = new Date(timestamp * 1000);
                        const formattedDate = date.toLocaleDateString();
                        const link = `https://www.bilibili.com/video/${video.bvid}`;
                        const id = video.bvid;
                        const detail = new ExtensionDetail(id, link, title);
                        detail.thumbnail = cover;
                        detail.category = formattedDate;
                        detail.type = 3 /* MediaType.Video */;
                        return detail;
                    });
                    // update offset for next page from articles last item
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                }
                if (!hasMore) {
                    return new ExtensionList(videos, page, undefined);
                }
                return new ExtensionList(videos, page, realUrl);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                let newPlayerUrl = 'https://www.bilibili.com/blackboard/newplayer.html?isOutside=true&autoplay=true&danmaku=true&muted=false&highQuality=true';
                let isBvid = url.includes("/video/BV");
                if (isBvid) {
                    let bvid = url.substring(url.lastIndexOf("BV"));
                    let fullUrl = `${newPlayerUrl}&bvid=${bvid}&cid=${id}`;
                    return new VideoMedia(id, "", fullUrl, false, true);
                }
                else {
                    let avid = url.substring(url.lastIndexOf("av"));
                    let fullUrl = `${newPlayerUrl}&aid=${avid}&cid=${id}`;
                    return new VideoMedia(id, "", fullUrl, false, true);
                }
            });
        }
    }
    (function () {
        const video = new BilibiliVideo();
        video.init();
    })();

    return BilibiliVideo;

})();
