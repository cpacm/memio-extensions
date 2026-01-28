import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import HuggingfaceModels from "@app/article/huggingface_models";

describe("HuggingfaceModels", () => {
    const huggingfaceTest = new RuleJest(new HuggingfaceModels());

    it("should provide extension info", () => {
        const info = huggingfaceTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://huggingface.co");
        expect(info.key).toBe("huggingface-models");
        expect(info.name).toBe("Huggingface Models");
        expect(info.type).toBe(MediaType.Article);
    });

    it("should request item list", async () => {
        const url = ""; // All Models
        const page = 1;
        const list = await huggingfaceTest.requestItemList(url, page);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.status).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it("should search item list", async () => {
        const keyword = "gemma";
        const url = ""; // All Models
        const page = 1;
        const list = await huggingfaceTest.searchItemList(keyword, url, page);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.status).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it("should request item media", async () => {
        const url = "https://huggingface.co/google/gemma-2-9b-it";
        const id = "google/gemma-2-9b-it";
        const media = await huggingfaceTest.requestItemMedia(url, id);
        console.log("Media:", media);
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toBeDefined();
        expect(media).toBeInstanceOf(ArticleMedia);

        var article = media as ArticleMedia;
        expect(article.content).toBeDefined();
    }, 30000);
});
