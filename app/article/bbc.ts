import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia } from '@/core/extension';

class BBC extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("bbc", "BBC", MediaType.Article);
        site.baseUrl = "https://www.bbc.com";
        site.description = "BBC News"
        site.thumbnail = "https://www.bbc.com/favicon.ico";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("UK", "27d91e93-c35c-4e30-87bf-1bd443496470"),
            new SiteUrl("Israel-Gaza war", "0c92b177-4544-4046-9b06-e428e46f72de"),
            new SiteUrl("War in Ukraine", "555e4b6e-6240-4526-8a00-fed231e6ff74"),
            new SiteUrl("US & Canada", "db5543a3-7985-4b9e-8fe0-2ac6470ea45b"),
            new SiteUrl("Africa", "f7905f4a-3031-4e07-ac0c-ad31eeb6a08e"),
            new SiteUrl("Asia", "ec977d36-fc91-419e-a860-b151836c176b"),
            new SiteUrl("Australia", "3307dc97-b7f0-47be-a1fb-c988b447cc72"),
            new SiteUrl("Europe", "e2cc1064-8367-4b1e-9fb7-aed170edc48f"),
            new SiteUrl("Latin America", "16d132f4-d562-4256-8b68-743fe23dab8c"),
            new SiteUrl("Middle East", "b08a1d2f-6911-4738-825a-767895b8bfc4"),
            new SiteUrl("In Pictures", "1da310d9-e5c3-4882-b7a8-ffc09608054d"),
            new SiteUrl("BBC Verify", "9559fc2e-5723-450d-9d89-022b8458cc8d"),
            new SiteUrl("Business", "daa2a2f9-0c9e-4249-8234-bae58f372d82"),
            new SiteUrl("Innovation", "3da03ce0-ee41-4427-a5d9-1294491e0448"),
            new SiteUrl("Culture", "6d50eb9d-ee20-40fe-8e0f-f506d6a02b78"),
            new SiteUrl("Arts", "ef20229c-cde4-449f-b225-6db94953d2ce"),
            new SiteUrl("Travel", "98529df5-2749-4618-844f-96431b3084d9"),
            new SiteUrl("Earth", "9f0b9075-b620-4859-abdc-ed042dd9ee66"),
        ];
        site.searchList = [];
        return site;
    }

    async requestItemList(url: string, page: number): Promise<ExtensionList> {
        const apiPage = page > 0 ? page - 1 : 0;
        const realUrl = `https://web-cdn.api.bbci.co.uk/xd/content-collection/${url}?page=${apiPage}&size=9`;
        const nextUrl = `https://web-cdn.api.bbci.co.uk/xd/content-collection/${url}?page=${page}&size=9`;

        const jsonResponse = await this.client.request({ url: realUrl, method: "GET" });
        const json = JSON.parse(jsonResponse.body);

        if (!json || !json.data || json.data.length === 0) {
            return new ExtensionList([], page, undefined);
        }

        const items: ExtensionDetail[] = json.data.map((item: any) => {
            const idParts = item.id.split(':');
            let id = idParts[idParts.length - 1];
            if(id.includes('/')) {
                // encoded id
                try {
                    id = decodeURIComponent(id);
                } catch (e) {
                    console.error("Failed to decode URI component:", id, e);
                    // Optionally, handle the error, e.g., by skipping this item
                    // return null; // or some other logic
                }
            }
            const detail = new ExtensionDetail(id, this.site.baseUrl + item.path, item.title);
            if (item.indexImage?.model?.blocks?.src) {
                detail.thumbnail = item.indexImage.model.blocks.src;
            }
            detail.description = item.summary;
            if (item.firstPublishedAt) {
                detail.category = new Date(item.firstPublishedAt).toLocaleDateString();
            }
            detail.type = MediaType.Article;
            return detail;
        });

        const hasNextPage = (json.page + 1) * json.pageSize < json.total;

        return new ExtensionList(items, page, hasNextPage ? nextUrl : undefined);
    }

    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const htmlResponse = await this.client.request({ url: url, method: "GET", afterLoad: true });
        const html = htmlResponse.body;
        const $nodes = $(html);

        const title = $nodes.find("article div[data-component='headline-block'] h1").first().text().trim();
        const detailNode = $nodes.find("article div[data-component='byline-block']").first();
        const date = detailNode.find("time").text().trim();
        const author = detailNode.find("span[data-testid='byline-new-contributors']").text().trim();

        let content = "";
        $nodes.find('article').children().each((_index, element) => {
            if (element.tagName.toLowerCase() === 'div' 
            && (
                $(element).attr('data-component') === 'headline-block' 
                || $(element).attr('data-component') === 'byline-block'
                || $(element).attr('data-component') === 'video-block'
                || $(element).attr('data-component') === 'audio-block'
                || $(element).attr('data-component') === 'ad-slot'
                || $(element).attr('data-component') === 'embed-block'
                || $(element).attr('data-component') === 'tags'
                || $(element).attr('data-component') === 'caption-block'
            )) {
                // skip blocks
                return;
            }
            content += $(element).html();
        });

        content = "<html>" + content + "</html>";
        const articleMedia = new ArticleMedia(id, title, content);
        articleMedia.date = date;
        articleMedia.author = author;
        return articleMedia;
    }
}

(function () {
    const bbc = new BBC();
    bbc.init();
})();

export default BBC;
