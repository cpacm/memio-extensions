import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import World8 from "@app/article/world8";

describe("World8", () => {
    const world8Test = new RuleJest(new World8());

    it("should provide extension info", () => {
        const info = world8Test.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.8world.com");
        expect(info.key).toBe("8world");
        expect(info.name).toBe("8视界新闻网");
        expect(info.categoryList.length).toBeGreaterThan(0);
        expect(info.type).toBe(MediaType.Article);
    });

    it("explore should request item list", async () => {
        const url = "singapore"; // category
        const page = 1;
        const list = await world8Test.requestItemList(url, page);
        console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.status).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
    }, 30000);

    it("should get item detail", async () => {
        // This item is from the result of the `explore` test
        const itemUrl = "https://www.8world.com/singapore/parliament-sitting-live-2462421";
        const id = "2462421";
        const media = await world8Test.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(ArticleMedia);
        console.log(media);
        let articleMedia = media as ArticleMedia;
        expect(articleMedia).toBeDefined();
        expect(articleMedia.id).toBe(id);
        expect(articleMedia.title).toBeDefined();
        expect(articleMedia.content.length).toBeGreaterThan(0);
        expect(articleMedia.date).toBeDefined();
    }, 30000);

});
