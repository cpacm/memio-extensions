import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, ItemVolume, ItemChapter, MediaType, NovelMedia } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class Kakuyomu extends Rule {

    provideExtensionInfo(): Extension {

        let site = new Extension("kakuyomu", "カクヨム", MediaType.Novel)
        site.baseUrl = "https://kakuyomu.jp"
        site.thumbnail = "https://cdn-static.kakuyomu.jp/images/brand/favicons/android-192.png?RxPTbcii9yzz"
        site.description = "様々なWeb小説を無料で「書ける、読める、伝えられる」、KADOKAWA × はてな によるWeb小説サイトです。ジャンルはファンタジー、SF、恋愛、ホラー、ミステリーなどがあり、二次創作作品も楽し…"
        site.lang = "ja"
        site.categoryList = [
            { name: "更新順", url: "order=last_episode_published_at" },
            { name: "週間ランキング", url: "order=weekly_ranking" },
            { name: "累計ランキング", url: "order=popular" },
            { name: "異世界ファンタジー", url: "order=last_episode_published_at&genre_name=fantasy" },
            { name: "現代ファンタジー", url: "order=last_episode_published_at&genre_name=action" },
            { name: "SF", url: "order=last_episode_published_at&genre_name=sf" },
            { name: "恋愛", url: "order=last_episode_published_at&genre_name=love_story" },
            { name: "ラブコメ", url: "order=last_episode_published_at&genre_name=romance" },
            { name: "現代ドラマ", url: "order=last_episode_published_at&genre_name=drama" },
            { name: "ホラー", url: "order=last_episode_published_at&genre_name=horror" },
            { name: "ミステリー", url: "order=last_episode_published_at&genre_name=mystery" },
            { name: "エッセイ・ノンフィクション", url: "order=last_episode_published_at&genre_name=nonfiction" },
            { name: "歴史・時代・伝奇", url: "order=last_episode_published_at&genre_name=history" },
            { name: "創作論・評論", url: "order=last_episode_published_at&genre_name=criticism" },
            { name: "詩・童話・その他", url: "order=last_episode_published_at&genre_name=others" },
            { name: "魔法のiらんど", url: "order=last_episode_published_at&genre_name=maho" },
            { name: "二次創作", url: "order=last_episode_published_at&genre_name=fan_fiction" },
            { name: "暴力描写有り", url: "order=weekly_ranking&inclusion_conditions=violent" },
            { name: "残酷描写有り", url: "order=last_episode_published_at&inclusion_conditions=cruel" },
            { name: "性描写有り", url: "order=last_episode_published_at&inclusion_conditions=sexual" }
        ];

        site.searchList = [
            { name: "小説", url: "https://kakuyomu.jp/search?order=last_episode_published_at&q={keyword}" }
        ];


        return site;

    }

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((index, element) => {
            if (element instanceof HTMLScriptElement) {
                if (element.id === "__NEXT_DATA__") {
                    let scriptContent = element.innerHTML;
                    jsonString = scriptContent;
                    return false; // Exit the each loop
                }
            }
        });
        return jsonString;
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let searchApi = url.replace("{keyword}", encodeURIComponent(keyword)) + `&page=${page}`;
        let response = await this.client?.request({ url: searchApi, method: "GET" });
        let html = response.body;

        let jsonString = this.searchHtmlScriptElement(html);

        try {
            let listData = JSON.parse(jsonString).props.pageProps.__APOLLO_STATE__;
            let items: ExtensionDetail[] = [];

            for (let key in listData) {
                if (key.startsWith("Work:")) {
                    let item = listData[key];
                    let id = item.id;
                    let link = `${this.site.baseUrl}/works/${id}`;
                    let title = item.title;
                    let description = item.introduction;
                    let date = item.lastEpisodePublishedAt;
                    let dateTxt = formatDateToYMD(date);
                    let episodeCount = item.publicEpisodeCount || 0;
                    let category = item.tagLabels?.join(", ");
                    let genre = item.genre;
                    // let authorName = "";
                    // let author = item.author.__ref
                    // if( author && listData[author] ){
                    //     authorName = listData[author].activityName;
                    // }

                    let detail = new ExtensionDetail(id, link, title);
                    detail.category = category || genre || "";
                    detail.status = episodeCount + "話";
                    detail.description = description;
                    detail.author = dateTxt;
                    detail.hasChapter = true;
                    detail.type = MediaType.Novel;
                    items.push(detail);
                }
            }

            let hasMore = items.length >= 20;
            let nextApi = this.site.baseUrl + "/search?" + url + `&page=${page + 1}`;
            return new ExtensionList(items, page, hasMore ? nextApi : undefined);

        } catch (err) {
            console.log("Kakuyomu requestItemList parse json error:", err);
        }
        return new ExtensionList([], page, undefined);

    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {

        let api = this.site.baseUrl + "/search?" + url + `&page=${page}`;
        let response = await this.client?.request({ url: api, method: "GET" });
        let html = response.body;

        let jsonString = this.searchHtmlScriptElement(html);

        try {
            let listData = JSON.parse(jsonString).props.pageProps.__APOLLO_STATE__;
            let items: ExtensionDetail[] = [];

            for (let key in listData) {
                if (key.startsWith("Work:")) {
                    let item = listData[key];
                    let id = item.id;
                    let link = `${this.site.baseUrl}/works/${id}`;
                    let title = item.title;
                    let description = item.introduction;
                    let date = item.lastEpisodePublishedAt;
                    let dateTxt = formatDateToYMD(date);
                    let episodeCount = item.publicEpisodeCount || 0;
                    let category = item.tagLabels?.join(", ");
                    let genre = item.genre;
                    let authorName = "";
                    let author = item.author.__ref
                    if (author && listData[author]) {
                        authorName = listData[author].activityName;
                    }

                    let detail = new ExtensionDetail(id, link, title);
                    detail.category = category || genre || "";
                    detail.status = episodeCount + "話";
                    detail.description = description;
                    detail.author = authorName;
                    detail.hasChapter = true;
                    detail.type = MediaType.Novel;
                    items.push(detail);
                }
            }

            let hasMore = items.length >= 20;
            let nextApi = this.site.baseUrl + "/search?" + url + `&page=${page + 1}`;
            return new ExtensionList(items, page, hasMore ? nextApi : undefined);

        } catch (err) {
            console.log("Kakuyomu requestItemList parse json error:", err);
        }
        return new ExtensionList([], page, undefined);
    }

    override async requestItemChapter(url: string, id: string): Promise<ExtensionDetail> {

        let response = await this.client?.request({ url: url, method: "GET" });
        let html = response.body;

        let jsonString = this.searchHtmlScriptElement(html);

        try {
            let jsonData = JSON.parse(jsonString).props.pageProps.__APOLLO_STATE__;
            let workData = jsonData["Work:" + id];

            let title = workData.title;
            let description = workData.introduction;
            let authorName = "";
            let authorRef = workData.author.__ref;
            if (authorRef && jsonData[authorRef]) {
                authorName = jsonData[authorRef].activityName;
            }
            let thumbnail = workData.adminCoverImageUrl || "";
            let date = workData.lastEpisodePublishedAt;
            let dateTxt = formatDateToYMD(date);
            let category = workData.tagLabels?.join(", ");

            let tableOfContents = workData.tableOfContents || [];
            let volumes: ItemVolume[] = [];

            tableOfContents.forEach((volume: any) => {
                let volumeRef = volume.__ref;
                let volumeData = jsonData[volumeRef];
                let volumeTitle = "目次"
                if (volumeData.chapter && volumeData.chapter.__ref) {
                    let volumeDataRef = volumeData.chapter.__ref;
                    volumeTitle = jsonData[volumeDataRef].title;
                }

                let chapterUnions = volumeData.episodeUnions || [];
                let chapters: ItemChapter[] = [];

                chapterUnions.forEach((ep: any) => {
                    let epRef = ep.__ref;
                    let epData = jsonData[epRef];

                    let epId = epData.id;
                    let epTitle = epData.title;
                    //https://kakuyomu.jp/works/16817139555923024504/episodes/16817139555954620237
                    let epLink = `${this.site.baseUrl}/works/${id}/episodes/${epId}`;

                    let chapter = new ItemChapter(epId, epLink, epTitle);
                    chapters.push(chapter);
                });

                let volumeItem = new ItemVolume(volumeTitle, chapters);
                volumes.push(volumeItem);
            });

            let novelDetail = new ExtensionDetail(id, url, title);
            novelDetail.author = authorName;
            novelDetail.description = description;
            novelDetail.thumbnail = thumbnail;
            novelDetail.category = category || "";
            novelDetail.type = MediaType.Novel;
            novelDetail.status = dateTxt;
            novelDetail.hasChapter = true;
            novelDetail.volumes = volumes;

            return novelDetail;

        } catch (err) {
            console.log("Kakuyomu requestItemChapter parse json error:", err);
        }
        return new ExtensionDetail("-1", url, "Parse Error");
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let response = await this.client?.request({ url: url, method: "GET" });
        let html = response.body;

        let $nodes = $(html);
        let contentNode = $nodes.find("div#contentMain");
        let header = contentNode.find("header#contentMain-header");
        let title = header.find("p.widget-episodeTitle").text().trim();
        header.remove();
        let contentBody = contentNode.find("div.widget-episodeBody");
        contentBody.find("ruby").replaceWith("div"); // Remove ruby tags, keep text only
        contentBody.find("rt,rb,rp").replaceWith("span"); // Remove ruby related tags

        let content = `<html>${contentBody.html() || ""}</html>`;

        let novelMedia = new NovelMedia(id, title, content);
        return novelMedia;
    }
}

(function () {
    const rule = new Kakuyomu();
    rule.init();
})();


export default Kakuyomu;