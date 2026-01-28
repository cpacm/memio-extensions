import Hpoi from "@app/picture/hpoi";
import { RuleJest } from "./../core";
import { MediaType, PictureMedia } from "@/core/extension";

describe('hpoi', () => {

    const hpoiTest = new RuleJest(new Hpoi());

    it('should provide extension info', () => {
        const info = hpoiTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.key).toBe("hpoi");
        expect(info.name).toBe("Hpoi 手办维基");
        expect(info.type).toBe(MediaType.Picture);
    });

    it('should request item list from category', async () => {
        const url = "category=100&order=hitsDay"; // 手办-一天热度
        const page = 1;
        const list = await hpoiTest.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined(); // company
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 60000);

    it('should request channel list for a company', async () => {
        const companyId = "2642"; // Good Smile Company
        const page = 1;
        const list = await hpoiTest.requestChannelList(companyId, page);
        console.log(list);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 60000);

    it('should search for items', async () => {
        const keyword = "re:zero";
        const url = "category=10000&order=add&keyword={keyword}";
        const page = 1;
        const list = await hpoiTest.searchItemList(keyword, url, page);
        console.log(list);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.nextPageUrl).toBeUndefined();
    }, 60000);

    it('should request item media', async () => {
        // Example artwork ID.
        const artworkId = "94786";
        const url = `https://www.hpoi.net/hobby/${artworkId}`;
        const media = await hpoiTest.requestItemMedia(url, artworkId);
        console.log(media);
        expect(media).toBeInstanceOf(PictureMedia);
        let pictureMedia = media as PictureMedia;
        expect(pictureMedia.id).toBe(artworkId);
        expect(pictureMedia.imageList.length).toBeGreaterThan(0);
    }, 120000);
});
