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
    class PictureMedia extends ExtensionMedia {
        constructor(id, title, imageList) {
            super(2 /* MediaType.Picture */, id, title);
            this.imageList = imageList;
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

    class Pixiv extends Rule {
        constructor() {
            super(...arguments);
            this.channelMap = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("pixiv", "Pixiv", 2 /* MediaType.Picture */);
            site.baseUrl = "https://www.pixiv.net";
            site.description = "pixiv(ピクシブ)は、作品の投稿・閲覧が楽しめる「イラストコミュニケーションサービス」です。幅広いジャンルの作品が投稿され、ユーザー発の企画やメーカー公認のコンテストが開催されています。";
            site.thumbnail = "https://www.pixiv.net/favicon.ico";
            site.lang = "ja";
            site.categoryList = [
                new SiteUrl("Ranking - デイリー", "daily"),
                new SiteUrl("Ranking - ウィークリー", "weekly"),
                new SiteUrl("Ranking - マンスリー", "monthly"),
                new SiteUrl("Ranking - ルーキー", "rookie"),
                new SiteUrl("Ranking - オリジナル", "original"),
                new SiteUrl("Ranking - AI生成", "daily_ai"),
                new SiteUrl("Ranking - 男性に人気", "male"),
                new SiteUrl("Ranking - 女性に人気", "female"),
                new SiteUrl("Ranking - デイリー R18", "daily_r18"),
                new SiteUrl("Ranking - ウィークリー R18", "weekly_r18"),
                new SiteUrl("Ranking - AI生成 R18", "daily_r18_ai"),
                new SiteUrl("Ranking - 男性に人気 R18", "male_r18"),
                new SiteUrl("Ranking - 女性に人気 R18", "female_r18")
            ];
            site.imageRefer = "https://www.pixiv.net/";
            site.forceLogin = false;
            site.loginParams = [
                { key: "Cookie", value: "Cookie Value" },
            ];
            site.searchList = [
                new SiteUrl("作品を検索", "s_tag"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "ユーザー IDを指定してください。例: 12345678", "ユーザー");
            site.useGuide = ` ## Pixiv(ピクシブ) ログインCookie取得ガイド

1. [Pixiv公式サイト](https://www.pixiv.net)にアクセスし、アカウントを登録します。
2. ログイン後、ブラウザの開発者ツールを開きます（通常はF12キーを押すか、右クリックして「検証」を選択します）。
3. 開発者ツールで、「ネットワーク」（Network）タブを見つけます。
4. ページを更新し、ネットワークリクエストのリストからpixiv.netへのリクエストを見つけてクリックします。
5. リクエスト詳細で、「ヘッダー」（Headers）セクションを見つけ、下にスクロールして「リクエストヘッダー」（Request Headers）を探します。
6. 「Cookie」フィールドの値をコピーします。通常はPHPSESSIDの値だけで十分です。
7. 拡張機能のログイン設定ページに戻り、コピーしたCookieの値を「Cookie Value」フィールドに貼り付けます。
8. 設定を保存すると、ログインが必要なコンテンツにアクセスできるようになります。

注意：Cookieは期限切れになることがありますので、継続的なアクセスを確保するために定期的に更新してください。

## ユーザー IDの取得方法

1. Pixivのユーザープロフィールページにアクセスします。
2. URLの形式は通常 *https://www.pixiv.net/users/12345678* となっており、**12345678** の部分がユーザーIDです。
3. このユーザーIDを拡張機能のチャンネル設定に入力してください。
        `;
            return site;
        }
        loginForm(form) {
            return __awaiter(this, void 0, void 0, function* () {
                let cookie = form.get("Cookie");
                if (!cookie || cookie.trim().length == 0) {
                    return new ExtensionAuth();
                }
                let auth = new ExtensionAuth();
                auth.headers.push(new SiteHeader("Cookie", cookie.trim()));
                return auth;
            });
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                // https://www.pixiv.net/ranking.php?mode=weekly_r18&content=all&format=json&p=1
                var realUrl = this.site.baseUrl + "/ranking.php?content=all&format=json&mode=" + url + "&p=" + page;
                let nextUrl = this.site.baseUrl + "/ranking.php?content=all&format=json&mode=" + url + "&p=" + (page + 1);
                var jsonResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: realUrl, method: "GET" }));
                var json = JSON.parse(jsonResponse.body);
                if (!json || !json.contents) {
                    return new ExtensionList([], page ? page : 1, undefined);
                }
                var items = [];
                json.contents.forEach((element) => {
                    if (element.illust_id === undefined) {
                        return;
                    }
                    let id = element.illust_id.toString();
                    let link = "/artworks/" + id;
                    let date = element.date;
                    let title = element.title;
                    let cover = element.url;
                    let author = element.user_name;
                    let tags = element.tags.toString();
                    let item = new ExtensionDetail(id, this.site.baseUrl + link, title);
                    item.thumbnail = cover;
                    item.description = tags;
                    item.status = date;
                    item.author = author;
                    item.type = 2 /* MediaType.Picture */;
                    items.push(item);
                });
                let hasMore = page < 10;
                return new ExtensionList(items, page, hasMore ? nextUrl : undefined);
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                //https://www.pixiv.net/ajax/user/68480688/profile/all?sensitiveFilterMode=userSetting&lang=ja
                var _a, _b;
                let illustIds = this.channelMap.get(key);
                if (!illustIds) {
                    let channelUrl = this.site.baseUrl + "/ajax/user/" + key + "/profile/all?sensitiveFilterMode=userSetting&lang=ja";
                    var jsonResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: channelUrl, method: "GET" }));
                    var json = JSON.parse(jsonResponse.body);
                    if (!json || json.error) {
                        return new ExtensionList([], page ? page : 1, undefined);
                    }
                    let illusts = json.body.illusts;
                    const ids = Object.keys(illusts);
                    this.channelMap.set(key, ids);
                    illustIds = ids;
                }
                console.log(`Total illustrations for user ${key}: ${illustIds}`);
                const pageSize = 50;
                const startIndex = (page - 1) * pageSize;
                let endIndex = startIndex + pageSize;
                if (endIndex > illustIds.length) {
                    endIndex = illustIds.length;
                }
                if (startIndex >= endIndex) {
                    return new ExtensionList([], page ? page : 1, undefined);
                }
                const pagedIds = illustIds.slice(startIndex, endIndex);
                // https://www.pixiv.net/ajax/user/109083427/illusts?
                let params = pagedIds.map(id => "ids%5B%5D=" + id).join("&");
                let requestUrl = this.site.baseUrl + "/ajax/user/" + key + "/illusts?" + params;
                var pageResponse = yield ((_b = this.client) === null || _b === void 0 ? void 0 : _b.request({ url: requestUrl, method: "GET" }));
                var pageJson = JSON.parse(pageResponse.body);
                if (!pageJson || pageJson.error) {
                    return new ExtensionList([], page ? page : 1, undefined);
                }
                var items = [];
                pagedIds.forEach((id) => {
                    const element = pageJson.body[id];
                    console.log('element:', element);
                    if (element === undefined) {
                        return;
                    }
                    let link = this.site.baseUrl + "/artworks/" + id;
                    let title = element.title;
                    let cover = element.url;
                    let author = element.userName;
                    let illustType = element.illustType;
                    let illustTypeTxt = "イラスト";
                    if (illustType === 0)
                        illustTypeTxt = "イラスト";
                    else if (illustType === 1)
                        illustTypeTxt = "マンガ";
                    else
                        illustTypeTxt = "アニメーション";
                    let restrict = element.restrict;
                    let restrictTxt = "一般";
                    if (restrict === 0)
                        restrictTxt = "一般";
                    else if (restrict === 1)
                        restrictTxt = "R-18";
                    else
                        restrictTxt = "R-18G";
                    let pageCount = element.pageCount;
                    let tags = element.tags.toString();
                    let item = new ExtensionDetail(id, link, title);
                    item.thumbnail = cover;
                    item.description = tags;
                    item.status = pageCount > 1 ? `全${pageCount}枚` : "単一画像";
                    item.author = author;
                    item.type = 2 /* MediaType.Picture */;
                    item.category = illustTypeTxt + " - " + restrictTxt;
                    items.push(item);
                });
                let hasMore = endIndex < illustIds.length;
                return new ExtensionList(items, page ? page : 1, hasMore ? key : undefined);
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                // https://www.pixiv.net/ajax/search/artworks/%E3%83%AA%E3%82%BC%E3%83%AD?word=%E3%83%AA%E3%82%BC%E3%83%AD&order=date_d&mode=all&p=1&csw=0&s_mode=s_tag_full&type=all&lang=ja
                var _a;
                let searchApi = this.site.baseUrl + "/ajax/search/artworks/" + encodeURIComponent(keyword) +
                    `?word=${encodeURIComponent(keyword)}&order=date_d&mode=all&p=${page}&csw=0&s_mode=s_tag_full&type=all&lang=ja`;
                let nextUrl = this.site.baseUrl + "/ajax/search/artworks/" + encodeURIComponent(keyword) +
                    `?word=${encodeURIComponent(keyword)}&order=date_d&mode=all&p=${page + 1}&csw=0&s_mode=s_tag_full&type=all&lang=ja`;
                var jsonResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: searchApi, method: "GET" }));
                var json = JSON.parse(jsonResponse.body);
                if (!json || json.error) {
                    return new ExtensionList([], page ? page : 1, undefined);
                }
                var items = [];
                let illusts = json.body.illustManga.data;
                illusts.forEach((element) => {
                    if (element.id === undefined) {
                        return;
                    }
                    let id = element.id;
                    let link = this.site.baseUrl + "/artworks/" + id;
                    let title = element.title;
                    let cover = element.url;
                    let author = element.userName;
                    let illustType = element.illustType;
                    let illustTypeTxt = "イラスト";
                    if (illustType === 0)
                        illustTypeTxt = "イラスト";
                    else if (illustType === 1)
                        illustTypeTxt = "マンガ";
                    else
                        illustTypeTxt = "アニメーション";
                    let restrict = element.restrict;
                    let restrictTxt = "一般";
                    if (restrict === 0)
                        restrictTxt = "一般";
                    else if (restrict === 1)
                        restrictTxt = "R-18";
                    else
                        restrictTxt = "R-18G";
                    let pageCount = element.pageCount;
                    let tags = element.tags.toString();
                    let item = new ExtensionDetail(id, link, title);
                    item.thumbnail = cover;
                    item.description = tags;
                    item.status = pageCount > 1 ? `全${pageCount}枚` : "単一画像";
                    item.author = author;
                    item.type = 2 /* MediaType.Picture */;
                    item.category = illustTypeTxt + " - " + restrictTxt;
                    items.push(item);
                });
                let lastPage = json.body.illustManga.lastPage;
                let hasMore = page < lastPage;
                return new ExtensionList(items, page, hasMore ? nextUrl : undefined);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                var realUrl = this.site.baseUrl + "/ajax/illust/" + id + "/pages";
                var jsonResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: realUrl, method: "GET" }));
                var json = JSON.parse(jsonResponse.body);
                if (!json || !json.body) {
                    return new PictureMedia("-1", "", []);
                }
                let urls = [];
                let nodes = json.body;
                nodes.forEach((element) => {
                    let imageUrl = element.urls.regular;
                    urls.push(imageUrl);
                });
                let media = new PictureMedia(id, "", urls);
                media.refer = this.site.imageRefer;
                return media;
            });
        }
    }
    (function () {
        const pixiv = new Pixiv();
        pixiv.init();
    })();

    return Pixiv;

})();
