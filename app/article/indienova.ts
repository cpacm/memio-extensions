import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class Indienova extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("indienova", "Indienova", MediaType.Article);
        site.baseUrl = "https://indienova.com";
        site.description = "Indienova is a community and platform dedicated to indie game developers and enthusiasts in China.";
        site.thumbnail = "https://static.indienova.com/assets/images/indienova_thumb.png";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("全部文章", "indie-game-news"),
            new SiteUrl("业界新闻", "channel/news"),
            new SiteUrl("独立前瞻", "channel/game"),
            new SiteUrl("游戏评测", "channel/reviews"),
            new SiteUrl("游戏漫谈", "channel/culture"),
            new SiteUrl("开发:引擎", "channel/engine"),
            new SiteUrl("开发:设计", "channel/design"),
            new SiteUrl("开发:编程", "channel/programming"),
            new SiteUrl("开发:工具", "channel/software"),
        ];
        site.imageRefer = "https://hive.indienova.com";

        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        // https://indienova.com/indie-game-news/page/1/
        let api = `${this.site.baseUrl}/${url}/page/${page}/`;
        let htmlResponse = await this.client.request({
            url: api, method: "GET", headers: [
                { key: "Accept", value: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" }
            ]
        });

        let $nodes = $(htmlResponse.body);
        let details: ExtensionDetail[] = [];

        let articleNodes = $nodes.find("div.container div.article-panel");
        articleNodes.each((index, element) => {
            let ele = $(element);
            let thumbnail = ele.find("div.article-image img").attr("src") || "";
            let title = ele.find("h4 a").text().trim();
            let link = ele.find("h4 a").attr("href") || "";
            // /indie-game-news/stories-from-game-collecting-01-warcraft/
            let id = link.split("/").filter(part => part.length > 0).pop() || link;

            let description = ele.find("p").last().text().trim();

            let detail = new ExtensionDetail(id, this.site.baseUrl + link, title);
            detail.description = description;
            detail.thumbnail = thumbnail;
            detail.hasChapter = false;
            detail.type = MediaType.Article;
            details.push(detail);
        });

        let pageNav = $nodes.find("ul.pagination li");
        pageNav.last().remove(); // remove next
        let lastPageLink = pageNav.last().find("a").attr("href") || "";
        // /indie-game-news/page/487/ -> 487
        let lastPageNum = parseInt(lastPageLink.split("/").filter(part => part.length > 0).pop() || "1");
        let hasMore = page < lastPageNum;
        let nextApi = hasMore ? `${this.site.baseUrl}/${url}/page/${page + 1}/` : undefined;

        return new ExtensionList(details, page, nextApi);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {

        let htmlResponse = await this.client.request(
            {
                url: url, method: "GET", headers: [
                    { key: "Accept", value: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" }
                ]

            });

        let $nodes = $(htmlResponse.body);
        let section = $nodes.find("section#content")
        let title = section.find("h1").text().trim();
        let author = section.find("span.header-info > a").first().text().trim();
        let header = section.find("span.header-info");
        header.find("a").remove();
        header.find("small").remove();
        let dateText = header.text().replace("作者：", "").trim();

        let content = section.find("div.single-post").html() || "";
        // <strong>...</strong> add </br>
        content = content.replace(/<strong>(.*?)<\/strong>/g, (match, p1) => {
            return `<strong>${p1}</strong> `;
        });

        let media = new ArticleMedia(id, title, `<html>${content}</html>`);
        media.date = dateText
        media.author = author;
        media.refer = "https://hive.indienova.com";

        return media;
    }

}

(function () {
    const indienova = new Indienova();
    indienova.init();
})();

export default Indienova;