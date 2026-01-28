import fs from 'fs/promises';
import path from 'path';

const mediaTypeMap = {
    'Article': 1,
    'Picture': 2,
    'Video': 3,
    'Audio': 4,
    'Novel': 5,
};

const appDir = path.join(process.cwd(), 'app');
const rawURL = 'https://r2.memio.site/';
const source = `https://github.com/Moment-Box/extensions/blob/main/app`;

async function reflectModule(filePath) {
    try {
        const module = await import(filePath);
        const ExtensionClass = module.default;
        const instance = new ExtensionClass();
        const extensionInfo = instance.provideExtensionInfo();
        console.log(`Processing extension: ${extensionInfo.name}`);
        return extensionInfo;
    } catch (err) {
        console.error(`Error processing file ${filePath}:`, err);
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');

    const extensionInfoMatch = fileContent.match(/new Extension\((['"])([^'"]+)\1, (['"])([^'"]+)\3, MediaType\.([^)]+)\)/);
    const key = extensionInfoMatch ? extensionInfoMatch[2].trim() : path.basename(file, '.ts');
    const name = extensionInfoMatch ? extensionInfoMatch[4].trim() : '';
    const mediaType = extensionInfoMatch ? extensionInfoMatch[5].trim() : '';
    const type = mediaTypeMap[mediaType] || 0;

    const descMatch = fileContent.match(/site\.description = (['"])([^'"]*)\1/);
    const desc = descMatch ? descMatch[2].trim() : '';

    const originMatch = fileContent.match(/site\.baseUrl = (['"])([^'"]*)\1/);
    const baseUrl = originMatch ? originMatch[2].trim() : '';

    const thumbnailMatch = fileContent.match(/site\.thumbnail = (['"])([^'"]*)\1/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[2].trim() : '';

    const langMatch = fileContent.match(/site\.lang = (['"])([^'"]*)\1/);
    const lang = langMatch ? langMatch[2].trim() : 'en';

    const authorMatch = fileContent.match(/site\.author = (['"])([^'"]*)\1/);
    const author = authorMatch ? authorMatch[2].trim() : 'memio';

    const versionMatch = fileContent.match(/site\.version = (['"])([^'"]*)\1/);
    const versionTxt = versionMatch ? versionMatch[2].trim() : '1';
    const version = parseInt(versionTxt, 10) || 1;


    return {
        key,
        name,
        type,
        thumbnail,
        description: desc,
        baseUrl,
        lang,
        author,
        version
    };
}

async function generateJson() {
    const extensions = [];
    const categories = await fs.readdir(appDir);

    for (const category of categories) {
        const categoryPath = path.join(appDir, category);
        const stats = await fs.stat(categoryPath);
        if (stats.isDirectory()) {
            const files = await fs.readdir(categoryPath);
            for (const file of files) {
                if (path.extname(file) === '.ts') {
                    const filePath = path.join(categoryPath, file);
                    // run typescirpt file to get info
                    const extensionInfo = await reflectModule(filePath);

                    const key = extensionInfo.key;
                    const name = extensionInfo.name
                    const type = extensionInfo.type;
                    const version = extensionInfo.version;
                    const desc = extensionInfo.description;
                    const baseUrl = extensionInfo.baseUrl;
                    const thumbnail = extensionInfo.thumbnail;
                    const lang = extensionInfo.lang || 'en';
                    const author = extensionInfo.author || 'memio';

                    const jsFileName = path.basename(file, '.ts') + '.js';
                    const js = `${rawURL}${category}/${jsFileName}`;

                    const sourceGit = `${source}/${category}/${file}`;

                    extensions.push({
                        key,
                        name,
                        type,
                        thumbnail,
                        desc,
                        baseUrl,
                        js,
                        source: sourceGit,
                        lang: lang.toLowerCase(),
                        author,
                        version
                    });
                }
            }
        }
    }

    const jsonContent = JSON.stringify(extensions, null, 2);
    await fs.writeFile('extensions.json', jsonContent);
    console.log('extensions.json generated successfully.');
}

generateJson().catch(console.error);

