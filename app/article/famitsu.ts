import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class Famitsu extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("famitsu", "ファミ通", MediaType.Article);
        site.baseUrl = "https://www.famitsu.com";
        site.description = "ファミ通.comは、ゲーム情報を中心にエンタメ情報を発信する総合メディアサイトです。最新ニュース、レビュー、攻略情報、インタビュー、動画など、多彩なコンテンツを提供しています。";
        site.thumbnail = "https://www.famitsu.com/res/images/favicons/favicon.ico";
        site.lang = "ja";
        site.categoryList = [
            new SiteUrl("新着", "new-article"),
            new SiteUrl("Switch2", "switch2"),
            new SiteUrl("Switch", "switch"),
            new SiteUrl("PS5", "ps5"),
            new SiteUrl("PCゲーム", "pc-game"),
            new SiteUrl("ニュース", "news"),
            new SiteUrl("動画", "videos"),
            new SiteUrl("特集・企画記事", "special-article"),
        ];

        return site;
    }

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((index, element) => {
            if (element instanceof HTMLScriptElement) {
                if (element.id === "__NEXT_DATA__") {
                    let scriptContent = element.innerHTML;
                    jsonString = scriptContent;
                    return false; // Exit the each loop
                }
            }
        });
        return jsonString;
    }


    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        //https://www.famitsu.com/category/new-article/page/1
        let api = `${this.site.baseUrl}/category/${url}/page/${page}`;
        let htmlResponse = await this.client.request(
            { url: api, method: "GET" }
        );

        let jsonString = this.searchHtmlScriptElement(htmlResponse.body);

        try {

            let jsonData = JSON.parse(jsonString);
            let totalPage = jsonData.props.pageProps.pages;
            let articles = jsonData.props.pageProps.categoryArticleDataForPc;

            let details: ExtensionDetail[] = [];
            articles.forEach((article: any) => {
                if (article.isPr) return;
                console.log("article:", article);
                let id = article.id.toString();

                let description = article.description;
                let categorys = article.subCategories;
                let category = "";
                if (categorys && categorys.length > 0) {
                    category = categorys.map((cat: any) => cat.nameJa).join(", ");
                }
                let date = article.publishedAt;
                let dateTxt = formatDateToYMD(date);
                let thumbnail = article.thumbnailUrl;

                let dataArray = date.split("-");
                let ym = dataArray[0] + dataArray[1];
                // https://www.famitsu.com/article/202512/61249
                let link = this.site.baseUrl + `/article/${ym}/${id}`;
                let title = article.title;

                let detail = new ExtensionDetail(id, link, title);
                detail.thumbnail = thumbnail;
                detail.type = MediaType.Article;
                detail.description = description;
                detail.category = category;
                detail.status = dateTxt;

                details.push(detail);
            });

            let hasMore = page < totalPage;
            let nextApi = `${this.site.baseUrl}/category/${url}/page/${page + 1}`;
            return new ExtensionList(details, page, hasMore ? nextApi : undefined);
        } catch (err) {
            console.log("Kakuyomu requestItemList parse json error:", err);
        }
        return new ExtensionList([], page, undefined);
    }

    private safeDecodeURIComponent(str: string): string {
        try {
            return decodeURIComponent(str);
        } catch (e) {
            return str;
        }
    }


    private parseContent(content: any): string {
        let contentHtml = "";
        if (content.type === "STRING") {
            let inlineContent = content.content;
            if (inlineContent && inlineContent instanceof Array) {
                inlineContent.forEach((inlineItem: any) => {
                    let htmlContent = this.parseContent(inlineItem);
                    contentHtml += htmlContent;
                });
            } else if (inlineContent) {
                contentHtml += `${this.safeDecodeURIComponent(inlineContent)}`;
            }
        } else if (content.type === "STRONG") {
            contentHtml += `<strong>${content.content}</strong>`;
        } else if (content.type === "ITEMIZATION") {
            let items = content.content;
            let itemHtml = "<ul>";
            items.forEach((item: any) => {
                let htmlContent = this.parseContent(item);
                itemHtml += `<li>${htmlContent}</li>`;
            });
            itemHtml += "</ul>";
            contentHtml += itemHtml;
        } else if (content.type === "HEAD") {
            contentHtml += `<h2>${content.content}</h2>`;
        } else if (content.type === "SHEAD") {
            contentHtml += `<h3>${content.content}</h3>`;
        } else if (content.type === "NEWS") {
            let path = content.url;
            let thumbnail = content.thumbnail_url;
            if (path && path.startsWith("//")) {
                path = "https:" + path;
            } else if (path && path.startsWith("/")) {
                path = this.site.baseUrl + path;
            }
            let title = content.content || content.description || "";
            contentHtml += `<embed src="${path}" poster="${thumbnail}" title="${title}"></embed>`;
        } 
        else if (content.type === "IMAGE") {
            let path = content.path;
            if (path && path.startsWith("//")) {
                path = "https:" + path;
            } else if (path && path.startsWith("/")) {
                path = this.site.baseUrl + path;
            }
            let title = content.alt || "";
            contentHtml += `<img src="${path}" alt="${title}" />`;
        } else if(content.type === "ANNOTATION") {
            contentHtml += `<!--${this.safeDecodeURIComponent(content.content)}-->`;
        }
        else if (content.type === "YOUTUBE") {
            contentHtml += this.safeDecodeURIComponent(content.content);
        } else if (content.type.startsWith("BUTTON")) {
            let linkUrl = content.url;
            if (linkUrl && linkUrl.startsWith("/")) {
                linkUrl = this.site.baseUrl + linkUrl;
            } else if (linkUrl && linkUrl.startsWith("//")) {
                linkUrl = "https:" + linkUrl;
            }
            contentHtml += `<a href="${linkUrl}">${content.content}</a>`;
        } else if (content.url && content.url.length > 0) {
            contentHtml += `<a href="${content.url}">${this.safeDecodeURIComponent(content.content)}</a>`;
        } 
        else {
            contentHtml += `${this.safeDecodeURIComponent(content.content)}`;
        }
        return contentHtml;
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {

        let htmlResponse = await this.client.request(
            { url: url, method: "GET" }
        );

        let jsonString = this.searchHtmlScriptElement(htmlResponse.body);

        try {
            let jsonData = JSON.parse(jsonString);
            let article = jsonData.props.pageProps.articleDetailData;
            let contentArray = article.content;
            let contentHtml = "";
            contentArray.forEach((contentItem: any) => {
                let contents = contentItem.contents;
                contents.forEach((content: any) => {
                    let result = this.parseContent(content);
                    contentHtml += result;
                });
            });
            let title = article.title;

            let media = new ArticleMedia(id, title, `<html>${contentHtml}</html>`);
            media.date = formatDateToYMD(article.publishedAt);
            return media;

        } catch (err) {
            console.log("Kakuyomu requestItemMedia parse json error:", err);
        }
        return new ArticleMedia("-1", "", "");
    }

}

(function () {
    const famitsu = new Famitsu();
    famitsu.init();
})();

export default Famitsu;