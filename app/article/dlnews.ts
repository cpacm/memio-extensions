import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class DLNews extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("dlnews", "DL News", MediaType.Article);
        site.baseUrl = "https://www.dlnews.com";
        site.description = "DLNews is a news portal providing the latest news and updates from Dalian, China.";
        site.thumbnail = "https://www.dlnews.com/pf/resources/favicon-light.svg?d=816";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("All News", ""),
            new SiteUrl("DeFi", "defi"),
            new SiteUrl("Deals", "deals"),
            new SiteUrl("Llama U", "llama-u"),
            new SiteUrl("Markets", "markets"),
            new SiteUrl("People&Culture", "people-culture"),
            new SiteUrl("Regulation", "regulation"),
            new SiteUrl("Snapshot", "snapshot"),
            new SiteUrl("Web3", "web3"),
            new SiteUrl("Opinion", "opinion"),
        ];
        site.searchList = [
            new SiteUrl("Search in DL News", "q={keyword}"),
        ];
        return site;
    }

    private parseArticleDetails(data: any): ExtensionDetail[] {

        let items: ExtensionDetail[] = [];
        data.content_elements.forEach((article: any) => {
            let id = article._id;
            let title = article.headlines.basic;
            let link = article.canonical_url;

            let promoItem = article.promo_items;
            let cover = promoItem.basic.url || "";
            let date = formatDateToYMD(article.publish_date);
            let author = article.credits.by[0].name || "";
            let category = article.taxonomy.primary_section.name || "";
        
            let item = new ExtensionDetail(id, this.site.baseUrl + link, title);
            item.thumbnail = cover;
            item.category = category;
            item.author = author;
            item.status = date;
            item.type = MediaType.Article;
            items.push(item);
            
        });

        return items;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let api = "https://api.dlnews.com/articles/search/v2";
        let size = 9;
        let offset = (page - 1) * size;
        let params = `sort=display_date%3Adesc&offset=${offset}&size=${size}&excludeSection=%2Fresearch%2C%2Fresearch%2Finternal%2C%2Fresearch%2Fexternal`;
        let category = url.length > 0 ? `&vertical=${url}` : "";
        let requestUrl = `${api}?${params}${category}`;

        const response = await this.client.request({
            url: requestUrl,
            method: "GET",
        });

        let data = JSON.parse(response.body);
        if (!data || !data.content_elements || data.content_elements.length == 0) {
            return new ExtensionList([], page ? page : 1, undefined);
        }

        let items = this.parseArticleDetails(data);
        let hasMore = data.next < data.count;

        return new ExtensionList(items, page, hasMore ? api : undefined);
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let api = "https://api.dlnews.com/articles/search/v2";
        let size = 9;
        let offset = (page - 1) * size;
        let params = `sort=display_date%3Adesc&offset=${offset}&size=${size}&excludeSection=%2Fresearch%2C%2Fresearch%2Finternal%2C%2Fresearch%2Fexternal`;
        let requestUrl = `${api}?${params}${encodeURIComponent(`&q=${keyword}`)}`;

        const response = await this.client.request({
            url: requestUrl,
            method: "GET",
        });

        let data = JSON.parse(response.body);
        if (!data || !data.content_elements || data.content_elements.length == 0) {
            return new ExtensionList([], page ? page : 1, undefined);
        }

        let items = this.parseArticleDetails(data);
        let hasMore = data.next < data.count;

        return new ExtensionList(items, page, hasMore ? api : undefined);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const response = await this.client.request({
            url: url,
            method: "GET",
        });

        let $nodes = $(response.body);
        let contentNode = $nodes.find("article.article-body-wrapper");
        contentNode.find("iframe").remove();

        let articleHero = $nodes.find("div.article-hero");
        let title = articleHero.find("h1").text().trim();
        let cover = articleHero.find("picture img").attr("src") || "";
        let author = $nodes.find("div#sidebar-content a.story-author-hover").text().trim() || "";
        let date = $nodes.find("div#sidebar-content span").eq(1).text().trim() || "";

        let contentHtml = `<html><img src="${cover}" /><br>` + contentNode.html() + "</html>";

        let media = new ArticleMedia(id, title, contentHtml);
        media.author = author;
        media.date = date;

        return media;
    }

}

(function () {
    const dlnews = new DLNews();
    dlnews.init();
})();

export default DLNews;