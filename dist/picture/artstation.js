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

    class ArtStation extends Rule {
        provideExtensionInfo() {
            let site = new Extension("artstation", "ArtStation", 2 /* MediaType.Picture */);
            site.baseUrl = "https://www.artstation.com";
            site.thumbnail = "https://www.artstation.com/favicon.ico";
            site.description = "ArtStation is the leading showcase platform for games, film, media & entertainment artists.";
            site.lang = "en";
            site.categoryList = [
                new SiteUrl("Trending", "/explore/projects/trending.json?page={page}"),
                new SiteUrl("Latest", "/explore/projects/latest.json?page={page}"),
                new SiteUrl("Anatomy", "/channels/projects.json?channel_id=69&page={page}"),
                new SiteUrl("Abstract", "/channels/projects.json?channel_id=70&page={page}"),
                new SiteUrl("Animals & Wildlife", "/channels/projects.json?channel_id=71&page={page}"),
                new SiteUrl("Anime & Manga", "/channels/projects.json?channel_id=72&page={page}"),
                new SiteUrl("Architectural Visualization", "/channels/projects.json?channel_id=73&page={page}"),
                new SiteUrl("Character Design", "/channels/projects.json?channel_id=74&page={page}"),
                new SiteUrl("Character Modeling", "/channels/projects.json?channel_id=75&page={page}"),
                new SiteUrl("Editorial Illustration", "/channels/projects.json?channel_id=76&page={page}"),
                new SiteUrl("Children's Art", "/channels/projects.json?channel_id=77&page={page}"),
                new SiteUrl("Comic Art", "/channels/projects.json?channel_id=78&page={page}"),
                new SiteUrl("Creatures & Monsters", "/channels/projects.json?channel_id=80&page={page}"),
                new SiteUrl("Environmental Concept Art & Design", "/channels/projects.json?channel_id=81&page={page}"),
                new SiteUrl("Fan Art", "/channels/projects.json?channel_id=82&page={page}"),
                new SiteUrl("Fantasy", "/channels/projects.json?channel_id=83&page={page}"),
                new SiteUrl("Cover Art", "/channels/projects.json?channel_id=84&page={page}"),
                new SiteUrl("Game Art", "/channels/projects.json?channel_id=85&page={page}"),
                new SiteUrl("Horror", "/channels/projects.json?channel_id=86&page={page}"),
                new SiteUrl("Graphic Design", "/channels/projects.json?channel_id=87&page={page}"),
                new SiteUrl("Illustration", "/channels/projects.json?channel_id=88&page={page}"),
                new SiteUrl("Industrial & Product Design", "/channels/projects.json?channel_id=89&page={page}"),
                new SiteUrl("Lighting", "/channels/projects.json?channel_id=90&page={page}"),
                new SiteUrl("Matte Painting", "/channels/projects.json?channel_id=91&page={page}"),
                new SiteUrl("Mecha", "/channels/projects.json?channel_id=92&page={page}"),
                new SiteUrl("Pixel & Voxel", "/channels/projects.json?channel_id=93&page={page}"),
                new SiteUrl("Props", "/channels/projects.json?channel_id=94&page={page}"),
                new SiteUrl("Science Fiction", "/channels/projects.json?channel_id=95&page={page}"),
                new SiteUrl("Storyboards", "/channels/projects.json?channel_id=96&page={page}"),
                new SiteUrl("Textures & Materials", "/channels/projects.json?channel_id=97&page={page}"),
                new SiteUrl("Tutorials", "/channels/projects.json?channel_id=98&page={page}"),
                new SiteUrl("User Interface", "/channels/projects.json?channel_id=99&page={page}"),
                new SiteUrl("Vehicles", "/channels/projects.json?channel_id=100&page={page}"),
                new SiteUrl("Architectural Concepts", "/channels/projects.json?channel_id=101&page={page}"),
                new SiteUrl("Web and App Design", "/channels/projects.json?channel_id=102&page={page}"),
                new SiteUrl("Board and Card Game Art", "/channels/projects.json?channel_id=103&page={page}"),
                new SiteUrl("Book Illustration", "/channels/projects.json?channel_id=104&page={page}"),
                new SiteUrl("Character Animation", "/channels/projects.json?channel_id=105&page={page}"),
                new SiteUrl("Fashion & Costume Design", "/channels/projects.json?channel_id=106&page={page}"),
                new SiteUrl("Gameplay & Level Design", "/channels/projects.json?channel_id=107&page={page}"),
                new SiteUrl("Games and Real-Time 3D Environment Art", "/channels/projects.json?channel_id=108&page={page}"),
                new SiteUrl("Hard Surface", "/channels/projects.json?channel_id=109&page={page}"),
                new SiteUrl("Mechanical Design", "/channels/projects.json?channel_id=110&page={page}"),
                new SiteUrl("Motion Graphics", "/channels/projects.json?channel_id=111&page={page}"),
                new SiteUrl("Photogrammetry & 3D Scanning", "/channels/projects.json?channel_id=112&page={page}"),
                new SiteUrl("Portraits", "/channels/projects.json?channel_id=113&page={page}"),
                new SiteUrl("Realism", "/channels/projects.json?channel_id=114&page={page}"),
                new SiteUrl("Scientific Illustration & Visualization", "/channels/projects.json?channel_id=115&page={page}"),
                new SiteUrl("Scripts & Tools", "/channels/projects.json?channel_id=116&page={page}"),
                new SiteUrl("Sketches", "/channels/projects.json?channel_id=117&page={page}"),
                new SiteUrl("Still Life", "/channels/projects.json?channel_id=118&page={page}"),
                new SiteUrl("Stylized", "/channels/projects.json?channel_id=119&page={page}"),
                new SiteUrl("Technical Art", "/channels/projects.json?channel_id=120&page={page}"),
                new SiteUrl("Toys & Collectibles", "/channels/projects.json?channel_id=121&page={page}"),
                new SiteUrl("VFX for Film, TV & Animation ", "/channels/projects.json?channel_id=122&page={page}"),
                new SiteUrl("VFX for Real-Time & Games", "/channels/projects.json?channel_id=123&page={page}"),
                new SiteUrl("Virtual and Augmented Reality", "/channels/projects.json?channel_id=124&page={page}"),
                new SiteUrl("Visual Development", "/channels/projects.json?channel_id=125&page={page}"),
                new SiteUrl("Weapons", "/channels/projects.json?channel_id=126&page={page}"),
                new SiteUrl("Unreal Engine", "/channels/projects.json?channel_id=127&page={page}"),
                new SiteUrl("Automotive", "/channels/projects.json?channel_id=128&page={page}"),
                new SiteUrl("RealityScan", "/channels/projects.json?channel_id=8064&page={page}"),
                new SiteUrl("Twinmotion", "/channels/projects.json?channel_id=174543&page={page}"),
                new SiteUrl("Substance 3D", "/channels/projects.json?channel_id=175298&page={page}"),
            ];
            // CSRF-TOKEN may be required for search API
            // site.searchList = [
            //     new SiteUrl("Search", "/api/v2/search/projects.json"),
            // ];
            return site;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let api = this.site.baseUrl + `/api/v2/community` + url.replace("{page}", page.toString()) + `&dimension=all&per_page=30&sort=trending`;
                let htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "GET" }));
                let jsonContent = htmlResponse.body;
                try {
                    let jsonData = JSON.parse(jsonContent);
                    let details = [];
                    let datas = jsonData.data;
                    for (let item of datas) {
                        let hash = item.hash_id;
                        let link = item.url;
                        let title = item.title;
                        let author = item.user ? item.user.username : "Unknown";
                        let thumb = item.smaller_square_cover_url;
                        let detail = new ExtensionDetail(hash, link, title);
                        detail.thumbnail = thumb;
                        detail.type = 2 /* MediaType.Picture */;
                        detail.hasChapter = false;
                        detail.author = author;
                        details.push(detail);
                    }
                    let totalCount = (_b = jsonData.total_count) !== null && _b !== void 0 ? _b : 0;
                    let hasMore = true;
                    if (totalCount === 0) {
                        hasMore = details.length >= 30;
                    }
                    else {
                        hasMore = page * 30 < totalCount;
                    }
                    let nextPage = hasMore ? url : undefined;
                    return new ExtensionList(details, page, nextPage);
                }
                catch (e) {
                    console.error("Failed to parse JSON:", e);
                }
                return new ExtensionList([], page, undefined);
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                let api = this.site.baseUrl + url;
                let body = `{"query":"${keyword}","page":${page},"per_page":50,"sorting":"relevance","pro_first":"1","filters":[],"additional_fields":[]}`;
                let htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "POST", body: body, contentType: "application/json" }));
                let jsonContent = htmlResponse.body;
                try {
                    let jsonData = JSON.parse(jsonContent);
                    let details = [];
                    let datas = jsonData.data;
                    for (let item of datas) {
                        let hash = item.hash_id;
                        let link = item.url;
                        let title = item.title;
                        let author = item.user ? item.user.username : "Unknown";
                        let thumb = item.smaller_square_cover_url;
                        let detail = new ExtensionDetail(hash, link, title);
                        detail.thumbnail = thumb;
                        detail.type = 2 /* MediaType.Picture */;
                        detail.hasChapter = false;
                        detail.author = author;
                        details.push(detail);
                    }
                    let totalCount = (_b = jsonData.total_count) !== null && _b !== void 0 ? _b : 0;
                    let hasMore = true;
                    if (totalCount === 0) {
                        hasMore = details.length >= 50;
                    }
                    else {
                        hasMore = page * 50 < totalCount;
                    }
                    let nextPage = hasMore ? url : undefined;
                    return new ExtensionList(details, page, nextPage);
                }
                catch (e) {
                    console.error("Failed to parse JSON:", e);
                }
                return new ExtensionList([], page, undefined);
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                // https://www.artstation.com/projects/x3EO22.json
                let api = this.site.baseUrl + `/projects/` + id + `.json`;
                let htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({ url: api, method: "GET" }));
                let jsonContent = htmlResponse.body;
                try {
                    let jsonData = JSON.parse(jsonContent);
                    let images = [];
                    let title = jsonData.title || "";
                    let assets = jsonData.assets;
                    for (let asset of assets) {
                        if (asset.asset_type === "image") {
                            let imageUrl = asset.image_url;
                            images.push(imageUrl);
                        }
                    }
                    return new PictureMedia(id, title, images);
                }
                catch (e) {
                    console.error("Failed to parse JSON:", e);
                }
                return new PictureMedia(`-1`, "", []);
            });
        }
    }
    (function () {
        const artStation = new ArtStation();
        artStation.init();
    })();

    return ArtStation;

})();
