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

    class BilibiliOpus extends Rule {
        constructor() {
            super(...arguments);
            // cache page with offset 
            this.channelPageOffsetMap = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("bilibili_opus", "哔哩哔哩-专栏", 1 /* MediaType.Article */);
            site.baseUrl = "https://www.bilibili.com";
            site.description = "哔哩哔哩-中国的年轻人文化社区";
            site.thumbnail = "https://www.bilibili.com/favicon.ico";
            site.lang = "zh";
            site.categoryList = [
                new SiteUrl("推荐", site.baseUrl + "/read/home/"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "用户ID", "userId");
            site.forceLogin = false;
            site.loginParams = [
                { key: "Cookie", value: "用户Cookie值(取 DedeUserID 和 DedeUserID__ckMd5 值)" },
            ];
            site.useGuide = `## 如何获取 Bilibili Cookie？

1. 打开浏览器，登录你的 Bilibili 账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，选择“Cookies”，然后选择“https://www.bilibili.com”。
5. 找到名为“DedeUserID”和“DedeUserID__ckMd5”的 Cookie 值。
6. 将这两个值复制并粘贴到扩展的登录表单中对应的字段，输入格式为 DedeUserID=xxx; DedeUserID__ckMd5=xxx; 。

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
        searchHtmlScriptElement(html) {
            let $nodes = $(html);
            let jsonString = "";
            $nodes.each((index, element) => {
                if (element instanceof HTMLScriptElement) {
                    let scriptContent = element.innerHTML;
                    if (scriptContent.includes("window.__INITIAL_STATE__")) {
                        jsonString = scriptContent.replace('window.__INITIAL_STATE__=', '').replace(/undefined/g, "null");
                        if (jsonString.includes("(function(){")) {
                            // remove the function wrapper
                            const funcStart = jsonString.lastIndexOf(";(function(){");
                            if (funcStart !== -1) {
                                jsonString = jsonString.substring(0, funcStart);
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
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: url, method: "GET" }));
                var html = htmlResponse.body;
                const jsonString = this.searchHtmlScriptElement(html);
                if (!jsonString || jsonString === "") {
                    return new ExtensionList([], page, url);
                }
                var articles = [];
                try {
                    const data = JSON.parse(jsonString);
                    const items = data.home.list;
                    articles = items.map((note) => {
                        const noteId = note.id.toString();
                        var banner = note.banner_url;
                        if (!banner || banner === "") {
                            banner = note.image_urls[0];
                        }
                        const cover = decodeURIComponent(banner);
                        const author = note.author.name;
                        //const category = note.category.name;
                        const title = note.title;
                        const timestamp = note.publish_time;
                        const date = new Date(timestamp * 1000);
                        const formattedDate = date.toLocaleDateString();
                        const url = this.site.baseUrl + `/read/cv${noteId}`;
                        const detail = new ExtensionDetail(noteId, url, title);
                        detail.thumbnail = cover;
                        detail.author = author;
                        detail.category = formattedDate;
                        detail.type = 1 /* MediaType.Article */;
                        return detail;
                    });
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                }
                const extensionList = new ExtensionList(articles, page, undefined);
                return extensionList;
            });
        }
        // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/opus/space.md
        requestChannelList(userId, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                // get offset from map
                const offset = this.channelPageOffsetMap.get(page) || "";
                console.log("requestChannelList page:", page, " offset:", offset);
                var realUrl = `https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/feed/space?host_mid=${userId}&page=${page}&type=all&offset=${offset}`;
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: realUrl, method: "GET" }));
                var html = htmlResponse.body;
                var articles = [];
                var hasMore = false;
                try {
                    const data = JSON.parse(html);
                    if (data.code !== 0) {
                        console.error("Failed to fetch channel list:", data.message);
                        return new ExtensionList([], page, undefined);
                    }
                    hasMore = data.data.has_more;
                    const items = data.data.items;
                    articles = items.map((note) => {
                        var _a;
                        const noteId = note.opus_id;
                        // judge note.cover exist?
                        const cover = ((_a = note.cover) === null || _a === void 0 ? void 0 : _a.url) ? note.cover.url : "";
                        const title = note.content;
                        const url = "https:" + note.jump_url;
                        const detail = new ExtensionDetail(noteId, url, title);
                        detail.thumbnail = cover;
                        detail.type = 1 /* MediaType.Article */;
                        return detail;
                    });
                    // update offset for next page from articles last item
                    const nextOffset = articles.length > 0 ? articles[articles.length - 1].id : "";
                    console.log("nextOffset:", nextOffset);
                    this.channelPageOffsetMap.set(page + 1, nextOffset);
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                }
                if (!hasMore) {
                    return new ExtensionList(articles, page, undefined);
                }
                return new ExtensionList(articles, page, realUrl);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: url, method: "GET"
                }));
                var html = htmlResponse.body;
                const jsonString = this.searchHtmlScriptElement(html);
                if (!jsonString || jsonString === "") {
                    return new ArticleMedia(id, "", "<html></html><body>内容加载失败</body></html>");
                }
                try {
                    let json = JSON.parse(jsonString);
                    let moduleList = json.detail.modules;
                    // find author module and content module or undefined
                    let titleModule = moduleList.find((module) => module.module_title);
                    let authorModule = moduleList.find((module) => module.module_author);
                    let contentModule = moduleList.find((module) => module.module_content);
                    let title = (_b = titleModule === null || titleModule === void 0 ? void 0 : titleModule.module_title) === null || _b === void 0 ? void 0 : _b.text;
                    let author = (_c = authorModule === null || authorModule === void 0 ? void 0 : authorModule.module_author) === null || _c === void 0 ? void 0 : _c.name;
                    let paragraphList = (_d = contentModule === null || contentModule === void 0 ? void 0 : contentModule.module_content) === null || _d === void 0 ? void 0 : _d.paragraphs;
                    if (paragraphList) {
                        let contentMarkdown = this.parseOpusNodes(paragraphList);
                        if (title === undefined || title === null) {
                            title = "无标题专栏";
                        }
                        let articleMedia = new ArticleMedia(id, title, contentMarkdown);
                        articleMedia.author = author;
                        articleMedia.isMarkdown = true;
                        return articleMedia;
                    }
                }
                catch (e) {
                    console.error("Failed to parse JSON data:", e);
                }
                return new ArticleMedia(id, "", "<html></html><body>内容加载失败</body></html>");
                // let title = $nodes.find("div.opus-detail div.opus-module-title__inner").text().trim();
                // let author = $nodes.find("div.opus-detail div.opus-module-author__name").text().trim();
                // let date = $nodes.find("div.opus-detail div.opus-module-author__pub").text().replace("编辑于", "").trim();
                // let findedContent = $nodes.find("div.opus-module-content").first();
                // findedContent.find("div.bili-album__watch__control").remove(); // remove image control divs
                // let content = "<html>" + findedContent.html() + "</html>";
            });
        }
        // parse article opus nodes tp html
        // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/opus/features.md
        parseOpusNodes(paragraphs) {
            let markdown = "";
            paragraphs.forEach(paragraph => {
                const para_type = paragraph.para_type;
                switch (para_type) {
                    case 1: // TEXT
                        const text_nodes = paragraph.text.nodes;
                        let line = "";
                        text_nodes.forEach((node) => {
                            line += this.parseOpusTextNode(node);
                        });
                        markdown += `${line}\n\n`;
                        break;
                    case 2: // IMAGE
                        const pics = paragraph.pic.pics;
                        pics.forEach((pic) => {
                            markdown += `![](${pic.url})\n\n`;
                        });
                        break;
                    case 3: // DIVIDER
                        markdown += "---\n\n";
                        break;
                    case 4: // QUOTE
                        const quotes = paragraph.blockquote.children;
                        quotes.forEach((children) => {
                            let quote_nodes = children.text.nodes;
                            let quote = "";
                            quote_nodes.forEach((node) => {
                                quote += this.parseOpusTextNode(node);
                            });
                            markdown += `> ${quote}\n\n`;
                        });
                        break;
                    case 5: // LIST
                        const list = paragraph.list;
                        const list_items = list.children;
                        list_items.forEach((item) => {
                            // 列表项可能是嵌套的段落
                            const nestedParagraphs = item.children;
                            if (nestedParagraphs && nestedParagraphs.length > 0) {
                                // 递归解析嵌套的段落
                                const nestedContent = this.parseOpusNodes(nestedParagraphs).trim();
                                const indent = ' '.repeat((item.level - 1) * 4);
                                if (list.style === 1) { // ordered
                                    markdown += `${indent}${item.order}. ${nestedContent}\n`;
                                }
                                else { // unordered
                                    markdown += `${indent}* ${nestedContent}\n`;
                                }
                            }
                        });
                        markdown += "\n";
                        break;
                    case 6: // LINK_CARD
                        const card = paragraph.link_card.card;
                        const cardType = card.type;
                        switch (cardType) {
                            case "LINK_CARD_TYPE_UGC":
                                let ugc = card.ugc;
                                let ugcTitle = (ugc === null || ugc === void 0 ? void 0 : ugc.title) || "链接";
                                let ugcCover = decodeURIComponent((ugc === null || ugc === void 0 ? void 0 : ugc.cover) || "");
                                let ugcUrl = decodeURIComponent(ugc.jump_url || "");
                                if (ugcUrl.startsWith("//")) {
                                    ugcUrl = "https:" + ugcUrl;
                                }
                                markdown += `!!I\n![cover](${ugcCover})\n[${ugcTitle}](${ugcUrl})\n\n!!!\n`;
                                break;
                            case "LINK_CARD_TYPE_OPUS":
                                let opus = card.opus;
                                let opusTitle = (opus === null || opus === void 0 ? void 0 : opus.title) || "专栏链接";
                                let opusCover = decodeURIComponent((opus === null || opus === void 0 ? void 0 : opus.cover) || "");
                                let opusUrl = decodeURIComponent(opus.jump_url || "");
                                if (opusUrl.startsWith("//")) {
                                    opusUrl = "https:" + opusUrl;
                                }
                                markdown += `!!I\n![cover](${opusCover})\n[${opusTitle}](${opusUrl})\n\n!!!\n`;
                                break;
                            case "LINK_CARD_TYPE_COMMON":
                                let common = card.common;
                                markdown += `[${common.title}](${decodeURIComponent(common.jump_url)})\n\n`;
                                break;
                            case "LINK_CARD_TYPE_RESERVE":
                                let reserve = card.reserve;
                                markdown += `[${reserve.title}](${decodeURIComponent(reserve.jump_url)})\n\n`;
                                break;
                            case "LINK_CARD_TYPE_GOODS":
                                let goods = card.goods;
                                let goodsTitle = (goods === null || goods === void 0 ? void 0 : goods.head_text) || "商品链接";
                                let goodsUrl = decodeURIComponent(goods.jump_url || "");
                                if (goodsUrl.startsWith("//")) {
                                    goodsUrl = "https:" + goodsUrl;
                                }
                                markdown += `[${goodsTitle}](${goodsUrl})\n\n`;
                                break;
                            case "LINK_CARD_TYPE_MUSIC":
                                let music = card.music;
                                let musicTitle = (music === null || music === void 0 ? void 0 : music.title) || "音乐链接";
                                let musicUrl = decodeURIComponent(music.jump_url || "");
                                if (musicUrl.startsWith("//")) {
                                    musicUrl = "https:" + musicUrl;
                                }
                                markdown += `[${musicTitle}](${musicUrl})\n\n`;
                                break;
                            case "LINK_CARD_TYPE_LIVE":
                                let live = card.live;
                                let liveTitle = (live === null || live === void 0 ? void 0 : live.title) || "直播链接";
                                let liveUrl = decodeURIComponent(live.jump_url || "");
                                if (liveUrl.startsWith("//")) {
                                    liveUrl = "https:" + liveUrl;
                                }
                                markdown += `[${liveTitle}](${liveUrl})\n\n`;
                                break;
                        }
                        break;
                    case 7: // CODE
                        const code = paragraph.code;
                        markdown += "```" + `${code.lang}\n${code.content}\n` + "```\n\n";
                        break;
                    case 8: // HEAD
                        const head = paragraph.heading;
                        const head_nodes = head.nodes;
                        let headLine = "";
                        head_nodes.forEach((node) => {
                            headLine += this.parseOpusTextNode(node);
                        });
                        markdown += `${headLine}\n\n`;
                }
            });
            return markdown;
        }
        parseOpusTextNode(node) {
            var _a, _b, _c;
            let text = "";
            const type = node.type;
            switch (type) {
                case "TEXT_NODE_TYPE_WORD":
                    let content = node.word.words;
                    if ((_a = node.word.style) === null || _a === void 0 ? void 0 : _a.bold) {
                        content = `**${content}**`;
                    }
                    if ((_b = node.word.style) === null || _b === void 0 ? void 0 : _b.italic) {
                        content = `*${content}*`;
                    }
                    if ((_c = node.word.style) === null || _c === void 0 ? void 0 : _c.strikethrough) {
                        content = `~~${content}~~`;
                    }
                    const fontSize = node.word.font_size;
                    if (fontSize > 30) {
                        content = `# ${content}`;
                    }
                    else if (fontSize >= 25) {
                        content = `## ${content}`;
                    }
                    else if (fontSize >= 21) {
                        content = `### ${content}`;
                    }
                    text += content;
                    break;
                case "TEXT_NODE_TYPE_RICH":
                    const rich = node.rich;
                    const richType = rich.type;
                    switch (richType) {
                        case "RICH_TEXT_NODE_TYPE_EMOJI":
                            // 表情，解析为图片
                            text += `![${rich.text}](${rich.emoji.icon_url})`;
                            break;
                        default:
                            // 未知或默认处理
                            let richUrl = rich.jump_url;
                            if (richUrl) {
                                if (richUrl.startsWith("//")) {
                                    richUrl = "https:" + richUrl;
                                }
                                text += `[${rich.text}](${richUrl})`;
                            }
                            else {
                                text += rich.text;
                            }
                            break;
                    }
                    break;
                case "TEXT_NODE_TYPE_FORMULA":
                    text += `$${node.formula.latex_content}$`;
                    break;
            }
            return text;
        }
    }
    (function () {
        const opus = new BilibiliOpus();
        opus.init();
    })();

    return BilibiliOpus;

})();
