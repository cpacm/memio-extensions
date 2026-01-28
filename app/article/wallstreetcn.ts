import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class WallStreetCN extends Rule {

    feedPageCursorMap: Map<number, string> = new Map<number, string>();

    provideExtensionInfo(): Extension {

        let site = new Extension("wallstreetcn", "华尔街见闻", MediaType.Article);
        site.baseUrl = "https://wallstreetcn.com";
        site.thumbnail = "https://static.wscn.net/wscn/_static/favicon.png";
        site.description = "华尔街见闻是中国领先的全球财经资讯平台，提供及时、专业的财经新闻、深度分析和市场数据，帮助用户洞察全球经济动态，把握投资机会。";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("最新", "global"),
            new SiteUrl("股市", "shares"),
            new SiteUrl("债市", "bonds"),
            new SiteUrl("商品", "commodities"),
            new SiteUrl("外汇", "forex"),
            new SiteUrl("金融", "finance"),
            new SiteUrl("资管", "asset-manage"),
            new SiteUrl("科技", "tmt"),
            new SiteUrl("硬AI", "ai"),
            new SiteUrl("地产", "estate"),
            new SiteUrl("汽车", "car"),
            new SiteUrl("医药", "medicine"),
        ];

        site.searchList = [
            new SiteUrl("搜索", "search"),
        ];

        return site;

    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        //https://api-one-wscn.awtmt.com/apiv1/content/information-flow?channel=global&accept=article&cursor=eyJTbG90T2Zmc2V0IjoxLCJUb3RhbENvdW50IjoyMywiQXJ0aWNsZUxlIjoxNzY0OTA2MzM1fQ%3D%3D&limit=20&action=upglide
        let api = `https://api-one-wscn.awtmt.com/apiv1/content/information-flow?channel=${url}&accept=article&limit=20&action=upglide`;

        if (page == 1) {
            this.feedPageCursorMap.delete(page);
        } else {
            let cursor = this.feedPageCursorMap.get(page);
            if (cursor) {
                api += `&cursor=${cursor}`;
            }
        }

        var jsonResponse = await this.client.request({
            url: api,
            method: "GET",
            contentType: "application/json",
        });

        let json = JSON.parse(jsonResponse.body);
        let details: ExtensionDetail[] = [];

        let itemData = json.data.items;
        itemData.forEach((element: any) => {
            let type = element.resource_type;
            if (type != "article") {
                return;
            }
            let resource = element.resource;

            let id = resource.id.toString();
            let title = resource.title;
            let author = resource.author?.display_name ?? "";
            let link = resource.uri;
            let description = resource.content_short;
            let thumbnail = resource.image?.uri ?? "";
            let date = resource.display_time;
            let dateTxt = new Date(date * 1000).toLocaleDateString();
            let status = resource.vip_type;

            let detail = new ExtensionDetail(id, link, title);
            detail.author = author;
            detail.description = description;
            detail.thumbnail = thumbnail;
            detail.category = dateTxt;
            detail.status = status;
            detail.type = MediaType.Article;

            details.push(detail);
        });

        let nextCursor = json.data.next_cursor;
        if (nextCursor) {
            this.feedPageCursorMap.set(page + 1, nextCursor);
        }
        let hasMore = nextCursor != null && details.length >= 20;

        return new ExtensionList(details, page, hasMore ? nextCursor : undefined);
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        //https://api-one-wscn.awtmt.com/apiv1/search/article?query=%E8%B0%B7%E6%AD%8C&cursor=2&limit=20&vip_type=
        let api = `https://api-one-wscn.awtmt.com/apiv1/search/article?query=${encodeURIComponent(keyword)}&limit=20&cursor=${page}`;
        
        var jsonResponse = await this.client.request({
            url: api,
            method: "GET",
            contentType: "application/json",
        });

        let json = JSON.parse(jsonResponse.body);
        let details: ExtensionDetail[] = [];

        let itemData = json.data.items;
        itemData.forEach((element: any) => {
            let resource = element;

            let id = resource.id.toString();
            let title = resource.title.replace(/<em>/g, "").replace(/<\/em>/g, "");
            let author = resource.author?.display_name ?? "";
            let link = resource.uri;
            let description = resource.content;
            let thumbnail = resource.image?.uri ?? "";
            let date = resource.display_time;
            let dateTxt = new Date(date * 1000).toLocaleDateString();
            let status = resource.vip_type;

            let detail = new ExtensionDetail(id, link, title);
            detail.author = author;
            detail.description = description;
            detail.thumbnail = thumbnail;
            detail.category = dateTxt;
            detail.status = status;
            detail.type = MediaType.Article;

            details.push(detail);
        });

        let hasMore = json.data.count > page * 20;

        return new ExtensionList(details, page, hasMore ? (page + 1).toString() : undefined);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        //https://api-one-wscn.awtmt.com/apiv1/content/articles/${id}?extract=0&accept_theme=theme%2Cpremium-theme
        let api = `https://api-one-wscn.awtmt.com/apiv1/content/articles/${id}?extract=0&accept_theme=theme%2Cpremium-theme`;

        var jsonResponse = await this.client.request({
            url: api,
            method: "GET",
            contentType: "application/json",
        });

        let json = JSON.parse(jsonResponse.body);
        let resource = json.data;

        let title = resource.title;
        let author = resource.source_name;
        let date = resource.display_time;
        let dateTxt = new Date(date * 1000).toLocaleDateString();
        let content = resource.content;

        let audioUri = resource.audio_info;
        let image = resource.image?.uri ?? "";

        if (audioUri) {
            content += `<br/><audio controls src="${audioUri.uri}" poster="${image}">您的浏览器不支持 audio 元素。</audio>`;
        }

        content = `<html>${content}</html>`;

        let media = new ArticleMedia(id, title, content);
        media.author = author;
        media.date = dateTxt;
        media.isMarkdown = false;

        return media;
    }


}

(function () {
    const wallStreetCN = new WallStreetCN();
    wallStreetCN.init();
})();

export default WallStreetCN;