import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, MediaType, ArticleMedia, Channel, ChannelType } from '@/core/extension';

class Douban extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("douban", "豆瓣", MediaType.Article)
        site.baseUrl = "https://www.douban.com";
        site.description = "提供图书、电影、音乐唱片的推荐、评论和价格比较，以及城市独特的文化生活。";
        site.thumbnail = "https://www.douban.com/favicon.ico";
        site.categoryList = [
            { name: "书籍书评", url: "https://book.douban.com/review/best/" },
            { name: "电影影评", url: "https://movie.douban.com/review/best/" },
            { name: "音乐乐评", url: "https://music.douban.com/review/latest/" }
        ];
        site.lang = "zh";

        site.channel = new Channel(ChannelType.List, "小组 ID", "group");
        site.useGuide = `## 如何获取小组 ID

1. 打开豆瓣小组页面，例如 [豆瓣小组](https://www.douban.com/group/explore)
2. 在浏览器地址栏中找到你想要进入的小组的，进入后URL格式通常为 https://www.douban.com/group/634017/，其中 634017 即为小组 ID。
3. 将该 ID 填入扩展配置中的小组 ID 字段。`
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let start = (page - 1) * 10;
        let requestUrl = url + `?start=${start}`;
        let nextUrl = url + `?start=${start + 10}`;
        let htmlResponse = await this.client.request({
            url: requestUrl,
            method: "GET",
        });

        let $nodes = $(htmlResponse.body);
        let items: ExtensionDetail[] = [];

        let nodeList = $nodes.find("div.article div.review-list div.review-item");
        nodeList.each((index, element) => {
            let ele = $(element);
            let titleElement = ele.find("div.main-bd h2");
            let title = titleElement.text().trim();
            let url = titleElement.find("a").attr("href") || "";

            //https://book.douban.com/review/17201029/ --> 17201029
            let idMatch = url.match(/\/review\/([\d]+)/);
            let id = idMatch ? idMatch[1] : url;

            let author = ele.find("header.main-hd a.name").text().trim();
            let date = ele.find("header.main-hd span.main-meta").text().trim();

            let thumbnailElement = ele.find("a.subject-img img");
            let thumbnail = thumbnailElement.attr("src") || "";
            let category = thumbnailElement.attr("title") || "";

            let summaryElement = ele.find("div.short-content");
            summaryElement.find("p,a").remove();
            let summary = summaryElement.text().trim();


            let detail = new ExtensionDetail(id, url, title);
            detail.author = author;
            detail.category = category;
            detail.thumbnail = thumbnail;
            detail.description = summary;
            detail.status = date;
            detail.type = MediaType.Article;

            items.push(detail);
        });

        let countText = $nodes.find("div.paginator span.count").text().trim();
        // (共50条) -> 50
        let total = 0;
        let countMatch = countText.match(/共([\d]+)条/);
        if (countMatch) {
            total = parseInt(countMatch[1]);
        }

        let count = 10 * page;
        let hasMore = total > count;

        return new ExtensionList(items, page, hasMore ? nextUrl : undefined);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let start = (page - 1) * 30;
        let requestUrl = `https://www.douban.com/group/${key}/discussion?start=${start}&type=new`;

        let htmlResponse = await this.client.request({
            url: requestUrl,
            method: "GET",
        });

        let $nodes = $(htmlResponse.body);
        let items: ExtensionDetail[] = [];

        let nodeList = $nodes.find("div#content table.olt tr");
        nodeList.find("tr.th").remove();
        nodeList.each((index, element) => {
            let ele = $(element);
            let titleElement = ele.find("td.title a");
            let title = titleElement.text().trim();
            let url = titleElement.attr("href") || "";
            //https://www.douban.com/group/topic/177200223?_spm_id=MTg0MTYwMjEz --> 177200223
            let idMatch = url.match(/\/topic\/([\d]+)/);
            let id = idMatch ? idMatch[1] : url;

            let author = ele.find("td:eq(1) a").text().trim();
            let date = ele.find("td.time").text().trim();

            let detail = new ExtensionDetail(id, url, title);
            detail.author = author;
            detail.category = date;
            detail.type = MediaType.Article;

            items.push(detail);
        });

        let hasMore = nodeList.length >= 30;
        let nextUrl = hasMore ? `https://www.douban.com/group/${key}/discussion?start=${start + 30}&type=new` : undefined;

        return new ExtensionList(items, page, nextUrl);
    }

    private async requestReviewMedia(url: string, id: string): Promise<ExtensionMedia> {
        // https://book.douban.com/review/17206526/
        let htmlResponse = await this.client.request({
            url: url,
            method: "GET",
        });
        let $nodes = $(htmlResponse.body);
        let content = $nodes.find("div.review-content");
        let author = content.attr("data-author") || "";
        let title = $nodes.find("div.article h1").text().trim();
        let date = $nodes.find("header.main-hd div.main-meta span").first().text().trim();

        let media = new ArticleMedia(id, title, `<html>${content.html()}</html>`);
        media.author = author;
        media.date = date;
        media.isMarkdown = false;
        return media;
    }

    private async requestTopicMedia(url: string, id: string): Promise<ExtensionMedia> {
        // https://www.douban.com/group/topic/314128071
        let htmlResponse = await this.client.request({
            url: url,
            method: "GET",
        });
        let $nodes = $(htmlResponse.body);
        let content = $nodes.find("div.rich-content");
        let author = $nodes.find("div.topic-doc h3 span.from").text().trim();
        let title = $nodes.find("div.article h1").text().trim();
        let date = $nodes.find("div.topic-doc div.topic-meta span.create-time").text().trim();

        let media = new ArticleMedia(id, title, `<html>${content.html()}</html>`);
        media.author = author;
        media.date = date;
        media.isMarkdown = false;
        return media;
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        // Determine if it's a review or topic
        let media: ExtensionMedia;
        if (url.includes("/review/")) {
            media = await this.requestReviewMedia(url, id);
        } else if (url.includes("/topic/")) {
            media = await this.requestTopicMedia(url, id);
        } else {
            media = new ExtensionMedia(MediaType.Article, id);
        }
        return media;
    }

}

(function () {
    let rule = new Douban();
    rule.init();
})();

export default Douban;