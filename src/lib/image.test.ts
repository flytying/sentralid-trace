import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { imageSize, readImage, sniffImage } from "./image";

const png = readFileSync("public/samples/A-chat-lumencove-gcash.png");

describe("image checks", () => {
  it("sniffs content, not the declared type", () => {
    expect(sniffImage(png)).toBe("image/png");
    expect(sniffImage(Buffer.from("%PDF-1.7 hello"))).toBeNull();
    expect(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
  });

  it("reads PNG dimensions", () => {
    expect(imageSize(png, "image/png")).toEqual({ width: 540, height: 960 });
  });

  it("rejects a PDF renamed to .png", async () => {
    const f = new File([Buffer.from("%PDF-1.7")], "shot.png", { type: "image/png" });
    await expect(readImage(f, "Page screenshot")).rejects.toMatchObject({ code: "FILE_TYPE_UNSUPPORTED" });
  });

  it("rejects oversized files before reading them", async () => {
    const f = new File([new Uint8Array(1_700_000)], "big.png", { type: "image/png" });
    await expect(readImage(f, "Chat screenshot 1")).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });

  it("accepts a real screenshot", async () => {
    const f = new File([png], "a.png");
    await expect(readImage(f, "Chat")).resolves.toMatchObject({ mime: "image/png" });
  });
});
