import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class A9vg extends Rule {
    provideExtensionInfo(): Extension {
        let site = new Extension("a9vg", "A9VG电玩部落", MediaType.Article);
        site.baseUrl = "https://www.a9vg.com";
        site.description = "A9VG电玩部落,中国电玩及主机游戏行业的领先平台,致力于为玩家报道最新主机游戏独家资讯，PS4和Xbox One等主机电视游戏攻略,更有A9VG论坛为电玩主机游戏爱好者提供交流平台。";
        site.thumbnail = "https://www.a9vg.com/favicon.ico";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("All News", "All"),
            new SiteUrl("PS4", "PS4"),
            new SiteUrl("PS5", "PS5"),
            new SiteUrl("Switch", "Switch"),
            new SiteUrl("Xbox One", "XboxOne"),
            new SiteUrl("XSX", "XSX"),
            new SiteUrl("PC", "PC"),
            new SiteUrl("业界", "Industry"),
            new SiteUrl("厂商", "Factory"),
            new SiteUrl("评测", "reviews"),
        ];

        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        // https://www.a9vg.com/list/news/Factory/1
        let api = `${this.site.baseUrl}/list/news/${url}/${page}`;
        if (url === "reviews") {
            // https://www.a9vg.com/list/reviews/2
            api = `${this.site.baseUrl}/list/${url}/${page}`;
        }

        let htmlResponse = await this.client.request({ url: api, method: "GET" });

        let $nodes = $(htmlResponse.body);
        let details: ExtensionDetail[] = [];

        let articleNodes = $nodes.find("div.a9-rich-card-list > ul > li");
        articleNodes.each((index, element) => {
            let ele = $(element);
            let thumbnail = ele.find("img.a9-rich-card-list_image").attr("src") || "";
            // add https if missing
            if (thumbnail && thumbnail.startsWith("//")) {
                thumbnail = "https:" + thumbnail;
            }

            let link = ele.find("a.vd-card").attr("href") || "";
            // /article/238616 -> 238616
            let id = link.split("/").filter(part => part.length > 0).pop() || link;

            let title = ele.find("div.a9-rich-card-list_label").text().trim();
            let description = ele.find("div.a9-rich-card-list_summary").text().trim();
            let date = ele.find("div.a9-rich-card-list_infos").text().trim();

            let detail = new ExtensionDetail(id, this.site.baseUrl + link, title);
            detail.description = description;
            detail.thumbnail = thumbnail;
            detail.category = date;
            detail.hasChapter = false;
            detail.type = MediaType.Article;
            details.push(detail);
        });

        let pageNav = $nodes.find("ul.a9-pagination_wrapper > li.a9-pagination_item-container");
        let lastPageLink = pageNav.last().find("a").attr("href") || "";
        // /list/reviews/88 -> 88
        let lastPageNum = parseInt(lastPageLink.split("/").pop() || "1");
        let hasMore = page < lastPageNum;
        let nextApi = hasMore ? url : undefined;
        return new ExtensionList(details, page, nextApi);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {

        let htmlResponse = await this.client.request(
            { url: url, method: "GET" });

        let $nodes = $(htmlResponse.body);

        // https://bbs.a9vg.com/thread-9060278-1-1.html
        let postList = $nodes.find("div#postlist");
        if (postList.length > 0) {
            let title = postList.find("h1.ts a#thread_subject").text().trim();
            let contentDiv = postList.find("table.plhin").first();
            let content = contentDiv.find("td.t_f");

            let ignore_js_ops = content.find("ignore_js_op");
            ignore_js_ops.each((index, element) => {
                let ignore_js_op = $(element);
                let img = ignore_js_op.find("img");
                img.insertAfter(ignore_js_op);
                ignore_js_op.remove();
            });
            
            content.find("img").each((index, element) => {
                let ele = $(element);
                let src = ele.attr("zoomfile") || "";
                if (src) {
                    ele.attr("src", src);
                }
            });
            content.find("script").remove();
            let media = new ArticleMedia(id, title, `<html>${content.html()}</html>`);

            return media;
        }

        // https://www.a9vg.com/article/238616
        let title = $nodes.find("div.c-article-main_content-title").text().trim();
        let date = $nodes.find("div.c-article-main_content-intro span:eq(0)").text().trim();
        let author = $nodes.find("div.c-article-main_content-intro span:eq(1)").text().trim();

        let content = $nodes.find("div.c-article-main_contentraw");
        // src add https: if missing
        content.find("img").each((index, element) => {
            let ele = $(element);
            let src = ele.attr("src") || "";
            if (src && src.startsWith("//")) {
                ele.attr("src", "https:" + src);
            }
        });

        content.find("iframe").each((index, element) => {
            let ele = $(element);
            let src = ele.attr("src") || "";
            if (src && src.startsWith("//")) {
                ele.attr("src", "https:" + src);
            }
        });
        let media = new ArticleMedia(id, title, `<html>${content.html()}</html>`);
        media.date = date;
        media.author = author;

        return media;
    }
}

(function () {
    const a9vg = new A9vg();
    a9vg.init();
})();

export default A9vg;