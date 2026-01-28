import { RuleJest } from "../core";
import { MediaType, VideoMedia } from "@/core/extension";
import Youtube from "@app/video/youtube";

describe("Youtube", () => {
    const youtubeTest = new RuleJest(new Youtube());
    // 警告：请务必替换为您的有效 YouTube Data API v3 密钥才能运行需要 API 的测试。
    // 为防止密钥泄露，请不要将含有密钥的文件提交到公共代码库。
    const YOUTUBE_API_KEY = "your-youtube-api-key"; 

    // 在所有测试运行之前配置扩展
    beforeAll(async () => {
        if (!YOUTUBE_API_KEY) {
            console.warn("YouTube API 密钥未设置。需要 API 的测试将被跳过。");
        }
        const config = new Map<string, string>();
        config.set("key", YOUTUBE_API_KEY);
        await youtubeTest.config(config);
    });

    it("should provide extension info", () => {
        const info = youtubeTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.youtube.com");
        expect(info.key).toBe("youtube");
        expect(info.name).toBe("YouTube");
        expect(info.type).toBe(MediaType.Video);
        expect(info.searchList.length).toBeGreaterThan(0);
        expect(info.categoryList.length).toBeGreaterThan(0);
    });

    // 如果没有 API 密钥，则跳过此测试套件
    describe("API-dependent tests", () => {
        beforeEach(() => {
            if (!YOUTUBE_API_KEY) {
                pending("YouTube API key is not available, skipping test.");
            }
        });

        it("should request item list from a category", async () => {
            const popularVideosUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=20";
            const page = 1;
            const list = await youtubeTest.requestItemList(popularVideosUrl, page);
            
            console.log(list);
            expect(list.items.length).toBeGreaterThan(0);
            list.items.forEach((item) => {
                expect(item.id).toBeDefined();
                expect(item.url).toBeDefined();
                expect(item.title).toBeDefined();
                expect(item.thumbnail).toBeDefined();
                expect(item.author).toBeDefined();
            });
        });

        it("should request channel list", async () => {
            // 使用 Google Developers 频道的 Handle 作为测试
            const channelId = "@GoogleDevelopers";
            const page = 1;
            const list = await youtubeTest.requestChannelList(channelId, page);

            console.log(list);
            expect(list.items.length).toBeGreaterThan(0);
            list.items.forEach((item) => {
                expect(item.id).toBeDefined();
                expect(item.url).toBeDefined();
                expect(item.title).toBeDefined();
                expect(item.thumbnail).toBeDefined();
            });
        });

        it("should search for videos", async () => {
            const keyword = "VS Code";
            const searchUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&type=video&q={keyword}";
            const page = 1;
            const list = await youtubeTest.searchItemList(keyword, searchUrl, page);

            console.log(list);
            expect(list.items.length).toBeGreaterThan(0);
            list.items.forEach((item) => {
                expect(item.id).toBeDefined();
                expect(item.url).toContain("https://www.youtube.com/watch?v=");
                expect(item.title).toBeDefined();
            });
        });
    });

    it("should request item media", async () => {
        const itemUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
        const id = "dQw4w9WgXcQ";
        const media = await youtubeTest.requestItemMedia(itemUrl, id);

        console.log(media);
        expect(media).toBeInstanceOf(VideoMedia);
        let videoMedia = media as VideoMedia;
        expect(videoMedia.id).toBe(id);
        expect(videoMedia.watchUrl).toBe(`https://www.youtube.com/embed/${id}`);
        expect(videoMedia.webPlay).toBe(true);
    });
});
