import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class Nature extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("nature-research", "Nature Research", MediaType.Article);
        site.baseUrl = "https://www.nature.com";
        site.description = "Nature is a weekly international journal publishing the finest peer-reviewed research in all fields of science and technology.";
        site.thumbnail = "https://www.nature.com/static/images/favicons/nature/favicon.ico";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("All", ""),
            new SiteUrl("Analysis", "analysis"),
            new SiteUrl("Appointments Vacant", "appointments-vacant"),
            new SiteUrl("Article", "article"),
            new SiteUrl("Brief Communication", "brief-communication"),
            new SiteUrl("Brief Communications Arising", "brief-communications-arising"),
            new SiteUrl("British Association Supplement", "british-association-supplement"),
            new SiteUrl("British Diary", "british-diary"),
            new SiteUrl("Guide to Authors", "guide-to-authors"),
            new SiteUrl("International News", "international-news"),
            new SiteUrl("Letter", "letter"),
            new SiteUrl("Matters Arising", "matters-arising"),
            new SiteUrl("Millennium Essay", "millennium-essay"),
            new SiteUrl("New World", "new-world"),
            new SiteUrl("Nordic Science", "nordic-science"),
            new SiteUrl("Old World", "old-world"),
            new SiteUrl("Reports and Other Publications", "reports-and-other-publications"),
            new SiteUrl("Research Article", "research-article"),
            new SiteUrl("Scientific Correspondence", "scientific-correspondence"),
            new SiteUrl("Supplement to Nature", "supplement-to-nature"),
            new SiteUrl("University News", "university-news"),
        ];
        site.searchList = [
            new SiteUrl("Search By Relevance", "relevance"),
            new SiteUrl("Search By Date Desc", "date_desc"),
        ];
        return site;
    }

    parseHtmlDetails(articleNodes: JQuery<HTMLElement>): ExtensionDetail[] {
        let items: ExtensionDetail[] = [];
        articleNodes.each((_index, element) => {
            let ele = $(element);
            let link = ele.find("h3.c-card__title a").attr("href");
            if (link) {
                let title = ele.find("h3.c-card__title a").text().trim();
                let cover = ele.find("div.c-card__image img").attr("src");
                let description = ele.find("p.c-card__summary").text().trim();
                let date = ele.find("time").attr("datetime");
                let idPattern = new RegExp('/articles/(.*?)$', 'i');
                let id = idPattern.exec(link!)?.[1];
                let authors = ele.find("ul.app-author-list li").map((i, el) => $(el).text().trim()).get().join(", ");
                let status = ele.find("span.u-color-open-access").text().trim();
                let item = new ExtensionDetail(id!, this.site.baseUrl + link, title);
                item.thumbnail = cover;
                item.description = description;
                item.category = date;
                item.author = authors;
                item.status = status;
                item.type = MediaType.Article;
                items.push(item);
            }
        });

        return items;
    }


    // https://www.nature.com/nature/research-articles?searchType=journalSearch&sort=PubDate&page=4
    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let baseUrl = "https://www.nature.com/nature/research-articles?searchType=journalSearch&sort=PubDate";
        if (url && url.length > 0) {
            baseUrl = baseUrl + `&type=${url}`;
        }
        if (page > 1) {
            baseUrl = baseUrl + `&page=${page}`;
        }

        const response = await this.client.request({
            url: baseUrl,
            method: "GET",
        });

        let $nodes = $(response.body);
        let articleNodes = $nodes.find("section#new-article-list article.c-card");
        console.log("Found article nodes:", articleNodes.length);

        if (!articleNodes || articleNodes.length == 0) {
            return new ExtensionList([], page ? page : 1, undefined);
        }

        let items = this.parseHtmlDetails(articleNodes);

        // Check if there is a next page
        let disableNext = true;
        const nextPageNode = $nodes.find("a.c-pagination__link");
        if (nextPageNode && nextPageNode.length > 0) {
            disableNext = false;
        }

        return new ExtensionList(items, page, disableNext ? undefined : url);
    }

    // https://www.nature.com/siteindex like: https://www.nature.com/aps/articles
    // override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
    //     return new ExtensionList([], page ? page : 1, undefined);
    // }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let searchUrl = this.site.baseUrl + `/search?order=${url}&q=${encodeURIComponent(keyword)}&page=${page}`;

        const response = await this.client.request({
            url: searchUrl,
            method: "GET",
        });


        let $nodes = $(response.body);
        let articleNodes = $nodes.find("section#search-article-list article.c-card");
        console.log("Found article nodes:", articleNodes.length);

        if (!articleNodes || articleNodes.length == 0) {
            return new ExtensionList([], page ? page : 1, undefined);
        }

        let items = this.parseHtmlDetails(articleNodes);

        // Check if there is a next page
        let disableNext = true;
        const nextPageNode = $nodes.find("a.c-pagination__link");
        if (nextPageNode && nextPageNode.length > 0) {
            disableNext = false;
        }

        return new ExtensionList(items, page, disableNext ? undefined : url);
    }


    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const response = await this.client.request({
            url: url,
            method: "GET",
        });

        const html = response.body;
        let $nodes = $(html);
        let articleNode = $nodes.find("main.c-article-main-column > article");
        let content = "";

        let pdfUrl = articleNode.find("div.c-pdf-download > a").attr("href");
        if (pdfUrl && pdfUrl.startsWith("/")) {
            pdfUrl = this.site.baseUrl + pdfUrl;
        }

        content = `<embed src="${pdfUrl}" title="PDF Document" />`;

        let header = articleNode.find("div.c-article-header > header");
        let title = header.find("h1.c-article-title").text().trim();
        let authors = header.find("ul.c-article-author-list li > a").map((i, el) => $(el).text().trim()).get().join(", ");
        let date = header.find("time").text().trim();

        let articleContent = articleNode.find("div.c-article-body");
        // replace span with mathjax to math tag
        articleContent.find("span.mathjax-tex").each((i, el) => {
            console.log("replace span with mathjax", el.textContent);
            let mathContent = $(el).text();
            $(el).replaceWith(`<math>${mathContent}</math>`);
        });
        let articleHtml = (articleContent.html() || "").replace(/href="(\/[^"]*)"/g, 'href="https://www.nature.com$1"');

        content = `<html>${content}\n${articleHtml}</html>`;
        let articleMedia = new ArticleMedia(id, title, content);
        articleMedia.author = authors;
        articleMedia.date = date;
        return articleMedia;
    }

}


(function () {
    const nature = new Nature();
    nature.init();
})();

export default Nature;