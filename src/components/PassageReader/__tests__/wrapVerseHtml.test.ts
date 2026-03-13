import { wrapVerseHtml } from "../wrapVerseHtml";

describe("wrapVerseHtml", () => {
  it("wraps a single-verse paragraph in <verse-text>", () => {
    const html =
      '<p id="p43003016_01-1" class="virtual"><b class="verse-num" id="v43003016-1">16 </b>For God so loved the world.</p>';
    const result = wrapVerseHtml(html);

    // Should wrap the verse content in <verse-text> (v prefix to avoid
    // duplicate IDs with the parent <p>)
    expect(result).toContain('<verse-text id="v43003016_01-1">');
    expect(result).toContain("</verse-text>");
    // Should preserve the <p> wrapper
    expect(result).toMatch(/<p [^>]*class="virtual">/);
    expect(result).toContain("</p>");
  });

  it("wraps each verse in a two-verse paragraph separately", () => {
    const html =
      '<p id="p01001001_01-1" class="virtual">' +
      '<b class="chapter-num" id="v01001001-1">1:1\u00A0</b>In the beginning, God created the heavens and the earth. ' +
      '<b class="verse-num" id="v01001002-1">2\u00A0</b>The earth was without form and void.' +
      "</p>";

    const result = wrapVerseHtml(html);

    // Should have two <verse-text> elements
    expect(result).toContain('<verse-text id="v01001001_01-1">');
    expect(result).toContain('<verse-text id="v01001002_01-1">');

    // Verse 1 text in first verse-text
    expect(result).toMatch(
      /v01001001_01-1">.*?In the beginning.*?<\/verse-text>/
    );
    // Verse 2 text in second verse-text
    expect(result).toMatch(/v01001002_01-1">.*?The earth was.*?<\/verse-text>/);

    // Should still be inside one <p> tag
    const pCount = (result.match(/<p /g) ?? []).length;
    expect(pCount).toBe(1);
  });

  it("wraps each verse in a three-verse paragraph", () => {
    const html =
      '<p id="p01001001_01-1" class="virtual">' +
      '<b class="chapter-num" id="v01001001-1">1:1\u00A0</b>Verse one. ' +
      '<b class="verse-num" id="v01001002-1">2\u00A0</b>Verse two. ' +
      '<b class="verse-num" id="v01001003-1">3\u00A0</b>Verse three.' +
      "</p>";

    const result = wrapVerseHtml(html);

    expect(result).toContain('<verse-text id="v01001001_01-1">');
    expect(result).toContain('<verse-text id="v01001002_01-1">');
    expect(result).toContain('<verse-text id="v01001003_01-1">');

    // All three should be inside one <p>
    const pCount = (result.match(/<p /g) ?? []).length;
    expect(pCount).toBe(1);
  });

  it("wraps verse continuation before first marker in a split paragraph (Gen 3:1)", () => {
    // ESV splits Gen 3:1 across two <p> tags. The second <p> starts with
    // verse 1's continuation text, then has verse 2's marker mid-paragraph.
    const html =
      '<p id="p01003001_03-1" class="starts-chapter">' +
      '<b class="chapter-num" id="v01003001-1">3:1\u00A0</b>Now the serpent was more crafty.' +
      "</p>" +
      '<p id="p01003001_03-1">' +
      'He said to the woman, "Did God actually say?" ' +
      '<b class="verse-num" id="v01003002-1">2\u00A0</b>And the woman said.' +
      "</p>";

    const result = wrapVerseHtml(html);

    // First paragraph: verse 1 wrapped normally
    expect(result).toContain('<verse-text id="v01003001_01-1">');
    // Second paragraph: continuation text wrapped as verse 1
    expect(result).toMatch(
      /<verse-text id="v01003001_01-1">He said to the woman.*?<\/verse-text>/
    );
    // Second paragraph: verse 2 also wrapped
    expect(result).toContain('<verse-text id="v01003002_01-1">');
    // Total: 3 verse-text elements
    const verseTextCount = (result.match(/<verse-text /g) ?? []).length;
    expect(verseTextCount).toBe(3);
  });

  it("does not touch paragraphs without verse IDs", () => {
    const html =
      '<p class="extra">(ESV)</p>' + "<h3>English Standard Version</h3>";
    expect(wrapVerseHtml(html)).toBe(html);
  });

  it("handles mixed single-verse and multi-verse paragraphs", () => {
    const html =
      '<p id="p01001001_01-1" class="virtual">' +
      '<b class="chapter-num" id="v01001001-1">1:1\u00A0</b>Verse one. ' +
      '<b class="verse-num" id="v01001002-1">2\u00A0</b>Verse two.' +
      "</p>" +
      '<p id="p01001003_01-1" class="virtual">' +
      '<b class="verse-num" id="v01001003-1">3\u00A0</b>Verse three alone.' +
      "</p>";

    const result = wrapVerseHtml(html);

    // First paragraph: two verse-text elements inside one <p>
    expect(result).toContain('<verse-text id="v01001001_01-1">');
    expect(result).toContain('<verse-text id="v01001002_01-1">');
    // Second paragraph: one verse-text element inside one <p>
    expect(result).toContain('<verse-text id="v01001003_01-1">');

    // Total: 2 opening <p> tags (paragraphs preserved)
    const pCount = (result.match(/<p /g) ?? []).length;
    expect(pCount).toBe(2);

    // Total: 3 verse-text elements
    const verseTextCount = (result.match(/<verse-text /g) ?? []).length;
    expect(verseTextCount).toBe(3);
  });

  it("returns empty string for empty input", () => {
    expect(wrapVerseHtml("")).toBe("");
  });

  it("preserves content before the first verse marker", () => {
    // Edge case: if there's text before the first <b> marker
    const html =
      '<p id="p01001001_01-1" class="virtual">' +
      "Some preamble " +
      '<b class="chapter-num" id="v01001001-1">1:1\u00A0</b>Verse one.' +
      "</p>";

    const result = wrapVerseHtml(html);

    // Preamble should be outside <verse-text>
    expect(result).toMatch(/class="virtual">Some preamble <verse-text/);
    // Verse content should be inside <verse-text>
    expect(result).toContain('<verse-text id="v01001001_01-1">');
  });

  it("prose verse-text IDs do not duplicate the parent <p> ID", () => {
    const html =
      '<p id="p07003001_01-1" class="starts-chapter">' +
      '<b class="chapter-num" id="v07003001-1">3:1\u00A0</b>First verse.' +
      "</p>";

    const result = wrapVerseHtml(html);

    // Parent <p> uses "p" prefix, verse-text uses "v" prefix
    expect(result).toContain('id="p07003001_01-1"'); // <p> tag
    expect(result).toContain('<verse-text id="v07003001_01-1">');
    // They should NOT be the same
    expect(result).not.toMatch(
      /<p[^>]+id="([^"]+)"[^>]*>.*?<verse-text id="\1">/s
    );
  });

  describe("poetry (block-indent)", () => {
    it("groups multi-line poetry spans with same verse ID into one <verse-text>", () => {
      const html =
        '<p class="block-indent"><span class="begin-line-group"></span>\n' +
        '<span id="p29003009_01-1" class="line"><b class="verse-num inline" id="v29003009-1">9\u00A0</b>\u00A0\u00A0Proclaim this among the nations:</span><br />' +
        '<span id="p29003009_01-1" class="line">\u00A0\u00A0Consecrate for war;</span><br />' +
        '<span class="end-line-group"></span></p>';

      const result = wrapVerseHtml(html);

      // Both lines share the same verse ID → one <verse-text> wrapper
      expect(result).toContain('<verse-text id="p29003009_01-1">');
      const verseTextCount = (result.match(/<verse-text /g) ?? []).length;
      expect(verseTextCount).toBe(1);

      // The <br /> between lines should be inside the wrapper
      expect(result).toMatch(
        /Proclaim this among the nations:<\/span><br \/><span/
      );
    });

    it("wraps poetry lines from different verses with correct IDs", () => {
      const html =
        '<p class="block-indent"><span class="begin-line-group"></span>\n' +
        '<span id="p29003009_01-1" class="line"><b class="verse-num inline" id="v29003009-1">9\u00A0</b>\u00A0\u00A0Line from verse 9.</span><br />' +
        '<span id="p29003010_01-1" class="line"><b class="verse-num inline" id="v29003010-1">10\u00A0</b>\u00A0\u00A0Line from verse 10.</span><br />' +
        '<span class="end-line-group"></span></p>';

      const result = wrapVerseHtml(html);

      expect(result).toContain('<verse-text id="p29003009_01-1">');
      expect(result).toContain('<verse-text id="p29003010_01-1">');
    });

    it("does not wrap spans without verse IDs (begin/end-line-group)", () => {
      const html =
        '<span class="begin-line-group"></span>' +
        '<span id="p29003009_01-1" class="line">Verse text</span>' +
        '<span class="end-line-group"></span>';

      const result = wrapVerseHtml(html);

      // begin/end-line-group spans should be untouched
      expect(result).toContain('<span class="begin-line-group"></span>');
      expect(result).toContain('<span class="end-line-group"></span>');
      // Only the verse line should be wrapped
      const verseTextCount = (result.match(/<verse-text /g) ?? []).length;
      expect(verseTextCount).toBe(1);
    });

    it("wraps poetry lines with indent class", () => {
      const html =
        '<span id="p29003009_01-1" class="indent line">\u00A0\u00A0\u00A0\u00A0stir up the mighty men.</span>';

      const result = wrapVerseHtml(html);

      expect(result).toContain('<verse-text id="p29003009_01-1">');
      expect(result).toContain("stir up the mighty men.");
    });

    it("handles mixed prose and poetry", () => {
      const prose =
        '<p id="p01001001_01-1" class="virtual">' +
        '<b class="chapter-num" id="v01001001-1">1:1\u00A0</b>Prose verse.' +
        "</p>";
      const poetry =
        '<span id="p29003009_01-1" class="line">Poetry line.</span>';

      const result = wrapVerseHtml(prose + poetry);

      // Prose uses "v" prefix, poetry keeps "p" prefix
      expect(result).toContain('<verse-text id="v01001001_01-1">');
      expect(result).toContain('<verse-text id="p29003009_01-1">');
    });
  });
});
