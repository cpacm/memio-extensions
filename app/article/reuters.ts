import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class Reuters extends Rule {
    provideExtensionInfo(): Extension {
        let site = new Extension("reuters", "Reuters", MediaType.Article);
        site.baseUrl = "https://www.reuters.com";
        site.description = "Reuters"
        site.thumbnail = "https://www.reuters.com/favicon.ico";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("World", "/world/"),
            new SiteUrl("Africa", "/world/africa/"),
            new SiteUrl("Americas", "/world/americas/"),
            new SiteUrl("Asia Pacific", "/world/asia-pacific/"),
            new SiteUrl("China", "/world/china/"),
            new SiteUrl("War", "/world/ukraine-russia-war/"),
            new SiteUrl("Europe", "/world/europe/"),
            new SiteUrl("India", "/world/india/"),
            new SiteUrl("Middle East", "/world/middle-east/"),
            new SiteUrl("United Kingdom", "/world/uk/"),
            new SiteUrl("United States", "/world/us/"),
            new SiteUrl("Israel and Hamas at War", "/world/israel-hamas/"),
        ];
        site.searchList = [];
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        const pageSize = 20;
        let baseUrl = 'https://www.reuters.com/pf/api/v3/content/fetch/articles-by-section-alias-or-id-v1';
        let offset = (page - 1) * pageSize;
        let query = new ReutersQuery(url, offset, pageSize);
        let requestUrl = baseUrl + `?query=${encodeURIComponent(JSON.stringify(query))}`;
        const jsonResponse = await this.client.request({
            url: requestUrl,
            method: "GET",
            headers: [
                { key: 'Accept', value: 'application/json, text/plain, */*' },
                { key: 'Referer', value: 'https://www.reuters.com/' },
                { key: 'Accept-Language', value: 'en-US,en;q=0.9' },
                { key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }
            ],
        });
        try {
            console.log("JSON Response:", jsonResponse.body);
            const json = JSON.parse(jsonResponse.body);
            if (!json || !json.statusCode || json.statusCode !== 200) {
                return new ExtensionList([], page, undefined);
            }
            let items = json.result.articles;

            const details: ExtensionDetail[] = items.map((item: any) => {
                let id = item.id;
                let title = item.title;
                let summary = item.description || "";
                let link = `https://www.reuters.com${item.canonical_url}`;
                let formattedDate = formatDateToYMD(item.published_time);

                let authors = item.authors?.map((author: any) => author.name).join(', ')
                let cover = item.thumbnail && item.thumbnail.resizer_url ? item.thumbnail.resizer_url : "";
                let category = item.kicker ? item.kicker.name : "";
                let detail = new ExtensionDetail(id, link, title);
                detail.description = summary;
                detail.author = authors;
                detail.status = formattedDate;
                detail.category = category;
                detail.thumbnail = cover;
                return detail;
            });

            let hasMore = false;
            let pagination = json.result.pagination;
            if (pagination) {
                hasMore = pageSize * page < pagination.total_size;
            }
            return new ExtensionList(details, page, hasMore ? url : undefined);

        } catch (e) {
            console.error("Failed to parse JSON response:", e);
            return new ExtensionList([], page, undefined);
        }
    }

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((index, element) => {
            if (element instanceof HTMLScriptElement) {
                if (element.id === "fusion-metadata") {
                    let scriptContent = element.innerHTML;
                    // match json part with Fusion.globalContent={}
                    let match = scriptContent.match(/Fusion.globalContent=({[\S\s]*?});/);
                    if (match && match[1]) {
                        jsonString = match[1].replace(/undefined/g, "null");
                    }

                    return false; // Exit the each loop
                }
            }
        });
        return jsonString;
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const htmlResponse = await this.client.request({
            url: url,
            method: "GET",
            headers: [
                { key: 'Accept', value: 'application/json, text/plain, */*' },
                { key: 'Referer', value: 'https://www.reuters.com/' },
                { key: 'Accept-Language', value: 'en-US,en;q=0.9' },
            ],
        });

        let html = htmlResponse.body;
        let jsonString = this.searchHtmlScriptElement(html);

        try {
            let json = JSON.parse(jsonString);
            if (!json || !json.statusCode || json.statusCode !== 200) {
                return new ArticleMedia("-1", "", "");
            }
            let article = json.result;

            let title = article.title;
            let date = formatDateToYMD(article.updated_time);
            let authors = article.authors?.map((author: any) => author.name).join(', ');

            let content = '';
            let elements = article.content_elements;
            for (let element of elements) {
                if (element.type === 'paragraph') {
                    let paragraph = element.content;
                    let pContent = paragraph.replace(/href="(\/[^"]*)"/g, 'href="https://www.reuters.com$1"');
                    content += `<p>${pContent}</p>\n\n`;
                } else if (element.type === 'header') {
                    let level = (element.level || 2) + 1;
                    content += `<h${level}>${element.content}</h${level}>\n\n`;
                } else if (element.type === 'graphic') {
                    content += `<img src="${element.resizer_url ?? element.url}" alt="${element.title || ''}"/>\n\n`;
                }
            }

            let related_content = article.related_content;
            if (related_content) {
                let galleries = related_content.galleries;
                if (galleries) {
                    for (let gallery of galleries) {
                        let gallery_elements = gallery.content_elements;
                        for (let g_element of gallery_elements) {
                            if (g_element.type === 'image') {
                                content += `<img src="${g_element.resizer_url ?? g_element.url}" alt="${g_element.caption || ''}"/>\n\n`;
                            }
                        }
                    }
                }

                let images = related_content.images;
                if (images) {
                    for (let image of images) {
                        content += `<img src="${image.resizer_url ?? image.url}" alt="${image.caption || ''}"/>\n\n`;
                    }
                }

                let videos = related_content.videos;
                if (videos) {
                    for (let video of videos) {
                        content += `<video controls src="${video.source.hls}" poster="${video.thumbnail.resizer_url}" title="${video.title || ''}" duration="${video.duration || ''}"></video>\n\n`;
                    }
                }
            }

            let media = new ArticleMedia(id, title, "<html>" + content + "</html>");
            media.author = authors;
            media.date = date;
            media.isMarkdown = false;
            return media;
        } catch (error) {
            console.error("Failed to parse JSON data:", error);
            return new ArticleMedia("-1", "", "");
        }
    }

}

class ReutersQuery {
    "arc-site": string;
    fetch_type: string;
    offset: number;
    section_id: string;
    size: number;
    website: string;

    constructor(sectionId: string, offset: number = 0, size: number = 9) {
        this["arc-site"] = "reuters";
        this.fetch_type = "collection";
        this.offset = offset;
        this.section_id = sectionId;
        this.size = size;
        this.website = "reuters";
    }
}


(function () {
    const reuters = new Reuters();
    reuters.init();
})();

export default Reuters;