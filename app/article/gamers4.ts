import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class Gamers4 extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("gamers4", "Gamers4电玩社", MediaType.Article);
        site.baseUrl = "https://www.4gamers.com.tw";
        site.description = "電玩 x 科技 x 動漫 x 影劇 x 紳士 最棒的 Gaming 生活充電站，For Gamers.";
        site.thumbnail = "https://img.4gamers.com.tw/puku-site-server-img/favicon-20210414.ico";
        site.lang = "zh-TW";
        site.categoryList = [
            new SiteUrl("最新消息", "latest"),
            new SiteUrl("WirForce", "of-category/362"),
            new SiteUrl("遊戲資訊", "of-category/352"),
            new SiteUrl("影劇動漫", "of-category/1116"),
            new SiteUrl("科技硬體", "of-category/355"),
            new SiteUrl("限時免費🆓", "of-category/1118"),
            new SiteUrl("VTuber", "of-category/1121"),
            new SiteUrl("潮流宅物", "of-category/1117"),
            new SiteUrl("電子競技", "of-category/353"),
            new SiteUrl("深度專題", "of-category/359"),
            new SiteUrl("實況直播", "of-category/1109"),
            new SiteUrl("展演活動", "of-category/356"),
            new SiteUrl("成人限定🔞", "of-category/1119"),
            new SiteUrl("男上加男", "of-category/1120"),
            new SiteUrl("品牌提供", "of-category/1115"),
        ];
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        // https://www.4gamers.com.tw/site/api/news/latest?nextStart=25&pageSize=25
        // https://www.4gamers.com.tw/site/api/news/of-category/362?nextStart=25&pageSize=25
        let api = `${this.site.baseUrl}/site/api/news/${url}?nextStart=${(page - 1) * 25}&pageSize=25`;
        let jsonResponse = await this.client.request({ url: api, method: "GET" });

        let data = JSON.parse(jsonResponse.body);
        let details: ExtensionDetail[] = [];

        let items = data.data.results;
        for (let item of items) {
            let id = item.id.toString();
            let link = item.canonicalUrl;
            let title = item.title;
            let description = item.intro;
            let tags = item.tags.join(", ");
            let category = item.category.name;
            let author = item.author.nickname;
            let thumbnail = item.smallBannerUrl;

            let detail = new ExtensionDetail(id, link, title);
            detail.description = description;
            detail.thumbnail = thumbnail;
            detail.category = tags;
            detail.status = category;
            detail.author = author;
            detail.type = MediaType.Article;
            details.push(detail);
        }

        let pager = data.data.pager;
        let hasMore = page < pager.totalPageNumber;

        let nextApi = `${this.site.baseUrl}/site/api/news/${url}?nextStart=${(page) * 25}&pageSize=25`;
        let extensionList = new ExtensionList(details, page, hasMore ? nextApi : undefined);
        return extensionList;
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        // https://www.4gamers.com.tw/site/api/news/find-section?sub=75968
        let api = `${this.site.baseUrl}/site/api/news/find-section?sub=${id}`;
        let jsonResponse = await this.client.request({ url: api, method: "GET" });

        let data = JSON.parse(jsonResponse.body);
        let title = data.data.title;
        let sectionList = data.data.contentSection.sections;
        let htmlContent = "";
        for (let section of sectionList) {
            if (section["@type"] === "RawHtmlSection") {
                htmlContent += section.html;
            } else if (section["@type"] === "ImageGroupSection") {
                let images = section.items;
                for (let imgItem of images) {
                    htmlContent += `<img src="${imgItem.url}" alt="${imgItem.alt}" />`;
                }
            } else if (section["@type"] === "ScrollerAdsSection" || section["@type"] === "ContentAdsSection") {
                // skip ads
            }
        }

        let media = new ArticleMedia(id, title, `<html>${htmlContent}</html>`);
        media.author = data.data.author.nickname;
        media.date = new Date(data.data.updatedAt).toLocaleDateString();
        return media;
    }

}

(function () {
    const gamers4 = new Gamers4();
    gamers4.init();
})();

export default Gamers4;