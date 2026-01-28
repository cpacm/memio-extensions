import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class YmGal extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("ymgal", "月幕Galgame", MediaType.Article);
        site.baseUrl = "https://www.ymgal.games";
        site.lang = "zh";
        site.description = "月幕Galgame, 属于中国的美少女游戏交流平台！从资讯到评测、wiki到感想、CG到表情包，你想要的全都在这里，来和我们一起打造更适合Galgame爱好者的全生态！";
        site.thumbnail = "https://www.ymgal.games/favicon.ico";
        site.categoryList = [
            // https://www.ymgal.games/co/topic/list?type=NEWS&page=4
            new SiteUrl("资讯", "/co/topic/list?type=NEWS&page={page}"),
            new SiteUrl("专栏", "/co/topic/list?type=COLUMN&page={page}"),
        ];
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {

        let pageUrl = this.site.baseUrl + url.replace("{page}", page.toString());
        let nextPageUrl = this.site.baseUrl + url.replace("{page}", (page + 1).toString());

        const htmlResponse = await this.client.request({
            url: pageUrl,
            method: "GET",
            contentType: "application/json",
        });

        let jsonContent = htmlResponse.body;
        try {
            let data = JSON.parse(jsonContent);
            let items: ExtensionDetail[] = [];
            for (let itemData of data.data) {
                let id = itemData.topicId;
                let title = itemData.title;
                let link = this.site.baseUrl + "/co/article/" + id;
                let thumbnail = itemData.mainImg || "";
                let description = itemData.introduction.trim() || "";
                let author = itemData.createAt || "";
                let categoty = itemData.topicCategory + " | " + itemData.publishTimeText;

                let item = new ExtensionDetail(id, link, title);
                item.description = description;
                item.type = MediaType.Article;
                item.thumbnail = thumbnail;
                item.category = categoty;
                item.author = author;
                items.push(item);
            }
            let hasMore = items.length >= 10;
            return new ExtensionList(items, page, hasMore ? nextPageUrl : undefined);
        } catch (e) {
            console.error("YmGal 解析错误", e);
            return new ExtensionList([], page, undefined);
        }
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {

        const htmlResponse = await this.client.request({
            url: url,
            method: "GET",
        });

        let $nodes = $(htmlResponse.body);

        let mainContent = $nodes.find("div#main-content");
        let title = mainContent.find("h1").text().trim();
        let article = mainContent.find("article");
        // filter a tag
        article.find("a").each((index, element) => {
            let aNode = $(element);
            let href = aNode.attr("href");
            if (href && href.startsWith("/linkfilter?url=")) {
                ///linkfilter?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DEhmc5PtBZYA%2F -> https://www.youtube.com/watch?v=Ehmc5PtBZYA
                let urlParam = decodeURIComponent(href.replace("/linkfilter?url=", ""));
                aNode.attr("href", urlParam);
            }
        });
        let media = new ArticleMedia(id, title, "<html>" + article.html() + "</html>");
        return media;
    }

}

(function () {
    const ymGal = new YmGal();
    ymGal.init();
})();

export default YmGal;