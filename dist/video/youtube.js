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

    class Youtube extends Rule {
        constructor() {
            super(...arguments);
            // cache page with offset 
            this.pageOffsetMap = new Map();
            this.channelMap = new Map();
            this.youtubeKey = "";
            this.searchPageOffsetMap = new Map();
        }
        provideExtensionInfo() {
            let site = new Extension("youtube", "YouTube", 3 /* MediaType.Video */);
            site.baseUrl = "https://www.youtube.com";
            site.description = "YouTube is a video sharing service where users can watch, like, share, comment and upload their own videos.";
            site.thumbnail = "https://www.gstatic.com/youtube/img/branding/favicon/favicon_144x144_v2.png";
            site.lang = "en";
            let commonCategoryUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=20";
            site.categoryList = [
                new SiteUrl("Popular Videos", commonCategoryUrl),
                new SiteUrl("Film & Animation", commonCategoryUrl + "&videoCategoryId=1"),
                new SiteUrl("Autos & Vehicles", commonCategoryUrl + "&videoCategoryId=2"),
                new SiteUrl("Music", commonCategoryUrl + "&videoCategoryId=10"),
                new SiteUrl("Pets & Animals", commonCategoryUrl + "&videoCategoryId=15"),
                new SiteUrl("Sports", commonCategoryUrl + "&videoCategoryId=17"),
                new SiteUrl("Short Movies", commonCategoryUrl + "&videoCategoryId=18"),
                new SiteUrl("Travel & Events", commonCategoryUrl + "&videoCategoryId=19"),
                new SiteUrl("Gaming", commonCategoryUrl + "&videoCategoryId=20"),
                new SiteUrl("Videoblogging", commonCategoryUrl + "&videoCategoryId=21"),
                new SiteUrl("People & Blogs", commonCategoryUrl + "&videoCategoryId=22"),
                new SiteUrl("Comedy", commonCategoryUrl + "&videoCategoryId=23"),
                new SiteUrl("Entertainment", commonCategoryUrl + "&videoCategoryId=24"),
                new SiteUrl("News & Politics", commonCategoryUrl + "&videoCategoryId=25"),
                new SiteUrl("Howto & Style", commonCategoryUrl + "&videoCategoryId=26"),
                new SiteUrl("Education", commonCategoryUrl + "&videoCategoryId=27"),
                new SiteUrl("Science & Technology", commonCategoryUrl + "&videoCategoryId=28"),
                new SiteUrl("Movies", commonCategoryUrl + "&videoCategoryId=30"),
                new SiteUrl("Anime/Animation", commonCategoryUrl + "&videoCategoryId=31"),
                new SiteUrl("Action/Adventure", commonCategoryUrl + "&videoCategoryId=32"),
                new SiteUrl("Classics", commonCategoryUrl + "&videoCategoryId=33"),
                new SiteUrl("Comedy", commonCategoryUrl + "&videoCategoryId=34"),
                new SiteUrl("Documentary", commonCategoryUrl + "&videoCategoryId=35"),
                new SiteUrl("Drama", commonCategoryUrl + "&videoCategoryId=36"),
                new SiteUrl("Family", commonCategoryUrl + "&videoCategoryId=37"),
                new SiteUrl("Foreign", commonCategoryUrl + "&videoCategoryId=38"),
                new SiteUrl("Horror", commonCategoryUrl + "&videoCategoryId=39"),
                new SiteUrl("Sci-Fi/Fantasy", commonCategoryUrl + "&videoCategoryId=40"),
                new SiteUrl("Thriller", commonCategoryUrl + "&videoCategoryId=41"),
                new SiteUrl("Shorts", commonCategoryUrl + "&videoCategoryId=42"),
                new SiteUrl("Shows", commonCategoryUrl + "&videoCategoryId=43"),
                new SiteUrl("Trailers", commonCategoryUrl + "&videoCategoryId=44"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "ChannelId / Handle / PlaylistId", "channelId");
            site.searchList = [
                new SiteUrl("Video Search", "https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&type=video&q={keyword}"),
            ];
            site.forceConfig = true;
            site.configParams = [
                { key: "key", value: "Google Youtube Api Key" },
            ];
            site.useGuide =
                `## How to get Google Youtube Api Key?

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  In the navigation menu, go to **APIs & Services** > **Library**.
4.  Search for "YouTube Data API v3", select it, and click **Enable**.
5.  Go to **APIs & Services** > **Credentials**.
6.  Click **Create Credentials** and select **API key**.
7.  Your API key will be created. Copy it and paste it into the extension's configuration.
8.  (Optional but recommended) To prevent unauthorized use, click on the newly created API key to add restrictions. Under **API restrictions**, select **Restrict key** and choose "YouTube Data API v3" from the dropdown.

## How to get Channel ID?

1. Open your browser and go to the YouTube website.
2. Navigate to the channel you want to view.
3.  Look at the URL in your browser's address bar.
    * For a URL like *https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw*, the Channel ID is **UC_x5XG1OV2P6uZZ5FSM9Ttw**.
    * For a URL with a handle like *https://www.youtube.com/@username*, you can use **@username**.
4. Enter this Channel ID into the extension's channel field.

## How to get a Playlist ID?

1. Navigate to the playlist you want to use on YouTube.
2. The URL will look like *https://www.youtube.com/playlist?list={PlaylistID}*.
3. The Playlist ID is the string of characters after **list=**. For example, in **...list=PL4fGSI1pDJn6j_t_mK5b_f_m_p_q_w_q_**, the ID is **PL4fGSI1pDJn6j_t_mK5b_f_m_p_q_w_q_**.
4. You can use this Playlist ID in the extension to access specific playlists.
`;
            return site;
        }
        config(form) {
            this.youtubeKey = form.get("key") || "";
            return Promise.resolve(true);
        }
        parseVideoItems(items) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const videos = [];
            for (let item of items) {
                let videoId = "";
                if (item.id.kind) {
                    // search result
                    if (item.id.kind !== "youtube#video") {
                        continue;
                    }
                    videoId = item.id.videoId;
                }
                else {
                    // normal video list
                    videoId = item.id;
                }
                // channel video list
                if (item.contentDetails && item.contentDetails.videoId) {
                    videoId = item.contentDetails.videoId;
                }
                let snippet = item.snippet;
                let title = snippet.title;
                let description = snippet.description;
                let thumbnail = (_m = (_j = (_f = (_c = (_b = (_a = snippet.thumbnails) === null || _a === void 0 ? void 0 : _a.standard) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : (_e = (_d = snippet.thumbnails) === null || _d === void 0 ? void 0 : _d.high) === null || _e === void 0 ? void 0 : _e.url) !== null && _f !== void 0 ? _f : (_h = (_g = snippet.thumbnails) === null || _g === void 0 ? void 0 : _g.medium) === null || _h === void 0 ? void 0 : _h.url) !== null && _j !== void 0 ? _j : (_l = (_k = snippet.thumbnails) === null || _k === void 0 ? void 0 : _k.default) === null || _l === void 0 ? void 0 : _l.url) !== null && _m !== void 0 ? _m : "";
                let publishedAt = snippet.publishedAt;
                const date = new Date(publishedAt);
                const formattedDate = `${date.getFullYear()},${date.getMonth() + 1}/${date.getDate()}`;
                let videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                let video = new ExtensionDetail(videoId, videoUrl, title);
                video.description = description;
                video.thumbnail = thumbnail;
                video.author = snippet.channelTitle;
                video.type = 3 /* MediaType.Video */;
                video.category = formattedDate;
                videos.push(video);
            }
            return videos;
        }
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let apiUrl = url + '&key=' + this.youtubeKey;
                if (page > 1) {
                    apiUrl = apiUrl + `&pageToken=${this.pageOffsetMap.get(page) || ""}`;
                }
                else {
                    this.pageOffsetMap.clear();
                }
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: apiUrl, method: "GET",
                    headers: [{ key: "Accept", value: "application/json" }]
                }));
                const content = htmlResponse.body;
                let hasNextPage = false;
                var videos = [];
                try {
                    const json = JSON.parse(content);
                    videos = this.parseVideoItems(json.items);
                    // handle next page token
                    if (json.nextPageToken) {
                        this.pageOffsetMap.set(page + 1, json.nextPageToken);
                        hasNextPage = true;
                    }
                }
                catch (e) {
                    console.log("Youtube requestItemList error:", e);
                    return new ExtensionList([], page, undefined);
                }
                if (hasNextPage) {
                    return new ExtensionList(videos, page, url);
                }
                else {
                    return new ExtensionList(videos, page, undefined);
                }
            });
        }
        requestPlaylistIdFromChannel(channelId) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                if (this.channelMap.has(channelId)) {
                    return this.channelMap.get(channelId) || "";
                }
                let baseApi = `https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&key=${this.youtubeKey}`;
                if (channelId.startsWith("UC")) {
                    baseApi = baseApi + `&id=${channelId}`;
                }
                else if (channelId.startsWith("@")) {
                    baseApi = baseApi + `&forHandle=${encodeURIComponent(channelId)}`;
                }
                else if (channelId.startsWith("PL") || channelId.startsWith("UU")) {
                    // playlistId directly
                    this.channelMap.set(channelId, channelId);
                    return channelId;
                }
                else {
                    // try username
                    baseApi = baseApi + `&forUsername=${encodeURIComponent(channelId)}`;
                }
                var htmlResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: baseApi, method: "GET",
                    headers: [{ key: "Accept", value: "application/json" }]
                }));
                const content = htmlResponse.body;
                try {
                    const json = JSON.parse(content);
                    let playlistId = json.items[0].contentDetails.relatedPlaylists.uploads;
                    this.channelMap.set(channelId, playlistId);
                    return playlistId;
                }
                catch (e) {
                    console.log("Youtube requestPlaylistIdFromChannel error:", e);
                    return "";
                }
            });
        }
        requestChannelList(channelId, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let hasNextPage = false;
                try {
                    let uploadPlayListId = yield this.requestPlaylistIdFromChannel(channelId);
                    if (uploadPlayListId === "") {
                        return new ExtensionList([], page, undefined);
                    }
                    // fetch videos from upload playlist
                    let playlistApiUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails&playlistId=${uploadPlayListId}&maxResults=20&key=${this.youtubeKey}`;
                    if (page > 1) {
                        playlistApiUrl = playlistApiUrl + `&pageToken=${this.pageOffsetMap.get(page) || ""}`;
                    }
                    else {
                        this.pageOffsetMap.clear();
                    }
                    var playlistResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                        url: playlistApiUrl, method: "GET",
                        headers: [{ key: "Accept", value: "application/json" }]
                    }));
                    let playlistContent = playlistResponse.body;
                    const playlistJson = JSON.parse(playlistContent);
                    let videos = this.parseVideoItems(playlistJson.items);
                    // handle next page token
                    if (playlistJson.nextPageToken) {
                        this.pageOffsetMap.set(page + 1, playlistJson.nextPageToken);
                        hasNextPage = true;
                    }
                    if (hasNextPage) {
                        return new ExtensionList(videos, page, playlistApiUrl);
                    }
                    else {
                        return new ExtensionList(videos, page, undefined);
                    }
                }
                catch (e) {
                    console.log("Youtube requestItemList error:", e);
                    return new ExtensionList([], page, undefined);
                }
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                let hasNextPage = false;
                let searchApiUrl = url.replace(`{keyword}`, encodeURIComponent(keyword)) + `&key=${this.youtubeKey}`;
                if (page > 1) {
                    searchApiUrl = searchApiUrl + `&pageToken=${this.searchPageOffsetMap.get(page) || ""}`;
                }
                else {
                    this.searchPageOffsetMap.clear();
                }
                var searchResponse = yield ((_a = this.client) === null || _a === void 0 ? void 0 : _a.request({
                    url: searchApiUrl, method: "GET",
                    headers: [{ key: "Accept", value: "application/json" }]
                }));
                let content = searchResponse.body;
                const searchJson = JSON.parse(content);
                let videos = this.parseVideoItems(searchJson.items);
                // handle next page token
                if (searchJson.nextPageToken) {
                    this.searchPageOffsetMap.set(page + 1, searchJson.nextPageToken);
                    hasNextPage = true;
                }
                if (hasNextPage) {
                    return new ExtensionList(videos, page, searchApiUrl);
                }
                else {
                    return new ExtensionList(videos, page, undefined);
                }
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                let apiUrl = `https://www.youtube.com/embed/${id}`;
                let media = new VideoMedia(id, "", apiUrl);
                media.webPlay = true;
                return media;
            });
        }
    }
    (function () {
        const youtube = new Youtube();
        youtube.init();
    })();

    return Youtube;

})();
