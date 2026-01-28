import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, ItemVolume, ItemChapter, MediaType, NovelMedia } from '@/core/extension';

class Syosetu extends Rule {

    mediaMap: Map<string, NovelMedia> = new Map<string, NovelMedia>();

    provideExtensionInfo(): Extension {
        let site = new Extension("syosetu", "小説家になろう", MediaType.Novel)
        site.baseUrl = "https://yomou.syosetu.com"
        site.thumbnail = "https://static.syosetu.com/sub/yomouview/images/yomou.ico?psawph"
        site.description = "小説家になろうは、日本最大級のオンライン小説投稿サイトです。多様なジャンルの小説が無料で読めます。"
        site.lang = "ja"

        site.categoryList = [
            { name: "注目度ランキング", url: "/rank/attnlist/type/total/?p={page}" },
            { name: "[日間] 総合ランキング", url: "/rank/list/type/daily_total/?p={page}" },
            { name: "[週間] 総合ランキング", url: "/rank/list/type/weekly_total/?p={page}" },
            { name: "[月間] 総合ランキング", url: "/rank/list/type/monthly_total/?p={page}" },
            { name: "[四半期] 総合ランキング", url: "/rank/list/type/quarter_total/?p={page}" },
            { name: "[年間] 総合ランキング", url: "/rank/list/type/yearly_total/?p={page}" },
            { name: "[累計] 総合ランキング", url: "/rank/list/type/total_total/?p={page}" },

            { name: "[週間] 異世界〔恋愛〕", url: "/rank/genrelist/type/weekly_101/?p={page}" },
            { name: "[週間] 現実世界〔恋愛〕", url: "/rank/genrelist/type/weekly_102/?p={page}" },
            { name: "[週間] ハイファンタジー〔ファンタジー〕", url: "/rank/genrelist/type/weekly_201/?p={page}" },
            { name: "[週間] ローファンタジー〔ファンタジー〕", url: "/rank/genrelist/type/weekly_202/?p={page}" },
            { name: "[週間] 純文学〔文芸〕", url: "/rank/genrelist/type/weekly_301/?p={page}" },
            { name: "[週間] ヒューマンドラマ〔文芸〕", url: "/rank/genrelist/type/weekly_302/?p={page}" },
            { name: "[週間] 歴史〔文芸〕", url: "/rank/genrelist/type/weekly_303/?p={page}" },
            { name: "[週間] 推理〔文芸〕", url: "/rank/genrelist/type/weekly_304/?p={page}" },
            { name: "[週間] ホラー〔文芸〕", url: "/rank/genrelist/type/weekly_305/?p={page}" },
            { name: "[週間] アクション〔文芸〕", url: "/rank/genrelist/type/weekly_306/?p={page}" },
            { name: "[週間] コメディー〔文芸〕", url: "/rank/genrelist/type/weekly_307/?p={page}" },

            { name: "[週間] VRゲーム〔SF〕", url: "/rank/genrelist/type/weekly_401/?p={page}" },
            { name: "[週間] 宇宙〔SF〕", url: "/rank/genrelist/type/weekly_402/?p={page}" },
            { name: "[週間] 空想科学〔SF〕", url: "/rank/genrelist/type/weekly_403/?p={page}" },
            { name: "[週間] パニック〔SF〕", url: "/rank/genrelist/type/weekly_404/?p={page}" },

            { name: "[週間] 童話〔その他〕", url: "/rank/genrelist/type/weekly_9901/?p={page}" },
            { name: "[週間] 詩〔その他〕", url: "/rank/genrelist/type/weekly_9902/?p={page}" },
            { name: "[週間] エッセイ〔その他〕", url: "/rank/genrelist/type/weekly_9903/?p={page}" },
            { name: "[週間] その他〔その他〕", url: "/rank/genrelist/type/weekly_9999/?p={page}" },

            { name: "[週間] 異世界転生/転移〔恋愛〕", url: "/rank/isekailist/type/weekly_1/?p={page}" },
            { name: "[週間] 異世界転生/転移〔ファンタジー〕", url: "/rank/isekailist/type/weekly_2/?p={page}" },
            { name: "[週間] 異世界転生/転移〔文芸・SF・その他〕", url: "/rank/isekailist/type/weekly_o/?p={page}" },

            { name: "[日間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/daily_total/" },
            { name: "[週間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/weekly_total/" },
            { name: "[月間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/monthly_total/" },
            { name: "[四半期] ノクターン", url: "https://noc.syosetu.com/rank/list/type/quarter_total/" },
            { name: "[年間] ノクターン", url: "https://noc.syosetu.com/rank/list/type/yearly_total/" },

            { name: "[日間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/daily_total/" },
            { name: "[週間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/weekly_total/" },
            { name: "[月間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/monthly_total/" },
            { name: "[四半期] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/quarter_total/" },
            { name: "[年間] ムーンライト [女性向け]", url: "https://mnlt.syosetu.com/rank/list/type/yearly_total/" },

            { name: "[日間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/daily_total/" },
            { name: "[週間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/weekly_total/" },
            { name: "[月間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/monthly_total/" },
            { name: "[四半期] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/quarter_total/" },
            { name: "[年間] ムーンライト [ＢＬ]", url: "https://mnlt.syosetu.com/rank/bllist/type/yearly_total/" },
        ];

        site.searchList = [
            { name: "小説検索", url: "/search.php?search_type=novel&word={keyword}&order_former=search&order=new&notnizi=1&p={page}" },
        ];

        return site;
    }

    private async requestR18ItemList(url: string, page: number): Promise<ExtensionList> {
        let response = await this.client?.request({
            url: url, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }]
        });
        let html = response.body;
        let $nodes = $(html);

        let rankH = $nodes.find("div.ranking_inbox div.rank_h");
        let rankTable = $nodes.find("div.ranking_inbox table.rank_table");

        let items: ExtensionDetail[] = [];
        rankH.each((index, element) => {
            let ele = $(element);
            let eleTable = $(rankTable[index]);

            let title = ele.find("a").text().trim();
            let link = ele.find("a").attr("href") || "";
            // https://novel18.syosetu.com/n6666lm/ -> n6666lm
            let id = link.split("/").filter(part => part.length > 0).pop() || "";
            let author = ele.find("span").last().text().trim();

            let description = eleTable.find("td.ex").text().trim();
            let categoryNode = eleTable.find("td.left");
            categoryNode.find("span").remove();
            let category = categoryNode.text().trim();

            let status = eleTable.find("td.s").text().trim();

            let detail = new ExtensionDetail(id, link, title);
            detail.author = author;
            detail.description = description;
            detail.category = category;
            detail.hasChapter = true;
            detail.status = status;
            detail.type = MediaType.Novel;
            items.push(detail);
        });

        return new ExtensionList(items, page, undefined);
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {

        if (url.startsWith("https://")) {
            return this.requestR18ItemList(url, page);
        }

        let api = this.site.baseUrl + url.replace("{page}", page.toString());
        let response = await this.client?.request({ url: api, method: "GET", });
        let html = response.body;
        let $nodes = $(html);

        let ranklistNodes = $nodes.find("div.p-ranklist-item__column");
        let items: ExtensionDetail[] = [];
        ranklistNodes.each((index, element) => {
            let itemNode = $(element);
            let title = itemNode.find("div.p-ranklist-item__title a").text().trim();
            let link = itemNode.find("div.p-ranklist-item__title a").attr("href") || "";
            // https://ncode.syosetu.com/n8065lj/ -> n8065lj
            let id = link.split("/").filter(part => part.length > 0).pop() || "";

            let author = itemNode.find("div.p-ranklist-item__author a").text().trim();
            let points = itemNode.find("div.p-ranklist-item__points").text().trim();

            let infomation = itemNode.find("div.p-ranklist-item__infomation span").text().trim();

            let description = itemNode.find("div.p-ranklist-item__synopsis").text().trim();

            let detail = new ExtensionDetail(id, link, title);
            detail.author = author;
            detail.description = description;
            detail.category = infomation;
            detail.hasChapter = true;
            detail.type = MediaType.Novel;
            detail.status = points
            items.push(detail);
        });

        let maxPage = 2;
        if (url.indexOf("/rank/list/type") >= 0) {
            maxPage = 6;
        }
        let nextPageUrl = page < maxPage ? url.replace("{page}", (page + 1).toString()) : undefined;
        return new ExtensionList(items, page, nextPageUrl);

    }

    private async parseChapters(chapterNodes: JQuery<HTMLElement>): Promise<ItemVolume[]> {
        let volumes: ItemVolume[] = [];
        let chapters: ItemChapter[] = [];

        chapterNodes.each((vIndex, vElement) => {
            let ele = $(vElement);
            if (ele.hasClass("p-eplist__chapter-title")) {
                // is new volume
                chapters = [];
                let newVolme = new ItemVolume(ele.text().trim(), chapters);
                volumes.push(newVolme);
                return;
            }

            let chapterTitle = ele.find("a.p-eplist__subtitle").text().trim();
            let chapterUrl = ele.find("a.p-eplist__subtitle").attr("href") || "";
            // /n8281jr/2/ -> 2
            let chapterId = chapterUrl.split("/").filter(part => part.length > 0).pop() || "";
            let newChapter = new ItemChapter(chapterId, "https://ncode.syosetu.com" + chapterUrl, chapterTitle);
            chapters.push(newChapter);

            if (volumes.length === 0) {
                // no volume info, create default volume
                let defaultVolume = new ItemVolume("章节列表", chapters);
                volumes.push(defaultVolume);
            }

        });

        return volumes;

    }

    override async requestItemChapter(url: string, id: string): Promise<ExtensionDetail> {

        let response = await this.client?.request({ url: url, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] });

        let html = response.body;
        let $nodes = $(html);

        let article = $nodes.find("article.p-novel");
        let title = article.find("h1.p-novel__title").text().trim();
        let author = article.find("div.p-novel__author a").text().trim();
        let description = article.find("div.p-novel__summary").text().trim();

        let detail = new ExtensionDetail(id, url, title);
        detail.author = author;
        detail.description = description;
        detail.type = MediaType.Novel;
        detail.hasChapter = true;

        let chapters = article.find("div.p-eplist > div");
        if (chapters === undefined || chapters.length === 0) {
            let content = article.find("div.p-novel__body").html() || "";
            detail.volumes = [new ItemVolume("短編", [new ItemChapter(id, url, title)])];

            let novelMedia = new NovelMedia(id, title, content);
            this.mediaMap.set(id, novelMedia);

            return detail;
        }


        let curPage = 1;
        let pager = article.find("div.c-pager__pager");
        let lastPageNode = pager.find("a.c-pager__item").last();
        let lastPageHref = lastPageNode.attr("href") || "";
        // /n8281jr/?p=1 -> 1
        let maxPage = 1;
        let match = lastPageHref.match(/\?p=(\d+)/);
        if (match && match.length > 1) {
            maxPage = parseInt(match[1]);
        }

        let volumes = await this.parseChapters(chapters);

        while (curPage < maxPage) {
            let pageUrl = url + "?p=" + (curPage + 1);
            let response = await this.client?.request({ url: pageUrl, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] });

            let html = response.body;
            let $nodes = $(html);

            let article = $nodes.find("article.p-novel");

            let chapters = article.find("div.p-eplist > div");
            if (chapters === undefined || chapters.length === 0) {
                break;
            }
            let moreVolumes = await this.parseChapters(chapters);
            // merge volumes
            for (let vol of moreVolumes) {
                if (volumes.length > 0 && volumes[volumes.length - 1].name === vol.name) {
                    // merge chapters
                    volumes[volumes.length - 1].chapters.push(...vol.chapters);
                } else {
                    volumes.push(vol);
                }
            }
        }

        detail.volumes = volumes;
        return detail;
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let searchApi = this.site.baseUrl + url.replace("{keyword}", encodeURIComponent(keyword)).replace("{page}", page.toString());

        let response = await this.client?.request({ url: searchApi, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] });
        let html = response.body;
        let $nodes = $(html);

        let searchlistNodes = $nodes.find("div#main_search div.searchkekka_box");
        let items: ExtensionDetail[] = [];
        searchlistNodes.each((index, element) => {
            let itemNode = $(element);
            let title = itemNode.find("div.novel_h a").text().trim();
            let link = itemNode.find("div.novel_h a").attr("href") || "";
            // https://ncode.syosetu.com/n8065lj/ -> n8065lj
            let id = link.split("/").filter(part => part.length > 0).pop() || "";

            let author = itemNode.find("a:eq(1)").text().trim();

            let description = itemNode.find("table div.ex").text().trim();
            let categoryNode = itemNode.find("table td.left");
            let category = categoryNode.text().trim();

            let detail = new ExtensionDetail(id, link, title);
            detail.author = author;
            detail.description = description;
            detail.category = category;
            detail.hasChapter = true;
            detail.type = MediaType.Novel;
            items.push(detail);
        });

        let hasMore = items.length >= 20;
        let nextPageUrl = hasMore ? url.replace("{keyword}", encodeURIComponent(keyword)).replace("{page}", (page + 1).toString()) : undefined;
        return new ExtensionList(items, page, nextPageUrl);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let novelMedia = this.mediaMap.get(id);
        if (novelMedia !== undefined) {
            return novelMedia;
        }

        let response = await this.client?.request({ url: url, method: "GET", headers: [{ key: "Cookie", value: "over18=yes;" }] });
        let html = response.body;
        let $nodes = $(html);

        let article = $nodes.find("article.p-novel");
        let title = article.find("h1.p-novel__title").text().trim();

        let content = article.find("div.p-novel__body").html() || "";
        let media = new NovelMedia(id, title, content);
        return media;
    }
}

(function () {
    const rule = new Syosetu();
    rule.init();
})();

export default Syosetu;