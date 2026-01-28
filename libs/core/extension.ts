export class Extension {
    readonly name: string;
    readonly key: string;
    readonly type: number;
    version: number = 1;
    baseUrl: string = "";
    description?: string;
    thumbnail?: string;
    imageRefer?: string;
    categoryList: SiteUrl[] = [];
    searchList: SiteUrl[] = [];
    configParams: SiteHeader[] = [];
    forceConfig: boolean = false;
    forceLogin: boolean = false;
    loginParams: SiteHeader[] = [];
    useGuide?: string;

    channel?: Channel;
    script: SiteUrl[] = [];
    lang = "en";
    author = "memio";

    constructor(key: string, name: string, type: number) {
        this.key = key;
        this.name = name;
        this.type = type;

        this.script.push(
            new SiteUrl("jquery", "")
        );
    }
}

export class SiteUrl {
    readonly name: string;
    readonly url: string;

    constructor(name: string, url: string) {
        this.name = name;
        this.url = url;
    }
}

export class SiteHeader {
    readonly key: string;
    readonly value: string;

    constructor(key: string, value: string) {
        this.key = key;
        this.value = value;
    }
}

export class Channel {
    readonly type: number; //0:list, 1:detail
    readonly name: string;
    readonly value: string;

    constructor(type: number = ChannelType.List, name: string, value: string) {
        this.type = type;
        this.name = name;
        this.value = value;
    }
}

export class ExtensionAuth {
    public headers: SiteHeader[] = [];
}

export class ExtensionList {
    public readonly items: ExtensionDetail[];
    public readonly page: number = 1;
    public nextPageUrl?: string;

    constructor(items: ExtensionDetail[], page: number, nextPage?: string) {
        this.items = items;
        this.page = page;
        this.nextPageUrl = nextPage;
    }
}

export class ExtensionDetail {
    public readonly id: string;
    public readonly title: string;
    public readonly url: string;

    public author?: string;
    public category?: string;
    public status?: string;
    public description?: string;
    public thumbnail?: string;
    public type: number = MediaType.Undefined;
    public hasChapter: boolean = false;

    /// for item chapter list
    public volumes?: ItemVolume[];

    constructor(id: string, url: string, title: string) {
        this.url = url;
        this.id = id;
        this.title = title;
    }
}

export class ItemVolume {
    public readonly name: string;
    public readonly chapters: ItemChapter[];

    constructor(volumeName: string, chapters: ItemChapter[]) {
        this.name = volumeName;
        this.chapters = chapters;
    }
}

export class ItemChapter {
    public readonly id: string;
    public readonly name: string;
    public readonly url: string;

    constructor(id: string, url: string, name: string) {
        this.url = url;
        this.id = id;
        this.name = name;
    }
}

export class ExtensionMedia {
    public readonly mediaType: number;
    public readonly id: string;
    public readonly title?: string;

    constructor(mediaType: number, id: string, title?: string) {
        this.mediaType = mediaType;
        this.id = id;
        this.title = title;
    }
}

export class ArticleMedia extends ExtensionMedia {
    public readonly content;
    public author?: string;
    public date?: string;
    public isMarkdown: boolean = false;
    public refer?: string;

    constructor(id: string, title: string, content: string) {
        super(MediaType.Article, id, title);
        this.content = content;
    }
}

export class PictureMedia extends ExtensionMedia {
    public readonly imageList: string[];
    public refer?: string;

    // Optional encoding info
    public encodeMethod?: string;
    public encodeKeys?: string[];

    constructor(id: string, title: string, imageList: string[]) {
        super(MediaType.Picture, id, title);
        this.imageList = imageList;
    }
}

export class VideoMedia extends ExtensionMedia {
    public readonly watchUrl: string;
    public autoCatch: boolean = true;
    public webPlay: boolean = false

    constructor(id: string, title: string, url: string, autoCatch: boolean = true, webPlay: boolean = false) {
        super(MediaType.Video, id, title);
        this.watchUrl = url;
        this.autoCatch = autoCatch;
        this.webPlay = webPlay;
    }
}

export class AudioMedia extends ExtensionMedia {
    public readonly playUrl: string;
    public readonly duration: number; // seconds
    public artist?: string;
    public thumbnail?: string;

    constructor(id: string, title: string, playUrl: string, duration: number = -1, artist?: string, thumbnail?: string) {
        super(MediaType.Audio, id, title);
        this.playUrl = playUrl;
        this.duration = duration;
        this.artist = artist;
        this.thumbnail = thumbnail;
    }
}

export class NovelMedia extends ExtensionMedia {
    public readonly content: string;
    public refer?: string;

    constructor(id: string, title: string, content: string, refer?: string) {
        super(MediaType.Novel, id, title);
        this.content = content;
        this.refer = refer;
    }
}

export const enum MediaType {
    Undefined = 0,
    Article = 1,
    Picture = 2,
    Video = 3,
    Audio = 4,
    Novel = 5,
}

export const enum ChannelType {
    List = 0,
    Detail = 1,
}