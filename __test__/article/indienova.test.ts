import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import Indienova from "@app/article/indienova";

describe('Indienova', () => {
    const indienova = new RuleJest(new Indienova());

    it('provideExtensionInfo should return correct extension info', () => {
        const info = indienova.provideExtensionInfo();
        expect(info.key).toBe('indienova');
        expect(info.name).toBe('Indienova');
        expect(info.lang).toBe('zh');
        expect(info.baseUrl).toBe('https://indienova.com');
        expect(info.type).toBe(MediaType.Article);
    });

    it.only('requestItemList should fetch and parse articles', async () => {
        const url = 'indie-game-news';
        const page = 2;
        const list: ExtensionList = await indienova.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        console.log(list);
        list.items.forEach(item => {
            
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.description).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it('requestItemMedia should fetch and parse article media', async () => {
        const url = 'https://indienova.com/indie-game-news/guide-2025-1222-1228-part-1/';
        const id = 'guide-2025-1222-1228-part-1';
        const media: ArticleMedia = await indienova.requestItemMedia(url, id) as ArticleMedia;
        console.log(media);
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toBeDefined();
        expect(media.content).toBeDefined();
    }, 30000);
});
