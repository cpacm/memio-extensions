import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import Nature from '@app/article/nature';

describe("Nature Article Test", () => {
    let ruleJest: RuleJest;
    beforeAll(() => {
        ruleJest = new RuleJest(new Nature());
    });

    test("Provide Extension Info", () => {
        const extInfo = ruleJest.provideExtensionInfo();
        expect(extInfo.key).toBe("nature-research");
        expect(extInfo.name).toBe("Nature Research");
        expect(extInfo.type).toBe(MediaType.Article);
        expect(extInfo.baseUrl).toBe("https://www.nature.com");
        expect(extInfo.categoryList.length).toBeGreaterThan(0);
    });

    test("Request Item List", async () => {
        const extList: ExtensionList = await ruleJest.requestItemList("", 1);
        expect(extList.items.length).toBeGreaterThan(0);
        extList.items.forEach(item => {
            console.log(item);
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.url).toBeDefined();
            expect(item.type).toBe(MediaType.Article);
        });
        expect(extList.nextPageUrl).toBeDefined();
    });

    test("request media detail", async () => {
        const testUrl = "https://www.nature.com/articles/s41586-025-09710-8";
        const mediaDetail = await ruleJest.requestItemMedia(testUrl,"s41586-025-09710-8");
        console.log(mediaDetail);
        expect(mediaDetail.id).toBeDefined();
        expect(mediaDetail.title).toBeDefined();

        let articleMedia = mediaDetail as ArticleMedia;
        expect(articleMedia.content).toBeDefined();
        expect(articleMedia.author).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    },30000);

    test.only("Search Item List", async () => {
        const extList: ExtensionList = await ruleJest.searchItemList("Forests support global", "relevance", 1);
        expect(extList.items.length).toBeGreaterThan(0);
        extList.items.forEach(item => {
            console.log(item);
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.url).toBeDefined();
            expect(item.type).toBe(MediaType.Article);
        });
        expect(extList.nextPageUrl).toBeDefined();
    },30000);

});