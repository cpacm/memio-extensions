import Reuters from "@app/article/reuters";
import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";

describe('Reuters', () => {
    const reuters = new RuleJest(new Reuters());

    it('provideExtensionInfo should return correct extension info', () => {
        const info = reuters.provideExtensionInfo();
        expect(info.key).toBe('reuters');
        expect(info.name).toBe('Reuters');
        expect(info.lang).toBe('en');
        expect(info.baseUrl).toBe('https://www.reuters.com');
        expect(info.type).toBe(MediaType.Article);
    });

    it('requestItemList should fetch and parse articles', async () => {
        const url = '/world/';
        const page = 1;
        const list: ExtensionList = await reuters.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            console.log(item);
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.category).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it('requestItemMedia should fetch and parse article media', async () => {
        const url = 'https://www.reuters.com/business/aerospace-defense/us-may-cut-air-traffic-10-by-friday-without-shutdown-deal-sources-say-2025-11-05/';
        const id = '3KFAJ6FMHFJMNMJ7HWLVMNN7QU';
        const media: ArticleMedia = await reuters.requestItemMedia(url, id) as ArticleMedia;
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toBeDefined();
        expect(media.content).toBeDefined();
        expect(media.author).toBeDefined();
        expect(media.date).toBeDefined();
    }, 30000);
});