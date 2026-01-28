import Pixiv from "@app/picture/pixiv";
import { RuleJest } from "./../core";
import { MediaType, PictureMedia } from "@/core/extension";

describe('pixiv', () => {

    const pixivTest = new RuleJest(new Pixiv());

    it('should provide extension info', () => {
        const info = pixivTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.key).toBe("pixiv");
        expect(info.name).toBe("Pixiv");
        expect(info.type).toBe(MediaType.Picture);
    });

    it('should request item list from ranking', async () => {
        const url = "daily"; // daily ranking
        const page = 1;
        const list = await pixivTest.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.description).toBeDefined(); // tags
            expect(item.author).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 60000);

    it.skip('should request channel list for a user', async () => {
        const userId = "1733213"; // A sample user ID
        const page = 1;
        const list = await pixivTest.requestChannelList(userId, page);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 60000);

    it('should search for items', async () => {
        const keyword = "re:zero";
        const url = "s_tag";
        const page = 1;
        const list = await pixivTest.searchItemList(keyword, url, page);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 60000);

    it.skip('should request item media', async () => {
        // This test requires a valid cookie with authentication.
        // Skipping this test in CI/CD.
        // To run this test, you need to provide a valid cookie.
        // Example artwork ID.
        const artworkId = "110028914";
        const url = `https://www.pixiv.net/artworks/${artworkId}`;
        const media = await pixivTest.requestItemMedia(url, artworkId);
        expect(media).toBeInstanceOf(PictureMedia);
        let pictureMedia = media as PictureMedia;
        expect(pictureMedia.id).toBe(artworkId);
        expect(pictureMedia.imageList.length).toBeGreaterThan(0);
    }, 120000);
});
