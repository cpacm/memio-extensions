import Web3Caff from "@app/article/web3caff";
import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";

describe("Web3Caff", () => {
    const web3caffTest = new RuleJest(new Web3Caff());

    it("should provide extension info", () => {
        const info = web3caffTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.web3caff.com");
        expect(info.key).toBe("web3caff");
        expect(info.name).toBe("Web3Caff");
        expect(info.type).toBe(MediaType.Article);
    });

    it("should request item list", async () => {
        const url = "append=list-home&action=ajax_load_posts&query=&page=home";
        const page = 1;
        const list = await web3caffTest.requestItemList(url, page);
        list.items.forEach(item => {
            console.log(item);
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.category).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it("should request channel", async () => {
        const key = "mankunlaw";
        const page = 1;
        const list = await web3caffTest.requestChannelList(key, page);
        list.items.forEach(item => {
            console.log(item);
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.category).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it("should request item media", async () => {
        const url = "https://www.web3caff.com/archives/130081";
        const id = "130081";
        const media = await web3caffTest.requestItemMedia(url, id);
        console.log(media);
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toBeDefined();
        expect(media).toBeInstanceOf(ArticleMedia);

        var article = media as ArticleMedia;
        expect(article.content).toBeDefined();
    }, 30000);
});
