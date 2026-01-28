import BBC from "@app/article/bbc";
import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";

describe("BBC", () => {
    const bbcTest = new RuleJest(new BBC());

    it("should provide extension info", () => {
        const info = bbcTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.bbc.com");
        expect(info.key).toBe("bbc");
        expect(info.name).toBe("BBC");
        expect(info.searchList.length).toBe(0);
        expect(info.type).toBe(MediaType.Article);
    });

    it("should request item list", async () => {
        const url = "27d91e93-c35c-4e30-87bf-1bd443496470"; // UK
        const page = 1;
        const list = await bbcTest.requestItemList(url, page);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.category).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it("should request item media", async () => {
        const url = "https://www.bbc.com/news/articles/cd6758pn6ylo";
        const id = "cd6758pn6ylo";
        const media = await bbcTest.requestItemMedia(url, id);
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toBeDefined();
        expect(media).toBeInstanceOf(ArticleMedia);

        var article = media as ArticleMedia;
        expect(article.content).toBeDefined();
    }, 30000);
});
