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

    class HuggingfaceModels extends Rule {
        provideExtensionInfo() {
            let site = new Extension("huggingface-models", "Huggingface Models", 1 /* MediaType.Article */);
            site.baseUrl = "https://huggingface.co";
            site.description = "Hugging Face is an AI community and platform that provides tools and resources for building, training, and deploying machine learning models.";
            site.thumbnail = "https://huggingface.co/front/assets/huggingface_logo-noborder.svg";
            site.lang = "en";
            site.categoryList = [
                new SiteUrl("All Models", ""),
                new SiteUrl("Text Generation", "text-generation"),
                new SiteUrl("Any-to-Any", "any-to-any"),
                new SiteUrl("Image-Text-to-Text", "image-text-to-text"),
                new SiteUrl("Image-to-Text", "image-to-text"),
                new SiteUrl("Image-to-Image", "image-to-image"),
                new SiteUrl("Text-to-Image", "text-to-image"),
                new SiteUrl("Text-to-Video", "text-to-video"),
                new SiteUrl("Text-to-Speech", "text-to-speech"),
            ];
            site.searchList = [
                new SiteUrl("Filter by name", "search={keyword}"),
            ];
            site.channel = new Channel(0 /* ChannelType.List */, "Filter Params", "filter");
            site.useGuide = `## How to set Channel Filter Params
Huggingface Models can be filtered by various parameters such as Tasks, Libraries, etc.

1. You can set these filter parameters in the Channel section of the extension settings. For example, to filter models by a specific task, you can add a parameter with key "pipeline_tag=[value]" and value as the desired task name.
Like "pipeline_tag=text-generation" to filter models related to text generation.
2. Similarly, you can filter by library using the key "library=[value]".
Like "library=tf" to filter models that use the TensorFlow library.
3. You can combine multiple filter parameters by adding more parameters. For example, to filter models by both task and library, you can merge two parameters.
Like "pipeline_tag=text-generation&library=tf".

## How to get Filter Params
To find the available filter parameters, you can visit the Hugging Face Models page at [https://huggingface.co/models](https://huggingface.co/models) and explore the filters on the left sidebar. The URL will update with the selected filters, which you can use to set the appropriate parameters in the extension settings.
`;
            return site;
        }
        parseItemDetails(models) {
            var _a, _b, _c, _d, _e;
            let items = [];
            for (let model of models) {
                let id = model["id"];
                let title = id;
                let category = (_a = model["pipeline_tag"]) !== null && _a !== void 0 ? _a : "";
                let author = (_b = model["authorData"].name) !== null && _b !== void 0 ? _b : "";
                let thumbnail = (_c = model["authorData"]["avatarUrl"]) !== null && _c !== void 0 ? _c : "";
                let formattedDate = formatDateToYMD(model["lastModified"]);
                let downloads = (_d = model["downloads"]) !== null && _d !== void 0 ? _d : 0;
                let likes = (_e = model["likes"]) !== null && _e !== void 0 ? _e : 0;
                let description = (downloads > 0 ? `Downloads: ${downloads}` : "") + (likes > 0 ? ` Likes: ${likes}` : "");
                let item = new ExtensionDetail(id, this.site.baseUrl + `/${id}`, title);
                item.thumbnail = thumbnail;
                item.description = description;
                item.author = author;
                item.status = formattedDate;
                item.category = category;
                item.type = 1 /* MediaType.Article */;
                items.push(item);
            }
            return items;
        }
        //https://huggingface.co/models-json?sort=trending&withCount=true
        requestItemList(url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let pageIndex = page - 1;
                let apiUrl = this.site.baseUrl + `/models-json?sort=trending&p=${pageIndex}&withCount=true`;
                if (url && url.length > 0) {
                    apiUrl += `&pipeline_tag=${url}`;
                }
                const response = yield this.client.request({
                    url: apiUrl,
                    method: "GET",
                });
                try {
                    let json = JSON.parse(response.body);
                    let models = json["models"];
                    let items = this.parseItemDetails(models);
                    // Check if there is a next page
                    let totalModels = json["numTotalItems"];
                    let pageSize = json["numItemsPerPage"];
                    let disableNext = (pageIndex + 1) * pageSize >= totalModels;
                    return new ExtensionList(items, page, disableNext ? undefined : url);
                }
                catch (e) {
                    console.log("Error parsing JSON:", e);
                    return new ExtensionList([], page ? page : 1, undefined);
                }
            });
        }
        searchItemList(keyword, url, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let pageIndex = page - 1;
                let apiUrl = this.site.baseUrl + `/models-json?sort=trending&p=${pageIndex}&withCount=true`;
                if (keyword && keyword.length > 0) {
                    apiUrl += `&search=${encodeURIComponent(keyword)}`;
                }
                const response = yield this.client.request({
                    url: apiUrl,
                    method: "GET",
                });
                try {
                    let json = JSON.parse(response.body);
                    let models = json["models"];
                    let items = this.parseItemDetails(models);
                    // Check if there is a next page
                    let totalModels = json["numTotalItems"];
                    let pageSize = json["numItemsPerPage"];
                    let disableNext = (pageIndex + 1) * pageSize >= totalModels;
                    return new ExtensionList(items, page, disableNext ? undefined : url);
                }
                catch (e) {
                    console.log("Error parsing JSON:", e);
                    return new ExtensionList([], page ? page : 1, undefined);
                }
            });
        }
        requestChannelList(key, page) {
            return __awaiter(this, void 0, void 0, function* () {
                let params = key;
                let pageIndex = page - 1;
                let apiUrl = this.site.baseUrl + `/models-json?${params}&p=${pageIndex}&withCount=true`;
                const response = yield this.client.request({
                    url: apiUrl,
                    method: "GET",
                });
                try {
                    let json = JSON.parse(response.body);
                    let models = json["models"];
                    let items = this.parseItemDetails(models);
                    // Check if there is a next page
                    let totalModels = json["numTotalItems"];
                    let pageSize = json["numItemsPerPage"];
                    let disableNext = (pageIndex + 1) * pageSize >= totalModels;
                    return new ExtensionList(items, page, disableNext ? undefined : apiUrl);
                }
                catch (e) {
                    console.log("Error parsing JSON:", e);
                    return new ExtensionList([], page ? page : 1, undefined);
                }
            });
        }
        requestItemMedia(url, id) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                const response = yield this.client.request({
                    url,
                    method: "GET",
                });
                const $nodes = $(response.body);
                let contentNode = $nodes.find("div.model-card-content");
                let title = contentNode.find("h1").first().text().trim();
                contentNode.find("h1").first().remove();
                let contentHtml = (_a = contentNode.html()) !== null && _a !== void 0 ? _a : "";
                let media = new ArticleMedia(id, title, contentHtml);
                return media;
            });
        }
    }
    (function () {
        const huggingfaceModels = new HuggingfaceModels();
        huggingfaceModels.init();
    })();

    return HuggingfaceModels;

})();
