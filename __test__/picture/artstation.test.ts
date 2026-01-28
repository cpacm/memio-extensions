import ArtStation from "@app/picture/artstation";
import { RuleJest } from "./../core";
import { MediaType, PictureMedia } from "@/core/extension";

describe('artstation', () => {

    const artstationTest = new RuleJest(new ArtStation());

    it('should provide extension info', () => {
        const info = artstationTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.key).toBe("artstation");
        expect(info.name).toBe("ArtStation");
        expect(info.type).toBe(MediaType.Picture);
    });

    it('should request item list from category', async () => {
        const url = "/explore/projects/trending.json?page={page}"; // Trending
        const page = 1;
        const list = await artstationTest.requestItemList(url, page);
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

    it('should request item list from a channel', async () => {
        const url = "/channels/projects.json?channel_id=72&page={page}"; // Anime & Manga
        const page = 1;
        const list = await artstationTest.requestItemList(url, page);
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

    
    it('should request item media', async () => {
        // Example artwork ID.
        const artworkId = "g8XmB8";
        const url = `https://www.artstation.com/artwork/${artworkId}`;
        const media = await artstationTest.requestItemMedia(url, artworkId);
        expect(media).toBeInstanceOf(PictureMedia);
        let pictureMedia = media as PictureMedia;
        expect(pictureMedia.id).toBe(artworkId);
        expect(pictureMedia.imageList.length).toBeGreaterThan(0);
    }, 120000);
});
