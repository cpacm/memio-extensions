import { Rule } from "./rule";
import { ExtensionDetail, ExtensionList, ExtensionMedia, Extension, ExtensionAuth } from "./extension";

export default interface Bridge {

  rule: Rule;

  // js to native
  request(optionJson: string, callback: (html: any) => void): void;

  // native to js
  provideExtensionInfo(): Extension;

  requestItemList(url: string, page: number): Promise<ExtensionList>;

  searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList>;

  requestChannelList(key: string, page: number): Promise<ExtensionList>;

  requestItemChapter(url: string, id?: string): Promise<ExtensionDetail>;

  requestItemMedia(url: string, id: string): Promise<ExtensionMedia>;

  loginForm(form: Map<string, string>): Promise<ExtensionAuth>;

  config(form: Map<string, string>): Promise<boolean>;

}