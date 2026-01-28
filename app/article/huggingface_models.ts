import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia, ChannelType, Channel } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class HuggingfaceModels extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("huggingface-models", "Huggingface Models", MediaType.Article);
        site.baseUrl = "https://huggingface.co";
        site.description = "Hugging Face is an AI community and platform that provides tools and resources for building, training, and deploying machine learning models.";
        site.thumbnail = "https://huggingface.co/front/assets/huggingface_logo-noborder.svg";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("All Models", ""),
            new SiteUrl("Text Generation", "text-generation"),
            new SiteUrl("Any-to-Any", "any-to-any"),
            new SiteUrl("Image-Text-to-Text", "image-text-to-text"),
            new SiteUrl("Image-to-Text", "image-to-text"),
            new SiteUrl("Image-to-Image", "image-to-image"),
            new SiteUrl("Text-to-Image", "text-to-image"),
            new SiteUrl("Text-to-Video", "text-to-video"),
            new SiteUrl("Text-to-Speech", "text-to-speech"),
        ]

        site.searchList = [
            new SiteUrl("Filter by name", "search={keyword}"),
        ];

        site.channel = new Channel(ChannelType.List, "Filter Params", "filter");
        site.useGuide = `## How to set Channel Filter Params
Huggingface Models can be filtered by various parameters such as Tasks, Libraries, etc.

1. You can set these filter parameters in the Channel section of the extension settings. For example, to filter models by a specific task, you can add a parameter with key "pipeline_tag=[value]" and value as the desired task name.
Like "pipeline_tag=text-generation" to filter models related to text generation.
2. Similarly, you can filter by library using the key "library=[value]".
Like "library=tf" to filter models that use the TensorFlow library.
3. You can combine multiple filter parameters by adding more parameters. For example, to filter models by both task and library, you can merge two parameters.
Like "pipeline_tag=text-generation&library=tf".

## How to get Filter Params
To find the available filter parameters, you can visit the Hugging Face Models page at [https://huggingface.co/models](https://huggingface.co/models) and explore the filters on the left sidebar. The URL will update with the selected filters, which you can use to set the appropriate parameters in the extension settings.
`;

        return site;
    }

    parseItemDetails(models: any): ExtensionDetail[] {
        let items: ExtensionDetail[] = [];
        for (let model of models) {
            let id = model["id"];
            let title = id;
            let category = model["pipeline_tag"] ?? "";
            let author = model["authorData"].name ?? "";
            let thumbnail = model["authorData"]["avatarUrl"] ?? "";
            let formattedDate = formatDateToYMD(model["lastModified"]);
            let downloads = model["downloads"] ?? 0;
            let likes = model["likes"] ?? 0;
            let description = (downloads > 0 ? `Downloads: ${downloads}` : "") + (likes > 0 ? ` Likes: ${likes}` : "");

            let item = new ExtensionDetail(id, this.site.baseUrl + `/${id}`, title);
            item.thumbnail = thumbnail;
            item.description = description;
            item.author = author;
            item.status = formattedDate;
            item.category = category;
            item.type = MediaType.Article;
            items.push(item);
        }
        return items;

    }

    //https://huggingface.co/models-json?sort=trending&withCount=true
    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let pageIndex = page - 1;
        let apiUrl = this.site.baseUrl + `/models-json?sort=trending&p=${pageIndex}&withCount=true`;
        if (url && url.length > 0) {
            apiUrl += `&pipeline_tag=${url}`;
        }

        const response = await this.client.request({
            url: apiUrl,
            method: "GET",
        });

        try {
            let json = JSON.parse(response.body);

            let models = json["models"];
            let items = this.parseItemDetails(models);

            // Check if there is a next page
            let totalModels = json["numTotalItems"];
            let pageSize = json["numItemsPerPage"];
            let disableNext = (pageIndex + 1) * pageSize >= totalModels;

            return new ExtensionList(items, page, disableNext ? undefined : url);

        } catch (e) {
            console.log("Error parsing JSON:", e);
            return new ExtensionList([], page ? page : 1, undefined);
        }
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let pageIndex = page - 1;
        let apiUrl = this.site.baseUrl + `/models-json?sort=trending&p=${pageIndex}&withCount=true`;
        if (keyword && keyword.length > 0) {
            apiUrl += `&search=${encodeURIComponent(keyword)}`;
        }

        const response = await this.client.request({
            url: apiUrl,
            method: "GET",
        });

        try {
            let json = JSON.parse(response.body);

            let models = json["models"];
            let items = this.parseItemDetails(models);

            // Check if there is a next page
            let totalModels = json["numTotalItems"];
            let pageSize = json["numItemsPerPage"];
            let disableNext = (pageIndex + 1) * pageSize >= totalModels;

            return new ExtensionList(items, page, disableNext ? undefined : url);

        } catch (e) {
            console.log("Error parsing JSON:", e);
            return new ExtensionList([], page ? page : 1, undefined);
        }
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let params = key;
        let pageIndex = page - 1;
        let apiUrl = this.site.baseUrl + `/models-json?${params}&p=${pageIndex}&withCount=true`;

        const response = await this.client.request({
            url: apiUrl,
            method: "GET",
        });

        try {
            let json = JSON.parse(response.body);

            let models = json["models"];
            let items = this.parseItemDetails(models);

            // Check if there is a next page
            let totalModels = json["numTotalItems"];
            let pageSize = json["numItemsPerPage"];
            let disableNext = (pageIndex + 1) * pageSize >= totalModels;

            return new ExtensionList(items, page, disableNext ? undefined : apiUrl);

        } catch (e) {
            console.log("Error parsing JSON:", e);
            return new ExtensionList([], page ? page : 1, undefined);
        }
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const response = await this.client.request({
            url,
            method: "GET",
        });

        const $nodes = $(response.body);
        let contentNode = $nodes.find("div.model-card-content");
        let title = contentNode.find("h1").first().text().trim();
        contentNode.find("h1").first().remove();
        let contentHtml = contentNode.html() ?? "";

        let media = new ArticleMedia(id, title, contentHtml);
        return media;
    }
}

(function () {
    const huggingfaceModels = new HuggingfaceModels();
    huggingfaceModels.init();
})();

export default HuggingfaceModels;