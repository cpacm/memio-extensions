import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import Gamers4 from "@app/article/gamers4";

describe('Gamers4', () => {
    const gamers4 = new RuleJest(new Gamers4());

    it('provideExtensionInfo should return correct extension info', () => {
        const info = gamers4.provideExtensionInfo();
        expect(info.key).toBe('gamers4');
        expect(info.name).toBe('Gamers4电玩社');
        expect(info.lang).toBe('zh-TW');
        expect(info.baseUrl).toBe('https://www.4gamers.com.tw');
        expect(info.type).toBe(MediaType.Article);
    });

    it('requestItemList should fetch and parse articles', async () => {
        const url = 'latest';
        const page = 1;
        const list: ExtensionList = await gamers4.requestItemList(url, page);
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
        const url = 'https://www.4gamers.com.tw/news/detail/63449/maplestory-worlds-event-in-taipei';
        const id = '63449';
        const media: ArticleMedia = await gamers4.requestItemMedia(url, id) as ArticleMedia;
        console.log(media);
        expect(media.content).toBeDefined();
        expect(media.title).toBeDefined();
        expect(media.id).toBe(id);
    }, 30000);
});
