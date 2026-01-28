import KadokawaBlog from "@app/article/kadokawa_blog";
import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";

describe("KadokawaBlog", () => {
    const kadokawaBlogTest = new RuleJest(new KadokawaBlog());

    it("should provide extension info", () => {
        const info = kadokawaBlogTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.kadokawa.com.tw");
        expect(info.key).toBe("kadokawa_blog");
        expect(info.name).toBe("角編新聞台");
        expect(info.searchList.length).toBe(0);
        expect(info.type).toBe(MediaType.Article);
    });

    it("should request item list", async () => {
        const url = "https://www.kadokawa.com.tw/blog/posts?page={page}";
        const page = 1;
        const list = await kadokawaBlogTest.requestItemList(url, page);
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
    });

    it("should request item media", async () => {
        const url = "https://www.kadokawa.com.tw/blog/posts/20250630";
        const id = "20250630"; // Example ID
        const media = await kadokawaBlogTest.requestItemMedia(url, id);
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toContain("小角落文化");
        expect(media).toBeInstanceOf(ArticleMedia);

        var article = media as ArticleMedia;
        expect(article.content).toBeDefined();
    });
});