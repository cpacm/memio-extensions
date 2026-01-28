import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import RareHistoricalPhotos from '@app/article/rare_historical_photos';

describe("Rare Historical Photos Article Test", () => {
    let ruleJest: RuleJest;
    beforeAll(() => {
        ruleJest = new RuleJest(new RareHistoricalPhotos());
    });

    test("Provide Extension Info", () => {
        const extInfo = ruleJest.provideExtensionInfo();
        expect(extInfo.key).toBe("rare-historical-photos");
        expect(extInfo.name).toBe("Rare Historical Photos");
        expect(extInfo.type).toBe(MediaType.Article);
        expect(extInfo.baseUrl).toBe("https://www.rarehistoricalphotos.com");
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
    }, 30000);

    test("request media detail", async () => {
        const testUrl = "https://rarehistoricalphotos.com/herbert-ponting-antarctica-photos/";
        const mediaDetail = await ruleJest.requestItemMedia(testUrl, "herbert-ponting-antarctica-photos");
        console.log(mediaDetail);
        expect(mediaDetail.id).toBeDefined();
        expect(mediaDetail.title).toBeDefined();

        let articleMedia = mediaDetail as ArticleMedia;
        expect(articleMedia.content).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    }, 30000);
});
