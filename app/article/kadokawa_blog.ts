import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class KadokawaBlog extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("kadokawa_blog", "角編新聞台", MediaType.Article);
        site.baseUrl = "https://www.kadokawa.com.tw";
        site.description = "角編新聞台"
        site.thumbnail = "https://img.shoplineapp.com/media/image_clips/655dc24c5782ce002011c5db/original.png?1700643404";
        site.lang = "zh-TW";
        site.categoryList = [
            new SiteUrl("角編新聞台", "https://www.kadokawa.com.tw/blog/posts?page={page}"),
        ];
        site.searchList = [];
        return site;
    }

    async requestItemList(url: string, page: number): Promise<ExtensionList> {
        var realUrl = url.replace("{page}", page.toString());
        var nextUrl = url.replace("{page}", (page + 1).toString());
        var htmlResponse = await this.client.request({ url: realUrl, method: "GET", });
        var html = htmlResponse.body;
        let $nodes = $(html);
        var listNode = $nodes.find("div.List-item");
        if (!listNode || listNode.length == 0) {
            return new ExtensionList([], page ? page : 1, undefined);
        }
        var items: ExtensionDetail[] = [];
        listNode.each((_index, element) => {
            let ele = $(element);
            let link = ele.children("a").attr("href");
            if (link) {
                let coverSet = ele.find("div.List-item-excerpt img").attr("data-srcset");
                let cover = coverSet?.split(" ")[0];
                let title = ele.find("h2.List-item-title").text();
                let description = ele.find("div.List-item-preview").text();
                let update = ele.find("span.primary-border-color-after").text();
                let pattern = new RegExp('/blog/posts/(.*?)$', 'i');
                let id = pattern.exec(link!)?.[1];
                let item = new ExtensionDetail(id!, this.site.baseUrl + link, title);
                item.thumbnail = cover;
                item.description = description;
                item.category = update;
                item.type = MediaType.Article;
                items.push(item);
            }
        });
        let disableNext = true;
        const pageNode = $nodes.find("ul.pagination li.post-pagination-btn i.fa-angle-right");
        if (pageNode && pageNode.length > 0) {
            disableNext = false;
        }
        return new ExtensionList(items, page, disableNext ? undefined : nextUrl);

    }

    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        var htmlResponse = await this.client?.request({ url: url, method: "GET" });
        var html = htmlResponse.body;
        let $nodes = $(html);

        let title = $nodes.find("div.Post h1.Post-title").text().trim();
        let date = $nodes.find("div.Post div.Post-date").text().trim();
        let findedContent = $nodes.find("div.Post div.Post-content").first();
        let content = findedContent.html();
        var articleMedia = new ArticleMedia(id, title, content);
        articleMedia.date = date;
        return articleMedia;
    }
}

(function () {
    const blog = new KadokawaBlog();
    blog.init();
})();

export default KadokawaBlog;