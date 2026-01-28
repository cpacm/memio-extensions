const u = typeof window !== "undefined" ? window.navigator.userAgent : "Android";
const isAndroid = u.indexOf("Android") > -1 || u.indexOf("Adr") > -1; //android终端
const isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端

type Device = "android" | "ios";

export function getDevice(): Device | undefined {
    if (isAndroid) return "android";
    if (isIOS) return "ios";
}

export const jsbridge = function (callback: Callback) {
    if (getDevice() === "android") {
        if (window.MemoWebViewJavascriptBridge) {
            return callback(window.MemoWebViewJavascriptBridge);
        } else {
            document.addEventListener(
                "WebViewJavascriptBridgeReady",
                function () {
                    callback(window.MemoWebViewJavascriptBridge);
                },
                false
            );
        }
    }
    else if (getDevice() === "ios") {
        // new ios method ---> for WKWebview
        if (window.MemoWebViewJavascriptBridge) {
            window.MemoWebViewJavascriptBridge.callbackWithRequest = function (data: string) {
                window.webkit.messageHandlers.callbackWithRequest.postMessage(data);
            }

            window.MemoWebViewJavascriptBridge.request = function (option: string) {
                window.webkit.messageHandlers.request.postMessage(option);
                //TODO extra bridge method for ios to get response
                return "";
            }
            return callback(window.MemoWebViewJavascriptBridge);
        }

    }
};

export interface Callback {
    (args: CallbackArgs): void;
}
export interface CallbackArgs {
    // native call h5
    provideExtensionInfo: () => string;
    requestItemList: (param: string) => void;
    searchItemList: (param: string) => void;
    requestChannelList: (param: string) => void;
    requestItemChapter: (param: string) => void;
    requestItemMedia: (param: string) => void;
    loginForm: (param: string) => void;
    config: (param: string) => void;
    responseWithRequest: (key: string, status: number, headers: string, data: string) => void; /// special for native devices

    // h5 call native
    callbackWithRequest(data: string): void;
    request(option: string): string;

}