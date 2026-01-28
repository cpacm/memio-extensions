import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class RareHistoricalPhotos extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("rare-historical-photos", "Rare Historical Photos", MediaType.Article);
        site.baseUrl = "https://www.rarehistoricalphotos.com";
        site.description = "A collection of rare and historical photographs from around the world.";
        site.thumbnail = "https://rarehistoricalphotos.com/wp-content/uploads/2022/04/cropped-rarehistoricalphotos.png";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("Home", ""),
            new SiteUrl("Africa", "category/africa/"),
            new SiteUrl("Arab World", "category/arab-world/"),
            new SiteUrl("Australia", "category/australia/"),
            new SiteUrl("Britain", "category/britain/"),
            new SiteUrl("Canada", "category/canada/"),
            new SiteUrl("China", "category/china/"),
            new SiteUrl("Cold War", "category/cold-war/"),
            new SiteUrl("Cuba", "category/cuba/"),
            new SiteUrl("Culture and People", "category/culture-and-people/"),
            new SiteUrl("Finland", "category/finland/"),
            new SiteUrl("France", "category/france/"),
            new SiteUrl("German Empire", "category/german-empire/"),
            new SiteUrl("Germany", "category/germany/"),
            new SiteUrl("Gulf War", "category/gulf-war/"),
            new SiteUrl("Holocaust", "category/holocaust/"),
            new SiteUrl("Israel", "category/israel/"),
            new SiteUrl("Italy", "category/italy/"),
            new SiteUrl("Japan", "category/japan/"),
            new SiteUrl("Korea", "category/korea/"),
            new SiteUrl("Latin America", "category/latin-america/"),
            new SiteUrl("Nazi Germany", "category/nazi-germany/"),
            new SiteUrl("Poland", "category/poland/"),
            new SiteUrl("Russia", "category/russia/"),
            new SiteUrl("Southeast Asia", "category/southeast-asia/"),
            new SiteUrl("Soviet Union", "category/soviet-union/"),
            new SiteUrl("Spain", "category/spain/"),
            new SiteUrl("Sports", "category/sports/"),
            new SiteUrl("Sweden", "category/sweden/"),
            new SiteUrl("Technology", "category/weapons-technology/"),
            new SiteUrl("USA", "category/usa/"),
            new SiteUrl("Vietnam War", "category/vietnam-war/"),
            new SiteUrl("Women", "category/women/"),
            new SiteUrl("World War I", "category/ww1/"),
            new SiteUrl("World War II", "category/ww2/"),
        ];

        site.searchList = [
            new SiteUrl("Search...", ""),
        ];
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let pageUrl = this.site.baseUrl + "/" + url + "/page/" + page + "/";
        const htmlResponse = await this.client.request({
            url: pageUrl,
            method: "GET",
        });

        const html = htmlResponse.body;
        let $nodes = $(html);
        let articleNodes = $nodes.find("main#main div.posts-wrapper article");

        let items: ExtensionDetail[] = [];
        articleNodes.each((index, element) => {
            let ele = $(element);
            let cover = ele.find("div.post-image img").attr("src") || "";
            let title = ele.find("div.post-details h2.post-title a").text().trim();
            let link = ele.find("div.post-details h2.post-title a").attr("href") || "";
            //https://rarehistoricalphotos.com/lysenko-brothers/  => lysenko-brothers
            let id = link.match(/rarehistoricalphotos\.com\/(.*?)\/$/)?.[1] || "";
            let description = ele.find("div.post-details p").text().trim();
            let item = new ExtensionDetail(id, link, title);
            item.thumbnail = cover;
            item.description = description;
            item.type = MediaType.Article;
            items.push(item);
        });

        let pagination = $nodes.find("main#main div.pagination");
        // find pagination a with text "Next"
        let nextPageNode = pagination.find("a.next");
        let hasNext = items.length >= 20 && nextPageNode.length != 0;

        return new ExtensionList(items, page ? page : 1, hasNext ? url : undefined);
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {

        //https://rarehistoricalphotos.com/page/1/?s=Brothers
        let pageUrl = this.site.baseUrl + "/page/" + page + "/?s=" + encodeURIComponent(keyword);
        let nextPageUrl = this.site.baseUrl + "/page/" + (page + 1) + "/?s=" + encodeURIComponent(keyword);

        const htmlResponse = await this.client.request({
            url: pageUrl,
            method: "GET",
        });

        const html = htmlResponse.body;
        let $nodes = $(html);
        let articleNodes = $nodes.find("main#main div.posts-wrapper article");

        let items: ExtensionDetail[] = [];
        articleNodes.each((index, element) => {
            let ele = $(element);
            let cover = ele.find("div.post-image img").attr("src") || "";
            let title = ele.find("div.post-details h2.post-title a").text().trim();
            let link = ele.find("div.post-details h2.post-title a").attr("href") || "";
            //https://rarehistoricalphotos.com/lysenko-brothers/  => lysenko-brothers
            let id = link.match(/rarehistoricalphotos\.com\/(.*?)\/$/)?.[1] || "";
            let description = ele.find("div.post-details p").text().trim();
            let item = new ExtensionDetail(id, link, title);
            item.thumbnail = cover;
            item.description = description;
            item.type = MediaType.Article;
            items.push(item);
        });

        let pagination = $nodes.find("main#main div.pagination");
        // find pagination a with text "Next"
        let nextPageNode = pagination.find("a.next");
        let hasNext = items.length >= 20 && nextPageNode.length != 0;

        return new ExtensionList(items, page ? page : 1, hasNext ? nextPageUrl : undefined);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let pageUrl = url;
        const htmlResponse = await this.client.request({
            url: pageUrl,
            method: "GET",
        });

        const html = htmlResponse.body;
        let $nodes = $(html);
        let articleNode = $nodes.find("main#main article.post");
        let header = articleNode.find("header.post-image");
        let title = header.find("h1.post-title").text().trim();
        let date = articleNode.find("div.signature p").text().trim();
        let content = articleNode.find("section.post-content");

        let media = new ArticleMedia(id, title, "<html>" + content.html() + "</html>");
        media.date = date;
        return media;
    }

}

(function () {
    const rareHistoricalPhotos = new RareHistoricalPhotos();
    rareHistoricalPhotos.init();
})();
export default RareHistoricalPhotos;