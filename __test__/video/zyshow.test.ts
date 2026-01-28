import ZyShow from '../../app/video/zyshow';
import { RuleJest } from '../core';
import { MediaType, VideoMedia } from '@/core/extension';

describe('ZyShow', () => {
    const zyshowTest = new RuleJest(new ZyShow());

    it('should get extension info', () => {
        const extensionInfo = zyshowTest.provideExtensionInfo();
        expect(extensionInfo.name).toBe('综艺秀');
        expect(extensionInfo.key).toBe('zyshow');
        expect(extensionInfo.type).toBe(MediaType.Video);
    });

    it('should get item list', async () => {
        const list = await zyshowTest.requestItemList("https://www.zyshow.co/dl/index/{page}.html", 1);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.url).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.category).toBeDefined();
        });
        console.log(list);
    }, 30000);

    it('should get channel', async () => {
        const list = await zyshowTest.requestChannelList("dl/xirenqimiaoye", 1);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach(item => {
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.url).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.author).toBeDefined();
        });
        console.log(list);
    }, 30000);

    it.only('should get item media', async () => {
        const media = await zyshowTest.requestItemMedia("https://www.zyshow.co/dl/xirenqimiaoye/v/20240626.html", "xirenqimiaoye_20240626");
        expect(media).toBeInstanceOf(VideoMedia);
        const videoMedia = media as VideoMedia;
        expect(videoMedia.watchUrl).toBeDefined();
        expect(videoMedia.watchUrl.length).toBeGreaterThan(0);

        console.log(videoMedia);
    }, 30000);
});
