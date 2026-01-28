import CryptoJS from 'crypto-js';

export function base64Encode(input: string): string {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(input));
}

export function base64Decode(input: string): string {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(input));
}

export function md5(input: string): string {
    return CryptoJS.MD5(input).toString();
}

export function sha1(input: string): string {
    return CryptoJS.SHA1(input).toString();
}

export function sha256(input: string): string {
    return CryptoJS.SHA256(input).toString();
}

export function sha512(input: string): string {
    return CryptoJS.SHA512(input).toString();           
}

export function aesDecodeCBC(input: string, key: string, iv: string): string {
    let decrypted = CryptoJS.AES.decrypt(input, CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

export function aesDecodeECB(input: string, key: string): string {
    let decrypted = CryptoJS.AES.decrypt(input, CryptoJS.enc.Utf8.parse(key), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

export function aesEncodeCBC(input: string, key: string, iv: string): string {
    let encrypted = CryptoJS.AES.encrypt(input, CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

export function aesEncodeECB(input: string, key: string): string {
    let encrypted = CryptoJS.AES.encrypt(input, CryptoJS.enc.Utf8.parse(key), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}