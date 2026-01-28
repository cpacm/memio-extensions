// import $ from 'jquery';
import { TextEncoder, TextDecoder } from 'util';
import { JSDOM } from 'jsdom';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

global.TextEncoder = TextEncoder
// @ts-expect-error
global.TextDecoder = TextDecoder

let jsdom = new JSDOM();
$ = require('jquery')(jsdom.window);

global.$ = global.jQuery = $;
global.Node = jsdom.window.Node;
global.Element = jsdom.window.Element;
global.HTMLElement = jsdom.window.HTMLElement;
global.HTMLHeadElement = jsdom.window.HTMLHeadElement;
global.HTMLMetaElement = jsdom.window.HTMLMetaElement;
global.HTMLScriptElement = jsdom.window.HTMLScriptElement;
global.HTMLStyleElement = jsdom.window.HTMLStyleElement;
global.HTMLBodyElement = jsdom.window.HTMLBodyElement;

//const proxyAgent = new ProxyAgent('http://127.0.0.1:7897');
//setGlobalDispatcher(proxyAgent);
