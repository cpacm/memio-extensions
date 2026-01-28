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
    function formatDateToYMD(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // Months are zero-based
        const day = date.getDate();
        return `${year},${month}/${day}`;
    }

    class Bsky extends Rule {
        constructor() {
            super(...arguments);
            this.feedPageCursorMap = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("bsky", "Bluesky", 1 /* MediaType.Article */);
            site.baseUrl = "https://bsky.app";
            site.description = "Social media as it should be. Find your community among millions of users, unleash your creativity, and have some fun again.";
            site.thumbnail = "https://web-cdn.bsky.app/static/favicon-32x32.png";
            site.lang = "en";
            site.categoryList = [
                { name: "Discover", url: "did:plc:z72i7hdynmk6r22z27h6tvur" },
                { name: "Bluesky Feeds and Trends", url: "did:plc:dnne5gbk6yjt4ej7as4x3ikl" },
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "Feed URL", "feed");
            site.forceLogin = true;
            site.loginParams = [
                { key: "identifier", value: "User Handle" },
                { key: "password", value: "User Password" }
            ];
            site.useGuide = `## How to get User Identifier
1. Open the Bluesky app or website and log in to your account.
2. Navigate to your profile page.
3. Look at the URL in the address bar. It should look something like this: https://bsky.app/profile/cpacm.bsky.social.
4. The part after /profile/ (in this case, cpacm.bsky.social) is your User Identifier.
5. Copy this User Identifier and paste it into the extension settings.
6. BlueSky authorization is valid for a short period, you should re-login after enter this extension.

## How to get Feed URL

1. Visit a user's profile page, for example: https://bsky.app/profile/emilysue.bsky.social.
2. Open the page source and search for "did:plc:". You will find a string similar to "did:plc:z72i7hdynmk6r22z27h6tvur".
3. Paste this string into the Feed URL field in the extension settings.

`;
            return site;
        }
        loginForm(form) {
            return __awaiter(this, void 0, void 0, function* () {
                let identifier = form.get("identifier") || "";
                let password = form.get("password") || "";
                let api = "https://auriporia.us-west.host.bsky.network/xrpc/com.atproto.server.createSession";
                let body = {
                    identifier: identifier,
                    password: password
                };
                var jsonResponse = yield this.client.request({
                    url: api,
                    method: "POST",
                    body: JSON.stringify(body),
                    contentType: "application/json",
                    headers: [
                        { key: "accept", value: "application/json" },
                    ],
                });
                let responseData = JSON.parse(jsonResponse.body);
                console.log(jsonResponse.body);
                let accessJwt = responseData.accessJwt;
                let auth = new ExtensionAuth();
                auth.headers.push({ key: "Authorization", value: `Bearer ${accessJwt}` });
                return auth;
            });
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let feed = encodeURIComponent(url);
                // https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.feed.getAuthorFeed?actor=did:plc:z72i7hdynmk6r22z27h6tvur&filter=posts_and_author_threads&includePins=true&limit=30
                let api = `https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.feed.getAuthorFeed?actor=${feed}&filter=posts_and_author_threads&limit=30`;
                if (page == 1) {
                    this.feedPageCursorMap.delete(feed);
                }
                else {
                    let cursor = this.feedPageCursorMap.get(feed);
                    if (cursor) {
                        api += `&cursor=${cursor}`;
                    }
                }
                var jsonResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "GET" }));
                let items = [];
                let responseData = JSON.parse(jsonResponse.body);
                let feedItems = responseData.feed;
                feedItems.forEach((element) => {
                    let post = element.post;
                    let url = post.uri;
                    // at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3m6zx562tss2c -> 3m6zx562tss2c
                    let id = url.split("/").pop();
                    let author = post.author.displayName;
                    let category = "@" + post.author.handle;
                    let content = post.record.text || "";
                    let date = post.record.createdAt;
                    let dateTxt = formatDateToYMD(date);
                    let embed = post.embed;
                    let thumbnail = "";
                    if (embed && embed.images) {
                        thumbnail = embed.images[0].thumb;
                    }
                    if (embed && embed.playlist) {
                        thumbnail = embed.thumbnail;
                    }
                    if (embed && embed.external) {
                        thumbnail = embed.external.thumb || "";
                    }
                    let detail = new ExtensionDetail(id, url, author);
                    detail.author = category;
                    detail.description = content;
                    detail.category = dateTxt;
                    detail.thumbnail = thumbnail;
                    detail.type = 1 /* MediaType.Article */;
                    items.push(detail);
                });
                let hasNext = responseData.cursor && items.length == 30;
                // save cursor
                if (hasNext) {
                    this.feedPageCursorMap.set(feed, responseData.cursor);
                }
                return new ExtensionList(items, page, hasNext ? responseData.cursor : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.requestItemList(key, page);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                // https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.unspecced.getPostThreadV2?anchor=at%3A%2F%2Fsetouchiandore.bsky.social%2Fapp.bsky.feed.post%2F3m75etisuc22r&branchingFactor=1&below=10&sort=top
                let api = `https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.unspecced.getPostThreadV2?anchor=${encodeURIComponent(url)}&branchingFactor=1&below=10&sort=top`;
                var jsonResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "GET" }));
                let responseData = JSON.parse(jsonResponse.body);
                let post = responseData.thread[0].value.post;
                let uri = post.uri;
                // at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3m6zx562tss2c -> 3m6zx562tss2c
                uri.split("/").pop();
                let author = post.author.displayName;
                let title = post.record.text || "";
                let content = `<p>` + post.record.text + `</p>`;
                let date = post.record.createdAt;
                let dateTxt = formatDateToYMD(date);
                let embed = post.embed;
                if (embed && embed.images) {
                    embed.images.forEach((element) => {
                        // https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:227elnhync3rwi66l2fgw3n2/bafkreiczacuh227dvgnhromwqvb3agpuxkviswqydymphusp4ny3iymfdy@jpeg
                        content += `<br/><p><img src="${element.fullsize}" /></p>`;
                    });
                }
                if (embed && embed.playlist) {
                    let playlist = embed.playlist;
                    let thumbnail = embed.thumbnail;
                    content += `<br/><video controls ${thumbnail ? `poster="${thumbnail}"` : ""} >
                <source src="${playlist.url}">
                Your browser does not support the video tag.
            </video>`;
                }
                if (embed && embed.external) {
                    let title = embed.external.title || "";
                    let frameUri = embed.external.uri || "";
                    let description = embed.external.description || "";
                    let thumb = embed.external.thumb || "";
                    let iframeContent = `<iframe src="${frameUri}" title="${title}" width="100%" height="400px" poster="${thumb}"></iframe>`;
                    content += `<br/><h3>${title}</h3><p>${description}</p><br/>${iframeContent}`;
                }
                if (embed && embed.record) {
                    let record = embed.record;
                    let handle = record.author.handle;
                    let postUri = record.uri.split("/").pop();
                    let recordUrl = `https://bsky.app/profile/${handle}/post/${postUri}`;
                    let displayName = record.author.displayName;
                    let recContent = record.value.text || "";
                    content += `<br/><a href="${recordUrl}">@${displayName}</a>: <p>${recContent}</p>`;
                }
                let indeedTitle = title.length < 30 ? title : title.substring(0, 30);
                let media = new ArticleMedia(id, indeedTitle, content);
                media.author = author;
                media.date = dateTxt;
                media.isMarkdown = false;
                return media;
            });
        }
    }
    (function () {
        let rule = new Bsky();
        rule.init();
    })();

    return Bsky;

})();
