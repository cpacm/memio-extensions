import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class World8 extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("8world", "8视界新闻网", MediaType.Article);
        site.baseUrl = "https://www.8world.com";
        site.thumbnail = "https://www.8world.com/themes/custom/mc_8world_theme/favicon.ico";
        site.description = "《8视界新闻网》提供最全面的中文新闻报道，聚焦新加坡及全球热点和社会话题，带你了解新加坡、东南亚、中港台和国际时事。点击浏览 8world News，查阅今日新加坡及全球动态。";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("即时", "realtime"),
            new SiteUrl("新加坡", "singapore"),
            new SiteUrl("东南亚", "southeast-asia"),
            new SiteUrl("中港台", "greater-china"),
            new SiteUrl("国际", "world"),
            new SiteUrl("财经", "finance"),
            new SiteUrl("体育", "sports"),
            new SiteUrl("活动预告", "community-events"),
        ];

        site.searchList = [
            //https://www.8world.com/search?q=%E9%A6%99%E6%B8%AF%E5%A4%A7%E7%81%AB
            new SiteUrl("关键词", site.baseUrl + "/search?q={keyword}&page={page}"),
        ];


        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let api = this.site.baseUrl + `/${url}`;
        if (page > 1) {
            api += `?page=${page - 1}`;
        }
        let nextPageApi = this.site.baseUrl + `/${url}?page=${page}`;

        const response = await this.client.request({
            url: api,
            method: "GET",
        });

        let $nodes = $(response.body);
        let itemNodes = $nodes.find("div.layout--third-third-one-third article.article");

        let items: ExtensionDetail[] = [];
        itemNodes.each((index, element) => {
            let ele = $(element);
            let link = ele.find("div.article-header a").attr("href") || "";
            let id = link.split("-").pop() || "";
            let title = ele.find("div.article-header a span").text().trim();

            let cover = ele.find("div.article-thumbnail img").attr("src") || "";
            let category = ele.find("ul.article-meta-ul li").eq(0).text().trim();
            let date = ele.find("div.article-time time").text().trim();

            let item = new ExtensionDetail(id, this.site.baseUrl + link, title);
            item.thumbnail = cover;
            item.category = category;
            item.status = date;
            item.type = MediaType.Article;
            items.push(item);
        });

        let pagination = $nodes.find("nav.pager ul.pager__items li");
        let lastPage = pagination.last().find("a").attr("href") || "";
        let maxPage = lastPage.split("page=").pop() || "";
        console.log("maxPage:", maxPage);
        let hasMore = (page - 1) < parseInt(maxPage);

        return new ExtensionList(items, page, hasMore ? nextPageApi : undefined);
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let api = `https://kkwfbq38xf-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=KKWFBQ38XF&x-algolia-api-key=7f9d037180da82e7ae64354a505caa4a`;
        let formData = `{"requests":[{"indexName":"eightworldrevamp-ezrqv5hx","params":"query=${encodeURIComponent(keyword)}&maxValuesPerFacet=20&page=${page-1}&hitsPerPage=12"}]}`;

        const response = await this.client.request({
            url: api,
            method: "POST",
            body: formData,
            headers: [
                { key:"Content-Type", value: "application/json" }
            ]
        });

        let result = JSON.parse(response.body);
        let itemNodes = result.results[0].hits;

        let items: ExtensionDetail[] = [];
        itemNodes.map((element: any) => {
            console.log("element:", JSON.stringify(element));
            let id= element.nid;
            let link = this.site.baseUrl + `/node/${id}`;
            let title = element.title;

            let cover = element.hero_image_url;
            let description = element.paragraph_text;
            // if description is array, join it
            if (Array.isArray(description)) {
                description = description.join("\n");
            }
            let category = element.categories;
            let timeStamp = element.changed;
            let author = element.author;
            let date  = new Date(timeStamp * 1000).toLocaleDateString();

            let item = new ExtensionDetail(id, link, title);
            item.thumbnail = cover;
            item.category = category;
            item.status = date;
            item.author = author;
            item.description = description;
            item.type = MediaType.Article;
            items.push(item);
        });

        let maxPage = result.results[0].nbPages;
        console.log("maxPage:", maxPage);
        let hasMore = page < maxPage;

        return new ExtensionList(items, page, hasMore ? url : undefined);
    }


    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const response = await this.client.request({
            url: url,
            method: "GET",
        });

        let $nodes = $(response.body);
        let detailNode = $nodes.find("div.layout-content");
        let title = detailNode.find("div.article-intro h1").text().trim();
        let date = detailNode.find("div.article-info li.publish").text().split(": ").pop()?.trim();
        let bannerDiv = detailNode.find("div.wrapper > figure.article-media div.article-image").attr("style") || detailNode.find("div.wrapper > figure.article-media div.vjs-poster").attr("style") || "";
        let match = bannerDiv.match(/url\(['"]?(.*?)['"]?\)/);
        let banner = match ? match[1] : "";
        let bannerTitle = detailNode.find("div.wrapper > figure.article-media figcaption").text().trim();

        let content = detailNode.find("div.article-content");
        content.find("div.programtic-ads").remove();
        content.find("div.text-long").append("<hr/>");
        let contentText = content.html();

        let fullContent = `<html><img src="${banner}" alt="${bannerTitle}"/>${contentText}</html>`;

        let media = new ArticleMedia(id, title, fullContent);
        media.date = date;

        return media;
    }

}

(function () {
    let world8 = new World8();
    world8.init();
})();


export default World8;