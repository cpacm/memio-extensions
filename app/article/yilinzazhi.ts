import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, ItemVolume, ItemChapter, MediaType, ArticleMedia } from '@/core/extension';

class YilinZazhi extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension('yilinzazhi', '意林杂志网', MediaType.Article);
        site.thumbnail = "https://www.yilinzazhi.com/assets/images/logo.png";
        site.baseUrl = "https://www.yilinzazhi.com";
        site.description = "《意林》是由长春市文学艺术界联合会主办的知名文摘期刊，自2003年创刊至今，《意林》以其故事丰富、内容健康和亲和力强备受教师、家长推崇和万千读者喜爱。《意林》杂志网整理收集了《意林》2011年到2024年刊次的电子版本文章！";
        site.categoryList = [
            new SiteUrl('意林杂志', 'https://www.yilinzazhi.com'),
        ];
        site.lang = "zh";
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let htmlResponse = await this.client.request({ url: url, method: "GET", });
        let $nodes = $(htmlResponse.body);

        let zazhiListNodes = $nodes.find('div.year-section ul.issue-list li');

        let items: ExtensionDetail[] = [];
        zazhiListNodes.each((index, element) => {
            let ele = $(element);
            let link = ele.find('a').attr('href') || "";
            let title = ele.find('a').text().trim();
            // 2025/20254/index.html ->  20254
            let id = link.split('/')[1];

            let detail = new ExtensionDetail(id, this.site.baseUrl + "/" + link, title);
            detail.hasChapter = true;
            detail.type = MediaType.Article;
            items.push(detail);
        });

        let extensionList = new ExtensionList(items, page, undefined);

        return extensionList;
    }

    override async requestItemChapter(url: string, id: string): Promise<ExtensionDetail> {
        let htmlResponse = await this.client.request({ url: url, method: "GET", });
        let $nodes = $(htmlResponse.body);

        console.log(htmlResponse.body);

        let mainNode = $nodes.find("div.catalog-container");
        if (mainNode.length > 0) {
            let coverNode = $nodes.find("div.magazine-info img")
            let cover = coverNode.attr("src") || "";
            let thumbnail = url.replace("index.html", cover)

            let title = $nodes.find("h1.magazine-title").text().trim();
            let detail = new ExtensionDetail(id, url, title);
            detail.thumbnail = thumbnail;
            detail.type = MediaType.Article;

            let volumes: ItemVolume[] = [];
            let volumeNodes = $nodes.find("section.catalog-section");

            volumeNodes.each((vIndex, vElement) => {
                let vEle = $(vElement);
                let vTitle = vEle.find("h2.catalog-section-title").text().trim();
                let chapters: ItemChapter[] = [];
                let chapterNodes = vEle.find("div.article-list div.article-item");
                chapterNodes.each((cIndex, cElement) => {
                    let cEle = $(cElement);
                    let cTitle = cEle.find("a").text().trim();
                    let cLink = cEle.find("a").attr("href") || "";
                    let cUrl = url.replace("index.html", cLink)
                    // articles/yigerendecunzhuang.html -> yigerendecunzhuang
                    let cId = cLink.split('/')[1].replace('.html', '');

                    let chapter = new ItemChapter(cId, cUrl, cTitle);
                    chapters.push(chapter);
                });
                let volume = new ItemVolume(vTitle, chapters);
                volumes.push(volume);
            });

            detail.volumes = volumes;
            return detail;
        } else {
            let title = $nodes.find("h1").text().trim();
            let cover = $nodes.find("div.sidebarBlock img").attr("src") || "";
            // ../../upload/image/2022/yl20228.jpg -> 	https://www.yilinzazhi.com/upload/image/2022/yl20228.jpg
            let thumbnail = this.site.baseUrl + "/" + cover.replace("../../", "");

            let detail = new ExtensionDetail(id, url, title);
            detail.thumbnail = thumbnail;
            detail.type = MediaType.Article;

            let catalog = $nodes.find("div.maglistbox dl");
            let volumes: ItemVolume[] = [];
            catalog.each((vIndex, vElement) => {
                let vEle = $(vElement);
                let vTitle = vEle.find("dt").text().trim();
                let chapters: ItemChapter[] = [];
                let chapterNodes = vEle.find("dd a");
                chapterNodes.each((cIndex, cElement) => {
                    let cEle = $(cElement);
                    let cTitle = cEle.text().trim();
                    let cLink = cEle.attr("href") || "";
                    let cUrl = url.replace("index.html", cLink)
                    // articles/yigerendecunzhuang.html -> yigerendecunzhuang
                    let cId = cLink.split('.')[0] || "";

                    let chapter = new ItemChapter(cId, cUrl, cTitle);
                    chapters.push(chapter);
                });
                let volume = new ItemVolume(vTitle, chapters);
                volumes.push(volume);
            });

            detail.volumes = volumes;
            return detail;
        }
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {

        let htmlResponse = await this.client.request({ url: url, method: "GET", });
        let $nodes = $(htmlResponse.body);

        let articleNode = $nodes.find("article.article-main");
        if (articleNode.length > 0) {
            let title = articleNode.find("h1.article-title").text().trim();
            let category = articleNode.find("span.category").text().trim();

            let content = articleNode.find("div.article-content").html() || "";
            let media = new ArticleMedia(id, title, `<html>${content}</html>`);
            media.date = category;

            return media;
        } else {
            let title = $nodes.find("div.blkContainerSblk h1").text().trim();
            let contentNode = $nodes.find("div.blkContainerSblkCon");
            contentNode.find("div.contentAd").remove();
            contentNode.find("div.article_pdf").remove();
            let content = contentNode.html() || "";
            let media = new ArticleMedia(id, title, `<html>${content}</html>`);
            return media;
        }

    }

}


(function () {
    const yilin = new YilinZazhi();
    yilin.init();
})();

export default YilinZazhi;