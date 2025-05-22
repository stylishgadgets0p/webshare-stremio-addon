const webshare = require("../src/webshare");
const needle = require("needle");

jest.mock("needle");

const file = (id, name, size, pos, neg) => ({
  name: "file",
  children: [
    { name: "ident", value: id },
    { name: "name", value: name },
    { name: "size", value: size },
    { name: "positive_votes", value: pos },
    { name: "negative_votes", value: neg },
  ],
});
describe("search results are sorted", () => {
  test("by match", async () => {
    const showInfo = {
      name: null,
      nameSk: null,
      originalName: "Miracle man",
      type: "movie",
      year: "2024",
    };

    needle.mockImplementation((method, url, data, headers) => ({
      body: {
        children: [
          file("1", "Morcle man 2024.avi", "600000", "1", "0"),
          file("2", "Moracle man 2024.avi", "600000", "1", "0"),
          file("3", "Miracle man 2024.avi", "600000", "1", "0"),
        ],
      },
    }));

    const results = await webshare.search(showInfo, null);
    expect(results.map((x) => x.ident)).toStrictEqual(["3", "2", "1"]);
  });

  test("by fulltext name match", async () => {
    const showInfo = {
      name: null,
      nameSk: null,
      originalName: "Miracle man",
      type: "series",
      episode: "3",
      series: "1",
      year: null,
    };

    needle.mockImplementation((method, url, data, headers) => ({
      body: {
        children: [
          // these filename are parsed incorrectly by the parse-torrent-title
          file("1", "720p S01 E03 Morcle man.avi", "600000", "1", "0"),
          file("2", "720p S01 E03 Moracle man.avi", "600000", "1", "0"),
          file("3", "720p S01 E03 Miracle man.avi", "600000", "1", "0"),
        ],
      },
    }));

    const results = await webshare.search(showInfo, null);
    expect(results.map((x) => x.ident)).toStrictEqual(["3", "2", "1"]);
  });

  test("by positive votes", async () => {
    const showInfo = {
      name: null,
      nameSk: null,
      originalName: "Miracle man",
      type: "movie",
      year: "2024",
    };

    needle.mockImplementation((method, url, data, headers) => ({
      body: {
        children: [
          file("1", "Miracle man 2024.avi", "600000", "4", "0"),
          file("2", "Miracle man 2024.avi", "600000", "0", "0"),
          file("3", "Miracle man 2024.avi", "600000", "1", "0"),
        ],
      },
    }));

    const results = await webshare.search(showInfo, null);
    expect(results.map((x) => x.ident)).toStrictEqual(["1", "3", "2"]);
  });

  test("by size", async () => {
    const showInfo = {
      name: null,
      nameSk: null,
      originalName: "Miracle man",
      type: "movie",
      year: "2024",
    };

    needle.mockImplementation((method, url, data, headers) => ({
      body: {
        children: [
          file("1", "Miracle man 2024.avi", "600000", "4", "0"),
          file("2", "Miracle man 2024.avi", "1200000", "4", "0"),
          file("3", "Miracle man 2024.avi", "100000", "4", "0"),
        ],
      },
    }));

    const results = await webshare.search(showInfo, null);
    expect(results.map((x) => x.ident)).toStrictEqual(["2", "1", "3"]);
  });
  // NEW
  test("strong matches are not sorted by fulltext match", async () => {
    const showInfo = {
      name: null,
      nameSk: null,
      originalName: "Miracle man",
      type: "series",
      episode: "3",
      series: "1",
      year: null,
    };

    needle.mockImplementation((method, url, data, headers) => ({
      body: {
        children: [
          // these filename are parsed incorrectly by the parse-torrent-title
          file("1", "720p S01 E03 Morcle man.avi", "600000", "1", "0"),
          file("2", "720p S01 E03 Moracle man.avi", "600000", "1", "0"),
          file("3", "720p S01 E03 Miracle man.avi", "600000", "1", "0"),
          // and these are parsed correctly, first has fulltext match 0.6, second 0.3 and third 0.4
          file("4", "Miracle man 720p S01 E03.avi", "600000", "1", "0"),
          file(
            "5",
            "Miracle man 720p VOD-gakqlqlqpapapa S01 E03.avi",
            "600000",
            "4",
            "0",
          ),
          file(
            "6",
            "Miracle man 720p VOD-qqlkl S01 E03.avi",
            "600000",
            "2",
            "0",
          ),
        ],
      },
    }));

    const results = await webshare.search(showInfo, null);
    // 5 is first even though the fulltext match is low
    // the last three are sorted by fulltext match
    expect(results.map((x) => x.ident)).toStrictEqual([
      "5",
      "6",
      "4",
      "3",
      "2",
      "1",
    ]);
  });
});
