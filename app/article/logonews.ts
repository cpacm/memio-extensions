import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia, Channel, ChannelType } from '@/core/extension';

class LogoNews extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("logonews", "标志情报局", MediaType.Article);
        site.baseUrl = "https://www.logonews.cn";
        site.description = "标志情报局24小时提供全球最新最全的新标志、新LOGO、标志新闻、标志资讯、LOGO新闻、LOGO设计欣赏、标志揭晓、国外LOGO设计欣赏等情报资讯。";
        site.thumbnail = "https://www.logonews.cn/favicon-64x64.png";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("新闻频道", "category/news"),
            new SiteUrl("欣赏评论", "category/ead"),
        ];
        site.channel = new Channel(ChannelType.List, "分类", "category");

        site.searchList = [
            new SiteUrl("Search...", ""),
        ];

        site.useGuide = `## 如何获取分类名称

1. 访问网站 [标志情报局](https://www.logonews.cn/)，进入想要访问的分类页面；
2. 在其网页链接上，例如 \`https://www.logonews.cn/category/news\`，其中的 \`category/news\` 就是您需要填入的分类名称。
`;

        return site;
    }

    parseArticleNodes(articleNodes: JQuery<HTMLElement>) {
        let items: ExtensionDetail[] = [];
        articleNodes.each((index, element) => {
            let ele = $(element);
            if (ele.hasClass("ads")) {
                return; // skip ad item
            }
            let thumbnail = ele.find("div.cover-image").attr("data-src") || "";

            let title = ele.find("div.post-doo h3").text().trim();
            let link = ele.find("a.article-link").attr("href") || "";
            let date = ele.find("div.article-meta time").attr("datetime") || "";
            //https://www.logonews.cn/atletico-dallas-new-logo.html => atletico-dallas-new-logo
            let id = link.match(/logonews\.cn\/(.*?)\.html/)?.[1] || "";
            let item = new ExtensionDetail(id, link, title);
            item.thumbnail = thumbnail;
            item.status = date;
            item.type = MediaType.Article;
            items.push(item);
        });
        return items;
    }


    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let pageUrl = page == 1 ? this.site.baseUrl + "/" + url : this.site.baseUrl + "/" + url + "/page/" + page;
        let nextPageUrl = this.site.baseUrl + "/" + url + "/page/" + (page + 1);
        const htmlResponse = await this.client.request({
            url: pageUrl,
            method: "GET",
        });

        const html = htmlResponse.body;

        let $nodes = $(html);
        let articleNodes = $nodes.find("div.postlist div.article-item-card");

        let items: ExtensionDetail[] = this.parseArticleNodes(articleNodes);

        let pagination = $nodes.find("div.pagination ul li");
        let hasNextText = pagination.last().find("a").text().trim().indexOf("下一页") >= 0;
        let hasNext = items.length >= 15 || hasNextText;

        return new ExtensionList(items, page ? page : 1, hasNext ? nextPageUrl : undefined);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let pageUrl = page == 1 ? this.site.baseUrl + "/" + key : this.site.baseUrl + "/" + key + "/page/" + page;
        let nextPageUrl = this.site.baseUrl + "/" + key + "/page/" + (page + 1);
        const htmlResponse = await this.client.request({
            url: pageUrl,
            method: "GET",
        });

        const html = htmlResponse.body;
        let $nodes = $(html);
        let articleNodes = $nodes.find("div.postlist div.article-item-card");
        let items: ExtensionDetail[] = this.parseArticleNodes(articleNodes);

        let pagination = $nodes.find("div.pagination ul li");
        let hasNextText = pagination.last().find("a").text().trim().indexOf("下一页") >= 0;
        let hasNext = items.length >= 15 || hasNextText;

        return new ExtensionList(items, page ? page : 1, hasNext ? nextPageUrl : undefined);
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let pageUrl = page == 1 ? this.site.baseUrl + "/search/" + encodeURIComponent(keyword) : this.site.baseUrl + "/search/" + encodeURIComponent(keyword) + "/page/" + page;
        let nextPageUrl = this.site.baseUrl + "/search/" + encodeURIComponent(keyword) + "/page/" + (page + 1);
        const htmlResponse = await this.client.request({
            url: pageUrl,
            method: "GET",
        });

        console.log("requestItemMedia url:", pageUrl);
        console.log("htmlResponse:", htmlResponse);

        const html = htmlResponse.body;
        let $nodes = $(html);
        let articleNodes = $nodes.find("div.mainsss div.post");


        let items: ExtensionDetail[] = [];
        articleNodes.each((index, element) => {
            let ele = $(element);
            if (ele.hasClass("ads")) {
                return; // skip ad item
            }
            let thumbnail = ele.find("div.image").attr("data-src") || "";

            let title = ele.find("h2.search_title").text().trim();
            let link = ele.find("h2.search_title a").attr("href") || "";
            //https://www.logonews.cn/atletico-dallas-new-logo.html => atletico-dallas-new-logo
            let id = link.match(/logonews\.cn\/(.*?)\.html/)?.[1] || "";
            let item = new ExtensionDetail(id, link, title);
            item.thumbnail = thumbnail;
            item.type = MediaType.Article;
            items.push(item);
        });

        let pagination = $nodes.find("div.pagination ul li");
        let hasNextText = pagination.last().find("a").text().trim().indexOf("下一页") >= 0;
        let hasNext = items.length >= 10 || hasNextText;

        return new ExtensionList(items, page ? page : 1, hasNext ? nextPageUrl : undefined)
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const htmlResponse = await this.client.request({
            url: url,
            method: "GET",
        });


        const html = htmlResponse.body;
        let $nodes = $(html);

        console.log("html:", html);
        let article = $nodes.find("article#post_content");
        let title = article.find("h1.h1").text().trim();
        let date = article.find("span.category_and_post_time span").text().trim();
        let contentNode = article.find("div.article_content");
        // remove all a tag but keep inner text
        contentNode.find("img").each((index, element) => {
            let ele = $(element);
            let dataSrc = ele.attr("data-src") || "";
            if (dataSrc) {
                ele.attr("src", dataSrc);
            }
        });
        let contentHtml = contentNode.html() || "";

        let articleMedia = new ArticleMedia(id, title, contentHtml);
        articleMedia.date = date;
        return articleMedia;
    }


}

(function () {
    const logonews = new LogoNews();
    logonews.init();
})();

export default LogoNews;