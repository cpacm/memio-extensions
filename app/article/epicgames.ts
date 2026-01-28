import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class EpicGames extends Rule {

    locale: string = "en-US" // ["es-419", "es", "en", "zh-HK", "zh-TW", "zh-Hans", "en-US", "ko", "ja", "zh-CN", "zh-Hant", "fr", "de", "ru", "it", "es-ES", "es-MX", "pt-BR", "pl", "th", "tr", "ar", "nl", "sv", "cs", "da", "no", "fi", "pt", "hu", "ro", "id", "vi", "bg", "uk", "hi", "ms", "fil"]
    cookie: string = ""

    provideExtensionInfo(): Extension {
        let site = new Extension("epicgames", "Epic Games Store", MediaType.Article);
        site.baseUrl = "https://store.epicgames.com";
        site.description = "Epic Games Store ";
        site.thumbnail = "https://www.epicgames.com/apple-touch-icon.png";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("All", "?sortBy=relevancy&sortDir=DESC"),
            new SiteUrl("New Release", "?sortBy=releaseDate&sortDir=DESC"),
            new SiteUrl("Coming Soon", "?sortBy=comingSoon&sortDir=DESC"),
            new SiteUrl("Alphabetical", "?sortBy=title&sortDir=ASC"),
            new SiteUrl("Price: Low to High", "?sortBy=currentPrice&sortDir=ASC"),
            new SiteUrl("Price: High to Low", "?sortBy=currentPrice&sortDir=DESC"),
        ];
        site.configParams = [
            { key: "locale", value: "en-US|zh-CN|ja|..." },
        ];
        site.useGuide = `## Locale Setting Guide

The **locale** parameter allows you to set the language and region for the Epic Games Store. This affects the content and pricing displayed in the store.
Examples include "en-US" for English (United States), "zh-CN" for Chinese (Simplified), "ja" for Japanese, etc.

> Choose locale from the list: ["es-419", "es", "en", "zh-HK", "zh-TW", "zh-Hans", "en-US", "ko", "ja", "zh-CN", "zh-Hant", "fr", "de", "ru", "it", "es-ES", "es-MX", "pt-BR", "pl", "th", "tr", "ar", "nl", "sv", "cs", "da", "no", "fi", "pt", "hu", "ro", "id", "vi", "bg", "uk", "hi", "ms", "fil"]

`;

        return site;
    }

    override async config(form: Map<string, string>): Promise<boolean> {
        this.locale = form.get("locale") || this.locale;
        return Promise.resolve(true);
    }

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((_index, element) => {
            if (element instanceof HTMLScriptElement) {
                let scriptContent = element.innerHTML;

                if (scriptContent.includes("window.__REACT_QUERY_INITIAL_QUERIES__")) {
                    // match json part with window.__REACT_QUERY_INITIAL_QUERIES__={}
                    // 首先获取 window.__REACT_QUERY_INITIAL_QUERIES__ 一整行内容
                    let line = scriptContent.split('\n').find(line => line.includes("window.__REACT_QUERY_INITIAL_QUERIES__"));
                    if (line) {
                        let match = line.match(/window\.__REACT_QUERY_INITIAL_QUERIES__\s*=\s*({.*?});/);
                        if (match && match[1]) {
                            jsonString = match[1].replace(/undefined/g, "null");
                        }
                    }

                    return false; // Exit the each loop
                }

            }
        });
        return jsonString;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let baseUrl = `https://store.epicgames.com/${this.locale}/browse`;
        let category = "&category=Game%7CEditor"
        let pagination = `&start=${(page - 1) * 40}&count=40`;

        let requestUrl = baseUrl + url + category + pagination;
        console.log("EpicGames Request URL:", requestUrl);
        let htmlResponse = await this.client.request({
            url: requestUrl,
            method: "GET",
            headers: [
                { key: 'Accept', value: 'application/json, text/plain, */*' },
                { key: 'User-Agent', value: 'Postman' },
                { key: 'Referer', value: 'https://store.epicgames.com/' },
                { key: 'Cookie', value: this.cookie },
            ],
        });

        let jsonString = this.searchHtmlScriptElement(htmlResponse.body);

        try {
            const json = JSON.parse(jsonString);
            let querys = json["queries"];
            // find searchStore query
            let searchStoreQuery = querys.find((q: any) => q.state.data && q.state.data.Catalog && q.state.data.Catalog.searchStore);
            if (!searchStoreQuery) {
                return new ExtensionList([], page, undefined);
            }
            let searchStore = searchStoreQuery.state.data.Catalog.searchStore
            let items = searchStore.elements;
            let paging = searchStore.paging;

            let details: ExtensionDetail[] = [];
            for (const item of items) {
                try {
                    let id = item.id;
                    let title = item.title;
                    let summary = item.description || "";
                    
                    let nameSlug = item.catalogNs.mappings[0].pageSlug ?? item.offerMappings[0].pageSlug;
                    let link = `https://store.epicgames.com/${this.locale}/p/${nameSlug}`;
                    let formattedDate = formatDateToYMD(item.releaseDate);

                    //https://cdn1.epicgames.com/spt-assets/c938aad977fb4b5aafe75922750028ba/capri-care-1n214.png?resize=1&w=360&h=480&quality=medium
                    let keyImages = item.keyImages || [];
                    let cover = keyImages && keyImages.length > 0 ? keyImages[0].url : "";
                    let thumbnailImage = keyImages.find((img: any) => img.type === "Thumbnail");
                    if (thumbnailImage) {
                        cover = thumbnailImage.url + `?resize=1&w=360&h=480&quality=medium`;
                    }

                    let authors = item.developerDisplayName || item.publisherDisplayName || "Epic Games";
                    let status = "";
                    if (item.price && item.price.totalPrice && item.price.totalPrice.fmtPrice.intermediatePrice) {
                        status = item.price.totalPrice.fmtPrice.intermediatePrice;
                    }
                    let category = item.categories && item.categories.length > 0 ? item.categories[0].path : "Game";
                    let detail = new ExtensionDetail(id, link, title);
                    detail.description = summary;
                    detail.category = status + " , " + category;
                    detail.thumbnail = cover;
                    detail.hasChapter = false;
                    detail.author = authors;
                    detail.status = formattedDate;
                    detail.type = MediaType.Article;
                    details.push(detail);
                } catch (e) {
                    console.log("EpicGames Item Parse Error:", e, item);
                    continue;
                }
            }

            let hasMore = false;
            if (paging) {
                hasMore = paging.total > page * paging.count;
            }
            return new ExtensionList(details, page, hasMore ? url : undefined);
        } catch (e) {
            console.log("EpicGames JSON Parse Error:", e);
            return new ExtensionList([], page, undefined);
        }

    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let htmlResponse = await this.client.request({
            url: url,
            method: "GET",
            headers: [
                { key: 'Accept', value: 'application/json, text/plain, */*' },
                { key: 'Cookie', value: this.cookie },
            ],
        });

        let jsonString = this.searchHtmlScriptElement(htmlResponse.body);

        try {
            const json = JSON.parse(jsonString);
            let querys = json["queries"];
            // find searchStore query
            let catalogOffer = querys.find((q: any) => q.state.data && q.state.data.Catalog && q.state.data.Catalog.catalogOffer);
            if (!catalogOffer) {
                console.log("can't find catalogOffer");
                return new ExtensionMedia(MediaType.Article, "", "");
            }
            let offerData = catalogOffer.state.data.Catalog.catalogOffer;

            let title = offerData.title;
            let description = offerData.description || "";
            let content = decodeURIComponent(offerData.longDescription || description);

            let tags = offerData.tags || [];
            let tagNames = tags.map((tag: any) => tag.name);
            if (tagNames.length > 0) {
                content += "\n\n> **Tags:** " + tagNames.join(", ");
            }

            // mark markdown # to ##
            content = content.replace(/^# /gm, "## ");

            let articleMedia = new ArticleMedia(id, title, content);
            articleMedia.isMarkdown = true;
            articleMedia.date = formatDateToYMD(offerData.releaseDate);
            return articleMedia;

        } catch (e) {
            console.log("EpicGames Detail JSON Parse Error:", e);
        }
        return new ExtensionMedia(MediaType.Article, id, "");
    }
}



(function () {
    const epicGames = new EpicGames();
    epicGames.init();
})();

export default EpicGames;