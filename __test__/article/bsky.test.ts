import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import Bsky from "@app/article/bsky";

describe("Bsky", () => {
    const bskyTest = new RuleJest(new Bsky());

    // Before running tests that require authentication, we need to log in.
    // You should replace "your_handle" and "your_password" with actual test credentials.
    // To avoid committing credentials, consider using environment variables.
    beforeAll(async () => {
        const identifier = process.env.BSKY_IDENTIFIER;
        const password = process.env.BSKY_PASSWORD;

        if (!identifier || !password) {
            console.warn("Skipping Bsky tests that require authentication: BSKY_IDENTIFIER and BSKY_PASSWORD environment variables are not set.");
            return;
        }

        const loginForm = new Map<string, string>();
        loginForm.set("identifier", identifier);
        loginForm.set("password", password);
        try {
            const auth = await bskyTest.loginForm(loginForm);
            bskyTest.addExtraHeaders(auth.headers);
        } catch (e) {
            console.error("Bsky login failed, skipping tests that require authentication.", e);
        }
    });

    it("should provide extension info", () => {
        const info = bskyTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://bsky.app");
        expect(info.key).toBe("bsky");
        expect(info.name).toBe("Bluesky");
        expect(info.type).toBe(MediaType.Article);
        expect(info.forceLogin).toBe(true);
    });

    it("should request item list from a feed", async () => {

        // Using a known feed for testing, e.g., the "Discover" feed DID.
        const url = "did:plc:z72i7hdynmk6r22z27h6tvur";
        const page = 1;
        const list = await bskyTest.requestItemList(url, page);
        
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.author).toBeDefined();
        });
    });

    it("should request channel list", async () => {
        // Using a known feed for testing, e.g., the "Discover" feed DID.
        const url = "did:plc:7tyhlziszrunowfvarla52va";
        const page = 1;
        const list = await bskyTest.requestChannelList(url, page);
        
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.author).toBeDefined();
        });
    });

    it("should request item media", async () => {
        // Using a known post URI for testing.
        const postUri = "at://did:plc:7tyhlziszrunowfvarla52va/app.bsky.feed.post/3m77iqdbhs22l";
        const id = "3m77iqdbhs22l";
        const media = await bskyTest.requestItemMedia(postUri, id) as ArticleMedia;

        expect(media).toBeDefined();
        expect(media.content).toBeDefined();
    });
});
