import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, PictureMedia, MediaType, ChannelType, Channel } from '@/core/extension';

class Hpoi extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("hpoi", "Hpoi 手办维基", MediaType.Picture);
        site.baseUrl = "https://www.hpoi.net";
        site.description = "资讯、资料，舔图、晒图，共同建设一个属于大家的手办模型中文网吧！";
        site.thumbnail = "https://www.hpoi.net/favicon.ico";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("手办-一天热度", "category=100&order=hitsDay"),
            new SiteUrl("手办-一周热度", "category=100&order=hits7Day"),
            new SiteUrl("手办-总热度", "category=100&order=hits"),
            new SiteUrl("手办-入库", "category=100&order=add"),
            new SiteUrl("手办-发售", "category=100&order=release"),

            new SiteUrl("动漫模型-一天热度", "category=200&order=hitsDay"),
            new SiteUrl("动漫模型-一周热度", "category=200&order=hits7Day"),
            new SiteUrl("动漫模型-总热度", "category=200&order=hits"),
            new SiteUrl("动漫模型-入库", "category=200&order=add"),
            new SiteUrl("动漫模型-发售", "category=200&order=release"),

            new SiteUrl("真实模型-一天热度", "category=500&order=hitsDay"),
            new SiteUrl("真实模型-一周热度", "category=500&order=hits7Day"),
            new SiteUrl("真实模型-总热度", "category=500&order=hits"),
            new SiteUrl("真实模型-入库", "category=500&order=add"),
            new SiteUrl("真实模型-发售", "category=500&order=release"),

            new SiteUrl("毛绒玩具-一天热度", "category=400&order=hitsDay"),
            new SiteUrl("毛绒玩具-一周热度", "category=400&order=hits7Day"),
            new SiteUrl("毛绒玩具-总热度", "category=400&order=hits"),
            new SiteUrl("毛绒玩具-入库", "category=400&order=add"),
            new SiteUrl("毛绒玩具-发售", "category=400&order=release"),

            new SiteUrl("Doll娃娃-一天热度", "category=300&order=hitsDay"),
            new SiteUrl("Doll娃娃-一周热度", "category=300&order=hits7Day"),
            new SiteUrl("Doll娃娃-总热度", "category=300&order=hits"),
            new SiteUrl("Doll娃娃-入库", "category=300&order=add"),
            new SiteUrl("Doll娃娃-发售", "category=300&order=release"),

        ];

        site.searchList = [
            new SiteUrl("全部搜索", "category=10000&order=add&keyword={keyword}"),
        ];
        site.imageRefer = "https://www.hpoi.net";

        site.channel = new Channel(ChannelType.List, "厂商", "campany");
        site.useGuide = `## 如何设置厂商频道
1. 进入 Hpoi 厂商浏览周边页面，选择想要浏览的厂商，例如：https://www.hpoi.net/hobby/all?order=add&company=2511669,取得 URL 中的 company 参数值 2511669 ；
2. 在频道设置中，选择“厂商”，并输入参数值 2511669，保存即可查看该厂商的全部作品。
        `;

        return site;

    }

    private parseItemDetails(nodeList: JQuery<HTMLElement>): ExtensionDetail[] {
        var items: ExtensionDetail[] = [];
        nodeList.each((index, element) => {
            let node = $(element);

            let link = node.find("a").first().attr("href") || "";
            // hobby/98372 -> 98372
            let id = link.split("/").pop() || "";

            let title = node.find("div.hpoi-detail-grid-title a").text().trim() || "";
            let thumbnail = node.find("a img").attr("src") || "";
            let company = node.find("div.hpoi-detail-grid-info span:eq(0)").text().trim() || "";
            let date = node.find("div.hpoi-detail-grid-info span:eq(1)").text().trim() || "";
            let status = node.find("div.hpoi-detail-grid-info span:eq(2)").text().trim() || "";

            let item = new ExtensionDetail(id, this.site.baseUrl + "/" + link, title);
            item.author = company;
            item.type = MediaType.Picture;
            item.hasChapter = false;
            item.category = date;
            item.thumbnail = thumbnail;
            item.status = status;
            items.push(item);
        });
        return items;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let pageurl = this.site.baseUrl + "/hobby/all"
        let body = url + `&part=true&sex=0&r18=0&page=${page}`;

        let htmlResponse = await this.client?.request(
            { url: pageurl, method: "POST", body: body, contentType: "application/x-www-form-urlencoded" }
        );

        let $nodes = $("<div>" + htmlResponse.body + "</div>");

        let nodeList = $nodes.find("ul.hpoi-glyphicons-list li");

        let details = this.parseItemDetails(nodeList);

        let pagination = $nodes.find("div.hpoi-page-box input#pageCount").attr("value");
        let totalPage = parseInt(pagination || "1");
        let hasmore = page < totalPage;
        let nextPage = hasmore ? pageurl : undefined;

        return new ExtensionList(details, page, nextPage);
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let pageurl = this.site.baseUrl + "/hobby/all"
        let body = url.replace("{keyword}", encodeURIComponent(keyword)) + `&part=true&sex=0&r18=0&page=${page}`;

        let htmlResponse = await this.client?.request(
            { url: pageurl, method: "POST", body: body, contentType: "application/x-www-form-urlencoded" }
        );

        let $nodes = $("<div>" + htmlResponse.body + "</div>");

        let nodeList = $nodes.find("ul.hpoi-glyphicons-list > li");
        let details = this.parseItemDetails(nodeList);

        let pagination = $nodes.find("div.hpoi-page-box input#pageCount").attr("value");
        let totalPage = parseInt(pagination || "1");
        let hasmore = page < totalPage;
        let nextPage = hasmore ? pageurl : undefined;

        return new ExtensionList(details, page, nextPage);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let pageurl = this.site.baseUrl + "/hobby/all"
        let body = "order=add&sex=0&r18=0&releaseYear=0&releaseMonth=0&view=3&category=10000&jobId=1&releaseYearCount=0&part=true";
        body = body + `&company=${key}&page=${page}`;

        let htmlResponse = await this.client?.request(
            { url: pageurl, method: "POST", body: body, contentType: "application/x-www-form-urlencoded" }
        );

        let $nodes = $("<div>" + htmlResponse.body + "</div>");

        let nodeList = $nodes.find("ul.hpoi-glyphicons-list > li");
        let details = this.parseItemDetails(nodeList);

        let pagination = $nodes.find("div.hpoi-page-box input#pageCount").attr("value");
        let totalPage = parseInt(pagination || "1");
        let hasmore = page < totalPage;
        let nextPage = hasmore ? pageurl : undefined;

        return new ExtensionList(details, page, nextPage);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {

        let api = this.site.baseUrl + "/hobby/" + id;
        let htmlResponse = await this.client?.request({ url: api, method: "GET" });

        let $nodes = $(htmlResponse.body);

        let title = $nodes.find("div.hpoi-ibox-title p").attr("title") || "";

        let imageNodes = $nodes.find("div#intelligenceModal-content div.av-masonry-container a");
        let images: string[] = [];
        imageNodes.each((index, element) => {
            let node = $(element);
            let imgsrc = node.attr("href") || "";
            if (imgsrc) {
                images.push(imgsrc);
            }
        });
        let media = new PictureMedia(id, title, images);
        media.refer = this.site.baseUrl;
        return media;
    }

}

(function () {
    const hpoi = new Hpoi();
    hpoi.init();
})();

export default Hpoi