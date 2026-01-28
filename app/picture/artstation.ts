import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, PictureMedia, MediaType } from '@/core/extension';

class ArtStation extends Rule {
    provideExtensionInfo(): Extension {
        let site = new Extension("artstation", "ArtStation", MediaType.Picture);
        site.baseUrl = "https://www.artstation.com";
        site.thumbnail = "https://www.artstation.com/favicon.ico";
        site.description = "ArtStation is the leading showcase platform for games, film, media & entertainment artists.";
        site.lang = "en";
        site.categoryList = [
            new SiteUrl("Trending", "/explore/projects/trending.json?page={page}"),
            new SiteUrl("Latest", "/explore/projects/latest.json?page={page}"),

            new SiteUrl("Anatomy", "/channels/projects.json?channel_id=69&page={page}"),
            new SiteUrl("Abstract", "/channels/projects.json?channel_id=70&page={page}"),
            new SiteUrl("Animals & Wildlife", "/channels/projects.json?channel_id=71&page={page}"),
            new SiteUrl("Anime & Manga", "/channels/projects.json?channel_id=72&page={page}"),
            new SiteUrl("Architectural Visualization", "/channels/projects.json?channel_id=73&page={page}"),
            new SiteUrl("Character Design", "/channels/projects.json?channel_id=74&page={page}"),
            new SiteUrl("Character Modeling", "/channels/projects.json?channel_id=75&page={page}"),
            new SiteUrl("Editorial Illustration", "/channels/projects.json?channel_id=76&page={page}"),
            new SiteUrl("Children's Art", "/channels/projects.json?channel_id=77&page={page}"),
            new SiteUrl("Comic Art", "/channels/projects.json?channel_id=78&page={page}"),
            new SiteUrl("Creatures & Monsters", "/channels/projects.json?channel_id=80&page={page}"),
            new SiteUrl("Environmental Concept Art & Design", "/channels/projects.json?channel_id=81&page={page}"),
            new SiteUrl("Fan Art", "/channels/projects.json?channel_id=82&page={page}"),
            new SiteUrl("Fantasy", "/channels/projects.json?channel_id=83&page={page}"),
            new SiteUrl("Cover Art", "/channels/projects.json?channel_id=84&page={page}"),
            new SiteUrl("Game Art", "/channels/projects.json?channel_id=85&page={page}"),
            new SiteUrl("Horror", "/channels/projects.json?channel_id=86&page={page}"),
            new SiteUrl("Graphic Design", "/channels/projects.json?channel_id=87&page={page}"),
            new SiteUrl("Illustration", "/channels/projects.json?channel_id=88&page={page}"),
            new SiteUrl("Industrial & Product Design", "/channels/projects.json?channel_id=89&page={page}"),
            new SiteUrl("Lighting", "/channels/projects.json?channel_id=90&page={page}"),
            new SiteUrl("Matte Painting", "/channels/projects.json?channel_id=91&page={page}"),
            new SiteUrl("Mecha", "/channels/projects.json?channel_id=92&page={page}"),
            new SiteUrl("Pixel & Voxel", "/channels/projects.json?channel_id=93&page={page}"),
            new SiteUrl("Props", "/channels/projects.json?channel_id=94&page={page}"),
            new SiteUrl("Science Fiction", "/channels/projects.json?channel_id=95&page={page}"),
            new SiteUrl("Storyboards", "/channels/projects.json?channel_id=96&page={page}"),
            new SiteUrl("Textures & Materials", "/channels/projects.json?channel_id=97&page={page}"),
            new SiteUrl("Tutorials", "/channels/projects.json?channel_id=98&page={page}"),
            new SiteUrl("User Interface", "/channels/projects.json?channel_id=99&page={page}"),
            new SiteUrl("Vehicles", "/channels/projects.json?channel_id=100&page={page}"),
            new SiteUrl("Architectural Concepts", "/channels/projects.json?channel_id=101&page={page}"),
            new SiteUrl("Web and App Design", "/channels/projects.json?channel_id=102&page={page}"),
            new SiteUrl("Board and Card Game Art", "/channels/projects.json?channel_id=103&page={page}"),
            new SiteUrl("Book Illustration", "/channels/projects.json?channel_id=104&page={page}"),
            new SiteUrl("Character Animation", "/channels/projects.json?channel_id=105&page={page}"),
            new SiteUrl("Fashion & Costume Design", "/channels/projects.json?channel_id=106&page={page}"),
            new SiteUrl("Gameplay & Level Design", "/channels/projects.json?channel_id=107&page={page}"),
            new SiteUrl("Games and Real-Time 3D Environment Art", "/channels/projects.json?channel_id=108&page={page}"),
            new SiteUrl("Hard Surface", "/channels/projects.json?channel_id=109&page={page}"),
            new SiteUrl("Mechanical Design", "/channels/projects.json?channel_id=110&page={page}"),
            new SiteUrl("Motion Graphics", "/channels/projects.json?channel_id=111&page={page}"),
            new SiteUrl("Photogrammetry & 3D Scanning", "/channels/projects.json?channel_id=112&page={page}"),
            new SiteUrl("Portraits", "/channels/projects.json?channel_id=113&page={page}"),
            new SiteUrl("Realism", "/channels/projects.json?channel_id=114&page={page}"),
            new SiteUrl("Scientific Illustration & Visualization", "/channels/projects.json?channel_id=115&page={page}"),
            new SiteUrl("Scripts & Tools", "/channels/projects.json?channel_id=116&page={page}"),
            new SiteUrl("Sketches", "/channels/projects.json?channel_id=117&page={page}"),
            new SiteUrl("Still Life", "/channels/projects.json?channel_id=118&page={page}"),
            new SiteUrl("Stylized", "/channels/projects.json?channel_id=119&page={page}"),
            new SiteUrl("Technical Art", "/channels/projects.json?channel_id=120&page={page}"),
            new SiteUrl("Toys & Collectibles", "/channels/projects.json?channel_id=121&page={page}"),
            new SiteUrl("VFX for Film, TV & Animation ", "/channels/projects.json?channel_id=122&page={page}"),
            new SiteUrl("VFX for Real-Time & Games", "/channels/projects.json?channel_id=123&page={page}"),
            new SiteUrl("Virtual and Augmented Reality", "/channels/projects.json?channel_id=124&page={page}"),
            new SiteUrl("Visual Development", "/channels/projects.json?channel_id=125&page={page}"),
            new SiteUrl("Weapons", "/channels/projects.json?channel_id=126&page={page}"),
            new SiteUrl("Unreal Engine", "/channels/projects.json?channel_id=127&page={page}"),
            new SiteUrl("Automotive", "/channels/projects.json?channel_id=128&page={page}"),

            new SiteUrl("RealityScan", "/channels/projects.json?channel_id=8064&page={page}"),
            new SiteUrl("Twinmotion", "/channels/projects.json?channel_id=174543&page={page}"),
            new SiteUrl("Substance 3D", "/channels/projects.json?channel_id=175298&page={page}"),
        ];

        // CSRF-TOKEN may be required for search API
        // site.searchList = [
        //     new SiteUrl("Search", "/api/v2/search/projects.json"),
        // ];

        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let api = this.site.baseUrl + `/api/v2/community` + url.replace("{page}", page.toString()) + `&dimension=all&per_page=30&sort=trending`;
        let htmlResponse = await this.client?.request({ url: api, method: "GET" });
        let jsonContent = htmlResponse.body;
        try {
            let jsonData = JSON.parse(jsonContent);
            let details: ExtensionDetail[] = [];
            let datas = jsonData.data;
            for (let item of datas) {
                let hash = item.hash_id;
                let link = item.url;
                let title = item.title;
                let author = item.user ? item.user.username : "Unknown";
                let thumb = item.smaller_square_cover_url;

                let detail = new ExtensionDetail(hash, link, title);
                detail.thumbnail = thumb;
                detail.type = MediaType.Picture;
                detail.hasChapter = false;
                detail.author = author;
                details.push(detail);
            }
            let totalCount = jsonData.total_count ?? 0;
            let hasMore = true;
            if (totalCount === 0) {
                hasMore = details.length >= 30;
            } else {
                hasMore = page * 30 < totalCount;
            }
            let nextPage = hasMore ? url : undefined;

            return new ExtensionList(details, page, nextPage);
        } catch (e) {
            console.error("Failed to parse JSON:", e);
        }

        return new ExtensionList([], page, undefined);
    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let api = this.site.baseUrl + url;
        let body = `{"query":"${keyword}","page":${page},"per_page":50,"sorting":"relevance","pro_first":"1","filters":[],"additional_fields":[]}`;
        let htmlResponse = await this.client?.request(
            { url: api, method: "POST", body: body, contentType: "application/json" }
        );
        let jsonContent = htmlResponse.body;
        try {
            let jsonData = JSON.parse(jsonContent);
            let details: ExtensionDetail[] = [];
            let datas = jsonData.data;
            for (let item of datas) {
                let hash = item.hash_id;
                let link = item.url;
                let title = item.title;
                let author = item.user ? item.user.username : "Unknown";
                let thumb = item.smaller_square_cover_url;

                let detail = new ExtensionDetail(hash, link, title);
                detail.thumbnail = thumb;
                detail.type = MediaType.Picture;
                detail.hasChapter = false;
                detail.author = author;
                details.push(detail);
            }
            let totalCount = jsonData.total_count ?? 0;
            let hasMore = true;
            if (totalCount === 0) {
                hasMore = details.length >= 50;
            } else {
                hasMore = page * 50 < totalCount;
            }
            let nextPage = hasMore ? url : undefined;

            return new ExtensionList(details, page, nextPage);
        } catch (e) {
            console.error("Failed to parse JSON:", e);
        }

        return new ExtensionList([], page, undefined);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        // https://www.artstation.com/projects/x3EO22.json
        let api = this.site.baseUrl + `/projects/` + id + `.json`;
        let htmlResponse = await this.client?.request({ url: api, method: "GET" });
        let jsonContent = htmlResponse.body;
        try {
            let jsonData = JSON.parse(jsonContent);
            let images:string[] = [];
            let title = jsonData.title || "";
            let assets = jsonData.assets;
            for (let asset of assets) {
                if (asset.asset_type === "image") {
                    let imageUrl = asset.image_url;
                    images.push(imageUrl);
                }
            }
            return new PictureMedia(id,title,images);
        } catch (e) {
            console.error("Failed to parse JSON:", e);
        }
        return new PictureMedia(`-1`,"",[]);
    }


}

(function () {
    const artStation = new ArtStation();
    artStation.init();
})();
export default ArtStation;