import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import EpicGames from "@app/article/epicgames";

describe('EpicGames', () => {
    const epicgames = new RuleJest(new EpicGames());

    it('provideExtensionInfo should return correct extension info', () => {
        const info = epicgames.provideExtensionInfo();
        expect(info.key).toBe('epicgames');
        expect(info.name).toBe('Epic Games Store');
        expect(info.lang).toBe('en');
        expect(info.baseUrl).toBe('https://store.epicgames.com');
        expect(info.type).toBe(MediaType.Article);
    });

    it('requestItemList should fetch and parse articles', async () => {
        const url = '?sortBy=relevancy&sortDir=DESC';
        const page = 2;
        const list: ExtensionList = await epicgames.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            console.log(item);
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.category).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it('requestItemMedia should fetch and parse article media', async () => {
        const url = 'https://store.epicgames.com/en-US/p/fortnite';
        const id = '4b1d6f3e-20b4-4f0e-8f1e-8b5e8e8e8e8e';
        const media: ArticleMedia = await epicgames.requestItemMedia(url, id) as ArticleMedia;
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toBeDefined();
        expect(media.content).toBeDefined();
    }, 30000);
});